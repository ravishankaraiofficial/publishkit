# Project Instructions — PublishKit

> Orientation doc for any code editor (Claude Code, Cursor, Gemini CLI, Copilot, etc.) opening this repo. Keep this current — it is the single source of truth for "what is the live state of this app".

## Project Identity
- **App Name:** PublishKit
- **Primary URL:** https://publishkit.in (custom domain, live with SSL)
- **Backup URL:** https://publishkit.web.app (Firebase Hosting default; always works)
- **GitHub:** https://github.com/ravishankaraiofficial/publishkit
- **Firebase Project:** `gen-lang-client-0079285803`
- **Root Directory:** `D:\Project\Project 01\Google Antigravity Files`
- **Latest Commit on `main`:** `00bd31c` — fix(i18n): inject native scripts in language directives to enforce AI output language
- **Last Updated:** 2026-05-26

---

## What this app does
Upload audio / PDF / image → Gemini AI returns titles, timestamped chapters, SEO description, thumbnail prompts (audio only). Plus standalone **Script Writer** (full YouTube scripts in the creator's own voice — now also accepts audio / PDF / image as source material, not just text topics) and **MultiPost** (one click → **X / Instagram / LinkedIn / YouTube Community** posts from the same source — 4 platforms, 1 high-quality variant per platform by default with a "Generate more options" button). 13 output languages AND 13 full UI translations. Native scripts injected directly into the backend language directive so Gemini reliably outputs in Telugu/Bengali/Tamil/etc. — no more silent English fallback.

---

## Subscription plans (LIVE Razorpay, real money)
| Plan | Price | Metadata / mo | Script Writer / mo | MultiPost / mo |
|---|---|---|---|---|
| Free Plan | ₹0 | 3 | 3 | 3 |
| Pro Plan | ₹299/mo | 100 | 100 | 100 |
| Max Plan | ₹1,000/mo | 350 | 350 | 350 |

Internal plan IDs in code are still `'free' | 'pro' | 'ultra'` (display name "Max Plan"; the `'ultra'` literal is preserved to keep Razorpay subscription continuity).

**Payment modes (both live):**
- **One-time order (default, recommended)** — Razorpay Orders API, no autopay mandate, 30-day access. Functions: `createOrder` + `verifyOrderPayment`.
- **Auto-pay subscription (opt-in)** — Razorpay Subscriptions API, recurring monthly. Functions: `createSubscription` + `razorpayWebhook`.

Live Razorpay plan IDs:
- Pro: `plan_Spz2M0sp8rv1SA`
- Max: `plan_SqU3YCU38LA6aw`

One-time prices (paise, server-defined): Pro = 29900, Max = 100000.

`expireOneTimePlans` scheduled Cloud Function (daily, Asia/Kolkata) downgrades users whose `planExpiresAt` has passed and `planType === 'one_time'`.

---

## Model routing per plan (`functions/src/lib/pickModel.ts`)
- Max Plan **Script Writer** → `gemini-2.5-pro` (premium quality on longest content)
- Everything else (all plans, all other features) → `gemini-2.5-flash` (cost-efficient)

Rationale: keeps margins healthy. Script generation is the only place where Pro vs Flash quality difference is user-noticeable.

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
- `RAZORPAY_KEY_ID` (LIVE — starts with `rzp_live_`, 23 chars)
- `RAZORPAY_KEY_SECRET` (LIVE — 24 chars)
- `RAZORPAY_WEBHOOK_SECRET` (28 chars, matches Razorpay dashboard webhook secret)

To rotate from PowerShell **safely** (PS5.1 stdin pipe adds CRLF and corrupts HMAC — use the file path):
```powershell
[System.IO.File]::WriteAllText("$PWD\creds.tmp.txt", $value.Trim())
firebase functions:secrets:set NAME --data-file=creds.tmp.txt
Remove-Item creds.tmp.txt
```

To verify (length-only, never prints values):
```powershell
$k=(firebase functions:secrets:access RAZORPAY_KEY_ID 2>$null).Trim()
"KEY_ID: $($k.Substring(0,9))... ($($k.Length) chars)"
```

`.env` is gitignored and only holds the public Firebase web SDK config + reCAPTCHA site key.

---

## Custom domain setup (publishkit.in)

Domain bought from Hostinger. Configuration:

**Hostinger DNS records:**
- A `@` → `199.36.158.100` (Firebase)
- TXT `@` → `"hosting-site=publishkit"` (Firebase verification)
- TXT `@` → `"google-site-verification=iALTVStX9vB2AtKbVDy8QIW3Ck8rr4fW-js9Z0q6Hgk"` (Search Console)
- CNAME `www` → `publishkit.web.app` (Firebase redirect target)

**Firebase Hosting:**
- `publishkit.in` → Connected, SSL minted
- `www.publishkit.in` → Connected, redirects to `publishkit.in`

**Required allowlists (all configured):**
- Firebase Auth → Authorized domains: `publishkit.in` + `www.publishkit.in`
- Google Cloud API Key (`AIzaSyBYoceWOXWhYsYjCnMiPt2pCaKOh2IE7Xw`) → HTTP referrer: `publishkit.in/*`, `*.publishkit.in/*`, `https://publishkit.in/*`, `https://www.publishkit.in/*`
- reCAPTCHA Enterprise key (`6LcapOQsAAAAAIruihJKCmhDKLWmKhp2I9VqgYKh`, "PublishKit AppCheck") → Domains: `publishkit.in`, `www.publishkit.in`
- OAuth consent screen → Authorized domain 3: `publishkit.in`

If publishkit.in starts returning auth errors, check these 4 allowlists FIRST before code.

---

## Architecture

### Frontend (`src/`)
| File | Purpose |
|---|---|
| `src/lib/firebase.ts` | Firebase init + AppCheck (ReCaptchaEnterpriseProvider, site key `6LcapOQsAAAAAIruihJKCmhDKLWmKhp2I9VqgYKh`) |
| `src/lib/languages.ts` | 13-language registry + `languageHint()` (shared with backend via parallel registry) |
| `src/lib/colors.ts` | Brand-color hex/name utilities |
| `src/lib/validateMeaningful.ts` | Zod refinement rejecting gibberish in Settings fields (vowel check, keyboard-mash patterns, repeated chars) |
| `src/lib/fingerprint.ts` | FingerprintJS wrapper, returns `visitorId` for free-tier abuse detection |
| `src/hooks/useAuth.tsx` | Google OAuth + Anonymous; mobile popup-first with redirect fallback; 8s fallback timeout if anonymous sign-in stalls |
| `src/hooks/useUpload.tsx` | Upload state machine + refresh-recovery; MultiPost auto-trigger; frontend filename sanitization ([A-Za-z0-9._-], 100 char cap); sends `visitorId` |
| `src/i18n/index.tsx` | Homegrown `I18nProvider` + `useT()` hook; `t(key, {placeholder})` interpolation; localStorage `pk_ui_lang_v1` |
| `src/i18n/locales/*.json` | 13 locale files: en, hi, hinglish, te, ta, gu, mr, pa, bn, ml, kn, bho, ur |
| `src/i18n/UiLanguageSync.tsx` | Two-way sync: profile.uiLanguage ↔ localStorage (bidirectional) |
| `src/components/layout/PageContainer.tsx` | Shared layout with Navbar, LanguageBar, ambient cursor glow, **footer with Privacy/Terms/Pricing/Contact links** |
| `src/components/layout/LanguageBar.tsx` | Horizontal scrollable language chips below Navbar (UI language switcher) |
| `src/components/ui/Picker.tsx` | Generic dropdown component with **mobile bottom-sheet** style + glass effect (orange hover) |
| `src/components/ui/LanguagePicker.tsx` | Wraps Picker for OutputLanguage |
| `src/pages/Home.tsx` | Main upload page; thumbnail toggle + MultiPost toggle |
| `src/pages/ScriptWriter.tsx` | Script generation UI (calls `generateScript` callable); **multimodal — accepts audio / PDF / image uploads as input**, not just text topics. sends `visitorId` |
| `src/pages/MultiPost.tsx` | Repurposing UI (calls `generateRepurposing` callable); **4 platforms: X / Instagram / LinkedIn / YouTube Community**. Block stays visible during upload + after; toggles + platform selector always reachable. sends `visitorId` |
| `src/pages/Pricing.tsx` | 3-tier card layout (Free 3 / Pro 100 / Max 350); **one-time vs subscription toggle**; one-time is default |
| `src/pages/Settings.tsx` | 30-question Script System questionnaire; all free-text fields use `isMeaningfulText` Zod refinement (handle field exempt) |
| `src/pages/Login.tsx` | Hero + Google sign-in; **footer with Privacy/Terms links** for OAuth verification |
| `src/pages/PrivacyPolicy.tsx` | **NEW** — public route `/privacy`, DPDP-compliant, full 10-section policy |
| `src/pages/TermsOfService.tsx` | **NEW** — public route `/terms`, refund policy, AI disclaimer, India jurisdiction |
| `src/pages/Feedback.tsx`, `PastResults.tsx` | Feedback board, history |
| `src/components/results/ResultTabs.tsx` | Tabbed result viewer with copy buttons |
| `src/types/index.ts` | `CreatorProfile` with `uiLanguage` field; `PlanTier`, `AddressForm`, `AudienceLevel`, `VideoLength`, `OutputLanguage` |

### Backend (`functions/src/`)
| File | Purpose |
|---|---|
| `index.ts` | Exports: `processAudio`, `processAudioWorker`, `deleteOldAudio`, `generateScript`, `generateRepurposing`, `createSubscription`, `razorpayWebhook`, **`createOrder`**, **`verifyOrderPayment`**, **`expireOneTimePlans`** |
| `processAudio.ts` | Callable + Firestore-onCreate worker. App Check + auth + burst limit + monthly+per-IP quota + whitelist + VPN check + **free-tier guard** |
| `handleScript.ts` | `generateScript` callable. **Multimodal: handles topic text + optional audio / PDF / image attachments.** Routes via `pickModel(plan, 'script')` — Pro for Max, Flash otherwise. Anti-prompt-injection structural invariant preserved. `LANG_CONFIG` injects native script samples (देवनागरी / తెలుగు / বাংলা / etc.) into the language directive to lock AI output to the requested language |
| `handleRepurposing.ts` | `generateRepurposing` callable. Always Flash. **4 platforms supported: `x`, `instagram`, `linkedin`, `youtube` (Community Posts)**. Returns **1 high-quality variant per platform** by default (was multiple); UI exposes a "Generate more options" button for follow-up calls. Hardened JSON parsing — fenced/partial JSON tolerated; never silently drops a platform. Each platform requested counts as one generation against the monthly quota |
| `handlePayment.ts` | `createSubscription`, `razorpayWebhook`, **`createOrder` (Orders API, no autopay), `verifyOrderPayment` (HMAC signature verify, 30-day expiry grant), `expireOneTimePlans` (daily scheduled, downgrades expired one-timers)** |
| `cleanup.ts` | Scheduled `deleteOldAudio` — prunes results (3h), rate-limit ring buffers, `webhookEvents/` docs older than 7 days |
| `middleware/rateLimit.ts` | `enforceBurstLimit`, `enforceMonthlyQuota`, `enforceIpQuota`, `enforceScriptTrial`, `enforceRepurposingTrial`. `PLAN_MONTHLY_LIMITS = { free: 3, pro: 100, ultra: 350 }`. `FEATURE_MONTHLY_LIMITS` same shape |
| `middleware/auth.ts` | Whitelist + VPN/proxy check + fingerprint enforcement for anonymous users |
| `lib/firestore.ts` | Admin SDK init + `db.runTransaction` reused for atomic counters |
| `lib/gemini.ts` | `geminiApiKey = defineSecret('GEMINI_API_KEY')` |
| `lib/languages.ts` | Server-side language whitelist + `languageHint()` mirror |
| `lib/pickModel.ts` | **NEW** — `pickModel(plan, feature)` returns `'gemini-2.5-pro'` for Max+script, else `'gemini-2.5-flash'` |
| `lib/freeTierGuard.ts` | **NEW** — SHA-256 hashed IP + fingerprint stored in `freeTierUsage_ip/{hash}` and `freeTierUsage_fp/{hash}`. Blocks UID reuse on same device/IP. Paid users exempt |

---

## i18n system (NEW)

Homegrown React i18n (no `react-i18next` dependency).

- **Provider mount:** `<I18nProvider>` wraps `<AuthGatedRoutes>` in `App.tsx`
- **Hook:** `const t = useT(); t('script.title')` or `t('multipost.usageCounter', { used: 5, limit: 100 })`
- **Interpolation:** `{placeholder}` tokens replaced via `interpolate(text, params)`
- **Storage key:** `localStorage.pk_ui_lang_v1`
- **Profile sync:** `UiLanguageSync` component (mounted inside AuthProvider) writes `profile.uiLanguage` to Firestore so choice follows user across devices
- **Fallback:** missing key → return key string (English fallback also tried via en.json)
- **Output language is INDEPENDENT** — picked per-script on ScriptWriter, doesn't change UI language

To add a new string: define key in `en.json` first, then add to all 12 other locales. To add a new locale: drop a new JSON in `src/i18n/locales/` matching the same key set, then add to `src/lib/languages.ts` registry.

---

## Security posture (current state)

The repo has been through **5 hardening passes + free-tier guard** — see `SECURITY.md` for the full threat model. Pass 5 (commit `7f88443`) closed: payment bypass in `verifyOrderPayment` (now fetches verified plan from Razorpay, not client), IDOR in `processAudio` (enforces storage path ownership), webhook race condition (Firestore transaction wrapping), feedback voting duplication. Firestore rules now allow users to **delete their own results** (previously read-only). Highlights:

- **App Check** (ReCaptcha Enterprise) enforced as first line in all callables
- **Auth check** as second line
- **Burst rate limit** (60s sliding window): Free 2/min, Pro 8/min, Max 20/min
- **Monthly quota** per-UID per-feature (3 / 100 / 350) + per-IP cap for anonymous users
- **Free-tier abuse guard:** hashed IP + FingerprintJS visitor ID stored in Firestore, blocks UID reuse on same device
- **Per-plan model routing:** prevents Max users from arbitrage-burning Pro tokens via Flash-rated features
- **GCP Gemini quota cap:** 8,000 req/day
- **Budget alert:** ₹1,000/mo on GCP billing
- **Razorpay webhook:** timing-safe HMAC, event-ID idempotency, plan allowlist, UID-shape regex
- **Prompt injection structural defense:** language directive + Requirements block always AFTER user-controlled text
- **Input length caps:** topic 500 / title 500 / description 2000, control chars stripped
- **File upload security:** Storage rules cap 200MB + MIME allowlist; frontend + backend filename sanitization
- **Firestore rules:** all server-managed fields admin-SDK-only
- **Secrets:** zero in tracked code or client bundle

---

## Analytics & SEO (NEW)

- **Google Analytics 4:** Measurement ID `G-JPZ7157J7D`, injected via `index.html`. `anonymize_ip: true` for DPDP friendliness. Tag fires on every page view.
- **Sitemap:** `public/sitemap.xml` — 8 URLs (home, login, pricing, script-writer, multipost, feedback, privacy, terms). Submitted to Search Console.
- **robots.txt:** `public/robots.txt` — allow all crawlers, disallow `/__/` and `/api/`, sitemap reference.
- **Search Console:** verified via DNS TXT, property type = Domain (covers all subdomains). URL inspection requested for `/` and `/pricing`.
- **OAuth consent screen:** branding submitted with logo + privacy + terms. Verification status: paused (not blocking — app works with "Unverified app" prompt). See "OAuth verification gotcha" below.

---

## OAuth verification gotcha

Google's verification checker fetches `https://publishkit.in` and looks for a Privacy Policy link in the HTML. PublishKit is an SPA, so React-rendered footers are invisible to crawlers that don't run JS. Mitigations already in place:

1. `index.html` has a hidden `<div style="display:none">` with absolute-URL links to privacy/terms (SEO-only, kept in static HTML)
2. `<link rel="privacy-policy">` meta tag in `<head>`
3. `<noscript>` fallback with the same links
4. React footer in `PageContainer` and `Login.tsx` (visible to users + headless Chrome)

Despite all this, verification kept failing for unknown reasons (likely Google stale cache). **Verification is non-blocking — users just see one "Continue anyway" click on first sign-in.** Re-attempt later with a fresh ticket if needed.

---

## Creator profile schema

`users/{uid}` doc (client-writable fields only — server-managed fields are admin-only):

**Required (form-enforced):** `name`, `handle`, `niche`, `language`, `appearance`, `brandColor1`, `brandColor2`, `positioning`, `targetAudience`, `tone`

**Recommended optionals:** `audiencePainPoint`, `audienceLevel`, `audienceTransformation`, `catchphrases`, `avoidWords`, `hookStyle`, `ctaStyle`, `contentPillars`, `preferredVideoLength`

**Advanced optionals:** `age`, `whatMakesDifferent`, `personalStory`, `credentials`, `addressForm`, `usesSlang`, `usesMemes`, `usesCursing`, `bestVideoHooks`, `hookFormulas`

**UI preferences:** `uiLanguage` (controls the entire web app's interface language; written by `UiLanguageSync`)

**Server-managed (admin-SDK only):** `plan`, `planExpiresAt`, `planType` (`'one_time' | 'subscription'`), `razorpaySubscriptionId`, `scriptUsageThisMonth`, `repurposingUsageThisMonth`, `scriptUsageMonth`, `repurposingUsageMonth`, `scriptTrialLastUsedAt`, `repurposingTrialLastUsedAt`

`handleScript.ts` reads ALL the above (sanitized, length-capped) and injects into the Gemini prompt so scripts sound in the creator's voice — that's why Settings makes 10 fields required.

Additionally, `handleRepurposing.ts` (MultiPost) and the metadata prompts (`titles.ts`, `description.ts`, `timestamps.ts`) extract specific profile fields (`niche`, `targetAudience`, `tone`, `avoidWords`) to personalize their outputs and ensure the generated text matches the creator's precise style and target audience.

---

## Output languages (13)
English, Hindi, Hinglish, Telugu, Tamil, Gujarati, Marathi, Punjabi, Bengali, Malayalam, Kannada, Bhojpuri, Urdu — defined once in `src/lib/languages.ts` and mirrored in `functions/src/lib/languages.ts`. UI translations live in `src/i18n/locales/*.json`.

---

## Operational invariants — do NOT break
- **Internal plan IDs:** `'free' | 'pro' | 'ultra'` (display "Free Plan" / "Pro Plan" / "Max Plan"). Renaming `'ultra'` would orphan live Razorpay subscriptions.
- **Anti-prompt-injection structural rule:** in `handleScript.ts` and `handleRepurposing.ts`, the language directive + Requirements block MUST stay after all user-controlled text.
- **MultiPost formatting:** In `handleRepurposing.ts`, the prompt MUST require PLAIN TEXT output and avoid JSON. Raw JSON breaks when the AI includes multiple paragraphs/newlines for social posts.
- **HMAC compare:** use `safeEqual()` (wraps `crypto.timingSafeEqual`) in `handlePayment.ts` — never `!==`.
- **App Check + auth checks:** must be the first two lines of every callable.
- **Burst limit:** must be wired before any Gemini-bound work.
- **Firebase callables route by NAME, not URL path.** Any future breaking change ships as `functionNameV2` alongside the old name.
- **Storage path pattern:** `users/{uid}/{uploads|audio}/{fileName}` with single-segment fileName matching `[A-Za-z0-9._-]+`.
- **Model routing:** never hardcode `'gemini-2.5-flash'` or `'gemini-2.5-pro'` in handler files — always go through `pickModel()`.
- **Plan limits:** keep `src/pages/Pricing.tsx`, `src/pages/ScriptWriter.tsx`, `src/pages/MultiPost.tsx`, and `functions/src/middleware/rateLimit.ts` in sync. Source of truth = `rateLimit.ts` (enforced server-side). Currently: 3 / 100 / 350.
- **Razorpay live keys:** never deploy with `rzp_test_` prefix to production. Verify with the length+prefix check command in "Secrets" above.

---

## File auto-delete
- Results + uploaded audio: 3 hours after processing
- Webhook event IDs: 7 days
- Rate-limit ring buffers: pruned in-band on every check (no scheduled job needed)
- One-time plans: `expireOneTimePlans` daily scheduled job downgrades expired users to free

---

## What NOT to add without explicit ask
- Batch upload (would blow ₹6,000/mo budget cap)
- YouTube Data API (requires multi-week OAuth approval; not core UX)
- Gemini streaming (worker-trigger architecture is incompatible)
- Custom auth / session management / password hashing — Firebase Auth covers all of it
- New Express/REST routes — stick to Firebase callables
- Additional analytics SDKs (GA4 is enough)

---

## Quick links
- `SECURITY.md` — full threat model, controls, ops checklist, incident runbook
- `README.md` — user-facing project overview
- `CHANGELOG.md` — version history (most recent first)
- `publishkit_codebase_reference.md` — deeper code walkthrough (legacy reference)
- `publishkit_deployment_reference.md` — legacy deploy reference
- `DEPLOY-CHECKLIST.md` — pre-flight checks before `firebase deploy`
- `deploy-razorpay.ps1` — secret-rotation helper (file-based, CRLF-safe)
