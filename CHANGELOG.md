# PublishKit Changelog

## [2026-05-26] Post-Launch Polish — i18n Native Scripts, Multimodal Script Writer, YouTube Community Posts, Pass 5 Security

Five days after launch, the product hardened in three directions: AI output reliability, feature scope, and security. Done primarily in Antigravity (Gemini CLI). Net result: PublishKit now handles regional-language generation correctly, accepts file uploads on Script Writer, repurposes to 4 platforms (added YouTube), and survived another security pass.

### i18n — AI now reliably outputs in the requested language
- **Commit `00bd31c`** — backend `LANG_CONFIG` injects **native script samples** directly into the system prompts (देवनागरी for Hindi, తెలుగు for Telugu, தமிழ் for Tamil, বাংলা for Bengali, ગુજરાતી for Gujarati, etc.)
- **Bug it fixed:** Gemini was silently defaulting to English for regional languages — metadata titles, descriptions, timestamps, and thumbnail prompts all came back in English even when the user picked Telugu/Bengali. Now Gemini sees actual native characters in the directive and adheres reliably.
- **Coverage:** all 4 generation paths — Metadata (`generate.ts`), Script (`handleScript.ts`), MultiPost (`handleRepurposing.ts`), Transcribe (`transcribe.ts`).

### Script Writer — multimodal upload (Commit `5f009b6`)
- **What changed:** Script Writer used to only accept a text topic. Now it accepts the same uploads as Home page — **audio / PDF / image** — and uses them as source material for the script.
- **Use case:** A creator uploads a 10-min raw audio diary → Script Writer turns it into a structured YouTube script with hook, intro, sections, CTA, all in the creator's voice.
- Follow-up commits `a76487e` (build errors), `d53fb93` (emoji cleanup on copy button).

### MultiPost — YouTube Community Posts + single-variant default
- **Commit `38052c1`** — added **YouTube Community Posts** as a 4th platform alongside X / Instagram / LinkedIn. Tone is conversational and community-focused, designed for the YouTube Community tab.
- **Commit `5a75fa9`** — switched from "multiple variants per platform" to **1 high-quality variant per platform** by default. New "Generate more options" button lets users get additional variants on demand.
- **Commit `4d6477e`** — hardened JSON parsing in `handleRepurposing.ts`. Previously Gemini occasionally returned partial / fenced JSON that caused one platform's output to silently disappear. Now: fenced code blocks stripped, partial JSON tolerated, all requested platforms always returned.
- **Commit `34cbe77`** — earlier intermediate state (2 variations per platform) before settling on 1+button.
- **Commit `35d2983`** — usage UI shows MultiPost counter consistently; legacy result documents from before this commit are re-formatted on read.

### UI & Mobile polish
- **Commit `74c2250`** — on mobile, MultiPost input field and language picker now **stack vertically** instead of fighting for horizontal space (was overlapping at <480px).
- **Commit `e578bd6`** — MultiPost toggle + platform selector remain visible **during** audio upload (previously hidden when upload spinner was active).
- **Commit `f125268`** — MultiPost block stays visible during upload + after — quotas enforced in UI before submission.
- **Commit `f4a7bd8`** — native translations applied for **DropZone** text and **Copy** buttons across all 13 locales (these had been left in English).

