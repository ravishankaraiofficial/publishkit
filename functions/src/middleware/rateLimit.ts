import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db } from '../lib/firestore';

const MAX_GENERATIONS_PER_DAY = 10;

export async function checkRateLimit(uid: string) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const usageRef = db.doc(`users/${uid}/usage/${today}`);

  const usageDoc = await usageRef.get();

  if (usageDoc.exists) {
    const data = usageDoc.data();
    if (data && data.count >= MAX_GENERATIONS_PER_DAY) {
      // Never expose the limit number to the client
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Daily limit reached. Try again tomorrow.'
      );
    }
  }

  return usageRef;
}

export async function incrementRateLimit(usageRef: admin.firestore.DocumentReference) {
  await usageRef.set(
    {
      count: admin.firestore.FieldValue.increment(1),
      lastRequest: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
