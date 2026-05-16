import * as functions from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import https from 'https';

const razorpayKeyId = defineSecret('RAZORPAY_KEY_ID');
const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');
const razorpayWebhookSecret = defineSecret('RAZORPAY_WEBHOOK_SECRET');

const db = admin.firestore();

const PLAN_IDS: Record<string, string> = {
  pro: 'plan_Sq0QRIV54nNTBX',
  ultra: 'plan_Sq0Qt7wEgb2XaA',
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

      const keyId = razorpayKeyId.value();
      const keySecret = razorpayKeySecret.value();

      console.log('[createSubscription] Plan:', plan);
      console.log('[createSubscription] Plan ID:', PLAN_IDS[plan]);
      console.log('[createSubscription] Key ID loaded:', keyId ? `${keyId.slice(0, 10)}...` : 'MISSING');
      console.log('[createSubscription] Key Secret loaded:', keySecret ? `length=${keySecret.length}` : 'MISSING');

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
      console.error('[createSubscription] ERROR caught:', error);
      console.error('[createSubscription] Error type:', typeof error);
      console.error('[createSubscription] Error toString:', error?.toString?.());
      console.error('[createSubscription] Error message:', error?.message);
      console.error('[createSubscription] Error code:', error?.code);
      console.error('[createSubscription] Error statusCode:', error?.statusCode);
      console.error('[createSubscription] Error response:', JSON.stringify(error?.response?.data));
      console.error('[createSubscription] Full error JSON:', JSON.stringify(error));
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError('internal', error?.message || error?.toString?.() || 'Failed to create subscription');
    }
  });

export const razorpayWebhook = functions
  .runWith({ secrets: [razorpayWebhookSecret] })
  .https.onRequest(async (req, res) => {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const body = JSON.stringify(req.body);

      const expectedSig = crypto
        .createHmac('sha256', razorpayWebhookSecret.value())
        .update(body)
        .digest('hex');

      if (signature !== expectedSig) {
        res.status(400).send('Invalid signature');
        return;
      }

      const event = req.body.event;
      const subscription = req.body.payload?.subscription?.entity;
      const uid = subscription?.notes?.uid;
      const plan = subscription?.notes?.plan;

      if (!uid || !plan) {
        res.status(200).send('OK');
        return;
      }

      if (event === 'subscription.activated' || event === 'subscription.charged') {
        const nextBilling = subscription.charge_at
          ? new Date(subscription.charge_at * 1000)
          : new Date(Date.now() + 32 * 24 * 60 * 60 * 1000);

        await db.doc(`users/${uid}`).update({
          plan,
          planExpiry: nextBilling.toISOString(),
          razorpaySubscriptionId: subscription.id,
        });
      }

      if (event === 'subscription.cancelled' || event === 'subscription.expired') {
        await db.doc(`users/${uid}`).update({
          plan: 'free',
          planExpiry: admin.firestore.FieldValue.delete(),
          razorpaySubscriptionId: admin.firestore.FieldValue.delete(),
        });
      }

      res.status(200).send('OK');
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(500).send('Internal error');
    }
  });
