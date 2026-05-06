# PublishKit — Deployment & Operations Reference
Generated: 2026-05-06

---

## SECTION 1 — Deployment History

| # | Date | What Was Deployed | URL | Errors | Fix Applied |
|---|---|---|---|---|---|
| 1 | 2026-05-03 | Initial project scaffold (Vite + React + Firebase init) | localhost only | None | — |
| 2 | 2026-05-04 | First Firebase Hosting deploy after core build | publishkit.web.app | Build errors (missing env vars) | Added `.env` with VITE_FIREBASE_* vars |
| 3 | 2026-05-04 | Cloud Functions first deploy (processAudio, cleanup) | — | Functions build errors (tsc) | Fixed TypeScript types in functions/src |
| 4 | 2026-05-04 | Full deploy — Hosting + Functions + Firestore rules + Storage rules | publishkit.web.app | `GEMINI_API_KEY` secret not set | Set secret via `firebase functions:secrets:set GEMINI_API_KEY` |
| 5 | 2026-05-04 | Multimodal support (PDF + Image uploads) deployed | publishkit.web.app | Storage rules missing `/uploads/` path | Added `/users/{uid}/uploads/{fileName}` match to storage.rules |
| 6 | 2026-05-05 | Guest free trial system + security hardening | publishkit.web.app | None | — |
| 7 | 2026-05-05 | Navigation state persistence (useUpload context) | publishkit.web.app | TypeScript error: `ReactNode` not type-only import + unused vars | Fixed import syntax, removed unused `signInWithGoogle` and `getStatusCycle` |
| 8 | 2026-05-05 | History tab on Home page + Navbar Sign In/Out fix | publishkit.web.app | Floating tab overlapped Sign In card | Changed from `fixed` positioned to inline block |
| 9 | 2026-05-05 | Final deploy — History tab repositioned above Sign In button | publishkit.web.app | None | — |

**Live Hosting URL:** `https://publishkit.web.app`  
**Alternate URL:** `https://gen-lang-client-0079285803.web.app`

---

## SECTION 2 — Firebase Project Configuration

| Setting | Value |
|---|---|
| **Project ID** | `gen-lang-client-0079285803` |
| **Project Name** | gen-lang-client-0079285803 |
| **Firebase Hosting Site** | `publishkit` (custom site name) |
| **Hosting URL** | `https://publishkit.web.app` |

### Firebase Services Enabled

| Service | Status | Details |
|---|---|---|
| **Authentication** | ✅ Enabled | Google provider + Anonymous provider |
| **Firestore** | ✅ Enabled | Production mode, nam5 region (default) |
| **Storage** | ✅ Enabled | Default bucket |
| **Cloud Functions** | ✅ Enabled | Node 20 runtime, default region (us-central1) |
| **Firebase Hosting** | ✅ Enabled | Site name: publishkit |
| **App Check** | ❌ Not enabled | Recommended next step |

### Authentication Providers
- **Google** — popup on desktop, redirect on mobile
- **Anonymous** — auto sign-in for guest users

### authDomain
Set to `publishkit.web.app` (not the default `gen-lang-client-0079285803.firebaseapp.com`) to enable mobile Google redirect without cross-origin storage blocks.

### Firestore
- Mode: Native
- Region: nam5 (us-central1)
- Collections: `users/{uid}/results`, `users/{uid}/usage`, `guestUsage`

### Storage
- Bucket: `gen-lang-client-0079285803.appspot.com` (default)
- File paths: `users/{uid}/audio/` and `users/{uid}/uploads/`

### Cloud Functions
- Runtime: Node 20
- Region: us-central1 (default)
- Functions deployed: `processAudio`, `processAudioWorker`, `deleteOldAudio`

---

## SECTION 3 — All Build Commands Run (in order)

```bash
# Project initialization
npm create vite@latest . -- --template react-ts
npm install

# Firebase setup
npm install -g firebase-tools
firebase login
firebase init   # selected: Firestore, Functions, Hosting, Storage

# Install frontend dependencies
npm install firebase react-router-dom lucide-react tailwindcss @tailwindcss/vite
npm install @tanstack/react-query react-hook-form @hookform/resolvers zod
npm install clsx tailwind-merge
npm install @google/generative-ai @ffmpeg/ffmpeg @ffmpeg/util

# Install functions dependencies
cd functions
npm install @google/generative-ai firebase-admin firebase-functions
cd ..

# Set Gemini API key as Firebase secret
firebase functions:secrets:set GEMINI_API_KEY

# Build and deploy commands (run multiple times throughout development)
npm run build
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage
firebase deploy   # full deploy

# PowerShell-compatible sequential deploy (Windows)
npm run build; firebase deploy --only hosting
```

