# PublishKit Security Model

> Last updated: 2026-05-18 — covers production state through commit `fb8a8ff` + Hardening Pass 3 (burst limit + webhook idempotency + input caps).

This document is the single source of truth for what PublishKit defends against, how, and what operational actions remain on the user's plate (dashboard toggles that can't be expressed in code).

It's structured so a new auditor / developer can read it once and understand the entire security posture.

---

## Threat Model

What we're explicitly defending against, ranked by financial impact:

| # | Threat | Severity | Status |
|---|---|---|---|
| 1 | A signed-in user removes their own usage limits and runs up an unbounded Gemini bill | CRITICAL | **CLOSED** — all plan/usage fields admin-SDK-only; client write rules use `diff().affectedKeys()` |
| 2 | A signed-in user bursts requests in seconds to exhaust daily Gemini quota / DoS other users | CRITICAL | **CLOSED** — sliding-window burst rate limit (Free 2/min, Pro 8/min, Max 20/min) |
| 3 | A malicious client tampers with the Razorpay subscription to fake a Pro/Max plan | CRITICAL | **CLOSED** — webhook HMAC verified with `crypto.timingSafeEqual`; plan-allowlist; UID-regex; subId match on cancel; event-ID dedup |
| 4 | Anonymous spam — bots create thousands of free guest sessions | HIGH | **CLOSED** — per-fingerprint + per-IP quota; VPN/proxy header detection blocks the easy cases |
| 5 | Concurrent-request race lets a user consume more than their plan | HIGH | **CLOSED** — all rate limits run inside `db.runTransaction` |
| 6 | API keys leak to git / public bundle | HIGH | **CLOSED** — all secrets in Firebase Secret Manager; git history scanned clean; `.gitignore` hardened with temp-file patterns |
| 7 | Prompt injection / oversized input drives up Gemini token cost | MEDIUM | **CLOSED** — `topic` capped at 500 chars (handleScript); `title` 500, `description` 2000 (handleRepurposing); control chars stripped |
| 8 | XSS / clickjacking via malicious script injection | MEDIUM | **CLOSED** — CSP header on Firebase Hosting; `X-Frame-Options: DENY`; React auto-escapes |
| 9 | Multi-account abuse — same IP creates many Google accounts | MEDIUM | **CLOSED** — per-IP monthly quota (`ipUsage/{ipHash}`); fingerprint dedup |
| 10 | Webhook replay attack | MEDIUM | **CLOSED** — `x-razorpay-event-id` dedup table; stale cancel events filtered |
| 11 | Direct origin IP exposed to DDoS | LOW | **PASS** — hosted on Firebase Hosting + Cloud Functions behind Google's edge network |
| 12 | Path traversal via crafted filename in upload | LOW | **CLOSED** — Storage rules use single-segment `{fileName}` pattern (rejects multi-segment paths); backend `sanitizeFileName` strips non-`[A-Za-z0-9._-]`; frontend `useUpload.tsx` also pre-sanitizes (Pass 4 defense-in-depth) |
| 13 | ReDoS via `brace-expansion` (transitive frontend dep) | MEDIUM | **CLOSED** — Pass 4: `npm audit fix` upgraded to patched version; root frontend now at 0 vulnerabilities |

---

## Vibe Coding 7-point Checklist — Pass 4 results

Run on 2026-05-18 against the production codebase. This is a recurring developer-facing checklist (vs. the threat model above which is auditor-facing).

| # | Check | State |
|---|---|---|
| 1 | Hardcoded secrets in tracked files | **PASS** — grep for `rzp_live_`, `rzp_test_`, `AKIA`, `ghp_`, `github_pat_`, `xoxb-`, `sk-`, `AIza` returns 0 hits |
| 2 | XSS / SQL/NoSQL injection | **PASS** — 0 `dangerouslySetInnerHTML` / `innerHTML=` / `eval()` / `new Function()` in `src/`; all 17 Firestore `db.doc/collection` interpolations use auth-trusted UID or server-generated values or regex-validated IDs |
| 3 | Rate limiting on AI endpoints | **PASS** — all 3 callables wrapped in burst limit + monthly quota + GCP daily cap |
| 4 | Auth architecture (no custom session / password hashing) | **PASS** — Firebase Auth only (`signInWithGoogle`, `signInAnonymously`); `jsonwebtoken` / `bcrypt` etc. are only transitive deps, not directly used |
| 5 | API versioning | **N/A retrofit + convention adopted** — Firebase Cloud Functions use name-based routing, not `/api/v1/` paths. Convention going forward: when making a breaking change to a callable, ship the new contract under `functionNameV2` while keeping the old name active. Documented here and in CLAUDE.md. |
| 6 | File upload security (MIME, size, path traversal) | **PASS** — Storage rules: single-segment `{fileName}`, 200 MB cap, MIME allowlist (`audio/*`, `application/pdf`, `image/jpeg`/`png`/`webp`); frontend filename sanitization added in Pass 4 |
| 7 | Dependency check | **PASS** — root frontend: 0 vulnerabilities after Pass 4 fix; `functions/`: 0 high, 9 low (deferred — require firebase-admin v13 breaking-change upgrade) |

The 7-point checklist is meant to be **re-run quarterly** alongside the operational checklist. The prompt for re-running:

> "Run the Vibe Coding 7-point security audit on this codebase. Re-grep for leaked secrets, audit input sanitization (XSS + NoSQL), verify rate limiting on AI endpoints, confirm auth architecture (no custom session), assess API versioning, audit file upload security, and run `npm audit` to check dependencies. Fix anything that's regressed."

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
| 2026-05-14 | Hardening Pass 1 | (initial security hardening) | Atomic rate limit, ipUsage lock, anonymous-spam block on feedback, CSP header, secret-manager for Gemini key |
| 2026-05-18 | Hardening Pass 2 | `fb8a8ff` | Razorpay timing-safe HMAC, plan-allowlist, UID-shape regex, duplicate-subscription block, stale-cancel filter, legacy ultraTrials rule removed, fast-xml-builder CVE fixed |
| 2026-05-18 | Hardening Pass 3 | `50e275c` | Burst rate limit (Free 2/min, Pro 8/min, Max 20/min), webhook event-ID idempotency, prompt-injection length caps + control-char strip, `webhookEvents/` admin-only rule, scheduled cleanup extended to prune dedup docs |
| 2026-05-18 | Hardening Pass 4 (Vibe Coding 7-point) | (this change) | Re-audit confirms Pass 1-3 holds. Frontend filename sanitization in `useUpload.tsx` (defense-in-depth match to backend `sanitizeFileName`). `brace-expansion` MODERATE ReDoS CVE fixed in root via `npm audit fix`. API versioning convention documented (`functionNameV2` going forward — Firebase callables are name-based, not URL-path-based; no retrofit needed). |

---

*Maintained alongside [README.md](README.md). When you change a control here, update README too. If a SECURITY.md row says "CLOSED" but the corresponding code doesn't enforce it, that's a critical bug — open an issue immediately.*
