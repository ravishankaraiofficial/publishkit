import * as functions from 'firebase-functions/v1';
import { FieldValue } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { db } from '../lib/firestore';

const PLAN_MONTHLY_LIMITS: Record<string, number> = {
  free: 3,
  pro: 100,
  ultra: 350,
};
// IP cap kept generous enough that a legit Max user (300 uploads + 300 scripts +
// 300 multiposts on the same home wifi) doesn't get blocked. 1000 leaves
// headroom while still throttling obvious script-kiddie abuse from one IP.
const MAX_PER_IP_PER_MONTH = 1000;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Atomically enforces both UID-based and IP-based monthly rate limits.
 * Both checks and increments happen inside a single Firestore transaction,
 * eliminating TOCTOU race conditions. Throws HttpsError if either limit is reached.
 */
export async function enforceRateLimit(uid: string, rawIp: string, plan: string = 'free', generationMode: 'metadata' | 'script' = 'metadata'): Promise<void> {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM for IP (kept calendar month for simplicity)
  const limit = PLAN_MONTHLY_LIMITS[plan] ?? 10;

  const userRef = db.doc(`users/${uid}`);

  // Hash the raw IP for the ipUsage collection key
  const ipHash = crypto.createHash('sha256').update(rawIp).digest('hex');
  const ipRef = db.doc(`ipUsage/${ipHash}/monthly/${month}`);

  await db.runTransaction(async (tx) => {
    // Read both documents inside the transaction
    const [userDoc, ipDoc] = await Promise.all([tx.get(userRef), tx.get(ipRef)]);

    const data = userDoc.exists ? userDoc.data() || {} : {};
    const ipCount = ipDoc.exists ? (ipDoc.data()?.count ?? 0) : 0;

    const now = new Date();
    let cycleStartStr = data.usageCycleStart;
    let cycleStartDate = cycleStartStr ? new Date(cycleStartStr) : new Date(0);
    
    // Check if 30 days have passed
    if (now.getTime() - cycleStartDate.getTime() > THIRTY_DAYS_MS) {
      cycleStartStr = now.toISOString();
      cycleStartDate = now;
      data.metadataUsage = 0;
      data.scriptUsage = 0;
      data.repurposingUsage = 0;
    }

    const usageField = generationMode === 'script' ? 'scriptUsage' : 'metadataUsage';
    const uidCount = data[usageField] ?? 0;

    // Check per-UID limit
    if (uidCount >= limit) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Monthly limit of ${limit} reached. Resets 30 days after your cycle start.`
      );
    }

    // Check per-IP limit
    if (ipCount >= MAX_PER_IP_PER_MONTH) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Monthly limit reached.'
      );
    }

    // Both limits are safe — atomically increment both counters
    const payload: any = {
      usageCycleStart: cycleStartStr,
      [usageField]: uidCount + 1,
    };
    
    // If we're resetting, also apply 0 to others in this transaction
    if (generationMode === 'script' && data.metadataUsage === 0) payload.metadataUsage = 0;
    if (generationMode === 'metadata' && data.scriptUsage === 0) payload.scriptUsage = 0;
    if (data.repurposingUsage === 0) payload.repurposingUsage = 0;

    if (userDoc.exists) {
      tx.update(userRef, payload);
    } else {
      tx.set(userRef, payload, { merge: true });
    }

    const increment = FieldValue.increment(1);
    const timestamp = FieldValue.serverTimestamp();
    if (ipDoc.exists) {
      tx.update(ipRef, { count: increment, lastRequest: timestamp });
    } else {
      tx.set(ipRef, { count: 1, lastRequest: timestamp });
    }
  });
}

/**
 * Returns the monthly usage count for a user (current 30 day cycle).
 * Used for UI counter display.
 */
export async function getMonthlyUsage(uid: string): Promise<number> {
  const doc = await db.doc(`users/${uid}`).get();
  if (!doc.exists) return 0;
  
  const data = doc.data() || {};
  const cycleStartStr = data.usageCycleStart;
  if (!cycleStartStr) return 0;
  
  const cycleStartDate = new Date(cycleStartStr);
  if (Date.now() - cycleStartDate.getTime() > THIRTY_DAYS_MS) return 0;
  
  return data.metadataUsage ?? 0;
}

type TrialFeature = 'script' | 'repurposing';

const FEATURE_MONTHLY_LIMITS: Record<string, number> = {
  free: 3,
  pro: 100,
  ultra: 350,
};

/**
 * Plan-aware 30-day usage enforcement for Script Writer and MultiPost.
 *   Free  → 3  / 30 days
 *   Pro   → 100 / 30 days
 *   Ultra → 350 / 30 days
 * Check + write happen in a single transaction to remove TOCTOU races.
 * Counter resets the moment the stored usageCycleStart is > 30 days old.
 * Caller is "charged" before the Gemini call; on Gemini failure the usage still
 * counts (matches the metadata-upload pattern in enforceRateLimit above).
 *
 * `count` lets MultiPost charge per platform — e.g. 3 platforms selected = 3.
 * The full count is checked atomically against the limit so partial reservations
 * never happen: either every platform fits in the remaining quota or the call
 * is rejected before any Gemini work runs.
 */
async function enforceTrialOrUsage(
  uid: string,
  plan: string,
  feature: TrialFeature,
  count: number = 1
): Promise<void> {
  const userRef = db.doc(`users/${uid}`);
  const usageField = feature === 'script' ? 'scriptUsage' : 'repurposingUsage';
  const limit = FEATURE_MONTHLY_LIMITS[plan] ?? FEATURE_MONTHLY_LIMITS.free;
  const charge = Math.max(1, Math.floor(count));

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.exists ? snap.data() || {} : {};

    const now = new Date();
    let cycleStartStr = data.usageCycleStart;
    let cycleStartDate = cycleStartStr ? new Date(cycleStartStr) : new Date(0);
    
    // Check if 30 days have passed
    if (now.getTime() - cycleStartDate.getTime() > THIRTY_DAYS_MS) {
      cycleStartStr = now.toISOString();
      cycleStartDate = now;
      data.metadataUsage = 0;
      data.scriptUsage = 0;
      data.repurposingUsage = 0;
    }

    const current = data[usageField] ?? 0;
    const remaining = Math.max(0, limit - current);

    if (current + charge > limit) {
      const message =
        charge === 1
          ? `Monthly limit of ${limit} reached. Resets 30 days after your cycle start.`
          : `This would use ${charge} of your monthly quota but only ${remaining} left. ` +
            `Pick fewer platforms or upgrade your plan.`;
      throw new functions.https.HttpsError('resource-exhausted', message);
    }
    
    const payload: any = {
      usageCycleStart: cycleStartStr,
      [usageField]: current + charge,
      // cleanup legacy fields
      scriptUsageMonth: FieldValue.delete(),
      repurposingUsageMonth: FieldValue.delete(),
      scriptUsageThisMonth: FieldValue.delete(),
      repurposingUsageThisMonth: FieldValue.delete(),
    };
    
    // If we're resetting, also apply 0 to others in this transaction
    if (data.metadataUsage === 0) payload.metadataUsage = 0;
    if (data.scriptUsage === 0 && feature !== 'script') payload.scriptUsage = 0;
    if (data.repurposingUsage === 0 && feature !== 'repurposing') payload.repurposingUsage = 0;

    if (snap.exists) {
      tx.update(userRef, payload);
    } else {
      tx.set(userRef, payload, { merge: true });
    }
  });
}

export async function enforceScriptTrial(uid: string, plan: string): Promise<void> {
  return enforceTrialOrUsage(uid, plan, 'script', 1);
}

export async function enforceRepurposingTrial(
  uid: string,
  plan: string,
  count: number = 1
): Promise<void> {
  return enforceTrialOrUsage(uid, plan, 'repurposing', count);
}

/**
 * Per-minute burst rate limit — sliding 60-second window.
 *
 * Why this exists separately from the monthly quota: a Max user with 1000
 * monthly calls could fire all 1000 in a single minute, exhausting the
 * Gemini daily quota in seconds AND DoS-ing other users via cold-start
 * storm + concurrent-instance contention. Monthly caps protect the budget
 * over the month; burst caps protect against single-attacker DoS.
 *
 * Tier limits per 60-second window:
 *   Free  →  2  (legitimate users never hit this — 1/min is normal)
 *   Pro   →  8  (covers manual rapid testing comfortably)
 *   Ultra → 20  (the "Max Plan" — generous headroom)
 *
 * Implementation: small ring buffer of request timestamps stored at
 * users/{uid}/rateLimit/burst. On each call we transactionally prune
 * timestamps older than 60s, check size, append now if under limit,
 * write back. The doc is admin-SDK-only (firestore.rules already blocks
 * everything under users/{uid}/* writes by client; this subdoc inherits).
 *
 * Cost: one read + one write per gated request. Negligible vs Gemini call cost.
 */
const BURST_LIMITS: Record<string, number> = {
  free: 2,
  pro: 8,
  ultra: 20,
};
const BURST_WINDOW_MS = 60 * 1000;

export async function enforceBurstLimit(uid: string, plan: string): Promise<void> {
  const limit = BURST_LIMITS[plan] ?? BURST_LIMITS.free;
  const burstRef = db.doc(`users/${uid}/rateLimit/burst`);
  const nowMs = Date.now();
  const windowStart = nowMs - BURST_WINDOW_MS;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(burstRef);
    const raw: unknown = snap.exists ? snap.data()?.timestamps : undefined;
    const existing: number[] = Array.isArray(raw)
      ? raw.filter((n): n is number => typeof n === 'number')
      : [];

    // Prune anything older than the window. Cap retained length defensively at
    // 100 in case something pathological grew the array (a buggy client, a
    // dropped transaction, etc.). Plan tier limits are all <= 20 so this is
    // pure paranoia.
    const recent = existing.filter((t) => t > windowStart).slice(-100);

    if (recent.length >= limit) {
      // How long until the oldest timestamp falls out of the window?
      const oldest = recent[0];
      const retryInSec = Math.max(1, Math.ceil((oldest + BURST_WINDOW_MS - nowMs) / 1000));
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Too many requests. Slow down — try again in ${retryInSec}s.`
      );
    }

    recent.push(nowMs);
    if (snap.exists) {
      tx.update(burstRef, { timestamps: recent, lastRequest: FieldValue.serverTimestamp() });
    } else {
      tx.set(burstRef, { timestamps: recent, lastRequest: FieldValue.serverTimestamp() });
    }
  });
}
