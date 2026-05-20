# PublishKit — Test & Deploy Checklist (post-fixes)

This sweep delivered 6 fixes + i18n. Before letting real users hit it, walk
through the steps below in order. Anything marked **STOP** must pass before
moving on.

---

## 1. Razorpay test-mode end-to-end

Razorpay sandbox lives at the same `api.razorpay.com` — what changes is your
keys. Don't run this in production until every line below is green.

### 1a. Switch the project to test keys

```powershell
# In the functions/ directory
firebase functions:secrets:set RAZORPAY_KEY_ID
# When prompted, paste your TEST key id (starts with rzp_test_)

firebase functions:secrets:set RAZORPAY_KEY_SECRET
# Paste the TEST key secret

firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
# Paste the TEST webhook secret from Razorpay → Settings → Webhooks
```

After setting, **redeploy** so the new secret versions are picked up:

```powershell
firebase deploy --only functions:createOrder,functions:verifyOrderPayment,functions:createSubscription,functions:razorpayWebhook,functions:expireOneTimePlans
```

### 1b. Create test plans in the Razorpay test dashboard

The subscription path needs plan IDs. The hardcoded ones in
`functions/src/handlePayment.ts` are **live-mode** plan IDs and will not
work with test keys. Either:

- Option A (recommended): introduce a `PLAN_IDS_TEST` map and gate by `NODE_ENV` / env-var.
- Option B (quick): temporarily swap in test plan IDs while testing, then revert.

For the **one-time order path** (Fix 3), no plan IDs are needed — `/v1/orders`
takes a raw amount, so it works against test keys as-is.

### 1c. One-time order test (the new path)

1. Open the deployed site, sign in with a test Google account.
2. Go to **Pricing**.
3. Confirm the "One month only" toggle is selected by default.
4. Click **Upgrade** on the Pro card.
5. Razorpay popup should open with **no autopay mandate prompt**.
6. Pay with Razorpay's [test UPI VPA](https://razorpay.com/docs/payments/payments/test-card-details/#upi) `success@razorpay`.
7. Wait for "Payment verified! Your plan is active for 30 days."
8. **Firestore check**: `users/{uid}` should have:
   - `plan: 'pro'`
   - `planType: 'one_time'`
   - `planExpiresAt: <ISO date, ~30 days out>`
   - `razorpayLastOrderId`, `razorpayLastPaymentId` populated
   - `razorpaySubscriptionId` absent
9. **STOP** if any of those fields are missing — check the Functions logs for `[verifyOrderPayment]`.

### 1d. Subscription test (existing path, should still work)

1. Same as above but switch the toggle to "Auto-pay (recurring)".
2. Pay with test card `4111 1111 1111 1111`, any future expiry, CVV `123`.
3. Razorpay should prompt for autopay mandate setup.
4. **Firestore check**: `users/{uid}` should have `razorpaySubscriptionId`
   set and `planType` should be **absent or not `one_time`**.

### 1e. Webhook verification

- In the Razorpay test dashboard → Settings → Webhooks, point a test webhook
  at `https://<your-region>-<project>.cloudfunctions.net/razorpayWebhook`.
- Trigger a test `payment.captured` event. The webhook handler should
  return 200 and (for one-time orders) write the same fields as
  `verifyOrderPayment`. Test by deleting the user's plan fields manually,
  then resending the same webhook event — it should re-grant.

### 1f. Expiry sweep

To verify the daily downgrade job works:

1. In Firestore, manually set a test user's `planExpiresAt` to yesterday's ISO date.
2. From a shell with `firebase` CLI:
   ```powershell
   gcloud scheduler jobs run firebase-schedule-expireOneTimePlans --location=asia-south1
   ```
   (Replace location with whatever region your scheduler is in — find it in the GCP console.)
3. Check Functions logs for `[expireOneTimePlans] Downgraded 1 users`.
4. Verify the user's `plan` is now `'free'` and `planType` / `planExpiresAt` are removed.

---

## 2. Anti-abuse free-tier guard test

