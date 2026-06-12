# PublishKit Security Model

> Last updated: 2026-06-12 — covers production state through Pass 6 (Dependency Security Audit).

This document is the single source of truth for what PublishKit defends against, how, and what operational actions remain on the user's plate (dashboard toggles that can't be expressed in code).

---

## Threat Model

What we're explicitly defending against, ranked by financial impact:

| # | Threat | Severity | Status |
|---|---|---|---|
| 1 | A signed-in user removes their own usage limits and runs up an unbounded Gemini bill | CRITICAL | **CLOSED** — all plan/usage fields admin-SDK-only; client write rules use `diff().affectedKeys()` |
| 2 | A signed-in user bursts requests in seconds to exhaust daily Gemini quota / DoS other users | CRITICAL | **CLOSED** — sliding-window burst rate limit (Free 2/min, Pro 8/min, Max 20/min) |
| 3 | A malicious client tampers with the Razorpay subscription to fake a Pro/Max plan | CRITICAL | **CLOSED** — webhook HMAC verified with `crypto.timingSafeEqual`; plan-allowlist; UID-regex; subId match on cancel; event-ID dedup; **Pass 5: verifiedPlan fetch from Razorpay API blocks client-side plan spoofing** |
| 4 | Anonymous spam — bots create thousands of free guest sessions | HIGH | **CLOSED** — per-fingerprint + per-IP quota; VPN/proxy header detection blocks the easy cases |
| 5 | Concurrent-request race lets a user consume more than their plan | HIGH | **CLOSED** — all rate limits run inside `db.runTransaction`; **Pass 5: Webhook dedup now transactionally atomic** |
| 6 | API keys leak to git / public bundle | HIGH | **CLOSED** — all secrets in Firebase Secret Manager; git history scanned clean; `.gitignore` hardened with temp-file patterns |
| 7 | Prompt injection / oversized input drives up Gemini token cost | MEDIUM | **CLOSED** — `topic` capped at 500 chars (handleScript); `title` 500, `description` 2000 (handleRepurposing); control chars stripped |
| 8 | XSS / clickjacking via malicious script injection | MEDIUM | **CLOSED** — CSP header on Firebase Hosting; `X-Frame-Options: DENY`; React auto-escapes |
| 9 | Multi-account abuse — same IP creates many Google accounts | MEDIUM | **CLOSED** — per-IP monthly quota (`ipUsage/{ipHash}`); fingerprint dedup |
| 10 | Webhook replay attack | MEDIUM | **CLOSED** — `x-razorpay-event-id` dedup table; **Pass 5: Transactional deduplication check** |
| 11 | Path traversal via crafted filename in upload | LOW | **CLOSED** — Storage rules use single-segment `{fileName}` pattern; **Pass 5: processAudio enforces path ownership (`users/{uid}/` prefix)** |
| 12 | Direct origin IP exposed to DDoS | LOW | **PASS** — hosted on Firebase Hosting + Cloud Functions behind Google's edge network |
| 13 | IDOR: Accessing other users' files | CRITICAL | **CLOSED** — Pass 5: `processAudio` enforces storagePath ownership before worker download |

---

## Vibe Coding 7-point Checklist — Pass 6 results

Run on 2026-06-12 against the production codebase.

| # | Check | State |
|---|---|---|
| 1 | Hardcoded secrets in tracked files | **PASS** — grep returns 0 hits. |
| 2 | XSS / SQL/NoSQL injection | **PASS** — all Firestore interpolations use trusted auth UID; `processAudio` enforces path ownership. |
| 3 | Rate limiting on AI endpoints | **PASS** — burst limit + monthly quota + IP cap active on all callables. |
| 4 | Auth architecture (no custom session / password hashing) | **PASS** — Firebase Auth only. |
| 5 | API versioning | **PASS** — Convention adopted (`functionNameV2`). |
| 6 | File upload security (MIME, size, path traversal) | **PASS** — Storage rules + frontend sanitization + **Pass 5 backend path ownership check**. |
| 7 | Dependency check | **PASS** — `npm audit fix` in root and `functions/` on 2026-06-12 resolved 11 vulnerabilities. |

---

## Controls in Place

### 1. Authentication & Authorization

