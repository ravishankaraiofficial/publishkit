import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { db } from '../lib/firestore';

const PLAN_MONTHLY_LIMITS: Record<string, number> = {
  free: 10,
  pro: 100,
  ultra: 1000,
};
const MAX_PER_IP_PER_MONTH = 150;

/**
 * Atomically enforces both UID-based and IP-based monthly rate limits.
 * Both checks and increments happen inside a single Firestore transaction,
 * eliminating TOCTOU race conditions. Throws HttpsError if either limit is reached.
 */
export async function enforceRateLimit(uid: string, rawIp: string, plan: string = 'free'): Promise<void> {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const limit = PLAN_MONTHLY_LIMITS[plan] ?? 10;

  const uidRef = db.doc(`users/${uid}/usage/${month}`);

  // Hash the raw IP for the ipUsage collection key
  const ipHash = crypto.createHash('sha256').update(rawIp).digest('hex');
  const ipRef = db.doc(`ipUsage/${ipHash}/monthly/${month}`);

  await db.runTransaction(async (tx) => {
    // Read both documents inside the transaction
    const [uidDoc, ipDoc] = await Promise.all([tx.get(uidRef), tx.get(ipRef)]);

    const uidCount = uidDoc.exists ? (uidDoc.data()?.count ?? 0) : 0;
    const ipCount = ipDoc.exists ? (ipDoc.data()?.count ?? 0) : 0;

    // Check per-UID limit
    if (uidCount >= limit) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Monthly limit of ${limit} reached. Upgrade your plan.`
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
    const increment = admin.firestore.FieldValue.increment(1);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    if (uidDoc.exists) {
      tx.update(uidRef, { count: increment, lastRequest: timestamp });
    } else {
      tx.set(uidRef, { count: 1, lastRequest: timestamp });
    }

    if (ipDoc.exists) {
      tx.update(ipRef, { count: increment, lastRequest: timestamp });
    } else {
      tx.set(ipRef, { count: 1, lastRequest: timestamp });
    }
  });
}

/**
 * Returns the monthly usage count for a user (current month).
 * Used for UI counter display.
 */
export async function getMonthlyUsage(uid: string): Promise<number> {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const doc = await db.doc(`users/${uid}/usage/${month}`).get();
  return doc.exists ? (doc.data()?.count ?? 0) : 0;
}

type TrialFeature = 'script' | 'repurposing';

const FEATURE_MONTHLY_LIMITS: Record<string, number> = {
  free: 10,
  pro: 100,
  ultra: 1000,
};

/**
 * Plan-aware monthly usage enforcement for Script Writer and MultiPost.
 *   Free  → 10  / calendar month
 *   Pro   → 100 / calendar month
 *   Ultra → 1000 / calendar month  (the "Max Plan" in UI)
 * Check + write happen in a single transaction to remove TOCTOU races.
 * Counter resets the moment the stored YYYY-MM differs from the current month.
 * Caller is "charged" before the Gemini call; on Gemini failure the usage still
 * counts (matches the metadata-upload pattern in enforceRateLimit above).
 *
 * Legacy fields scriptTrialLastUsedAt / repurposingTrialLastUsedAt are no longer
 * read or written here. They remain as harmless orphan data on older user docs.
 */
async function enforceTrialOrUsage(uid: string, plan: string, feature: TrialFeature): Promise<void> {
  const userRef = db.doc(`users/${uid}`);
  const usageField = feature === 'script' ? 'scriptUsageThisMonth' : 'repurposingUsageThisMonth';
  const monthField = feature === 'script' ? 'scriptUsageMonth' : 'repurposingUsageMonth';
  const currentMonth = new Date().toISOString().slice(0, 7);
  const limit = FEATURE_MONTHLY_LIMITS[plan] ?? FEATURE_MONTHLY_LIMITS.free;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.exists ? snap.data() || {} : {};

    const storedMonth = data[monthField];
    const current = storedMonth === currentMonth ? (data[usageField] ?? 0) : 0;
    if (current >= limit) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Monthly limit of ${limit} reached. Resets on the 1st of next month.`
      );
    }
    const payload = {
      [usageField]: current + 1,
      [monthField]: currentMonth,
    };
    if (snap.exists) {
      tx.update(userRef, payload);
    } else {
      tx.set(userRef, payload, { merge: true });
    }
  });
}

export async function enforceScriptTrial(uid: string, plan: string): Promise<void> {
  return enforceTrialOrUsage(uid, plan, 'script');
}

export async function enforceRepurposingTrial(uid: string, plan: string): Promise<void> {
  return enforceTrialOrUsage(uid, plan, 'repurposing');
}
