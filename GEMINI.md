# Project Instructions — PublishKit (Google Antigravity Files)

## Project Identity
- **App Name:** PublishKit
- **Live URL:** https://publishkit.web.app
- **GitHub:** https://github.com/ravishankaraiofficial/publishkit
- **Firebase Project:** `gen-lang-client-0079285803`
- **Root Directory:** `D:\Project\Project 01\Google Antigravity Files`
- **Last Updated:** 2026-05-11

---

## Development Workflow
- **Frontend dev server:** `npm run dev` (run in root directory)
- **Backend watch mode:** `npm run build:watch` (run inside `functions/` directory)
- **Deploy frontend only:** `npm run build && firebase deploy --only hosting`
- **Deploy everything:** `firebase deploy`

## Conventions
- Use relative paths in all configuration files to maintain portability.
- Gemini API key lives in **Firebase Secret Manager** (`GEMINI_API_KEY`). Never put it in `.env` or source code.
- All monetary values in INR (₹). Budget cap = ₹6,000/month.

---

## Current Production Status (as of 2026-05-12)
**The app is LIVE and LAUNCH-READY. All known bugs are fixed. No known blockers.**

### Latest Deployed Commit
`b7444e0` — "feat: add reply/answer functionality to feedback board"

### Recent Changes (2026-05-12)
- ✅ Feedback Board page fully implemented with voting system
- ✅ Reply/answer functionality (like YouTube comments) 
- ✅ Firestore Security Rules for feedback & replies collections
- ✅ Error handling and TypeScript fixes
- ✅ Navbar updated with Feedback navigation button

---

## Architecture Overview

### Frontend (`src/`)
| File | Purpose |
|---|---|
| `src/lib/firebase.ts` | Firebase init. Uses **ReCaptchaEnterpriseProvider** for AppCheck (Site Key: `6LcapOQsAAAAAIruihJKCmhDKLWmKhp2I9VqgYKh`) |
| `src/hooks/useAuth.tsx` | Auth context. Handles Google OAuth (popup desktop / redirect mobile), anonymous guest sign-in, race condition prevention, and `freeTrialUsed` localStorage flag |
| `src/hooks/useUpload.tsx` | Upload state machine. Includes refresh-recovery logic that re-calls the backend if a user refreshes mid-upload |
| `src/pages/Home.tsx` | Main page. Thumbnail toggle is `sm:max-w-[600px]` on desktop to match the free-session banner width |
| `src/pages/Login.tsx` | Reads `location.state?.explicitSignIn` to bypass automatic guest redirect when user intentionally clicks Sign In |
| `src/pages/PastResults.tsx` | History page. Uses `onSnapshot` (real-time, NOT `getDocs`) |
| `src/components/layout/Navbar.tsx` | Passes `{ state: { explicitSignIn: true } }` when navigating to `/login` from Sign In button; includes Feedback link |
| `src/components/results/ResultTabs.tsx` | Shows per-tab partial error messages if one of the parallel AI calls fails |
| `src/components/ui/ColorPicker.tsx` | Shared reusable color picker component (used by Settings + SetupProfile) |
| `src/lib/colors.ts` | Shared color processing utilities (extracted from Settings + SetupProfile to eliminate duplication) |
| `src/types/index.ts` | `partialErrors?: Record<string, string> \| null` — matches backend output exactly |
| `src/pages/Feedback.tsx` | Feedback Board with voting, feature requests, and reply system (like YouTube comments) |

### Backend (`functions/src/`)
| File | Purpose |
|---|---|
| `processAudio.ts` | Firebase callable + Firestore onCreate trigger worker |
| `generate.ts` | Gemini 2.5 Flash calls for titles, timestamps, description, thumbnails |
| `transcribe.ts` | Gemini native audio transcription |
| `cleanup.ts` | Scheduled function — deletes files 3 hours after processing |
| `middleware/auth.ts` | VPN/proxy detection + per-device fingerprint enforcement |
| `middleware/rateLimit.ts` | 10 uploads/day per signed-in user |

---

## Key Decisions & Constraints

### Security
- **AppCheck:** `ReCaptchaEnterpriseProvider` is active. The old `ReCaptchaV3Provider` caused 400 errors and was replaced.
- **Guest abuse:** 1 free trial per anonymous UID (server-side) + device fingerprinting via `@fingerprintjs/fingerprintjs` (hardware-level).
- **Incognito bypass:** Guests in Incognito see the main page but are blocked at upload time by fingerprint+IP. This is by design — it is technically impossible to block page loads in Incognito mode on any website.

### Authentication Flow
- Desktop: `signInWithPopup`
- Mobile: `signInWithRedirect` (to avoid cross-origin storage blocks)
- `freeTrialUsed` localStorage flag is cleared in 3 places: `onAuthStateChanged` (for any real user), `getRedirectResult` (mobile redirect case), and `signInWithPopup` success (desktop case).
- The Sign In button in Navbar uses `navigate('/login', { state: { explicitSignIn: true } })` to prevent the Login page from bouncing users back to Home before their trial is used.

### Financial Protection
- **Gemini API:** Paid billing project retained for enterprise-level privacy (data not used for training).
- **Hard Quota Cap:** Google Cloud → APIs & Services → Generative Language API → Quota set to **8,000 requests/day** for `gemini-2.5-flash`. This mathematically caps spend at ~₹6,000/month even at 100% daily saturation.
- **Budget Alert:** ₹1,000 email alert configured in Google Cloud Billing.
- **No kill-switch function needed:** The quota cap at the API level is the hard stop.

### Upload Recovery ("Blind Spot" Fix)
When a user uploads a file, `storagePath` and `fileSize` are now persisted to localStorage inside `PendingUpload` BEFORE the backend call returns a `resultId`. If the user refreshes in this 1-2 second window, `useUpload.tsx` automatically re-triggers `processAudioCall` on mount, which is idempotent due to the 7-day cache on the backend.

### Feedback Board System
**Collections:**
- `feedback/{feedbackId}` — Main feedback items with fields: title, description, votes, votedBy[], uid, userName, status, createdAt
- `feedback/{feedbackId}/replies/{replyId}` — Replies/answers with fields: text, uid, userName, createdAt

**Features:**
- Public read access (anyone can see feedback + replies)
- Signed-in users only: create feedback, vote, post replies
- Only content creator can delete their own feedback/replies (Firestore rule enforced)

---

## What NOT To Change (Intentional Design)
- **Thumbnail toggle visible before file select** — it's a pre-upload option; shown regardless of file type. Thumbnails are forcibly disabled for PDFs/images in the backend call (`generateThumbnails: isAudio ? thumbnailPromptEnabled : false`).
- **No batch upload** — intentional to protect the ₹6,000/month quota cap.
- **No YouTube Data API** — requires lengthy OAuth approval from Google; not needed for the core UX.
- **No Gemini streaming** — backend uses a Firestore Worker trigger, which is incompatible with streaming architecture.
- **History uses onSnapshot** — already real-time; `getDocs` is only used for bulk-delete operations (intentional one-shot query).

---

## Packages
### Frontend (`package.json`)
Heavy packages removed: `@ffmpeg/ffmpeg`, `@ffmpeg/util`, frontend `@google/generative-ai`. These are NOT in the frontend bundle.

### Backend (`functions/package.json`)
`@google/generative-ai` IS present and required here (backend only).

---

## Environment Variables (`.env` in root)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_RECAPTCHA_SITE_KEY=6LcapOQsAAAAAIruihJKCmhDKLWmKhp2I9VqgYKh
```