---

## SECTION 4 — Environment Variables and Secrets

### Frontend `.env` file (VITE_* variables — safe to be in frontend code)
- `VITE_FIREBASE_API_KEY` — Firebase Web API Key (restricted to publishkit.web.app in Google Cloud Console)
- `VITE_FIREBASE_AUTH_DOMAIN` — set to `publishkit.web.app`
- `VITE_FIREBASE_PROJECT_ID` — Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` — Firebase Storage bucket name
- `VITE_FIREBASE_MESSAGING_SENDER_ID` — Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` — Firebase app ID

### Cloud Functions Secrets (stored in Google Secret Manager — never in code)
- `GEMINI_API_KEY` — Google AI Studio API key for Gemini 2.5 Flash

### API Key Security
The Firebase Web API Key (`VITE_FIREBASE_API_KEY`) has **HTTP Referrer Restrictions** applied in Google Cloud Console:
- `https://publishkit.web.app/*`
- `https://publishkit.firebaseapp.com/*`
- `http://localhost:5173/*`
- `http://127.0.0.1:5173/*`

---

## SECTION 5 — Firebase Free Tier Usage Estimates

> These are estimates based on typical usage patterns. Check Firebase Console for exact numbers.

| Service | Free Tier Limit | Estimated Daily Usage | Notes |
|---|---|---|---|
| **Firestore reads** | 50,000/day | ~500–2,000/day | Each page load reads results; onSnapshot counts as reads |
| **Firestore writes** | 20,000/day | ~100–500/day | Each generation writes 1 result doc + 1 usage doc |
| **Firestore deletes** | 20,000/day | ~50–200/day | Cleanup function deletes old docs hourly |
| **Storage** | 5 GB stored | <0.1 GB | Files auto-delete after 3 hours |
| **Storage downloads** | 1 GB/day | ~100 MB/day | Functions download files for processing |
| **Cloud Functions invocations** | 2,000,000/month | ~200–1,000/month | processAudio + processAudioWorker per generation |
| **Cloud Functions compute** | 400,000 GB-seconds/month | Low | Worker uses 1GB × ~30s avg = 30 GB-s per call |
| **Hosting bandwidth** | 10 GB/month | ~500 MB/month | 820KB bundle served to each visitor |
| **Gemini API** | Free tier via AI Studio | ~100–500 calls/month | Not a Firebase service — separate quota |

**Current Status:** Well within free tier limits. No services approaching limits based on current traffic.

---

## SECTION 6 — Errors Encountered and Fixes Applied

| Error | Where | Fix |
|---|---|---|
| `VITE_FIREBASE_API_KEY` undefined in build | Frontend `.env` not created | Created `.env` file with all VITE_* variables |
| `auth/internal-error` on mobile Google sign-in | `authDomain` was default `.firebaseapp.com` | Changed `authDomain` to `publishkit.web.app` in firebase.ts |
| Cloud Functions deploy failed: `tsc` error | functions/src missing types | Fixed TypeScript types, added proper imports |
| `GEMINI_API_KEY` not available in function | Secret not set | `firebase functions:secrets:set GEMINI_API_KEY` |
| Storage upload failing for PDF/Image | Storage rules only had `/audio/` path | Added `/users/{uid}/uploads/{fileName}` rule to storage.rules |
| File upload disappearing on navigation | Upload state lived inside Home.tsx component | Moved all upload state to global `useUpload` context in App.tsx |
| `ReactNode` import error in `useUpload.tsx` | `verbatimModuleSyntax` requires type-only imports | Changed to `import type { ReactNode }` |
| Unused variable TypeScript errors | `signInWithGoogle` and `getStatusCycle` declared but not used | Removed from Home.tsx; removed `signInWithGoogle` from Navbar destructure |
| History tab overlapping Sign In button | Tab was `position: fixed` at bottom of screen | Changed to inline `mt-12 mb-8` block below main content |
| Build succeeded but old version deployed | Previous build had TypeScript error, Firebase deployed stale `dist/` | Fixed TS error, ran `npm run build` again, redeployed |
| `&&` not valid in PowerShell | Used `&&` to chain commands | Switched to `;` for PowerShell command chaining |
| `auth/popup-blocked` on some mobile browsers | Popup blocked by mobile browser | Added redirect fallback for mobile (`isMobileDevice()` check) |
| Anonymous user re-created after Google sign-in | `onAuthStateChanged(null)` fired during sign-out of anonymous session | Added `googleSignInActive` module-level flag to prevent race condition |

