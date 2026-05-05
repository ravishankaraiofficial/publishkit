# PublishKit

> Turn your audio, PDFs, and images into YouTube-ready **Titles, Timestamps & Descriptions** in 90 seconds — powered by Gemini AI.

🔗 **Live Demo:** [publishkit.web.app](https://publishkit.web.app)

---

## What is it?

PublishKit is a web app built for YouTube creators. You upload a file — an audio recording, a PDF, or an image — and the AI reads it, understands the content, and instantly generates everything you need to publish a video on YouTube:

- Multiple title options
- Full timestamped chapters
- SEO-ready description
- Thumbnail prompt ideas (for audio files)

No manual editing. No copy-pasting from ChatGPT. One upload → ready to publish.

---

## Why I Built It

Publishing a YouTube video takes 10–15 minutes just for the metadata — writing titles, chapters, and descriptions. Multiply that by every video, every week.

PublishKit removes that friction entirely. It's designed for creators who record content and want to spend their time creating, not formatting.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Auth | Firebase Authentication (Google + Anonymous) |
| Database | Cloud Firestore |
| File Storage | Firebase Storage |
| Backend | Firebase Cloud Functions (Node.js) |
| AI | Google Gemini 2.5 Flash |
| Transcription | Gemini native audio understanding |
| Deployment | Firebase Hosting |
| Forms | React Hook Form + Zod |
| State | React Context API |

---

## Features

- 🎙️ **Audio → YouTube Metadata** — Upload MP3/WAV/AAC; get titles, timestamps, and a description
- 📄 **PDF & Image Analysis** — Upload documents or images; AI summarises and generates metadata
- 🌐 **English & Hindi Output** — Switch output language before uploading
- 🎨 **Thumbnail Prompts** — Optional AI-generated thumbnail ideas (audio only)
- 👤 **Creator Profile** — Set your name, niche, brand colours, and appearance so AI personalises the output for your channel
- 🆓 **Free Trial** — New visitors get 1 free session with no sign-in required
- 📱 **Mobile-Friendly** — Full responsive UI including a proper mobile color picker
- 🔒 **Secure by Design** — Firestore rules, Storage rules, rate limiting (10/day per user), guest quota per UID
- 📜 **History Page** — View all past results; files auto-deleted after 3 hours
- ⚡ **Result Caching** — Same file within 7 days returns instantly from cache

---

## Security Model

| Concern | How it's handled |
|---|---|
| API keys | Gemini key lives in Firebase Secret Manager — never in code or `.env` |
| Auth | Firebase Google OAuth — no passwords stored |
| Data isolation | Firestore rules enforce `uid === auth.uid` on every read/write |
| Guest abuse | 1 free session per anonymous UID enforced server-side |
| Rate limiting | 10 uploads/day per signed-in user enforced in Cloud Functions |
| File access | Firebase Storage rules reject wrong MIME types and files > 200 MB |
| Headers | CSP, X-Frame-Options, X-XSS-Protection, Referrer-Policy set on hosting |

---

## What I Learned

- Building a full-stack AI product end-to-end (frontend → Cloud Functions → Gemini API)
- Firebase auth flows: anonymous sign-in, Google OAuth popup vs redirect, race condition prevention
- Writing secure Firestore + Storage rules from scratch
- Handling mobile-specific auth issues (cross-origin popup blocks, redirect flow timing)
- React Context for global upload state with localStorage persistence
- Rate limiting and quota management in serverless functions
- Making a native `<input type="color">` work consistently on mobile (it doesn't — switched to `react-colorful`)

---

## Future Improvements

- [ ] YouTube Data API integration — publish directly from the app
- [ ] Batch upload — process multiple files at once
- [ ] Result editing — edit titles/description inline before copying
- [ ] Email notifications when long files finish processing
- [ ] Upgrade to Gemini 2.0 streaming for real-time output
- [ ] PWA support for offline access and install prompt

---

## Run Locally

### Prerequisites
- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project with Firestore, Storage, Authentication, and Functions enabled

### 1. Clone and install

```bash
git clone https://github.com/ravishankaraiofficial/publishkit.git
cd publishkit
npm install
cd functions && npm install && cd ..
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in your Firebase config values from:  
**Firebase Console → Project Settings → General → Your apps → Web app**

### 3. Set the Gemini API key (Cloud Functions secret)

The Gemini API key is stored securely in Firebase Secret Manager — never in `.env`.

```bash
firebase login
firebase use --add <YOUR_PROJECT_ID>
firebase functions:secrets:set GEMINI_API_KEY
# Paste your Gemini API key when prompted
```

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 4. Run locally

```bash
npm run dev
```

### 5. Deploy

```bash
firebase deploy
```

This deploys Hosting, Cloud Functions, Firestore rules, and Storage rules in one command.

---

## Project Structure

```
publishkit/
├── src/
│   ├── components/
│   │   ├── layout/        # Navbar, PageContainer, ProtectedRoute, AppLoader
│   │   ├── results/       # ResultTabs, CopyButton
│   │   ├── ui/            # Button, Input, Card, Toast, Spinner
│   │   └── upload/        # DropZone
│   ├── hooks/
│   │   ├── useAuth.tsx    # Firebase auth (Google + anonymous + race condition handling)
│   │   └── useUpload.tsx  # Upload state, Firestore listener, result management
│   ├── lib/
│   │   ├── firebase.ts    # Firebase app initialisation
│   │   ├── api.ts         # Cloud Function callable
│   │   └── utils.ts       # cn() helper
│   ├── pages/
│   │   ├── Home.tsx       # Upload zone + results
│   │   ├── Login.tsx      # Google sign-in
│   │   ├── Settings.tsx   # Creator profile
│   │   ├── PastResults.tsx# History page
│   │   ├── SetupProfile.tsx
│   │   └── AccessPending.tsx
│   └── types/             # Shared TypeScript types
├── functions/
│   └── src/
│       ├── index.ts           # Function exports
│       ├── processAudio.ts    # Main callable + Firestore worker trigger
│       ├── generate.ts        # Gemini title/timestamp/description generation
│       ├── transcribe.ts      # Gemini audio transcription
│       ├── cleanup.ts         # Scheduled 3-hour file deletion
│       └── middleware/
│           ├── auth.ts        # Guest quota + Google user bypass
│           └── rateLimit.ts   # 10/day per user limit
├── firestore.rules            # Firestore security rules
├── storage.rules              # Firebase Storage security rules
├── firebase.json              # Hosting + Functions config + security headers
├── .env.example               # Template — copy to .env and fill in values
└── vite.config.ts
```

---

## Cost

Designed to run on free tiers:

| Service | Free Tier |
|---|---|
| Firebase Hosting | 10 GB/month |
| Cloud Firestore | 50k reads, 20k writes/day |
| Firebase Storage | 5 GB storage, 1 GB/day download |
| Cloud Functions | 2M invocations/month |
| Gemini 2.5 Flash | Free tier available via Google AI Studio |

Recommended: set a **$1/month budget alert** in Google Cloud Console.

---

## License

MIT — use it, fork it, build on it.

---

*Built by [@ravishankaraiofficial](https://github.com/ravishankaraiofficial)*
