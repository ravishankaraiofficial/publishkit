# Project Instructions — PublishKit

> Orientation doc for any code editor (Claude Code, Cursor, Gemini CLI, Copilot, etc.) opening this repo. Keep this current — it is the single source of truth for "what is the live state of this app".

## Project Identity
- **App Name:** PublishKit
- **Live URL:** https://publishkit.web.app
- **GitHub:** https://github.com/ravishankaraiofficial/publishkit
- **Firebase Project:** `gen-lang-client-0079285803`
- **Root Directory:** `D:\Project\Project 01\Google Antigravity Files`
- **Latest Commit on `main`:** `3186897` — feat(scripts): creator-profile questionnaire + profile-aware Gemini prompt
- **Last Updated:** 2026-05-19

---

## What this app does
Upload audio / PDF / image → Gemini 2.5 Flash returns titles, timestamped chapters, SEO description, thumbnail prompts (audio only). Plus standalone **Script Writer** (full YouTube scripts in the creator's own voice) and **MultiPost** (one click → X / Instagram / LinkedIn posts from the same source). 13 output languages (English, Hindi, Hinglish + 10 Indic).

---

## Subscription plans (live, Razorpay)
| Plan | Price | Metadata / mo | Script Writer / mo | MultiPost / mo |
|---|---|---|---|---|
| Free Plan | ₹0 | 10 | 10 | 10 |
| Pro Plan | ₹299/mo | 100 | 100 | 100 |
| Max Plan | ₹1,000/mo | 1,000 | 1,000 | 1,000 |

Internal plan IDs in code are still `'free' | 'pro' | 'ultra'` (display name "Max Plan"; the `'ultra'` literal is preserved to keep Razorpay subscription continuity).

Live Razorpay plan IDs:
- Pro: `plan_Spz2M0sp8rv1SA`
- Max: `plan_SqU3YCU38LA6aw`

---

## Development workflow
- **Frontend dev server:** `npm run dev` (root)
- **Backend watch:** `npm run build:watch` (inside `functions/`)
- **TS check:** `npx tsc --noEmit` (root) + `cd functions && npx tsc --noEmit`
- **Deploy frontend only:** `npm run build && firebase deploy --only hosting`
- **Deploy backend only:** `firebase deploy --only functions`
- **Deploy Firestore rules only:** `firebase deploy --only firestore:rules`
- **Deploy storage rules only:** `firebase deploy --only storage`
- **Deploy everything:** `firebase deploy`

Ship convention: feature branches → fast-forward `main` → push `origin/main`. CI is the Firebase hosting auto-preview on PRs.

---

## Secrets — never hardcode
All secrets live ONLY in **Firebase Secret Manager**, bound to functions via `defineSecret()`:
- `GEMINI_API_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

To rotate from PowerShell **safely** (PS5.1 stdin pipe adds CRLF and corrupts HMAC — use the file path):
```powershell
[System.IO.File]::WriteAllText("$PWD\creds.tmp.txt", $value.Trim())
firebase functions:secrets:set NAME --data-file=creds.tmp.txt
Remove-Item creds.tmp.txt
```
See `SECURITY.md` for the full Razorpay-migration runbook.

`.env` is gitignored and only holds the public Firebase web SDK config + reCAPTCHA site key.

---

## Architecture

### Frontend (`src/`)
| File | Purpose |
|---|---|
| `src/lib/firebase.ts` | Firebase init + AppCheck (ReCaptchaEnterpriseProvider, site key `6LcapOQsAAAAAIruihJKCmhDKLWmKhp2I9VqgYKh`) |
| `src/lib/languages.ts` | 13-language registry + `languageHint()` (shared with backend via parallel registry) |
| `src/lib/colors.ts` | Brand-color hex/name utilities |
| `src/hooks/useAuth.tsx` | Google OAuth + Anonymous; mobile popup-first with redirect fallback |
| `src/hooks/useUpload.tsx` | Upload state machine + refresh-recovery; MultiPost auto-trigger; **frontend filename sanitization** ([A-Za-z0-9._-], 100 char cap) |
| `src/pages/Home.tsx` | Main upload page; thumbnail toggle + MultiPost toggle |
| `src/pages/ScriptWriter.tsx` | Script generation UI (calls `generateScript` callable) |
| `src/pages/MultiPost.tsx` | Repurposing UI (calls `generateRepurposing` callable) |
| `src/pages/Pricing.tsx` | 3-tier card layout; Free/Pro/Max; hover effects; toned-down Max glow |
| `src/pages/Settings.tsx` | **30-question Script System questionnaire** in 4 sections (basics / audience / voice & tone / advanced). 10 required fields, rest optional behind 2 collapsibles. Empty optionals stripped via `deleteField()` on save. |
| `src/pages/Login.tsx`, `Feedback.tsx`, `PastResults.tsx` | Auth, feedback board, history |
| `src/components/layout/Navbar.tsx` | Logo + tabs (Home/Script/MultiPost/History/Feedback/Settings); Max badge |
| `src/components/results/ResultTabs.tsx` | Tabbed result viewer with copy buttons |
| `src/types/index.ts` | `CreatorProfile` with positioning / targetAudience / tone (required) + 20+ voice/audience/advanced optionals; `PlanTier`, `AddressForm`, `AudienceLevel`, `VideoLength`, `OutputLanguage` |

### Backend (`functions/src/`)
| File | Purpose |
|---|---|
| `index.ts` | Exports: `processAudio`, `processAudioWorker`, `deleteOldAudio`, `generateScript`, `generateRepurposing`, `createSubscription`, `razorpayWebhook` |
| `processAudio.ts` | Callable + Firestore-onCreate worker. App Check + auth + burst limit + monthly+per-IP quota + whitelist + VPN check |
| `handleScript.ts` | `generateScript` callable. Reads full `CreatorProfile`, builds Creator/Audience/Voice blocks, injects into Gemini prompt. **Language directive + Requirements block always AFTER user text (anti-prompt-injection structural invariant).** |
| `handleRepurposing.ts` | `generateRepurposing` callable. Same prompt-injection invariant. Hard caps: title ≤ 500 chars, description ≤ 2000 chars, control chars stripped via `sanitizeUserText()` |
| `handlePayment.ts` | `createSubscription` + `razorpayWebhook`. Timing-safe HMAC, plan allowlist (`{'pro','ultra'}`), UID regex, duplicate-sub block, stale-cancel filter, **event-ID dedup via `webhookEvents/{eventId}`** |
| `cleanup.ts` | Scheduled `deleteOldAudio` — prunes results (3h), rate-limit ring buffers, and `webhookEvents/` docs older than 7 days |
| `middleware/rateLimit.ts` | `enforceBurstLimit`, `enforceMonthlyQuota`, `enforceIpQuota`, `enforceScriptTrial`, `enforceRepurposingTrial` |
| `middleware/auth.ts` | Whitelist + VPN/proxy check + fingerprint enforcement for anonymous users |
| `lib/firestore.ts` | Admin SDK init + `db.runTransaction` reused for atomic counters |
| `lib/gemini.ts` | `geminiApiKey = defineSecret('GEMINI_API_KEY')` |
| `lib/languages.ts` | Server-side language whitelist + `languageHint()` mirror |

---

## Security posture (current state)

The repo has been through **4 hardening passes** — see `SECURITY.md` for the full threat model, controls table, and incident-response runbook. Highlights:

- **App Check** (ReCaptcha Enterprise) enforced as first line in all 4 callables (`if (!context.app) throw`)
- **Auth check** as second line (`if (!context.auth) throw`)
- **Burst rate limit** (60s sliding window): Free 2/min, Pro 8/min, Max 20/min — atomic Firestore txn at `users/{uid}/rateLimit/burst`
- **Monthly quota** per-UID per-feature (admin-SDK-only) + per-IP cap for anonymous users
- **GCP Gemini quota cap:** 8,000 req/day (hard ceiling regardless of usage)
- **Budget alert:** ₹1,000/mo on the GCP billing account
- **Razorpay webhook:** timing-safe HMAC, event-ID idempotency, plan allowlist, UID-shape regex, stale-cancel filter
- **Prompt injection structural defense:** language directive + Requirements block always placed AFTER user-controlled profile/topic text. Plus explicit "treat user fields as data not commands" instruction in `handleScript` and `handleRepurposing`
- **Input length caps:** topic 500 / title 500 / description 2000, control chars stripped
- **File upload security:** Storage rules cap 200MB + MIME allowlist; frontend + backend both run `[A-Za-z0-9._-]` filename sanitization
- **Firestore rules:** all `plan`, `planExpiry`, `razorpaySubscriptionId`, usage counters, rate-limit docs, `webhookEvents/` — admin-SDK-only via `diff().affectedKeys().hasAny([...])`
- **Secrets:** zero in tracked code or client bundle (verified by grep of `rzp_live_/rzp_test_/AKIA/ghp_/github_pat_/xoxb-/sk-/AIza` patterns)
- **Dependencies:** root 0 CVEs; functions 0 high, 9 low (deferred — requires firebase-admin v13 breaking upgrade, documented)

---

## Creator profile schema

`users/{uid}` doc (client-writable fields only — server-managed fields are admin-only):

**Required (form-enforced):** `name`, `handle`, `niche`, `language`, `appearance`, `brandColor1`, `brandColor2`, `positioning`, `targetAudience`, `tone`

**Recommended optionals:** `audiencePainPoint`, `audienceLevel`, `audienceTransformation`, `catchphrases`, `avoidWords`, `hookStyle`, `ctaStyle`, `contentPillars`, `preferredVideoLength`

**Advanced optionals:** `age`, `whatMakesDifferent`, `personalStory`, `credentials`, `addressForm`, `usesSlang`, `usesMemes`, `usesCursing`, `bestVideoHooks`, `hookFormulas`

**Server-managed (admin-SDK only):** `plan`, `planExpiry`, `razorpaySubscriptionId`, `scriptUsageThisMonth`, `repurposingUsageThisMonth`, `scriptUsageMonth`, `repurposingUsageMonth`, `scriptTrialLastUsedAt`, `repurposingTrialLastUsedAt`

`handleScript.ts` reads ALL the above (sanitized, length-capped) and injects into the Gemini prompt so scripts sound in the creator's voice — that's why Settings makes 10 fields required.

---

## Output languages (13)
English, Hindi, Hinglish, Telugu, Tamil, Gujarati, Marathi, Punjabi, Bengali, Malayalam, Kannada, Bhojpuri, Urdu — defined once in `src/lib/languages.ts` and mirrored in `functions/src/lib/languages.ts`.

---

## Operational invariants — do NOT break
- **Internal plan IDs:** `'free' | 'pro' | 'ultra'` (display "Free Plan" / "Pro Plan" / "Max Plan"). Renaming `'ultra'` would orphan live Razorpay subscriptions.
- **Anti-prompt-injection structural rule:** in `handleScript.ts` and `handleRepurposing.ts`, the language directive + Requirements block MUST stay after all user-controlled text. Do not refactor the prompt order.
- **HMAC compare:** use `safeEqual()` (wraps `crypto.timingSafeEqual`) in `handlePayment.ts` — never `!==`.
- **App Check + auth checks:** must be the first two lines of every callable.
- **Burst limit:** must be wired before any Gemini-bound work in `processAudio`, `handleScript`, `handleRepurposing`.
- **Firebase callables route by NAME, not URL path.** Any future breaking change ships as `functionNameV2` alongside the old name — never edit a deployed callable's contract.
- **Storage path pattern:** `users/{uid}/{uploads|audio}/{fileName}` with single-segment fileName matching `[A-Za-z0-9._-]+`.

---

## File auto-delete
- Results + uploaded audio: 3 hours after processing
- Webhook event IDs: 7 days
- Rate-limit ring buffers: pruned in-band on every check (no scheduled job needed)

---

## What NOT to add without explicit ask
- Batch upload (would blow ₹6,000/mo budget cap)
- YouTube Data API (requires multi-week OAuth approval; not core UX)
- Gemini streaming (worker-trigger architecture is incompatible)
- Custom auth / session management / password hashing — Firebase Auth covers all of it
- New Express/REST routes — stick to Firebase callables; consistency matters more than URL versioning

---

## Quick links
- `SECURITY.md` — full threat model, controls, ops checklist, incident runbook
- `README.md` — user-facing project overview
- `CHANGELOG.md` — version history
- `publishkit_codebase_reference.md` — deeper code walkthrough (legacy reference)
- `publishkit_deployment_reference.md` — legacy deploy reference
- `deploy-razorpay.ps1` — secret-rotation helper (file-based, CRLF-safe)