### Security — Pass 5 hardening (Commit `7f88443`)
Fifth full security audit pass. Closed:
- **Payment bypass in `verifyOrderPayment`** — client could previously claim any plan during signature verification. Now the server fetches the actual paid plan from Razorpay Orders API and writes that, not what the client says.
- **IDOR in `processAudio`** — storage path ownership now enforced (caller's uid must match the path's uid segment).
- **Webhook race condition** — `razorpayWebhook` event-ID idempotency now wrapped in a Firestore transaction so concurrent webhook deliveries can't both apply the same event.
- **Feedback voting duplication** — same user voting twice on a feedback item now properly blocked.
- **Firestore rules** — `firestore.rules` now allows users to **delete their own result documents** (was read-only — users couldn't clean up old generations from their History page).
- Dependencies bumped to fix moderate-severity advisories.
- Updated `SECURITY.md` to document the Pass 5 controls.

### Files changed across this batch
- `functions/src/handleScript.ts` — multimodal input parsing + native-script LANG_CONFIG
- `functions/src/handleRepurposing.ts` — 4-platform support, single-variant default, JSON parser hardening
- `functions/src/handlePayment.ts` — Pass 5 payment-bypass fix, webhook race fix
- `functions/src/processAudio.ts` — Pass 5 IDOR fix (storage path ownership)
- `functions/src/transcribe.ts` — native-script LANG_CONFIG
- `functions/src/generate.ts` — native-script LANG_CONFIG
- `firestore.rules` — user can delete own results + server-managed-fields protection
- `src/pages/ScriptWriter.tsx` — multimodal upload UI
- `src/pages/MultiPost.tsx` — YouTube checkbox, single-variant + generate-more UI, mobile stacking
- `src/components/upload/DropZone.tsx` — i18n keys for all 13 locales
- `src/i18n/locales/*.json` — DropZone + Copy button keys added across all 13 files
- `SECURITY.md` — Pass 5 documentation
- `CHANGELOG.md` — Pass 5 entry

### Production state at end of this batch
- ✅ All 4 generation features (Metadata, Script Writer, MultiPost, Transcribe) reliably output in the user's chosen regional language
- ✅ Script Writer accepts audio / PDF / image (parity with Home page)
- ✅ MultiPost supports 4 platforms; default UX is "1 great variant per platform + button for more"
- ✅ Mobile MultiPost layout no longer overlaps at narrow widths
- ✅ Users can delete their own past results (cleanup workflow now possible)
- ✅ 5 security passes complete (payment, IDOR, webhook race, feedback voting closed)
- ✅ Live, paying-customer-ready at https://publishkit.in

## [2026-05-21] Production Launch — publishkit.in Live, Razorpay Live Mode, SEO, Legal Pages

This session shipped 6 fixes + custom domain + live payments + analytics + legal in one continuous push. Net result: PublishKit went from "feature-complete on web.app" to **production-grade SaaS at publishkit.in with real INR payments**.

### Security Hardening Pass 5 (GStack Audit)
- **CRITICAL: Payment plan spoofing fix** in `verifyOrderPayment` — now fetches the order directly from Razorpay to verify `notes.plan` instead of trusting client-provided string.
- **CRITICAL: Cross-user file IDOR fix** in `processAudio` — added strict ownership check to ensure `storagePath` starts with `users/{uid}/`.
- **HIGH: Feedback voting duplication logic bug** — Fixed a bug in `Feedback.tsx` where upvoting created duplicate feedback entries via `addDoc` instead of `updateDoc`. Corrected Firestore rules to securely allow cross-user vote modifications (`hasOnly(['votes', 'votedBy'])`).
- **MODERATE: Webhook race condition fix** — wrapped `eventId` deduplication check in a Firestore Transaction to prevent retry-ping double-processing.
- **MODERATE: Dependency update** — `protobufjs` updated via `npm audit fix` in root to resolve Denial of Service vulnerability (GHSA-jggg-4jg4-v7c6).
- Re-audited full backend for IDOR/Logic flaws using gstack methodology.

### Plans & limits
- **Free Plan limit changed: 10 → 3** (per feature per month)
- **Max Plan limit changed: 1000 → 350** (per feature per month) — protects margin on Gemini Pro cost
- Pro stays at 100. Pricing unchanged (₹0 / ₹299 / ₹1,000).
- Source of truth: `functions/src/middleware/rateLimit.ts`. Frontend cards + 13 locale `helpMax` strings synced.

### Razorpay
- **LIVE keys integrated** — `RAZORPAY_KEY_ID` (rzp_live_), `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` set in Firebase Secret Manager.
- **One-time order flow added** — new `createOrder` + `verifyOrderPayment` Cloud Functions using Razorpay Orders API (no autopay mandate). HMAC signature verification. Grants 30 days access.
- **`expireOneTimePlans` scheduled function** — daily downgrade of users whose `planExpiresAt` passed and `planType === 'one_time'`.
- **Frontend toggle on Pricing page**: one-time (default) vs subscription. Defaults to one-time because Indian users abandon checkout at autopay mandate prompt.
- **Real ₹299 test payment** verified end-to-end → captured → Firestore plan granted → refunded.
- **Live webhook** created in Razorpay dashboard pointing to `https://us-central1-gen-lang-client-0079285803.cloudfunctions.net/razorpayWebhook` with events: `payment.captured`, `subscription.charged`, `subscription.cancelled`.

### Custom domain (publishkit.in)
- Domain bought from Hostinger.
- Firebase Hosting connected, SSL certificate auto-minted.
- `www.publishkit.in` redirects to `publishkit.in`.
- Sitemap, robots.txt, Privacy, Terms all serve correctly under the custom domain.
- 4 allowlists configured (often-overlooked): Firebase Auth authorized domains, Google Cloud API Key referrers, reCAPTCHA Enterprise key domains, OAuth consent screen domain.

### Per-plan model routing (NEW)
- New `functions/src/lib/pickModel.ts` — Max Plan → `gemini-2.5-pro` for Script Writer only; everything else → `gemini-2.5-flash`.
- Wired into `handleScript.ts` and `handleRepurposing.ts`. No more hardcoded model strings.

### Free-tier abuse guard (NEW)
- New `functions/src/lib/freeTierGuard.ts` — SHA-256 hashed IP + FingerprintJS visitor ID stored in `freeTierUsage_ip/{hash}` and `freeTierUsage_fp/{hash}`. Blocks UID reuse on same device or IP.
- Paid users exempt. Frontend sends `visitorId` with every callable.
- New `src/lib/fingerprint.ts` — wraps `@fingerprintjs/fingerprintjs`, in-memory cache.

### i18n (NEW — 13-language UI translation)
- Homegrown React i18n (no `react-i18next` dependency to keep bundle small).
- New `src/i18n/index.tsx` with `I18nProvider`, `useT()`, `t(key, {placeholder})` interpolation, localStorage `pk_ui_lang_v1`.
- 13 locale JSON files in `src/i18n/locales/`: en, hi, hinglish, te, ta, gu, mr, pa, bn, ml, kn, bho, ur.
- `LanguageBar` component below Navbar — horizontally scrollable language chips.
- `UiLanguageSync` component bi-directionally syncs `profile.uiLanguage` ↔ localStorage so choice follows user across devices.
- Added `uiLanguage?: OutputLanguage` to `CreatorProfile` type.
- **Output language stays independent** — picked per-script on ScriptWriter, doesn't change UI language.

### Settings validation (NEW)
- New `src/lib/validateMeaningful.ts` — Zod refinement rejecting gibberish.
- Rules: vowel presence check, no keyboard-mash patterns (`qwerty`, `asdf`, `zxcv`, `1234`), no single repeated chars, ≥2 distinct word tokens for long fields.
- Applied to all free-text Settings fields EXCEPT `handle` (which can be `@anything.123`).
- Error message: "Please write this properly so we can generate good scripts for you."

### Mobile UX polish
- `Picker` component switched to **bottom-sheet style on mobile** — `fixed bottom-24 left-4 right-4 max-h-[55vh]`, stronger glass effect (`backdrop-blur-2xl bg-[#0E0E0E]/90`), dimmed backdrop overlay.
- Desktop behavior unchanged (inline popover below trigger).
- Fixes earlier issue where dropdown options were hidden behind the bottom nav.
- 48px minimum touch target heights.

### Analytics (NEW)
- **Google Analytics 4** — Measurement ID `G-JPZ7157J7D`, gtag inline in `index.html`. `anonymize_ip: true`.
- CSP updated to allow `googletagmanager.com`, `google-analytics.com`, `analytics.google.com`.

### SEO (NEW)
- `public/sitemap.xml` — 8 URLs (home, login, pricing, script-writer, multipost, feedback, privacy, terms).
- `public/robots.txt` — allow all crawlers, disallow `/__/` and `/api/`, sitemap reference.
- **Google Search Console** — verified via DNS TXT (Domain property type, covers all subdomains). Sitemap submitted. URL inspection requested for `/` and `/pricing`.

### Legal pages (NEW)
- `src/pages/PrivacyPolicy.tsx` — public route `/privacy`. DPDP Act 2023 compliant. 10 sections including retention table (3h for media, 7 years for payment records), third-party services list, user rights, contact.
- `src/pages/TermsOfService.tsx` — public route `/terms`. Refund policy (full refund within 7 days if 0 paid generations used), AI output disclaimer, IP rights, India jurisdiction (West Bengal).
- Both routes added to `App.tsx` **outside `ProtectedRoute`** so Google's OAuth verifier + search crawlers can access them without auth.
- Footer with Privacy/Terms/Pricing/Contact links added to `PageContainer` and `Login` page.

### CSP updates (`firebase.json`)
- `connect-src` now allows: `google.com`, `recaptcha.net` (App Check), `google-analytics.com`, `analytics.google.com`, `stats.g.doubleclick.net`
- `script-src` now allows: `googletagmanager.com`
- `img-src` now allows: `google-analytics.com`, `googletagmanager.com`

### OAuth verification (paused — non-blocking)
- App branding submitted with logo, privacy/terms URLs, authorized domain.
- Google's verifier kept failing despite valid setup (likely stale cache or undocumented requirement).
- Hidden `<div style="display:none">` in `index.html` with absolute-URL legal links — keeps DOM clean while satisfying HTML crawlers.
- `<link rel="privacy-policy">` + `<link rel="terms-of-service">` meta tags in `<head>`.
- **Decision: skip OAuth verification for now.** Users see one "Continue anyway" prompt on first sign-in — non-blocking for launch.

### Commits pushed today
- `28e533a` — fix(pricing): restore correct plan limits (free: 3, max: 300)
- `080d619` — feat(plans): bump Max plan limit 300 → 350
- `99bfb3d` — fix(picker): mobile dropdown bottom-sheet style
- `bf5e036` — feat(legal): add Privacy Policy + Terms of Service pages
- `13b359c` — feat(seo+analytics): GA4, sitemap, robots, OAuth verification scaffolding

### Production state at end of session
- ✅ publishkit.in live with SSL
- ✅ Real Razorpay payments capturing INR
- ✅ Razorpay verification submitted (24-48h pending approval for publishkit.in)
- ✅ GA4 tracking
- ✅ Search Console submitted
- ⏸️ Google OAuth verification paused (non-blocking)
- ⏸️ Throwaway test Gmail (`themreview082@gmail.com`) — keep until Razorpay approves publishkit.in, then delete

## [2026-05-19] Creator Profile Questionnaire + Profile-Aware Script Prompt
- **Settings page rewrite** — 30-question Script System questionnaire in 4 sections (basics / audience / voice & tone / advanced). 10 required fields, 20+ optional behind 2 collapsibles. Empty optionals stripped via `deleteField()` so Firestore stays clean.
- **`CreatorProfile` extended** — new fields: positioning, targetAudience, tone, audiencePainPoint, audienceLevel, audienceTransformation, catchphrases, avoidWords, hookStyle, ctaStyle, contentPillars, preferredVideoLength, age, whatMakesDifferent, personalStory, credentials, addressForm, usesSlang/usesMemes/usesCursing, bestVideoHooks, hookFormulas. Existing user docs unaffected (all new fields optional).
- **`handleScript.ts`** — reads full profile, builds Creator / Audience / Voice & Tone blocks, injects into Gemini prompt. Anti-prompt-injection structural invariant preserved (language directive + Requirements always AFTER user text). Each field sanitized (control chars stripped) + length-capped to bound prompt-injection cost-burn.
- **Commit:** `3186897` — pushed to `main` + `origin/main`. Functions + hosting deployed.

## [2026-05-18] Security Hardening Pass 4 — Vibe Coding 7-point Audit
- Frontend filename sanitization in `useUpload.tsx` (defense-in-depth match with backend `sanitizeFileName`).
- `brace-expansion` MODERATE ReDoS (GHSA-jxxr-4gwj-5jf2) fixed via `npm audit fix` — root now 0 CVEs.
- 7-point checklist documented in `SECURITY.md` for quarterly re-runs.
- **Commit:** `8c50fbe`.

## [2026-05-17] Security Hardening Pass 3 — Burst limit + webhook idempotency + input caps
- `enforceBurstLimit` (60s sliding-window ring buffer) — Free 2/min, Pro 8/min, Max 20/min — wired into `processAudio`, `handleScript`, `handleRepurposing`.
- Webhook event-ID dedup table `webhookEvents/{eventId}` (admin-SDK-only) blocks Razorpay replay and retry double-processing.
- Input length caps in `handleRepurposing`: title ≤ 500, description ≤ 2000, control chars stripped via `sanitizeUserText()`.
- `cleanup.ts` extended to prune `webhookEvents/` older than 7 days.
- `SECURITY.md` rewritten as current-state source of truth.
- **Commit:** `50e275c`.

## [2026-05-16] Security Hardening Pass 2 — Razorpay billing path
- Timing-safe HMAC via `crypto.timingSafeEqual` (was string `!==`).
- Webhook plan allowlist (`{'pro','ultra'}`) blocks plan-tampering payloads.
- UID-shape regex validation on webhook payloads.
- Duplicate-subscription block in `createSubscription`.
- Stale-cancel filter — only revert plan if `subId` matches stored.
- Legacy client-writable `ultraTrials/` Firestore rule deleted.
- Generic client-facing errors (no upstream leak).
- `fast-xml-builder` HIGH CVE fixed via `npm audit fix`.
- **Commit:** `fb8a8ff`.

## [2026-05-15] Razorpay Live Mode
- Migrated `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` to live values.
- Live plan IDs: Pro `plan_Spz2M0sp8rv1SA`, Max `plan_SqU3YCU38LA6aw`.
- `deploy-razorpay.ps1` rewritten ASCII-only + file-based secret upload (PS5.1 stdin pipe adds CRLF that breaks HMAC).
- End-to-end smoke verified: ₹299 Pro purchase, subscription doc written, plan reflected in UI, cancel webhook reverts plan.
- **Commit:** `71d20a2`.

## [2026-05-14] 13 Output Languages + MultiPost Rename + Plan Rename
- Output languages widened to 13: English, Hindi, Hinglish, Telugu, Tamil, Gujarati, Marathi, Punjabi, Bengali, Malayalam, Kannada, Bhojpuri, Urdu. Shared registry in `src/lib/languages.ts` + `functions/src/lib/languages.ts`.
- "Repurposing Planner" renamed to **MultiPost** everywhere (route `/multipost`, component, copy).
- Display name "Ultra Plan" renamed to **Max Plan**. Internal IDs unchanged (`'ultra'`) to preserve live subscription continuity.
- Monthly quota model: Free 10, Pro 100, Max 1000 across all 3 features.
- MultiPost auto-trigger on Home upload + persistence of `multiPostOutput` to the result doc.
- **Commits:** `f652df8`, `cded4e4`, `d082094`.

## [2026-05-13] Settings, Sign-out, and Tab Reset Fixes
- Clicking "New" tab or logo always calls `reset()` in `useUpload`.
- `logout()` removes `activeResultId_` + `pendingUpload_` from localStorage before sign-out.
- `reset()` also clears `isUploading` to fix stuck-processing state.

## [2026-05-12] Feedback Board & Reply System

### ✨ New Features
- **Feedback Board Page** (`/feedback`) — Public-facing feature request board
  - Vote on existing feature requests (signed-in users only)
  - Submit new feature requests with title + description
  - Real-time updates using Firestore onSnapshot
  - Status badges (pending, planned, completed)
  - Sort by votes (descending) then creation date

- **Reply/Answer System** — Comment-like functionality for feedback
  - Expand/collapse replies section for each feedback item
  - Signed-in users can post replies to feedback
  - Replies show author name, timestamp, and message
  - Real-time replies loading via Firestore sub-collection
  - YouTube-style single-level replies (no nested threads)

- **Navbar Update** — Added Feedback navigation link
  - Desktop: Text link between History and Settings
  - Mobile: Icon button in bottom navigation bar

### 🔐 Security & Database
- **Firestore Rules** — New feedback collection rules:
  ```
  match /feedback/{feedbackId} {
    allow read: if true;                    // Anyone can read
    allow create: if request.auth != null;  // Signed-in users can create
    allow update: if request.auth != null;  // Signed-in users can vote
    allow delete: if request.auth != null && request.auth.uid == resource.data.uid;
    
    match /replies/{replyId} {
      allow read: if true;                  // Anyone can read replies
      allow create: if request.auth != null;  // Signed-in users can reply
      allow delete: if request.auth != null && request.auth.uid == resource.data.uid;
    }
  }
  ```

### 🐛 Bug Fixes
- Fixed TypeScript compilation errors (unused imports in Feedback.tsx, ResultTabs.tsx)
- Added error handling to feedback loading with proper error logging
- Improved onSnapshot error callbacks to prevent stuck loading states

### 📝 Documentation Updates
- Updated GEMINI.md with new Feedback Board architecture
- Added Firestore collection schema documentation
- Documented security rules for feedback & replies

### 📦 Database Collections

**feedback/{feedbackId}**
```typescript
{
  id: string;
  title: string;              // Feature request title
  description: string;        // Detailed description
  votes: number;             // Total vote count
  votedBy: string[];         // Array of user UIDs who voted
  uid: string;               // Creator's UID
  userName: string;          // Creator's display name
  status: 'pending' | 'planned' | 'completed';
  createdAt: Timestamp;
}
```

**feedback/{feedbackId}/replies/{replyId}**
```typescript
{
  id: string;
  text: string;              // Reply content
  uid: string;               // Author's UID
  userName: string;          // Author's display name
  createdAt: Timestamp;
}
```

### 🚀 Deployment
- **Commit:** `b7444e0` — feat: add reply/answer functionality to feedback board
- **Status:** ✅ Live on https://publishkit.web.app
- **Components Updated:** Frontend + Firestore Rules
- **Functions:** Unchanged (no backend modifications needed)

---

## [2026-05-11] Feedback Board Initial Setup & Bug Fixes

### ✨ Features
- Feedback Board page layout with header and "New Request" button
- Modal for submitting feature requests
- Voting system with vote count display
- Real-time feedback list with Firestore integration
- Status badges for feedback items
- Empty state UI ("No requests yet. Be the first!")

### 🐛 Fixes
- Caching precision: Added generateThumbnails to cache key in processAudio.ts
- Failure UI visibility: showProcessing stays true on failed status
- Recovery error handling: setIsUploading guaranteed in finally block

### 📱 UI Enhancements
- Celebratory feedback card post-generation (signed-in users)
- Share feedback button in Navbar
- Emil Kowalski design polish (active:scale-95 micro-interactions)

---

## Getting Help
- See GEMINI.md for project setup and architecture
- Check git log for detailed commit messages
- File issues on GitHub: https://github.com/ravishankaraiofficial/publishkit
