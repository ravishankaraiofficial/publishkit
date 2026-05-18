# PublishKit

> Turn your audio, PDFs, and images into YouTube-ready **Titles, Timestamps & Descriptions** in 90 seconds — plus full **Script Writer** and **MultiPost** social repurposing. Powered by Gemini AI.

🔗 **Live Demo:** [publishkit.web.app](https://publishkit.web.app)

---

## What is it?

PublishKit is a web app built for YouTube creators. You upload a file — an audio recording, a PDF, or an image — and the AI generates everything you need to publish:

- Multiple title options ranked by CTR
- Full timestamped chapters
- SEO-ready description
- Thumbnail prompt ideas (audio uploads)
- One-click **MultiPost** — turn the same content into X / Instagram / LinkedIn posts
- Standalone **Script Writer** for new video ideas
- **13 output languages** — English, Hindi, Hinglish, Telugu, Tamil, Gujarati, Marathi, Punjabi, Bengali, Malayalam, Kannada, Bhojpuri, Urdu

No manual editing. No copy-pasting from ChatGPT. One upload → ready to publish.

---

## Subscription plans

| Plan | Price | Metadata / mo | Script Writer / mo | MultiPost / mo | Copy buttons |
|---|---|---|---|---|---|
| **Free Plan** | ₹0 | 10 | 10 | 10 | Metadata only |
| **Pro Plan** | ₹299/mo | 100 | 100 | 100 | Everywhere |
| **Max Plan** | ₹1,000/mo | 1,000 | 1,000 | 1,000 | Everywhere |

Payments are processed by **Razorpay Subscriptions** (live mode). Plan state is enforced server-side via Firebase Secret Manager + admin-only Firestore fields.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Auth | Firebase Authentication (Google + Anonymous) |
| Database | Cloud Firestore |
| File Storage | Firebase Storage |
| Backend | Firebase Cloud Functions (Node.js 20) |
| AI | Google Gemini 2.5 Flash (multimodal — audio + PDF + image) |
| App Check | Firebase App Check + reCAPTCHA Enterprise |
| Billing | Razorpay Subscriptions (live) |
| Deployment | Firebase Hosting |
| Forms | React Hook Form + Zod |
| State | React Context API |

---

## Features

- 🎙️ **Audio → YouTube Metadata** — Upload MP3/WAV/AAC; get titles, timestamps, description, thumbnail prompts
- 📄 **PDF & Image Analysis** — Upload documents/images; AI summarises and generates metadata
- ✍️ **Script Writer** — Generate full YouTube video scripts (hook + intro + sections + CTA) from a topic
- 🔁 **MultiPost** — Auto-generate X threads, Instagram captions, LinkedIn posts. Can run automatically after audio upload via the home-page toggle, or standalone on `/multipost`
- 🌐 **13-language output** — Native dropdown on every page. Toast confirms language switch with native script
- 🎨 **Thumbnail Prompts** — Optional AI-generated thumbnail concepts (audio only)
- 👤 **Creator Profile** — Name, niche, brand colours, on-camera appearance → AI personalises output
- 🆓 **Free Trial** — New visitors get 1 free metadata session with no sign-in required
- 📱 **Mobile-Friendly** — Responsive UI, mobile-safe color picker, bottom navigation bar
- 🔒 **Secure by Design** — Firestore rules, Storage rules, plan-aware rate limiting, App Check enforcement
- 📜 **History Page** — View all past results; files auto-deleted after 3 hours
- ⚡ **Result Caching** — Same file within 7 days returns instantly from cache

---

## Security Model

| Concern | How it's handled |
|---|---|
| Gemini API key | Firebase Secret Manager (`GEMINI_API_KEY`) — never in source or `.env` |
| Razorpay API keys | Firebase Secret Manager (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) |
| Razorpay webhook | HMAC-SHA256 signature verification using `RAZORPAY_WEBHOOK_SECRET` |
| Auth | Firebase Google OAuth — no passwords stored |
| App Check | reCAPTCHA Enterprise — all unauthenticated backend calls rejected |
| Data isolation | Firestore rules enforce `uid === auth.uid` on every read/write |
| Plan fields | `plan`, `planExpiry`, `razorpaySubscriptionId`, usage counters all **admin-SDK only** — clients cannot write |
| Rate limiting | Plan-aware: Free 10/mo, Pro 100/mo, Max 1000/mo — enforced inside Cloud Functions transactions |
| Guest abuse | 1 free session per anonymous UID + FingerprintJS hardware fingerprint |
| File access | Storage rules reject wrong MIME types and files > 200 MB |
| Headers | CSP, X-Frame-Options, X-XSS-Protection, Referrer-Policy on hosting |
| File auto-delete | Scheduled Cloud Function deletes audio + result docs after 3 hours |

---

## Run Locally

### Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project with Firestore, Storage, Authentication, App Check, and Cloud Functions enabled
- (For billing) A Razorpay account in Live Mode with subscription plans created

### 1. Clone and install

```bash
git clone https://github.com/ravishankaraiofficial/publishkit.git
cd publishkit
npm install
cd functions && npm install && cd ..
```

### 2. Frontend environment variables

```bash
cp .env.example .env
```

Fill in Firebase web config from **Firebase Console → Project Settings → General → Your apps**.

> The values in `.env` are **public Firebase identifiers** (apiKey, projectId, etc.) — safe to expose in a built JS bundle. The real secrets live in Firebase Secret Manager (see step 3).

### 3. Backend secrets (Firebase Secret Manager)

The backend reads these secrets at runtime — none of them ever touch `.env` or your repo.

```bash
firebase login
firebase use --add <YOUR_PROJECT_ID>

# Gemini AI
firebase functions:secrets:set GEMINI_API_KEY
# Paste your key from https://aistudio.google.com/app/apikey

# Razorpay (only if you want to enable subscriptions locally)
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
```

After setting Razorpay secrets, register a webhook on the Razorpay live dashboard pointing at:
```
https://<region>-<project>.cloudfunctions.net/razorpayWebhook
```
Subscribe to: `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.completed`. Use the same value you set in `RAZORPAY_WEBHOOK_SECRET`.

### 4. Razorpay plan IDs

Update plan IDs in [`functions/src/handlePayment.ts`](functions/src/handlePayment.ts) to match the plans you create on the Razorpay dashboard:

```ts
const PLAN_IDS: Record<string, string> = {
  pro: 'plan_YourLiveProPlanId',
  ultra: 'plan_YourLiveMaxPlanId',
};
```

### 5. Run locally

```bash
npm run dev
```

In a second terminal, watch + auto-rebuild the functions:

```bash
cd functions && npm run build:watch
```

### 6. Deploy

```bash
firebase deploy
```

Or piece-by-piece:

```bash
firebase deploy --only hosting             # frontend only
firebase deploy --only functions           # backend only
firebase deploy --only firestore:rules     # Firestore rules
firebase deploy --only storage             # Storage rules
```

---

## Razorpay setup helper

The repo ships [`deploy-razorpay.ps1`](deploy-razorpay.ps1) — a PowerShell script that walks through setting the three Razorpay secrets and deploying the payment functions in one go. It uses `Read-Host -AsSecureString` so secrets never echo to screen, and pipes via `[System.IO.File]::WriteAllText` + `--data-file=` (PowerShell's normal stdin pipe injects CRLF, which would corrupt the secret — this script avoids that trap).

```powershell
.\deploy-razorpay.ps1
```

---

## Project Structure

```
publishkit/
├── src/
│   ├── components/
│   │   ├── layout/        # Navbar, PageContainer, ProtectedRoute, AppLoader
│   │   ├── results/       # ResultTabs (with MultiPost tab), CopyButton
│   │   ├── ui/            # Button, Input, Card, Toast, Spinner, ColorPicker
│   │   └── upload/        # DropZone
│   ├── hooks/
│   │   ├── useAuth.tsx    # Firebase auth + race-condition handling
│   │   └── useUpload.tsx  # Upload state + MultiPost auto-trigger + Firestore listener
│   ├── lib/
│   │   ├── firebase.ts    # Firebase init with ReCaptchaEnterpriseProvider (App Check)
│   │   ├── api.ts         # Cloud Function callable wrappers
│   │   ├── colors.ts      # Shared color processing utilities
│   │   ├── languages.ts   # 13-language registry (frontend)
│   │   └── utils.ts       # cn() helper
│   ├── pages/
│   │   ├── Home.tsx           # Upload zone + MultiPost toggle + results
│   │   ├── Login.tsx
│   │   ├── Settings.tsx       # Creator profile + default language dropdown
│   │   ├── PastResults.tsx    # History page (real-time via onSnapshot)
│   │   ├── ScriptWriter.tsx   # Standalone Script Writer feature
│   │   ├── MultiPost.tsx      # Standalone MultiPost feature
│   │   ├── Pricing.tsx        # Plan cards + Razorpay checkout
│   │   ├── Feedback.tsx
│   │   ├── SetupProfile.tsx
│   │   └── AccessPending.tsx
│   └── types/                 # CreatorProfile, Result, OutputLanguage
├── functions/
│   └── src/
│       ├── index.ts              # Function exports
│       ├── processAudio.ts       # Audio/PDF/image metadata generation
│       ├── generate.ts           # Gemini calls for titles/timestamps/description/thumbnails
│       ├── transcribe.ts         # Native audio transcription
│       ├── handleScript.ts       # Script Writer callable
│       ├── handleRepurposing.ts  # MultiPost callable (writes back to result doc when resultId provided)
│       ├── handlePayment.ts      # Razorpay createSubscription + signed webhook handler
│       ├── cleanup.ts            # Scheduled 3-hour file deletion
│       ├── lib/
│       │   ├── firestore.ts      # Admin Firestore singleton
│       │   ├── gemini.ts         # Secret manager handle + client builder
│       │   └── languages.ts      # 13-language registry (backend) + prompt directives
│       ├── prompts/              # Per-output prompt builders (titles, timestamps, description, thumbnails)
│       └── middleware/
│           ├── auth.ts           # VPN/proxy detection + fingerprint enforcement
│           └── rateLimit.ts      # Plan-aware monthly counter helpers (script + repurposing + metadata)
├── deploy-razorpay.ps1           # PowerShell helper to set Razorpay secrets + redeploy
├── firestore.rules               # Firestore security rules
├── storage.rules                 # Storage security rules
├── firebase.json                 # Hosting + Functions config + security headers
├── .env.example                  # Template — copy to .env and fill in
└── vite.config.ts
```

---

## Cost

| Service | Plan |
|---|---|
| Firebase Hosting | Free tier |
| Cloud Firestore | Free tier (50k reads, 20k writes/day) |
| Firebase Storage | Free tier (5 GB storage) |
| Cloud Functions | Free tier (2M invocations/month) |
| Gemini 2.5 Flash | Pay-as-you-go |
| Razorpay | 2% + GST per successful transaction |

**Hard financial cap:** Google Cloud API quota is set to **8,000 requests/day** for `gemini-2.5-flash`. Mathematically guarantees a maximum spend of ~₹6,000/month even under sustained maximum load. A ₹1,000 budget alert email is also configured in Google Cloud Billing.

---

## License

MIT — use it, fork it, build on it.

---

*Built by [@ravishankaraiofficial](https://github.com/ravishankaraiofficial)*
