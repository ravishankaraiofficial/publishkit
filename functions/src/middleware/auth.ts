import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db } from '../lib/firestore';

export async function verifyWhitelist(context: functions.https.CallableContext) {
  const email = context.auth?.token?.email;

  // Any real Google-authenticated user (has an email) gets unlimited access.
  // Only anonymous / unauthenticated callers are subject to the guest quota.
  if (email) {
    return true;
  }

  // Anonymous user — enforce per-UID quota: exactly 1 free session per guest.
  // We use the Firebase anonymous UID (stable for the session) as the key.
  const guestId = context.auth?.uid || context.rawRequest.ip || 'unknown-guest';
  const guestRef = db.collection('guestUsage').doc(guestId.replace(/\//g, '_'));

  const guestDoc = await guestRef.get();
  if (guestDoc.exists) {
    const guestUses = guestDoc.data()?.uses || 0;
    if (guestUses >= 1) {
      throw new functions.https.HttpsError('resource-exhausted', 'Guest quota exceeded. Please sign up for full access.');
    }
    await guestRef.update({ uses: admin.firestore.FieldValue.increment(1) });
  } else {
    await guestRef.set({ uses: 1 });
  }

  return true;
}