1. Sign in as a fresh Google account A on your browser.
2. Run **one** Script Writer / MultiPost generation.
3. Sign out, clear browser history, cookies, and localStorage.
4. Sign in as a **different** Google account B from the same browser.
5. Try to generate again. **Expected**: HttpsError "Free tier already used on this device."
6. **Firestore check**: `freeTierUsage_fp/{hash}` should have `uids` array with both UIDs… wait, no — that's a bug. The guard blocks adding the 2nd uid, so `uids.length` stays at 1. ✓ correct behavior.
7. To verify IP-only path (if Brave / fingerprint-blocking browser): repeat with FingerprintJS disabled. The IP hash should still block.

### Known limitation
VPN + different browser bypasses both layers. This is documented in the
plan as acceptable; phone OTP is the only true defense and is left as a
future upgrade.

---

## 3. Settings validation test

1. Open **Settings**.
2. Type `asdfgh` in **Positioning** → click Save.
3. **Expected**: "Please write this properly so we can generate good scripts for you."
4. Type `@my.channel.123` in **YouTube handle** → save should succeed (handle field is exempt).
5. Type `aaaaaaaa` in **Niche** → should fail validation.
6. Type a real value like `Building AI products for Indian creators` → save succeeds.

---

## 4. i18n language bar test

1. Open the site on mobile or desktop.
2. Below the navbar, the language chip bar should be visible with all 13 languages.
3. Click "हिन्दी" — confirm navbar labels and ScriptWriter labels switch to Hindi.
4. Click "اردو" (Urdu) — text should render right-to-left visually in those chips that have it (note: full RTL layout for Urdu/Arabic was NOT part of this sweep — strings translate but layout direction stays LTR).
5. Refresh — selected language should persist (localStorage).
6. Sign in on a different browser — `profile.uiLanguage` should sync and the language bar should reflect the choice (UiLanguageSync).

---

## 5. Model routing test (Pro for Max users)

In Firestore, manually set a test user's `plan` to `'ultra'`.

1. Have that user generate a Script. Check the Functions logs — it should not error out on Pro model usage.
2. Compare quality vs a Free user's script on the same topic (subjective — Pro tends to produce more polished hooks).
3. Have the same user generate a MultiPost. The logs should show Flash still being used (Max only gets Pro on Script).

---

## 6. Mobile dropdown test

1. Open Chrome DevTools → device toolbar → set width to 360px (iPhone SE).
2. Navigate to **Script Writer**.
3. Tap the Language dropdown.
4. The native iOS/Android picker overlay should appear fully on-screen with no horizontal scroll on the trigger itself.

---

## 7. Build & deploy

After all the above pass:

```powershell
# 1. Compile functions
cd "D:\Project\Project 01\Google Antigravity Files\functions"
npm run build

# 2. Build frontend
cd ..
npm run build

# 3. Deploy in two stages — functions first (so the frontend has its new
#    callables available), then hosting.
firebase deploy --only functions

# Verify in the Firebase console → Functions that these now exist:
#   - createOrder
#   - verifyOrderPayment
#   - expireOneTimePlans
#   (createSubscription and razorpayWebhook should also still be present.)

# 4. Then hosting:
firebase deploy --only hosting
```

**STOP** if `firebase deploy --only functions` reports an error on the new
exports. Fix the error before running `--only hosting` — otherwise the
frontend will call functions that don't exist.

---

## 8. Switch back to live Razorpay keys (final step)

After test-mode passes:

```powershell
firebase functions:secrets:set RAZORPAY_KEY_ID         # paste LIVE key id
firebase functions:secrets:set RAZORPAY_KEY_SECRET     # paste LIVE secret
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET # paste LIVE webhook secret

# If you swapped plan IDs in 1b option B, revert them.

firebase deploy --only functions
```

Smoke-test one real ₹299 Pro one-time payment from your own account. Refund
yourself afterwards from the Razorpay dashboard.

---

## 9. Open follow-ups (not blocking deploy)

Already noted in our chat but listing here for completeness:

- **Wrap remaining UI strings in `t()`** across History, Feedback, Login,
  AccessPending, SetupProfile, Home — purely mechanical. The system already
  falls back to English for any unwrapped string.
- **Full RTL layout for Urdu** — would require `dir="rtl"` on the body when
  `lang === 'Urdu'`. Add to `UiLanguageSync.tsx` if you want this.
- **Pricing card body translations** — feature bullet labels in `Pricing.tsx`
  are still English literals. Wrap when you have translated copy.
- **Razorpay subscription test-mode plan IDs** — see 1b option A.
