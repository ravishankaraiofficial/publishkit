import * as functions from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import https from 'https';

const razorpayKeyId = defineSecret('RAZORPAY_KEY_ID');
const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');
const razorpayWebhookSecret = defineSecret('RAZORPAY_WEBHOOK_SECRET');

const db = admin.firestore();

// Live-mode plan IDs (Razorpay dashboard → Subscriptions → Plans).
// 'ultra' is the internal plan key — surfaces as "PublishKit Max" to customers.
// Last rebound to latest secret versions: 2026-05-18.
const PLAN_IDS: Record<string, string> = {
  pro: 'plan_Spz2M0sp8rv1SA',
  ultra: 'plan_SqU3YCU38LA6aw',
};

export const createSubscription = functions
  .runWith({ secrets: [razorpayKeyId, razorpayKeySecret] })
  .https.onCall(async (data, context) => {
    try {
      if (!context.app) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'The function must be called from an App Check verified app.'
        );
      }

      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { plan } = data;
      if (!['pro', 'ultra'].includes(plan)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid plan: must be "pro" or "ultra"');
      }

      // Defense-in-depth: refuse to create a second active subscription. Without
      // this, a Pro user could click "Upgrade" on Max and end up paying for BOTH
      // plans (Razorpay creates the second subscription happily; webhook would
      // overwrite the user's plan field but the first subscription keeps billing).
      const existingDoc = await db.doc(`users/${context.auth.uid}`).get();
      const existingSubId = existingDoc.data()?.razorpaySubscriptionId;
      if (existingSubId) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'You already have an active subscription. Cancel it on the Pricing page before upgrading.'
        );
      }

      const keyId = razorpayKeyId.value();
      const keySecret = razorpayKeySecret.value();

      console.log('[createSubscription] Plan:', plan);

      // Make direct HTTPS call to Razorpay API (bypassing SDK)
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const postData = JSON.stringify({
        plan_id: PLAN_IDS[plan],
        customer_notify: 1,
        quantity: 1,
        total_count: 12,
        notes: {
          uid: context.auth.uid,
          plan,
        },
      });

      const options = {
        hostname: 'api.razorpay.com',
        path: '/v1/subscriptions',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      console.log('[createSubscription] Calling Razorpay API directly...');
      const subscription = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 201 || res.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`Razorpay API returned ${res.statusCode}: ${data}`));
            }
          });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
      });

      const sub = subscription as any;
      console.log('[createSubscription] Success! Subscription ID:', sub.id);
      return {
        subscriptionId: sub.id,
        keyId: keyId,
      };
    } catch (error: any) {
      // Log just the safe summary. Full error objects can include response
      // bodies, headers, and internal stack traces — keep them out of logs.
      console.error('[createSubscription] error:', error?.message || String(error));
      if (error instanceof functions.https.HttpsError) throw error;
      // Never echo raw upstream errors to the client — they can contain API
      // implementation details. Return a generic message; full diagnosis is in logs.
      throw new functions.https.HttpsError('internal', 'Failed to create subscription. Please try again.');
    }
  });

// Plan values the webhook is allowed to set on a user doc. Anything else is
// dropped before the Firestore write. Defense-in-depth: if Razorpay's
// notes.plan ever returned something unexpected (or were tampered with),
// we won't blindly write it.
const ALLOWED_PLANS = new Set(['pro', 'ultra']);

// Firebase Auth UIDs are 28-character alphanumerics. Validating the shape
// prevents the webhook from writing to /users/<weird-path-with-slashes>
// even in the theoretical case where notes.uid got corrupted upstream.
const FIREBASE_UID_REGEX = /^[A-Za-z0-9]{20,128}$/;

/**
 * Constant-time string comparison wrapping crypto.timingSafeEqual.
 * Required for any secret/HMAC comparison — using `!==` leaks signature
 * bytes to attackers via response-time differences (textbook side channel).
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export const razorpayWebhook = functions
  .runWith({ secrets: [razorpayWebhookSecret] })
  .https.onRequest(async (req, res) => {
    try {
      const signature = req.headers['x-razorpay-signature'] as string | undefined;
      if (!signature || typeof signature !== 'string') {
        res.status(400).send('Missing signature');
        return;
      }

      const body = JSON.stringify(req.body);
      const expectedSig = crypto
        .createHmac('sha256', razorpayWebhookSecret.value())
        .update(body)
        .digest('hex');

      // CRITICAL: constant-time comparison. `signature !== expectedSig` is
      // vulnerable to timing attacks — an attacker can recover the HMAC
      // byte-by-byte by measuring response latency.
      if (!safeEqual(signature, expectedSig)) {
        res.status(400).send('Invalid signature');
        return;
      }

      const event = req.body.event;
      const subscription = req.body.payload?.subscription?.entity;
      const uid = subscription?.notes?.uid;
      const plan = subscription?.notes?.plan;
      const subId = subscription?.id;

      // Defense-in-depth input validation. notes.* come from Razorpay's
      // verified payload, but we still validate shape before any Firestore write.
      if (!uid || typeof uid !== 'string' || !FIREBASE_UID_REGEX.test(uid)) {
        res.status(200).send('OK');
        return;
      }
      if (!plan || typeof plan !== 'string' || !ALLOWED_PLANS.has(plan)) {
        // Activated/charged with unknown plan? Silently 200 — Razorpay will retry
        // and we don't want them disabling the webhook. But never write a
        // non-whitelisted plan value into the user doc.
        res.status(200).send('OK');
        return;
      }
      if (typeof subId !== 'string' || subId.length === 0) {
        res.status(200).send('OK');
        return;
      }

      const userRef = db.doc(`users/${uid}`);

      if (event === 'subscription.activated' || event === 'subscription.charged') {
        const nextBilling = subscription.charge_at
          ? new Date(subscription.charge_at * 1000)
          : new Date(Date.now() + 32 * 24 * 60 * 60 * 1000);

        await userRef.set({
          plan,
          planExpiry: nextBilling.toISOString(),
          razorpaySubscriptionId: subId,
        }, { merge: true });
      }

      if (event === 'subscription.cancelled' || event === 'subscription.completed') {
        // Defense-in-depth: only revert plan if the cancellation event refers
        // to the subscription currently attached to this user. Without this,
        // an old/stale cancellation event could downgrade a user who has
        // since started a fresh subscription.
        const userDoc = await userRef.get();
        const storedSubId = userDoc.data()?.razorpaySubscriptionId;
        if (storedSubId && storedSubId === subId) {
          await userRef.set({
            plan: 'free',
            planExpiry: admin.firestore.FieldValue.delete(),
            razorpaySubscriptionId: admin.firestore.FieldValue.delete(),
          }, { merge: true });
        }
      }

      res.status(200).send('OK');
    } catch (error: any) {
      console.error('[razorpayWebhook] error:', error?.message || String(error));
      res.status(500).send('Internal error');
    }
  });
