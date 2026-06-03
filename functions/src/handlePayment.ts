import * as functions from 'firebase-functions/v1';
import { defineSecret } from 'firebase-functions/params';
import { FieldValue } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import https from 'https';
import { db } from './lib/firestore';

const razorpayKeyId = defineSecret('RAZORPAY_KEY_ID');
const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');
const razorpayWebhookSecret = defineSecret('RAZORPAY_WEBHOOK_SECRET');

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

// ────────────────────────────────────────────────────────────────────────────
// One-time order flow (no autopay/mandate)
// ────────────────────────────────────────────────────────────────────────────
//
// Indian users routinely abandon checkout when Razorpay forces an e-mandate
// setup before charging. The createOrder + verifyOrderPayment pair below
// gives them a "pay once for 30 days" path that works with plain UPI/QR/cards
// and does not enrol them in autopay.
//
// Prices live server-side — never trust client input on amount.
const ONE_TIME_PRICE_PAISE: Record<string, number> = {
  pro: 29900,    // ₹299
  ultra: 100000, // ₹1,000
};

const ONE_TIME_DAYS = 30;

export const createOrder = functions
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

      // Block stacking one-time payments on top of an active subscription —
      // mirrors the createSubscription guard.
      const existingDoc = await db.doc(`users/${context.auth.uid}`).get();
      const existingSubId = existingDoc.data()?.razorpaySubscriptionId;
      if (existingSubId) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'You already have an active subscription. Cancel it before paying separately.'
        );
      }

      const keyId = razorpayKeyId.value();
      const keySecret = razorpayKeySecret.value();
      const amount = ONE_TIME_PRICE_PAISE[plan];

      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      // Receipt is a free-form short string Razorpay echoes back; cap to 40 chars.
      const receipt = `pk_${context.auth.uid.slice(0, 16)}_${Date.now()}`.slice(0, 40);
      const postData = JSON.stringify({
        amount,
        currency: 'INR',
        receipt,
        notes: {
          uid: context.auth.uid,
          plan,
          type: 'one_time',
        },
      });

      const options = {
        hostname: 'api.razorpay.com',
        path: '/v1/orders',
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const order: any = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let chunks = '';
          res.on('data', (c) => (chunks += c));
          res.on('end', () => {
            if (res.statusCode === 200 || res.statusCode === 201) resolve(JSON.parse(chunks));
            else reject(new Error(`Razorpay /orders returned ${res.statusCode}: ${chunks}`));
          });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
      });

      return {
        orderId: order.id,
        keyId,
        amount,
        currency: 'INR',
      };
    } catch (error: any) {
      console.error('[createOrder] error:', error?.message || String(error));
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError('internal', 'Failed to create order. Please try again.');
    }
  });

// Verify a Razorpay checkout payment signature, then grant 30 days of access.
// Razorpay's docs: the signature is HMAC-SHA256(order_id + "|" + payment_id,
// key_secret). We verify here (not just in the webhook) so the client can
// confirm success synchronously and route the user without waiting.
export const verifyOrderPayment = functions
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

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = data || {};
      if (
        typeof razorpay_order_id !== 'string' ||
        typeof razorpay_payment_id !== 'string' ||
        typeof razorpay_signature !== 'string' ||
        typeof plan !== 'string' ||
        !['pro', 'ultra'].includes(plan)
      ) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid fields');
      }

      const expected = crypto
        .createHmac('sha256', razorpayKeySecret.value())
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      // Constant-time compare — never use !== on signatures.
      const sigBuf = Buffer.from(razorpay_signature, 'hex');
      const expBuf = Buffer.from(expected, 'hex');
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        throw new functions.https.HttpsError('permission-denied', 'Invalid payment signature');
      }

      // SECURITY: verify the plan from the actual order notes on Razorpay.
      // Without this, a user could pay for 'pro' (299) and then spoof the 
      // verify call with plan: 'ultra' to get the 1000 plan.
      const auth = Buffer.from(`${razorpayKeyId.value()}:${razorpayKeySecret.value()}`).toString('base64');
      const orderOptions = {
        hostname: 'api.razorpay.com',
        path: `/v1/orders/${razorpay_order_id}`,
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      };

      const orderData: any = await new Promise((resolve, reject) => {
        const req = https.request(orderOptions, (res) => {
          let chunks = '';
          res.on('data', (c) => (chunks += c));
          res.on('end', () => {
            if (res.statusCode === 200) resolve(JSON.parse(chunks));
            else reject(new Error(`Razorpay /orders GET returned ${res.statusCode}`));
          });
        });
        req.on('error', reject);
        req.end();
      });

      const verifiedPlan = orderData?.notes?.plan;
      if (!verifiedPlan || !['pro', 'ultra'].includes(verifiedPlan)) {
        throw new functions.https.HttpsError('permission-denied', 'Invalid order metadata');
      }

      const orderUid = orderData?.notes?.uid;
      if (orderUid !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Order does not belong to this user');
      }

      const userRef = db.doc(`users/${context.auth.uid}`);
      const userDoc = await userRef.get();
      if (userDoc.exists && userDoc.data()?.razorpayLastOrderId === razorpay_order_id) {
        throw new functions.https.HttpsError('already-exists', 'This order has already been applied.');
      }

      const orderCreatedAt = orderData?.created_at ? orderData.created_at * 1000 : Date.now();
      const expiresAt = new Date(orderCreatedAt + ONE_TIME_DAYS * 24 * 60 * 60 * 1000);
      
      await userRef.set(
        {
          plan: verifiedPlan,
          planType: 'one_time',
          planExpiresAt: expiresAt.toISOString(),
          razorpayLastOrderId: razorpay_order_id,
          razorpayLastPaymentId: razorpay_payment_id,
          // Defensive: clear any stale subscription ID — this user is on the
          // one-time track now.
          razorpaySubscriptionId: FieldValue.delete(),
          usageCycleStart: new Date().toISOString(),
          metadataUsage: 0,
          scriptUsage: 0,
          repurposingUsage: 0,
        },
        { merge: true }
      );

      return { ok: true, plan, expiresAt: expiresAt.toISOString() };
    } catch (error: any) {
      console.error('[verifyOrderPayment] error:', error?.message || String(error));
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError('internal', 'Failed to verify payment.');
    }
  });