| Control | Implementation |
|---|---|
| Google OAuth (primary) | Firebase Authentication, popup + redirect fallback |
| Anonymous sessions (free trial) | Firebase anonymous auth, 1 use per fingerprint+IP via `verifyWhitelist` |
| Backend auth check | Every callable: `if (!context.auth) throw 'unauthenticated'` |
| App Check (anti-bot) | reCAPTCHA Enterprise; every callable: `if (!context.app) throw 'failed-precondition'` |
| Webhook auth | HMAC-SHA256 + `crypto.timingSafeEqual` constant-time comparison |
| Per-user isolation | Firestore rules + Storage rules enforce `request.auth.uid == uid` on every read/write |

### 2. Rate Limiting (defense-in-depth, three layers)

| Layer | Window | Free | Pro | Max | Implementation |
|---|---|---|---|---|---|
| **Burst** | 60 seconds | 2 | 8 | 20 | `enforceBurstLimit` — sliding-window ring buffer in Firestore transaction |
| **Per-IP monthly** | calendar month | 150 (shared across all UIDs on that IP hash) | same | same | `enforceRateLimit` IP path |
| **Per-UID monthly (metadata)** | calendar month | 10 | 100 | 1000 | `enforceRateLimit` UID path |
| **Per-UID monthly (Script Writer)** | calendar month | 10 | 100 | 1000 | `enforceScriptTrial` |
| **Per-UID monthly (MultiPost)** | calendar month | 10 | 100 | 1000 | `enforceRepurposingTrial` — charges 1 per selected platform |
| **GCP quota (account-wide)** | calendar day | 8,000 Gemini 2.5 Flash requests/day | same | same | Set in GCP Console → Quotas (caps billing exposure at ~₹6,000/month) |

The burst limit is the new layer in Hardening Pass 3. Without it, a Max user could fire 1000 requests in 60 seconds and DoS the entire daily Gemini quota for everyone. With it, the worst case is `20 × 60min × 24h = 28,800/day` — well above the 8,000/day GCP cap.

### 3. Firestore Rules — Server-Managed Fields

All these fields are written **only** by Cloud Functions (Admin SDK bypasses rules). Client writes are blocked via `request.resource.data.diff(resource.data).affectedKeys().hasAny([...])`:

- `plan`, `planExpiry`, `razorpaySubscriptionId`
- `scriptUsageThisMonth`, `repurposingUsageThisMonth`, `scriptUsageMonth`, `repurposingUsageMonth`
- `scriptTrialLastUsedAt`, `repurposingTrialLastUsedAt` (legacy, retained for back-compat)

Server-only collections (no client read/write):
- `/config/*` — whitelist + feature flags
- `/ipUsage/*` — IP-hash monthly counters
- `/webhookEvents/*` — Razorpay event-ID dedup table (admin-only)
- `/users/{uid}/usage/*` — write-locked (read OK for UI counter)
- `/users/{uid}/rateLimit/burst` — write-locked (inherits from `users/{uid}/{document=**}` block)

### 4. Storage Rules

- 200 MB max file size
- MIME type allowlist: `audio/*`, `application/pdf`, `image/jpeg|png|webp`
- Per-user paths: `users/{uid}/uploads/*` and `users/{uid}/audio/*` — caller's auth UID must match
- Auto-delete after 3 hours (scheduled `deleteOldAudio` Cloud Function)

### 5. Razorpay Billing Path

| Control | Where |
|---|---|
| Plan IDs hardcoded server-side | `handlePayment.ts:PLAN_IDS` — client cannot fake the price |
| Subscription ID validated as Razorpay-shaped string | `FIREBASE_UID_REGEX` for UID + structural check on `subId` |
| HMAC signature constant-time | `safeEqual()` wraps `crypto.timingSafeEqual` |
| Plan whitelist on webhook write | `ALLOWED_PLANS = {'pro', 'ultra'}` |
| Duplicate-subscription block | `createSubscription` refuses if `razorpaySubscriptionId` already set on user doc |
| Stale cancel-event filter | Cancel only reverts plan if `subId` matches the stored value |
| Event-ID idempotency | `webhookEvents/{x-razorpay-event-id}` doc as dedup key |
| Generic client error messages | Never echo raw upstream errors |
| Secrets in Secret Manager | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |

### 6. Input Validation (anti-prompt-injection + cost burn)

