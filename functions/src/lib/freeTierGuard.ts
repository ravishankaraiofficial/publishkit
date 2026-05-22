import * as functions from 'firebase-functions/v1';
import { FieldValue } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { db } from './firestore';

// Anti-abuse guard for free-tier generations.
//
// The threat: a free-tier user exhausts their monthly quota, deletes their
// browser history / makes a new Google account, and tries to generate again
// for free. The existing rate limiter is keyed on UID + IP — a new UID with
// a fresh-looking client bypasses it.
//
// This guard tracks two long-lived identifiers per free-tier generation:
//   1. A SHA-256 hash of the client IP (salted).
//   2. A SHA-256 hash of a browser visitor ID computed client-side.
// We store the set of UIDs that have ever called from each identifier. If a
// NEW uid arrives whose identifiers are already linked to one or more other
// free-tier uids, we block.
//
// Paid users (pro / max) are exempt — once someone has paid, they can use
// the service from any device.
//
// Caveats: VPN + different browser bypasses this. Phone OTP (Firebase Auth
// Phone provider) is the only truly strong defense and is left as a future
// upgrade. See the plan file for the layered strategy.

const SALT = 'pk_freetier_v1';
const MAX_LINKED_UIDS = 1; // 1 free UID per fingerprint/IP — second one blocks.

function hash(input: string): string {
  return crypto.createHash('sha256').update(SALT + ':' + input).digest('hex');
}

export interface FreeTierGuardInput {
  uid: string;
  rawIp: string;
  visitorId: string | undefined;
  plan: string;
}

/**
 * Check + record free-tier identifiers. Throws resource-exhausted if a
 * different free-tier uid already used this device/IP recently.
 *
 * Idempotent for the same (uid, fpHash) — calling it twice in a row is fine,
 * the uid is only appended once to the linked set.
 */
export async function enforceFreeTierGuard(input: FreeTierGuardInput): Promise<void> {
  // Paid users skip this check entirely.
  if (input.plan === 'pro' || input.plan === 'ultra') return;

  const ipHash = input.rawIp && input.rawIp !== 'unknown' ? hash('ip:' + input.rawIp) : null;
  // Accept any non-empty visitor identifier of reasonable length. FingerprintJS
  // emits 32-char hex; our fallback emits 'anonymous-fp'. The fallback is too
  // generic to be useful — skip it.
  const fpClean =
    typeof input.visitorId === 'string' &&
    input.visitorId.length >= 8 &&
    input.visitorId.length <= 128 &&
    input.visitorId !== 'anonymous-fp'
      ? input.visitorId
      : null;
  const fpHash = fpClean ? hash('fp:' + fpClean) : null;

  // If neither identifier is available, fall through quietly — the existing
  // UID-based monthly cap still applies; we just can't add this extra layer.
  if (!ipHash && !fpHash) return;

  const checks: Promise<void>[] = [];
  if (ipHash) checks.push(checkAndLink('freeTierUsage_ip', ipHash, input.uid));
  if (fpHash) checks.push(checkAndLink('freeTierUsage_fp', fpHash, input.uid));
  await Promise.all(checks);
}

async function checkAndLink(collection: string, key: string, uid: string): Promise<void> {
  const ref = db.doc(`${collection}/${key}`);
  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const existing = (doc.exists ? doc.data()?.uids : []) as string[] | undefined;
    const uids = Array.isArray(existing) ? existing : [];

    if (uids.includes(uid)) {
      // Already linked — fine, this is the same person reusing their own
      // device. Update lastSeenAt and continue.
      tx.set(
        ref,
        { lastSeenAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return;
    }

    if (uids.length >= MAX_LINKED_UIDS) {
      // A different free-tier uid is already linked to this device/IP.
      // Block — they've used their lifetime free quota from this device.
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Free tier already used on this device. Please upgrade or sign in to the account that first used the free tier here.'
      );
    }

    tx.set(
      ref,
      {
        uids: [...uids, uid],
        firstSeenAt: doc.exists ? doc.data()?.firstSeenAt : FieldValue.serverTimestamp(),
        lastSeenAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}