---

## SECTION 7 — Current Live App Status

**Live URL:** `https://publishkit.web.app`

| Feature | Status | Notes |
|---|---|---|
| Login / Google Sign-In | ✅ Working | Popup on desktop, redirect on mobile |
| Anonymous guest free trial | ✅ Working | 1 free session per anonymous UID |
| Guest quota enforcement | ✅ Working | Server-side via `guestUsage` Firestore collection |
| Creator profile setup (first time) | ✅ Working | `/setup` page saves to Firestore |
| Audio upload + processing | ✅ Working | Transcription + 5 titles + timestamps + description |
| PDF upload + analysis | ✅ Working | Summary + description via Gemini multimodal |
| Image upload + analysis | ✅ Working | Summary + description via Gemini multimodal |
| Optional thumbnail prompts | ✅ Working | Toggle on Home page, off by default |
| Real-time processing status | ✅ Working | `onSnapshot` listener in `useUpload` context |
| Hindi language output | ✅ Working | Language selector on Home page |
| History page | ✅ Working | Shows last 50 results with expand/delete |
| Real-time history updates | ❌ Not working | History uses one-time `getDocs`, not live listener |
| Settings page (profile edit) | ✅ Working | Saves to Firestore, refreshes in-memory profile |
| Sign Out with toast notification | ✅ Working | Toast shows "Signed out successfully" |
| Sign In / Sign Out in Navbar | ✅ Working | Shows correct label based on auth state |
| "View History" tab on Home page | ✅ Working | Inline tab above Sign In button |
| Auto file cleanup (3 hours) | ✅ Working | Scheduled Cloud Function runs hourly |
| Rate limiting (10/day per user) | ✅ Working | Server-side in `rateLimit.ts` |
| Upload state persists across navigation | ⚠️ Partial | Works once `resultId` exists; lost during first ~2s of upload |
| App Check / bot protection | ❌ Not enabled | Recommended but not implemented |

---

## SECTION 8 — Pending Deployments

As of 2026-05-06, **no changes are pending**. The last deployed build matches the current local code.

All recent changes (useUpload context, Navbar Sign In/Out, History tab positioning) have been built and deployed via `firebase deploy --only hosting`.

Cloud Functions have **not been redeployed** since the multimodal support update. If any function code changes are made, run:
```bash
firebase deploy --only functions
```

---

## SECTION 9 — GitHub Status

- **Is the project pushed to GitHub?** ❌ No
- **Repository URL:** None (no remote configured)
- **Git status:** A local git repository exists (`.git` folder present) but has **no commits yet** (`fatal: your current branch 'master' does not have any commits yet`)
- **Uncommitted changes:** All project files are untracked / uncommitted

### Recommended — Push to GitHub

```bash
# Initialize, add all files, make first commit
git add .
git commit -m "feat: initial production deploy of PublishKit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/publishkit.git
git push -u origin master
```

---

## SECTION 10 — Recommended Next Steps

### 1. Push to GitHub (Critical)
The entire codebase only exists on your local machine. If your computer has a problem, everything is lost. Create a GitHub repository immediately and push all code.

### 2. Fix the Upload State Loss in First 2 Seconds
**Problem:** If user navigates away during the initial Storage upload phase (before `processAudio` cloud function is called and returns a `resultId`), the Home page shows nothing on return.

**Fix:** Add a `pendingUpload` state to `useUpload` context (just the filename) that is set immediately when the user picks a file, before the upload completes. Store it in `localStorage`. On Home page mount, if `pendingUpload` exists but no `resultId`, show a "Uploading..." indicator even before the Firestore doc is created.

### 3. Enable App Check (Security)
Firebase App Check with reCAPTCHA v3 will block bots from calling your Cloud Functions directly, protecting your Gemini API quota and Firebase usage.
```bash
# In Google Cloud Console: enable App Check for your project
# In code: uncomment the App Check lines in firebase.ts
```

### 4. Make History Page Real-Time
Currently `PastResults.tsx` uses `getDocs` (one snapshot). Switch to `onSnapshot` so a file that is processing when the user opens History will update to "complete" without a page refresh.

### 5. Remove Unused Packages
`@ffmpeg/ffmpeg` and `@ffmpeg/util` are installed but unused. They add significant bundle size (~8MB). Remove them:
```bash
npm uninstall @ffmpeg/ffmpeg @ffmpeg/util
```
This will reduce the JavaScript bundle from ~820KB to a significantly smaller size, improving load time — especially on mobile.