| Field | Cap | Sanitization | File |
|---|---|---|---|
| `topic` (handleScript) | 500 chars | trim | `handleScript.ts` |
| `title` (handleRepurposing) | 500 chars | trim + strip control chars (`\x00–\x1F` except `\n` `\t`) | `handleRepurposing.ts` |
| `description` (handleRepurposing) | 2000 chars | trim + strip control chars | `handleRepurposing.ts` |
| `platforms` (handleRepurposing) | allowlist: `['x', 'instagram', 'linkedin']` | array filter | `handleRepurposing.ts` |
| `resultId` (handleRepurposing) | regex `^[A-Za-z0-9_-]{1,128}$` | reject if mismatch | `handleRepurposing.ts` |
| `language` (all 3 callables) | `VALID_LANGUAGES` set of 13 | `coerceLanguage()` falls back to English | `lib/languages.ts` |
| `plan` (createSubscription) | `['pro', 'ultra']` whitelist | strict equality | `handlePayment.ts` |
| File MIME type | Storage rules allowlist | Storage rejects at upload | `storage.rules` |
| File size | 200 MB | Storage rules | `storage.rules` |

The language directive (`strongLanguageDirective`) is placed **after** user-controlled text in every Gemini prompt. This is a structural anti-prompt-injection invariant — do not refactor it to come first.

### 7. HTTP Headers (Firebase Hosting)

Set in `firebase.json` headers section, applied to all responses:

- `Content-Security-Policy` — restricts script-src / connect-src / frame-src / etc. to known Firebase, Google, and Razorpay origins
- `X-Frame-Options: DENY` — blocks clickjacking
- `X-Content-Type-Options: nosniff` — blocks MIME confusion
- `Referrer-Policy: no-referrer-when-downgrade`
- `Strict-Transport-Security` — forces HTTPS via Firebase Hosting default

### 8. Cost Caps (defense-in-depth budget protection)

Even if every other control above failed, these mathematically bound how much money an attacker can cost us:

1. **GCP Gemini API daily quota: 8,000 requests/day** → max ~₹600/day in Gemini costs (set in GCP Console)
2. **GCP Billing alert: ₹1,000 / month** → email notification trips long before catastrophic
3. **Razorpay subscription model** → revenue capped per plan, no spike via API abuse

---

## What This Repo Does NOT Defend Against (out of scope)

- **Compromised user device** — if attacker has root on the user's phone, our web app has no RASP / TEE / Play Integrity equivalent. Banking-grade protections like attestation via Google Play Integrity API or Apple DeviceCheck apply to native apps, not browser apps. The equivalent layer for web is App Check + reCAPTCHA Enterprise — present and enforced.
- **Compromised Firebase project** — if a Firebase admin's Google account is breached, all bets are off. Mitigation is at the Google account level: 2FA + hardware security key on the Firebase project owner account.
- **Compromised Razorpay account** — same. Mitigation is at the Razorpay dashboard: strong password + 2FA + restricted IP allowlist for dashboard access.
- **Compromised GitHub account** — branch protection on `main` + 2FA on the GitHub account is the recommended setup (see Operational Checklist).
- **Supply chain attack on npm packages** — partially mitigated: lockfiles committed, `npm audit` clean, no install scripts in our direct deps. Cannot fully eliminate.

---

## Operational Checklist (dashboard actions, not code)

These items can't be expressed in repo code. They must be verified periodically by the project owner.

### Quarterly (every 3 months)
- [ ] Run `npm audit` in both root and `functions/` — fix all HIGHs
- [ ] Run gstack `/cso` skill or equivalent (manual checklist below) over the full codebase
- [ ] Confirm Firebase App Check is set to **Enforce** (not just Unenforced/Monitor) for: `processAudio`, `generateScript`, `generateRepurposing`, `createSubscription`. Firebase Console → App Check → APIs.
- [ ] Confirm Gemini 2.5 Flash daily quota cap is still at 8,000/day. GCP Console → APIs → Generative Language API → Quotas.
- [ ] Confirm GCP budget alert at ₹1,000/month is active and routes to the right email.
- [ ] Rotate Razorpay live `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET`. Run the file-based rotation flow documented in README → "Run Locally → Razorpay Setup".
- [ ] Confirm GitHub branch protection on `main`: require PR review, require status checks, restrict force-push. GitHub → Settings → Branches.
- [ ] Confirm GitHub secret scanning + push protection is enabled. GitHub → Settings → Code security.
- [ ] Review Firebase Authentication users list for anomalies (mass-signups).

### Monthly
- [ ] Check Cloud Functions logs for unusual `resource-exhausted` patterns (could indicate attempted abuse).
- [ ] Check Razorpay dashboard for failed-payment patterns (could indicate carding attempts).
- [ ] Verify the Razorpay live webhook is still registered at the correct Cloud Function URL and includes `subscription.activated/charged/cancelled/completed` events.