// Daily sweep — downgrade users whose one-time plan has expired.
// Subscription users are not touched; they're managed by the webhook.
export const expireOneTimePlans = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    const now = new Date().toISOString();
    const snap = await db
      .collection('users')
      .where('planType', '==', 'one_time')
      .where('planExpiresAt', '<=', now)
      .get();

    if (snap.empty) {
      console.log('[expireOneTimePlans] No expired one-time plans');
      return null;
    }

    const batch = db.batch();
    snap.forEach((doc) => {
      batch.set(
        doc.ref,
        {
          plan: 'free',
          planType: FieldValue.delete(),
          planExpiresAt: FieldValue.delete(),
        },
        { merge: true }
      );
    });
    await batch.commit();
    console.log(`[expireOneTimePlans] Downgraded ${snap.size} users`);
    return null;
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

      // Idempotency / replay protection. Razorpay sends a unique event ID per
      // delivery; their own retry mechanism reuses the same ID, and an
      // attacker who captured a valid signed payload would also reuse it.
      // We dedupe via Firestore doc webhookEvents/{eventId}. Admin-SDK-only
      // (firestore.rules denies client read/write on this collection).
      // Old entries are pruned by the scheduled cleanup function.
      const eventIdRaw = req.headers['x-razorpay-event-id'];
      const eventId = typeof eventIdRaw === 'string' ? eventIdRaw : '';
      if (eventId && /^[A-Za-z0-9_-]{1,128}$/.test(eventId)) {
        const eventRef = db.doc(`webhookEvents/${eventId}`);
        
        const alreadyProcessed = await db.runTransaction(async (tx) => {
          const eventDoc = await tx.get(eventRef);
          if (eventDoc.exists) return true;
          
          // Reserve the event ID before doing work.
          tx.set(eventRef, {
            processedAt: FieldValue.serverTimestamp(),
          });
          return false;
        });

        if (alreadyProcessed) {
          // Already processed — return 200 so Razorpay doesn't retry.
          res.status(200).send('OK');
          return;
        }
      }
      // If the header is missing/malformed we still process the event — better
      // to risk a duplicate write than to drop a real Razorpay delivery. The
      // existing subId-match check on cancel events catches stale replays anyway.

      const event = req.body.event;

      // ─── One-time order path: payment.captured for orders we created via
      // createOrder. Defense-in-depth: verifyOrderPayment is the primary grant
      // path (synchronous, client-confirmed). This is the safety net in case
      // the client never calls verifyOrderPayment (network drop, tab close).
      if (event === 'payment.captured') {
        const payment = req.body.payload?.payment?.entity;
        const oUid = payment?.notes?.uid;
        const oPlan = payment?.notes?.plan;
        const oType = payment?.notes?.type;
        if (
          oType === 'one_time' &&
          typeof oUid === 'string' &&
          FIREBASE_UID_REGEX.test(oUid) &&
          typeof oPlan === 'string' &&
          ALLOWED_PLANS.has(oPlan)
        ) {
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await db.doc(`users/${oUid}`).set(
            {
              plan: oPlan,
              planType: 'one_time',
              planExpiresAt: expiresAt.toISOString(),
              razorpayLastPaymentId: payment.id,
              razorpaySubscriptionId: FieldValue.delete(),
              usageCycleStart: new Date().toISOString(),
              metadataUsage: 0,
              scriptUsage: 0,
              repurposingUsage: 0,
            },
            { merge: true }
          );
        }
        res.status(200).send('OK');
        return;
      }

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
          usageCycleStart: new Date().toISOString(),
          metadataUsage: 0,
          scriptUsage: 0,
          repurposingUsage: 0,
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
            planExpiry: FieldValue.delete(),
            razorpaySubscriptionId: FieldValue.delete(),
          }, { merge: true });
        }
      }

      res.status(200).send('OK');
    } catch (error: any) {
      console.error('[razorpayWebhook] error:', error?.message || String(error));
      res.status(500).send('Internal error');
    }
  });
