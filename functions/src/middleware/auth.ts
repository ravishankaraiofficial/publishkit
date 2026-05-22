import * as functions from 'firebase-functions/v1';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../lib/firestore';

import * as crypto from 'crypto';

export async function verifyWhitelist(context: functions.https.CallableContext, fingerprint?: string) {
  const email = context.auth?.token?.email;

  // Any real Google-authenticated user (has an email) gets unlimited access.
  // Only anonymous / unauthenticated callers are subject to the guest quota.
  if (email) {
    return true;
  }

  // VPN Shield: Detect and block VPN/Proxy IPs for anonymous users only.
  const headers = context.rawRequest.headers;
  const isVpnOrProxy = 
    !!headers['via'] || 
    !!headers['proxy-connection'] ||
    (typeof headers['x-forwarded-for'] === 'string' && headers['x-forwarded-for'].includes(','));
  
  if (isVpnOrProxy) {
    throw new functions.https.HttpsError('permission-denied', 'VPNs and Proxies are not allowed for guest users.');
  }

  // Anonymous user — enforce per-UID quota: exactly 1 free session per guest.
  const rawIp = context.rawRequest.ip || 'unknown-ip';
  const rawFp = fingerprint || 'unknown-fp';
  const hash = crypto.createHash('sha256').update(`${rawIp}-${rawFp}`).digest('hex');
  const guestId = context.auth?.uid || hash;
  
  const guestRef = db.collection('guestUsage').doc(guestId.replace(/\//g, '_'));

  await db.runTransaction(async (transaction) => {
    const guestDoc = await transaction.get(guestRef);
    const guestUses = guestDoc.exists ? (guestDoc.data()?.uses || 0) : 0;

    if (guestUses >= 1) {
      throw new functions.https.HttpsError('resource-exhausted', 'Guest quota exceeded. Please sign up for full access.');
    }

    if (!guestDoc.exists) {
      transaction.set(guestRef, { uses: 1, firstUsedAt: FieldValue.serverTimestamp() });
    } else {
      transaction.update(guestRef, { uses: FieldValue.increment(1) });
    }
  });

  return true;
}