### After every prod deploy
- [ ] Verify the deployed Cloud Function version is using the **latest** secret version (`firebase functions:secrets:access RAZORPAY_KEY_SECRET` → confirm length is correct).
- [ ] Smoke test: hit `/pricing` as a fresh user, confirm Upgrade modal opens with the correct branded plan name + amount.

### One-time setup (do once if not already done)
- [ ] Razorpay → Settings → Account Settings → enable 2FA on the dashboard owner account
- [ ] Firebase / GCP → enable 2FA on the project owner Google account; ideally hardware security key
- [ ] GitHub → enable 2FA on `ravishankaraiofficial` account
- [ ] Set up a `security@` or recovery email distinct from the day-to-day email

---

## Incident Response Runbook

### "I think someone is abusing the API"

1. Open Cloud Functions logs (`firebase functions:log`) — filter by `resource-exhausted` and look for repeated rejections from same UID.
2. Open Firestore Console → `users/{suspected-uid}` → check `scriptUsageThisMonth`, `repurposingUsageThisMonth`, and `rateLimit/burst` doc — sanity-check the timestamps.
3. To kill a specific abuser fast: manually set their plan to a non-existent value (e.g., `plan: "suspended"`). Their next call hits the default-free path AND the `coerceLanguage`/plan map returns 0 limits.
4. Long-term: ban the user via Firebase Auth → delete user. Their UID can't be reused.

### "Razorpay webhook is failing"

1. Check `firebase functions:log --only razorpayWebhook` for the error.
2. Common: `Invalid signature` → the `RAZORPAY_WEBHOOK_SECRET` in Firebase doesn't match the one registered on Razorpay dashboard. Re-set it using the file-based flow.
3. Less common: `400 Missing signature` → Razorpay didn't send the header. Could be a test ping. Confirm in Razorpay dashboard → Webhooks → Recent Deliveries.

### "I leaked a secret in a commit"

1. **Immediately rotate** the secret on the provider dashboard (Razorpay, Firebase, GCP). The committed value is now worthless.
2. Update the rotated secret in Firebase Secret Manager: `firebase functions:secrets:set <NAME>`.
3. Redeploy: `firebase deploy --only functions`.
4. Force-push to scrub the commit from history? Generally NOT recommended — anyone who cloned in the window has it anyway. The rotation is what matters.
5. Audit: `git log --all -p -S "<leaked-string>"` to find every commit that contained it, document for incident report.

### "My GitHub account got compromised"

1. From a safe device: GitHub → Settings → Sessions → Sign out everywhere
2. Reset password + force 2FA reset.
3. Audit: GitHub → Settings → Security log → look for unusual activity (force-push, new SSH keys added, new PATs created)
4. Rotate all secrets that were ever accessible from the device.
5. If `main` was force-pushed: `git log --reflog` from your local clone can recover. Compare to GitHub's commit history.

---

## Change Log

| Date | Pass | Commit | Summary |
|---|---|---|---|
| 2026-05-14 | Hardening Pass 1 | | Atomic rate limit, ipUsage lock, anonymous-spam block, CSP header, secret-manager |
| 2026-05-18 | Hardening Pass 2 | `fb8a8ff` | Razorpay timing-safe HMAC, plan-allowlist, UID-regex, duplicate-subscription block, stale-cancel filter |
| 2026-05-18 | Hardening Pass 3 | `50e275c` | Burst rate limit, webhook event-ID idempotency, prompt-injection caps |
| 2026-05-18 | Hardening Pass 4 | | Frontend filename sanitization, `brace-expansion` fix |
| 2026-05-21 | Hardening Pass 5 | `7f88443` | **CRITICAL: Payment bypass fixed** (fetch verifiedPlan from Razorpay API). **CRITICAL: IDOR fixed** (enforce path ownership in `processAudio`). **MODERATE: Webhook race fixed** (transactional dedup). **MODERATE: protobufjs fix** (npm audit). |
| 2026-06-12 | Hardening Pass 6 | | **CRITICAL: Dependency Security Audit**. Patched 3 high-severity frontend and 8 moderate/high severity backend CVEs via `npm audit fix`. Confirmed structural immunity against CBSE-style architectural hacks (IDOR, exposed master keys, client-side OTP validation). |

---

*Maintained alongside [README.md](README.md). When you change a control here, update README too. If a SECURITY.md row says "CLOSED" but the corresponding code doesn't enforce it, that's a critical bug — open an issue immediately.*
