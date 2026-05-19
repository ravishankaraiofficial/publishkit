# PublishKit Changelog

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
