# PublishKit — Complete Codebase Reference

> Last updated: 2026-05-06 · Build marker: `2026-05-05-c`
> Live app: [publishkit.web.app](https://publishkit.web.app)
> GitHub: [github.com/ravishankaraiofficial/publishkit](https://github.com/ravishankaraiofficial/publishkit)

---

## Table of Contents

1. [Complete File Tree](#1-complete-file-tree)
2. [Every Component](#2-every-component)
   - [Entry Points](#entry-points)
   - [Context Providers & Hooks](#context-providers--hooks)
   - [Layout Components](#layout-components)
   - [UI Primitives](#ui-primitives)
   - [Upload Components](#upload-components)
   - [Result Components](#result-components)
   - [Pages](#pages)
   - [Library Utilities](#library-utilities)
   - [Types](#types)
3. [Every Cloud Function](#3-every-cloud-function)
4. [All Changes from Vite Starter](#4-all-changes-from-vite-starter)
5. [Firestore Rules (exact)](#5-firestore-rules-exact)
6. [Storage Rules (exact)](#6-storage-rules-exact)
7. [firebase.json (exact)](#7-firebasejson-exact)
8. [All npm Packages](#8-all-npm-packages)
9. [Known Bugs & Incomplete Features](#9-known-bugs--incomplete-features)
10. [Current App State Summary](#10-current-app-state-summary)

---

## 1. Complete File Tree

```
publishkit/
├── src/
│   ├── main.tsx                          # React root — mounts <App /> with StrictMode
│   ├── App.tsx                           # Provider tree + BrowserRouter + route map
│   ├── index.css                         # Global styles, animations (eq-bars, fade-in, hero-glow)
│   ├── App.css                           # Minimal — mostly empty after Vite cleanup
│   │
│   ├── types/
│   │   └── index.ts                      # CreatorProfile, Result interfaces
│   │
│   ├── lib/
│   │   ├── firebase.ts                   # Firebase app init; exports auth, db, storage, functions
│   │   ├── api.ts                        # processAudioCall — httpsCallable wrapper
│   │   └── utils.ts                      # cn() helper (clsx + tailwind-merge)
│   │
│   ├── hooks/
│   │   ├── useAuth.tsx                   # AuthContext + AuthProvider; Google OAuth, anonymous, logout
│   │   └── useUpload.tsx                 # UploadContext + UploadProvider; upload, status, result listener
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLoader.tsx             # Full-screen loader with rotating tips, shown while auth resolves
│   │   │   ├── PageContainer.tsx         # Page wrapper — glow blobs + Navbar
│   │   │   ├── Navbar.tsx                # Top nav: logo, Settings link, History link, user avatar + logout
│   │   │   └── ProtectedRoute.tsx        # Route guard — redirects guests and unauthed users
│   │   │
│   │   ├── ui/
│   │   │   ├── Button.tsx                # 3-variant button (primary / outline / danger) + isLoading spinner
│   │   │   ├── Input.tsx                 # Label + input + error text
│   │   │   ├── Card.tsx                  # Card / CardHeader / CardTitle / CardDescription / CardContent
│   │   │   ├── Spinner.tsx               # Simple spinning border ring
│   │   │   └── Toast.tsx                 # Context-based toast system (success / error / info) — 4s auto-dismiss
│   │   │
│   │   ├── upload/
│   │   │   └── DropZone.tsx              # Drag-drop + click to upload; validates MIME type + 200 MB size
│   │   │
│   │   └── results/
│   │       ├── ResultTabs.tsx            # Tab UI: audio → Titles/Timestamps/Description/Thumbnails
│   │       │                             #         document → Summary/Description
│   │       └── CopyButton.tsx            # Clipboard copy with 2s "Copied ✓" feedback
│   │
│   └── pages/
│       ├── Home.tsx                      # Main page: upload zone, processing card, results + guest CTAs
│       ├── Login.tsx                     # Google sign-in page with feature bullets + free-trial messaging
│       ├── Settings.tsx                  # Creator profile form with react-colorful color picker
│       ├── SetupProfile.tsx              # First-time profile setup (shown after first Google sign-in)
│       ├── PastResults.tsx               # History page: expand/collapse, multi-select delete, bulk delete
│       └── AccessPending.tsx             # Shown when Firestore returns permission-denied (not whitelisted)
│
├── functions/
│   └── src/
│       ├── index.ts                      # Exports: processAudio, processAudioWorker, deleteOldAudio
│       ├── processAudio.ts               # Callable function + Firestore-trigger worker
│       ├── generate.ts                   # generateOutputs() + analyzeDocument() — all Gemini generation
│       ├── transcribe.ts                 # transcribeAudio() — Gemini File API upload + transcription
│       ├── cleanup.ts                    # deleteOldAudio — hourly scheduled cleanup
│       │
│       ├── lib/
│       │   ├── gemini.ts                 # defineSecret('GEMINI_API_KEY'), getGeminiClient()
│       │   └── firestore.ts              # Firebase Admin SDK init; exports db, storage
│       │
│       ├── middleware/
│       │   ├── auth.ts                   # verifyWhitelist() — guest quota (1 free per UID)
│       │   └── rateLimit.ts              # checkRateLimit() / incrementRateLimit() — 10/day per user
│       │
│       └── prompts/
│           ├── titles.ts                 # getTitlesPrompt() — 5 ranked YouTube titles, JSON output
│           ├── timestamps.ts             # getTimestampsPrompt() — chapter timestamps, 150 wpm estimate
│           ├── description.ts            # getDescriptionPrompt() — YouTube description w/ [TIMESTAMPS_PLACEHOLDER]
│           └── thumbnails.ts             # getThumbnailsPrompt() — Imagen3 + DALL-E 3 prompts, JSON output
│
├── firestore.rules                       # Firestore security rules
├── firestore.indexes.json                # Firestore composite index definitions
├── storage.rules                         # Firebase Storage security rules
├── firebase.json                         # Hosting + Functions config + security headers
├── vite.config.ts                        # Vite config with @vitejs/plugin-react + @tailwindcss/vite
├── tsconfig.json                         # Root TypeScript config
├── tsconfig.app.json                     # App-specific TS config
├── tsconfig.node.json                    # Node/Vite TS config
├── eslint.config.js                      # ESLint config
├── package.json                          # Frontend dependencies
├── .env                                  # Firebase config — NOT committed (.gitignore'd)
├── .env.example                          # Template with placeholder values (committed)
├── .gitignore                            # Excludes .env, dist/, node_modules/, .firebase/, .claude/
└── README.md                             # Full project documentation for GitHub
```

---

## 2. Every Component

### Entry Points

#### `src/main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Standard React 19 entry point. Mounts the app into `#root`.

---

#### `src/App.tsx`

**Provider tree (outermost → innermost):**
```
QueryClientProvider   (TanStack Query — installed, minimal use)
  ToastProvider       (toast notification context)
    AuthProvider      (Firebase auth context)
      UploadProvider  (upload state — persists across page navigation)
        AuthGatedRoutes
```

**`AuthGatedRoutes`** — reads `loading` from `useAuth()`. While `true`, renders `<AppLoader />` to prevent the Login page from flashing during Firebase auth resolution. Once `false`, renders `<BrowserRouter>` with:

| Route | Component | Guard |
|---|---|---|
| `/login` | `Login` | Public |
| `/pending` | `AccessPending` | Public |
| `/` | `Home` | `ProtectedRoute` |
| `/setup` | `SetupProfile` | `ProtectedRoute` |
| `/settings` | `Settings` | `ProtectedRoute` |
| `/results` | `PastResults` | `ProtectedRoute` |

---

### Context Providers & Hooks

#### `src/hooks/useAuth.tsx`

**What it does:** Manages the complete Firebase authentication lifecycle.

**Context shape:**
```typescript
interface AuthContextType {
  user: User | null;               // Firebase User object
  profile: CreatorProfile | null;  // Firestore profile doc (null for anonymous users)
  loading: boolean;                // true while Firebase resolves auth state
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isWhitelisted: boolean | null;   // null=unknown, true=allowed, false=permission-denied
}
```

**Module-level state (outside React):**
```typescript
let googleSignInActive = false;
// Set true while Google sign-in is in progress.
// Prevents onAuthStateChanged(null) — fired when anonymous user signs out
// during Google popup — from starting a new signInAnonymously() call that
// would race the incoming Google session.
```

**Key closure state (inside useEffect):**
```typescript
let guestSignInStarted = false;   // prevents double anonymous sign-in
let redirectChecked = false;      // true after getRedirectResult() settles
```

**Auth flow for new anonymous visitor:**
1. App loads → `onAuthStateChanged(null)` fires
2. `redirectChecked` is `false` → wait (could be mobile redirect in flight)
3. `getRedirectResult()` resolves with no user → `redirectChecked = true`
4. `signInAsGuest()` → `signInAnonymously(auth)`
5. `onAuthStateChanged(anonymousUser)` → `setUser()`, `setLoading(false)`

**Auth flow for Google sign-in (desktop popup):**
1. `signInWithGoogle()` → `googleSignInActive = true`
2. Signs out anonymous user → `onAuthStateChanged(null)` suppressed by `googleSignInActive`
3. `signInWithPopup()` resolves → `onAuthStateChanged(googleUser)`
4. `fetchProfileAndWhitelist()` → reads Firestore `users/{uid}`
5. `googleSignInActive = false` in `finally`

**Device-aware sign-in:**
- Mobile (`/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i`) → `signInWithRedirect()`
- Desktop → `signInWithPopup()`
- Auth domain set to `publishkit.web.app` so redirect is same-origin (no cross-origin storage block)

**`logout()`:**
```typescript
const logout = async () => {
  // Set BEFORE signOut so the new anonymous session (created after sign-out)
  // does NOT pass ProtectedRoute and bounce back to Home.
  localStorage.setItem('freeTrialUsed', 'true');
  await signOut(auth);
};
```

**Silent auth errors** (swallowed, not shown to user):
```
auth/popup-closed-by-user
auth/cancelled-popup-request
auth/popup-blocked
auth/user-cancelled
auth/no-auth-event
auth/web-storage-unsupported
```

**8-second safety timeout:** If `onAuthStateChanged` never resolves (offline, etc.), forces `loading = false` so the UI doesn't stay stuck on the loader forever.

**`redirectChecked` logout handling:**
```typescript
} else if (redirectChecked) {
  // getRedirectResult has settled — null event means real logout.
  setUser(null);
  setProfile(null);
  setIsWhitelisted(null);
  setLoading(false);
  guestSignInStarted = false;
  signInAsGuest();  // re-create anonymous session in background
}
```

---

#### `src/hooks/useUpload.tsx`

**What it does:** Manages the full upload + processing lifecycle for the entire app.

**Context shape:**
```typescript
interface UploadContextType {
  isUploading: boolean;
  uploadProgress: number;               // 0–100 from Firebase Storage uploadTask
  statusIndex: number;                  // Index into statusCycle array
  statusCycle: string[];                // Rotating messages shown during processing
  outputLanguage: "English" | "Hindi";
  setOutputLanguage: (lang) => void;
  thumbnailPromptEnabled: boolean;
  setThumbnailPromptEnabled: (enabled) => void;
  resultId: string | null;              // Active Firestore result doc ID
  setResultId: (id) => void;
  result: Result | null;                // Current result data (from Firestore listener)
  setResult: (res) => void;
  quotaExceeded: boolean;               // True when guest hits 1-session limit
  setQuotaExceeded: (exceeded) => void;
  handleFileSelect: (file: File) => Promise<void>;
  reset: () => void;
}
```

**`handleFileSelect(file)` full flow:**
1. `setQuotaExceeded(false)` — clears stale quota state
2. Sets `statusCycle` from `getStatusCycle(file.type)`
3. `setIsUploading(true)`, `setStatusIndex(0)`, `setUploadProgress(0)`
4. Constructs Storage path: `users/{uid}/{audio|uploads}/{Date.now()}-{filename}`
   - Audio → `/audio/` subfolder
   - PDF/Image → `/uploads/` subfolder
5. `uploadBytesResumable()` with explicit `contentType` metadata
6. Progress callback → `setUploadProgress()`
7. On upload complete → calls `processAudioCall({ storagePath, audioFileName, audioSizeBytes, outputLanguage, generateThumbnails, fileType })`
8. On success → `setResultId(res.data.resultId)` — starts Firestore listener
9. On `functions/resource-exhausted` error:
   - `user.isAnonymous` → `localStorage.setItem('freeTrialUsed', 'true')` + `setQuotaExceeded(true)` → shows sign-in card
   - Google user → `toast('You\'ve reached your upload limit for today. Try again tomorrow.', 'error')`
10. Other errors → generic error toast

**Status cycle messages by file type:**

| File type | Messages |
|---|---|
| `audio/*` | "Uploading audio…" → "Transcribing your voice…" → "Generating titles…" → "Writing description…" → "Almost ready…" |
| `application/pdf` | "Uploading PDF…" → "Reading and decoding the document…" → "Extracting key content…" → "Generating titles…" → "Writing description…" → "Almost ready…" |
| `image/*` | "Uploading image…" → "Decoding the file…" → "Analysing visual content…" → "Generating titles…" → "Writing description…" → "Almost ready…" |

Status messages cycle every 3 seconds via `setInterval` while `isUploading === true`.

**Firestore listener** (`onSnapshot` on `users/{uid}/results/{resultId}`):
- `status === 'complete'` + anonymous user → `localStorage.setItem('freeTrialUsed', 'true')`
- `status === 'failed'` → error toast with `data.errorMessage`
- Both complete/failed → `setIsUploading(false)`

**localStorage persistence:**
- `activeResultId_{uid}` — saved whenever `resultId` changes; restored on mount
- Cleared when user identity switches (anonymous → Google) via `prevUidRef` comparison

**`reset()`:**
```typescript
const reset = () => {
  setResult(null);
  setResultId(null);
  setUploadProgress(0);
  setStatusIndex(0);
  setQuotaExceeded(false);   // ← important: clears stale quota state
  if (user) localStorage.removeItem(`activeResultId_${user.uid}`);
};
```

---

### Layout Components

#### `src/components/layout/ProtectedRoute.tsx`

Decision tree:
```
null user              → null (AppLoader shown above in App.tsx)
anonymous + freeTrialUsed=true in localStorage → navigate('/login')
anonymous + no trial used → render <Outlet /> (allow 1 free session)
Google user            → render <Outlet />
isWhitelisted === false → navigate('/pending')
profile === null (Google user, no profile doc) → navigate('/setup')
```

#### `src/components/layout/AppLoader.tsx`

- Full-screen dark background with PublishKit branding
- Animated equalizer bars (5 `<span>` children, CSS keyframe animation)
- Rotating tips array — cycles every 2.5 seconds
- Build marker: `2026-05-05-c` (hardcoded for deployment identification)
- Example tips: "Did you know? PublishKit supports audio, PDFs, and images", "Tip: Set up your Creator Profile for personalised output", etc.

#### `src/components/layout/PageContainer.tsx`

- Renders `<Navbar />` at top
- Decorative orange glow blobs (radial gradients, `pointer-events-none`, `overflow-hidden`)
- Wraps children in `max-w-5xl mx-auto px-4` container

#### `src/components/layout/Navbar.tsx`

- Logo / "PublishKit" text → links to `/`
- Settings icon → `/settings`
- History/Clock icon → `/results`
- User avatar (first letter of `displayName` or `email`) with name + "Log out" option
- Anonymous users: no avatar, no logout dropdown

---

### UI Primitives

#### `src/components/ui/Button.tsx`

**Props:** `variant?: 'primary' | 'outline' | 'danger'`, `isLoading?: boolean`, + all HTML button props (via spread)

- **primary** (default): `bg-[#E05A1E]` orange fill, white text, orange glow on hover
- **outline**: transparent background, `border-[#E05A1E]`, orange text
- **danger**: red destructive variant
- `isLoading`: renders inline `<Spinner />`, sets `disabled={true}`

#### `src/components/ui/Input.tsx`

**Props:** `label?: string`, `error?: string`, + all HTML input props (via `forwardRef`)

- Dark: `bg-[#0D0D0D]`, border `#2A2A2A`, orange focus ring `ring-[#E05A1E]/70`
- Error shown in red below input

#### `src/components/ui/Card.tsx`

Exports: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`
- Style: `bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl`

#### `src/components/ui/Spinner.tsx`

- `w-4 h-4` spinning border ring via `animate-spin`

#### `src/components/ui/Toast.tsx`

**API:** `useToast()` returns `{ toast }`. Call `toast(message, 'success' | 'error' | 'info')`.

- Appears top-right, auto-dismisses after 4 seconds
- Success: green border; Error: red border; Info: orange border
- Manual dismiss via × button

---

### Upload Components

#### `src/components/upload/DropZone.tsx`

**Props:** `onFileSelect: (file: File) => void`

**Accepted MIME types:**
- Audio: `audio/mpeg`, `audio/wav`, `audio/mp4`, `audio/aac`, `audio/ogg`, `audio/webm`, `audio/x-m4a`
- Document: `application/pdf`
- Image: `image/jpeg`, `image/png`, `image/webp`

**Max size:** 200 MB (enforced client-side before upload starts)

**Behavior:**
- Drag-over: orange border + background tint
- Click: opens native `<input type="file">` restricted to `accept` string
- Invalid type → error toast
- File > 200 MB → error toast
- Valid file → calls `onFileSelect(file)`

---

### Result Components

#### `src/components/results/ResultTabs.tsx`

**Props:** `result: Result`

Branches on `result.fileType`:

**Audio results — 4 tabs:**
1. **Titles** — 5 title cards, each with title + AI reasoning. Per-title `<CopyButton>`.
2. **Timestamps** — raw text block with chapter markers. `<CopyButton>` for all.
3. **Description** — full YouTube description text. `<CopyButton>` for all.
4. **Thumbnails** (tab visible only if `thumbnailPromptImagen` or `thumbnailPromptChatGPT` exists) — two blocks: Imagen 3 prompt + DALL-E 3/ChatGPT prompt.

**Document results (PDF / image) — 2 tabs:**
1. **Summary** — 150–200 word overview
2. **Description** — 300–400 word detailed description

Partial errors displayed inline per section if any Gemini call failed.

#### `src/components/results/CopyButton.tsx`

**Props:** `text: string`, `label?: string`

- Default label: "Copy"
- After click: changes to "Copied ✓" for 2 seconds via `setTimeout`, then resets
- Uses `navigator.clipboard.writeText()`

---

### Pages

#### `src/pages/Home.tsx`

**Three mutually exclusive body states:**
```typescript
const showResults   = !!(result && result.status === 'complete');
const showProcessing = (isUploading && !showResults) || !!(result && result.status === 'processing');
const showUpload    = !isUploading && !showResults && !showProcessing;
```

**Page sections (top to bottom):**

1. **Hero** — "PublishKit" h1 with `.hero-glow` class + tagline paragraph
2. **Language toggles** — English / Hindi pill buttons (disabled during upload/results)
3. **Thumbnail Prompts toggle** — custom checkbox with 3-line label:
   ```
   "Thumbnail Prompts"
   "Off by default · uses extra AI"
   "Audio files only"     ← added May 5, 2026
   ```
4. **Free trial notice** — shown only to `user.isAnonymous` users
5. **Body** (mutually exclusive):
   - `quotaExceeded` → sign-in card with Google button → `navigate('/login')`
   - `showUpload` → `<DropZone onFileSelect={handleFileSelect} />`
   - `showProcessing` → `<ProcessingCard>` (EQ bars + rotating status + upload progress bar)
6. **Results** (when `showResults`):
   - Filename header
   - `<ResultTabs result={result} />`
   - Footer CTA:
     - Guest → "That was your free session!" + History link + "Sign in with Google" → `navigate('/login')`
     - Google user → "Generate Another" button → calls `reset()`
7. **History footer tab** — always visible, `<Link to="/results">`

**`ProcessingCard`** (local function component):
- `.eq-bars` animated bars with orange glow
- Status text with `.status-text` fade-in class (re-keyed on `statusText` change for re-animation)
- Upload progress bar (0–100%) with percentage label

---

#### `src/pages/Login.tsx`

**Shown when:** anonymous user with `freeTrialUsed=true` hits ProtectedRoute, or direct navigation.

**Content:**
- PublishKit logo + tagline
- 5 feature bullets
- "Sign in with Google" button → `signInWithGoogle()`
- If `localStorage.freeTrialUsed === 'true'`: shows "Your free session is complete — sign in to keep going" message

**`isSilentAuthError` check:** popup-closed/cancelled errors are caught in `catch` and not displayed to user.

**`finally` block:** always resets button loading state, even on error.

---

#### `src/pages/Settings.tsx`

**Form fields + Zod schema:**

| Field | Schema |
|---|---|
| `name` | `z.string().min(1)` |
| `handle` | `z.string().min(1).regex(/^@?[\w.]+$/)` |
| `niche` | `z.string().min(1)` |
| `appearance` | `z.string().min(10)` |
| `brandColor1Raw` | `z.string().min(1)` — resolved to hex on submit |
| `brandColor2Raw` | `z.string().min(1)` — resolved to hex on submit |
| `language` | `z.enum(['English', 'Hindi'])` |

**`colorNameToHex(input)` helper:**
```typescript
// Resolves CSS color names (e.g. "orange") to #RRGGBB hex using canvas fillStyle
function colorNameToHex(input: string): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = trimmed;
  const computed = ctx.fillStyle; // returns #rrggbb or rgba(...)
  // ... parse and return
}
```

**`ColorPreviewInput` sub-component:**
- Color swatch button → toggles `react-colorful` `HexColorPicker` popover
- Text input alongside swatch accepts CSS color names or hex codes
- Click-outside close via `useRef` + `mousedown` listener
- "Done" button closes picker
- Swatch background = resolved hex (or `#2A2A2A` if invalid)

**Submit flow:**
1. Converts `brandColor1Raw` / `brandColor2Raw` to `#RRGGBB` hex
2. `updateDoc(doc(db, 'users', user.uid), { name, handle, appearance, brandColor1, brandColor2, language, niche })`
3. `refreshProfile()` — updates AuthContext
4. Success toast

**Mobile save button** — sticky at top of form (visible only on mobile via `sm:hidden`), in addition to the standard bottom submit button.

---

#### `src/pages/SetupProfile.tsx`

Shown to Google users who have no Firestore profile doc yet (first sign-in).
- Same fields as Settings.tsx
- On submit → `setDoc(doc(db, 'users', uid), {...})` to create the doc
- On success → `navigate('/')`

---

#### `src/pages/PastResults.tsx`

**Data:** Fetches `users/{uid}/results` ordered by `createdAt` desc via `getDocs` (one-time, not real-time).

**Features:**
- Collapsible rows — click row to expand and show `<ResultTabs />`
- Status badge: `processing` (yellow), `complete` (green), `failed` (red)
- Per-row trash icon → confirmation modal → `deleteDoc`
- Checkbox multi-select → "Delete Selected" button
- **Last Hour** bulk delete → deletes results created in last 60 minutes
- **All Time** bulk delete → deletes all results for this user
- All destructive actions go through a confirmation modal
- `expiresAt` field shown if present (when file auto-deletes)

---

#### `src/pages/AccessPending.tsx`

Static page. Shown when `isWhitelisted === false` (Firestore returns `permission-denied` on profile read).
- "Your access is pending" message
- Log out button

---

### Library Utilities

#### `src/lib/firebase.ts`
```typescript
// Initialises Firebase from VITE_FIREBASE_* env vars
export const auth      // FirebaseAuth
export const db        // Firestore
export const storage   // FirebaseStorage
export const functions // FirebaseFunctions
```

#### `src/lib/api.ts`
```typescript
export const processAudioCall = httpsCallable(functions, 'processAudio');
```
Single callable wrapper used by `useUpload.tsx`.

**Payload shape:**
```typescript
{
  storagePath: string,         // Firebase Storage path
  audioFileName: string,       // Original filename (for cache lookup)
  audioSizeBytes: number,      // File size in bytes (for cache lookup)
  outputLanguage: string,      // "English" | "Hindi"
  generateThumbnails: boolean,
  fileType: string,            // MIME type
}
```

**Response:** `{ resultId: string, cached: boolean }`

#### `src/lib/utils.ts`
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

### Types

#### `src/types/index.ts`

```typescript
export interface CreatorProfile {
  name: string;
  handle?: string;
  appearance: string;
  brandColor1: string;    // Always stored as #RRGGBB uppercase hex
  brandColor2: string;    // Always stored as #RRGGBB uppercase hex
  language: "English" | "Hindi";
  niche: string;
}

export interface Result {
  id?: string;
  audioFileName: string;
  audioStoragePath: string;
  audioSizeBytes: number;
  fileType?: string;
  status: 'processing' | 'complete' | 'failed';
  createdAt: any;                      // Firestore Timestamp
  expiresAt?: any;                     // Firestore Timestamp (now + 3h)
  uid?: string;
  transcript?: string;                 // Audio only
  titles?: { title: string; reason: string }[];
  timestamps?: string;                 // Raw text, audio only
  description?: string;
  thumbnailPromptImagen?: string;      // Audio only (if generateThumbnails=true)
  thumbnailPromptChatGPT?: string;     // Audio only (if generateThumbnails=true)
  summary?: string;                    // Document/image only
  errorMessage?: string;
  outputLanguage?: string;
  partialErrors?: string[];            // Note: backend returns Record<string,string>|null (type mismatch)
  cached?: boolean;                    // true if returned from 7-day cache
}
```

---

## 3. Every Cloud Function

### `processAudio` (HTTPS onCall)

**File:** `functions/src/processAudio.ts`
**Config:** `timeoutSeconds: 120`, `memory: '512MB'`

**Full flow:**
1. `verifyWhitelist(context)` — checks guest quota; passes Google users immediately
2. Sanitise all inputs:
   - `sanitizeString()` — strips HTML tags and `<>"'\`` chars, max 500 chars
   - `sanitizeFileName()` — strips non-alphanumeric/._- chars, max 255 chars
3. `findCachedResult(uid, audioFileName, audioSizeBytes, outputLanguage)`:
   - Queries last 50 `users/{uid}/results` docs ordered by `createdAt` desc
   - Returns existing `resultId` if same filename + size + language found within 7 days
   - If found → returns `{ resultId: cachedId, cached: true }` immediately
4. `checkRateLimit(uid)` + `incrementRateLimit(usageRef)`
5. Creates Firestore doc at `users/{uid}/results/{auto-id}`:
   ```typescript
   {
     uid, audioFileName, audioStoragePath: storagePath,
     audioSizeBytes, fileType, outputLanguage,
     generateThumbnails: data.generateThumbnails === true,
     status: 'processing',
     createdAt: FieldValue.serverTimestamp(),
     expiresAt: Timestamp.fromMillis(Date.now() + THREE_HOURS_MS),
   }
   ```
6. Returns `{ resultId, cached: false }`

**Error handling:** Re-throws `HttpsError` types; wraps all other errors as `'internal'` — never leaks internal details to client.

---

### `processAudioWorker` (Firestore onCreate trigger)

**File:** `functions/src/processAudio.ts`
**Trigger:** `firestore.document('users/{uid}/results/{resultId}').onCreate`
**Config:** `timeoutSeconds: 540`, `memory: '1GB'`, `secrets: [geminiApiKey]`

**Full flow:**
1. Guard: `if (data.status !== 'processing') return;`
2. Downloads file from Firebase Storage to `/tmp`
3. Branches on `fileType`:

**Audio path:**
```
transcribeAudio(localFilePath, mimeType)
  → db.doc(`users/${uid}`).get() (fetch creator profile)
  → generateOutputs(transcript, profile, outputLanguage, generateThumbnails)
  → resultRef.update({ transcript, titles, timestamps, description,
                        thumbnailPromptImagen, thumbnailPromptChatGPT,
                        partialErrors, status: 'complete' })
```

**Document path (PDF / image):**
```
analyzeDocument(localFilePath, fileType, outputLanguage)
  → resultRef.update({ summary, description, status: 'complete' })
```

**Guest profile fallback** (no Firestore profile for anonymous UID):
```typescript
profile = {
  name: 'Guest',
  appearance: 'A generic avatar.',
  brandColor1: '#E05A1E',
  brandColor2: '#0D0D0D',
  language: outputLanguage,
  niche: 'General content',
};
```

**Error path:** `resultRef.update({ status: 'failed', errorMessage: 'Processing failed. Please try again.' })`

**`finally` block:** Deletes temp file at `localFilePath` if it exists.

---

### `deleteOldAudio` (Pub/Sub Scheduled)

**File:** `functions/src/cleanup.ts`
**Schedule:** `0 * * * *` (every hour at :00 UTC)

**Full flow:**
1. `bucket.getFiles({ prefix: 'users/' })` — lists all user files
2. Skips files not in `/audio/` or `/uploads/` paths
3. Gets `metadata.timeCreated` for each file
4. Skips files younger than 3 hours
5. Deletes Storage file
6. Queries `users/{uid}/results` where `audioStoragePath == file.name`
7. Deletes all matching Firestore result docs
8. Logs: `"Cleanup complete — storage files deleted: X, Firestore docs deleted: Y"`

---

### Middleware: `verifyWhitelist`

**File:** `functions/src/middleware/auth.ts`

```typescript
export async function verifyWhitelist(context: functions.https.CallableContext) {
  const email = context.auth?.token?.email;

  // Google users (have email) → always pass
  if (email) return true;

  // Anonymous users → 1 free session per UID
  const guestId = context.auth?.uid || context.rawRequest.ip || 'unknown-guest';
  const guestRef = db.collection('guestUsage').doc(guestId.replace(/\//g, '_'));
  const guestDoc = await guestRef.get();

  if (guestDoc.exists) {
    const guestUses = guestDoc.data()?.uses || 0;
    if (guestUses >= 1) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Guest quota exceeded. Please sign up for full access.'
      );
    }
    await guestRef.update({ uses: admin.firestore.FieldValue.increment(1) });
  } else {
    await guestRef.set({ uses: 1 });
  }
  return true;
}
```

**Quota storage:** `guestUsage/{anonymousUID}` document with `uses` counter.
**History:** Global guest counter (`totalGuestUses`) was removed — it was exhausted during development and blocked all new users. Only per-UID check remains.

---

### Middleware: `checkRateLimit` / `incrementRateLimit`

**File:** `functions/src/middleware/rateLimit.ts`

```typescript
const MAX_GENERATIONS_PER_DAY = 10;

export async function checkRateLimit(uid: string) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const usageRef = db.doc(`users/${uid}/usage/${today}`);
  const usageDoc = await usageRef.get();

  if (usageDoc.exists) {
    const data = usageDoc.data();
    if (data && data.count >= MAX_GENERATIONS_PER_DAY) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Daily limit reached. Try again tomorrow.'
      );
    }
  }
  return usageRef;
}

export async function incrementRateLimit(usageRef) {
  await usageRef.set(
    { count: FieldValue.increment(1), lastRequest: FieldValue.serverTimestamp() },
    { merge: true }
  );
}
```

**Storage path:** `users/{uid}/usage/YYYY-MM-DD`
**Resets:** Daily (naturally — new doc path each day)
**Current limit:** 10 per day per signed-in user

---

### Gemini: `transcribeAudio`

**File:** `functions/src/transcribe.ts`

```typescript
export async function transcribeAudio(localFilePath: string, mimeType: string): Promise<string>
```

1. `new GoogleAIFileManager(geminiApiKey.value())` — uses secret
2. `fileManager.uploadFile(localFilePath, { mimeType, displayName: filename })`
3. `model.generateContent([{ fileData: { fileUri, mimeType } }, { text: promptText }])`
4. `fileManager.deleteFile(uploadResult.file.name)` — always cleans up
5. Returns `result.response.text()`

**Prompts:**
- Audio: `"Please transcribe the following audio accurately. Output only the transcript."`
- Non-audio: `"Thoroughly read this document or image and extract all text and visual information. Provide a detailed, comprehensive summary... Your output will be used as the source for generating YouTube metadata..."`

**Model:** `gemini-2.5-flash`

---

### Gemini: `generateOutputs`

**File:** `functions/src/generate.ts`

```typescript
export async function generateOutputs(
  transcript: string,
  profile: any,
  outputLanguage: "English" | "Hindi",
  generateThumbnails: boolean
)
```

**Runs 3–4 Gemini calls in parallel via `Promise.all`:**

| Call | Model config | Prompt |
|---|---|---|
| Titles | JSON mode, temp 0.7 | `getTitlesPrompt()` |
| Timestamps | Text mode, temp 0.7 | `getTimestampsPrompt()` |
| Description | Text mode, temp 0.7 | `getDescriptionPrompt()` |
| Thumbnails (if enabled) | JSON mode, temp 0.7 | `getThumbnailsPrompt()` |

**`callWithTimeoutAndRetry()` wrapper:**
- `PER_CALL_TIMEOUT_MS = 25,000` (25s)
- 2 attempts before returning `{ ok: false, error }`

**Post-processing:**
- Timestamps placeholder: `description.replace('[TIMESTAMPS_PLACEHOLDER]', timestamps)`
- Partial errors: failed calls add to `partialErrors` record — result still stored as `complete`

**Returns:**
```typescript
{
  titles: { title: string; reason: string }[],
  timestamps: string,
  description: string,
  thumbnailPromptImagen: string,
  thumbnailPromptChatGPT: string,
  partialErrors: Record<string, string> | null,
}
```

---

### Gemini: `analyzeDocument`

**File:** `functions/src/generate.ts`

```typescript
export async function analyzeDocument(
  localFilePath: string,
  mimeType: string,
  outputLanguage: "English" | "Hindi"
): Promise<{ summary: string; description: string }>
```

- Reads file → base64 encodes → sends as `inlineData` to Gemini
- `DOC_CALL_TIMEOUT_MS = 60,000` (60s), 2 attempts
- `responseMimeType: 'application/json'`, `temperature: 0.4`
- Prompt: 150–200 word summary + 300–400 word description in target language
- Returns `{ summary, description }` parsed from JSON response

---

### AI Prompts

#### `functions/src/prompts/titles.ts`

`getTitlesPrompt(transcript, profile, outputLanguage)`

- Requests 5 YouTube titles ranked by viral potential
- Personalised with `profile.niche`, `profile.name`, target language
- **JSON output:**
  ```json
  { "titles": [{ "title": "...", "reason": "..." }, ...] }
  ```

#### `functions/src/prompts/timestamps.ts`

`getTimestampsPrompt(transcript, outputLanguage)`

- Estimates video duration from word count at 150 words/minute
- Up to 10 chapter timestamps in `MM:SS Title` format
- Outputs in target language

#### `functions/src/prompts/description.ts`

`getDescriptionPrompt(transcript, profile, outputLanguage)`

- Generates full YouTube description: hook paragraph, key points, `[TIMESTAMPS_PLACEHOLDER]`, CTA, hashtags
- Personalised with `profile.name`, `profile.niche`, `profile.handle`
- Written in `outputLanguage`

#### `functions/src/prompts/thumbnails.ts`

`getThumbnailsPrompt(transcript, profile, outputLanguage)`

- Generates two thumbnail prompts in one Gemini call:
  - **Imagen 3** — Google image model style
  - **DALL-E 3 / ChatGPT** — OpenAI style
- Both incorporate `profile.appearance` and `profile.brandColor1/2`
- **JSON output:**
  ```json
  { "imagen": "...", "chatgpt": "..." }
  ```

---

## 4. All Changes from Vite Starter

Starting from `npm create vite@latest publishkit -- --template react-ts`:

### `vite.config.ts`
- Added `@tailwindcss/vite` plugin alongside the default `@vitejs/plugin-react`

### `src/` — completely rebuilt
Nothing from the Vite starter template (`App.tsx`, `App.css`, `index.css` content, `assets/react.svg`) remains. All files are custom-written.

### `index.css` — global styles added
- `body { background: #080808; color: #ffffff; }` — dark base
- `.eq-bars` — animated equalizer bars (5-bar CSS keyframe animation with staggered timing)
- `.hero-glow` — orange text shadow effect
- `.fade-in` / `.fade-in-fast` — opacity + translateY animation
- `.status-text` — re-triggers fade-in on key change (rotating processing status)

### Packages installed (beyond Vite defaults)
See [Section 8](#8-all-npm-packages) for full list.

### `functions/` directory — created from scratch
Complete Node.js 20 Firebase Cloud Functions project with TypeScript.

### Root config files added/modified
- `firebase.json` — written (hosting, functions, firestore, storage, security headers)
- `firestore.rules` — written from scratch
- `firestore.indexes.json` — created (empty indexes array)
- `storage.rules` — written from scratch
- `.env` — created (not committed)
- `.env.example` — created (committed, shows structure)
- `.gitignore` — completely rewritten with comprehensive exclusions
- `README.md` — completely rewritten with professional project documentation

### Firebase project configured
- Authentication: Google provider + Anonymous provider enabled
- Firestore: created in production mode, rules deployed
- Storage: created, rules deployed
- Cloud Functions: deployed to us-central1 (default)
- Hosting: live at `publishkit.web.app`
- Auth domain set to `publishkit.web.app` (required for mobile Google redirect)
- `GEMINI_API_KEY` stored in Firebase Secret Manager

---

## 5. Firestore Rules (exact)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Whitelist and config — Cloud Functions only, no client access
    match /config/{document} {
      allow read, write: if false;
    }

    // Users can only access their own data
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.uid == uid;
    }

    // Rate limit docs — user can only read/write own
    match /users/{uid}/usage/{date} {
      allow read, write: if request.auth != null
        && request.auth.uid == uid;
    }

    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Notes:**
- `guestUsage` collection is written by Cloud Functions via Admin SDK — Admin SDK bypasses these rules. Client cannot read or write `guestUsage`.
- All user data is scoped to `users/{uid}/**` with strict `uid === auth.uid` equality.
- The final catch-all `false` rule is the default-deny that makes this secure.

---

## 6. Storage Rules (exact)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/uploads/{fileName} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if request.auth != null
        && request.auth.uid == uid
        && request.resource.size < 200 * 1024 * 1024
        && (
          request.resource.contentType.matches('audio/.*')
          || request.resource.contentType == 'application/pdf'
          || request.resource.contentType == 'image/jpeg'
          || request.resource.contentType == 'image/png'
          || request.resource.contentType == 'image/webp'
        );
      allow delete: if request.auth != null && request.auth.uid == uid;
    }
    match /users/{uid}/audio/{fileName} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if request.auth != null
        && request.auth.uid == uid
        && request.resource.size < 200 * 1024 * 1024
        && request.resource.contentType.matches('audio/.*');
      allow delete: if request.auth != null && request.auth.uid == uid;
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

**Notes:**
- Two separate paths: `/audio/` (audio MIME only) and `/uploads/` (audio + PDF + images)
- 200 MB limit enforced at Storage rule level AND client-side in DropZone
- All other paths denied by catch-all

---

## 7. `firebase.json` (exact)

```json
{
  "hosting": {
    "site": "publishkit",
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/index.html",
        "headers": [
          { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" },
          { "key": "Pragma", "value": "no-cache" },
          { "key": "Expires", "value": "0" }
        ]
      },
      {
        "source": "/assets/**",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
        ]
      },
      {
        "source": "**",
        "headers": [
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
          { "key": "X-XSS-Protection", "value": "1; mode=block" },
          { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
          { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
          { "key": "Cross-Origin-Opener-Policy", "value": "same-origin-allow-popups" }
        ]
      }
    ]
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log",
        "*.local"
      ],
      "predeploy": [
        "npm --prefix \"$RESOURCE_DIR\" run build"
      ]
    }
  ],
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

**Caching strategy:**
- `index.html` → never cached (fresh HTML on every deploy)
- `/assets/**` (Vite content-hashed bundles) → immutable 1-year cache

**Security headers:**
- `X-Frame-Options: SAMEORIGIN` — prevents clickjacking
- `X-XSS-Protection: 1; mode=block` — legacy XSS protection
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — denies sensor APIs
- `Cross-Origin-Opener-Policy: same-origin-allow-popups` — required for Google OAuth popup

---

## 8. All npm Packages

### Frontend (`package.json`)

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.5 | UI framework |
| `react-dom` | ^19.2.5 | React DOM renderer |
| `react-router-dom` | ^7.14.2 | Client-side routing |
| `firebase` | ^12.12.1 | Auth, Firestore, Storage, Functions client SDK |
| `react-hook-form` | ^7.75.0 | Form state management |
| `@hookform/resolvers` | ^5.2.2 | Zod adapter for react-hook-form |
| `zod` | ^4.4.2 | Schema validation |
| `tailwindcss` | ^4.2.4 | Utility-first CSS framework |
| `@tailwindcss/vite` | ^4.2.4 | Vite plugin for Tailwind CSS v4 |
| `autoprefixer` | ^10.5.0 | CSS vendor prefixes |
| `postcss` | ^8.5.13 | CSS processing |
| `tailwind-merge` | ^3.5.0 | Merge Tailwind classes without conflicts |
| `clsx` | ^2.1.1 | Conditional class name utility |
| `lucide-react` | ^1.14.0 | Icon library |
| `react-colorful` | ^5.6.1 | Cross-platform color picker (replaced native `<input type="color">`) |
| `@tanstack/react-query` | ^5.100.9 | Server state management (QueryClientProvider set up, not actively used) |
| `@ffmpeg/ffmpeg` | ^0.12.15 | FFmpeg WASM — **installed but not used** |
| `@ffmpeg/util` | ^0.12.2 | FFmpeg utilities — **installed but not used** |
| `@google/generative-ai` | ^0.24.1 | Gemini SDK — **installed on frontend but not used** (Gemini is backend-only) |

### Frontend Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `vite` | ^8.0.10 | Build tool and dev server |
| `@vitejs/plugin-react` | ^6.0.1 | React Fast Refresh for Vite |
| `typescript` | ~6.0.2 | TypeScript compiler |
| `@types/react` | ^19.2.14 | React type definitions |
| `@types/react-dom` | ^19.2.3 | React DOM type definitions |
| `@types/node` | ^24.12.2 | Node.js type definitions |
| `eslint` | ^10.2.1 | Linter |
| `@eslint/js` | ^10.0.1 | ESLint JS config |
| `eslint-plugin-react-hooks` | ^7.1.1 | React Hooks lint rules |
| `eslint-plugin-react-refresh` | ^0.5.2 | React Refresh lint rules |
| `globals` | ^17.5.0 | Global variable definitions for ESLint |
| `typescript-eslint` | ^8.58.2 | TypeScript ESLint integration |

### Cloud Functions (`functions/package.json`)

| Package | Version | Purpose |
|---|---|---|
| `firebase-functions` | ^5.0.0 | Cloud Functions SDK (onCall, onCreate, pubsub) |
| `firebase-admin` | ^12.0.0 | Admin SDK for Firestore + Storage (bypasses security rules) |
| `@google/generative-ai` | ^0.21.0 | Gemini 2.5 Flash SDK including `GoogleAIFileManager` |

### Functions Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `typescript` | ^5.3.3 | TypeScript (functions has separate tsconfig) |
| `firebase-functions-test` | ^3.1.0 | Unit testing utilities (not actively used) |

---

## 9. Known Bugs & Incomplete Features

### Bugs (confirmed)

**1. Upload state lost during first ~2 seconds of upload**
- If user navigates away between `uploadBytesResumable()` starting and `processAudioCall()` completing, no `resultId` exists in localStorage yet.
- On return, `useUpload` has no `resultId` to restore → upload state is lost.
- Severity: Low (requires navigating away during active upload).

**2. `freeTrialUsed` flag not cleared on Google sign-in**
- After a guest completes a session and signs in with Google, `localStorage.freeTrialUsed` remains `'true'`.
- On sign-out, `logout()` sets it again. This means a Google user who signs out, then tries to use the app as guest on the same browser, is immediately sent to `/login`.
- Severity: Low–Medium (intentional for most scenarios, unexpected for some).

**3. History page does not update in real-time**
- `PastResults.tsx` uses `getDocs` (one-time fetch). Processing files don't auto-update to `complete`.
- User must manually refresh to see updated status.
- Severity: Medium UX impact.

**4. `partialErrors` type mismatch**
- `Result` interface declares `partialErrors?: string[]`
- `generateOutputs` returns `partialErrors: Record<string, string> | null`
- TypeScript won't catch access issues. Runtime behaviour is fine as long as display code only iterates.

**5. Thumbnail toggle visible regardless of file type**
- Toggle is always shown on Home page. If user enables thumbnails and uploads a PDF/image, `generateThumbnails: true` is sent to the function.
- `analyzeDocument()` ignores `generateThumbnails`. No client warning shown.

### Unused Installed Packages

- **`@ffmpeg/ffmpeg` + `@ffmpeg/util`** — Not imported anywhere. Adds ~8 MB to production bundle. Originally intended for client-side audio compression. Safe to remove.
- **`@google/generative-ai` (frontend)** — Not imported anywhere in `src/`. Gemini is backend-only. Safe to remove.
- **`@tanstack/react-query`** — `QueryClientProvider` is configured but no `useQuery`/`useMutation` hooks are used. Direct Firestore calls used throughout.

### Security Gaps

- **App Check not enabled** — Firebase APIs are exposed without reCAPTCHA or device attestation. Bot abuse possible.
- **No explicit `guestUsage` Firestore rule** — Covered by catch-all `false` but no documented rule for clarity.

### Planned but not built

- [ ] YouTube Data API integration — publish directly to YouTube from the app
- [ ] Batch upload — process multiple files at once
- [ ] Inline result editing — edit titles/description before copying
- [ ] Email notifications when long files finish processing
- [ ] Gemini streaming — real-time output instead of batch
- [ ] PWA / service worker — offline support and install prompt
- [ ] Real-time updates in History page

---

## 10. Current App State Summary

### Production status

PublishKit is **fully deployed and working** at `https://publishkit.web.app`.

### What works end-to-end

**Anonymous guest flow:**
1. Visit app → Firebase auto signs user in anonymously
2. "1 free session — no sign-in needed" banner shown
3. Upload audio (MP3/WAV/AAC/OGG/WebM/M4A), PDF, or image (JPEG/PNG/WebP) up to 200 MB
4. File uploads to `users/{uid}/audio/` or `users/{uid}/uploads/`
5. `processAudio` callable checks guest quota (1/UID), creates result doc
6. `processAudioWorker` triggers → downloads → transcribes or analyzes → generates output
7. Firestore listener picks up `status: 'complete'` → results shown in tabbed UI
8. After result: sign-in prompt + History link shown

**Google user flow:**
1. `/login` → Google sign-in (popup on desktop, redirect on mobile)
2. New user → profile setup at `/setup`
3. Returning user → straight to `/`
4. Up to 10 uploads per calendar day
5. History page shows all past results with expand/collapse/delete
6. Settings page for creator profile management
7. Files + Firestore docs auto-delete after 3 hours

### Firebase project

| Service | Configuration |
|---|---|
| Firebase Hosting | Live at `publishkit.web.app` |
| Auth domain | `publishkit.web.app` (custom, for same-origin OAuth) |
| Firestore | Production mode; rules deployed |
| Storage | Rules deployed; auto-cleanup running |
| Functions | `processAudio`, `processAudioWorker`, `deleteOldAudio` deployed |
| Secret Manager | `GEMINI_API_KEY` stored securely, never in code |

### Firestore data model

```
users/{uid}                          ← CreatorProfile document
users/{uid}/results/{resultId}       ← Result documents (auto-expire 3h)
users/{uid}/usage/{YYYY-MM-DD}       ← Daily rate limit counter (count, lastRequest)
guestUsage/{guestUid}                ← Anonymous quota tracker (uses)
```

### Environment variables

```bash
# .env (never committed)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=publishkit.web.app
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Gemini key — in Firebase Secret Manager, not .env
# Set with: firebase functions:secrets:set GEMINI_API_KEY
```

### Deployment commands

```bash
# Frontend
npm run build         # tsc + vite build → dist/

# Full deploy (hosting + functions + rules)
firebase deploy

# Deploy specific targets
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage
```

---

*Updated 2026-05-11 · Current path: D:\Project\Project 01\Google Antigravity Files*
