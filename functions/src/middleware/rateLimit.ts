import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { db } from '../lib/firestore';

const MAX_PER_UID_PER_DAY = 10;
const MAX_PER_IP_PER_DAY = 30;

/**
 * Atomically enforces both UID-based and IP-based daily rate limits.
 * Both checks and increments happen inside a single Firestore transaction,
 * eliminating TOCTOU race conditions. Throws HttpsError if either limit is reached.
 */
export async function enforceRateLimit(uid: string, rawIp: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const uidRef = db.doc(`users/${uid}/usage/${today}`);

  // Hash the raw IP for the ipUsage collection key
  const ipHash = crypto.createHash('sha256').update(rawIp).digest('hex');
  const ipRef = db.doc(`ipUsage/${ipHash}/daily/${today}`);

  await db.runTransaction(async (tx) => {
    // Read both documents inside the transaction
    const [uidDoc, ipDoc] = await Promise.all([tx.get(uidRef), tx.get(ipRef)]);

    const uidCount = uidDoc.exists ? (uidDoc.data()?.count ?? 0) : 0;
    const ipCount = ipDoc.exists ? (ipDoc.data()?.count ?? 0) : 0;

    // Check per-UID limit
    if (uidCount >= MAX_PER_UID_PER_DAY || ipCount >= MAX_PER_IP_PER_DAY) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Daily limit reached. Try again tomorrow.'
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
