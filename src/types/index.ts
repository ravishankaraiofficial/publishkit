import type { Timestamp } from 'firebase/firestore';
import type { OutputLanguage } from '../lib/languages';

export type PlanTier = 'free' | 'pro' | 'ultra';

// Address-form preference for Hindi/Hinglish output. Used by the Script
// Writer prompt to match the creator's audience-talk style. `na` =
// not applicable (output language is not Hindi/Hinglish).
export type AddressForm = 'tum' | 'aap' | 'mixed' | 'na';

export type AudienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'mixed';

export type VideoLength = '15' | '30' | '45' | '60' | '90' | 'long';

export interface CreatorProfile {
  // ─── Required basics ────────────────────────────────────────────────────
  name: string;
  handle?: string;
  niche: string;
  language: OutputLanguage;
  // UI display language for the entire web app. Independent of `language`
  // (which controls generation output). Set via the LanguageBar component;
  // synced to localStorage + this field so the choice follows the user
  // across devices.
  uiLanguage?: OutputLanguage;

  // Required for thumbnails (existing)
  appearance: string;
  brandColor1: string;
  brandColor2: string;

  // ─── NEW required for script quality ────────────────────────────────────
  // One-line positioning, e.g. "18 y/o building a 6-figure AI agency"
  positioning?: string;
  // Who watches your content, e.g. "20-25 y/o aspiring Indian creators"
  targetAudience?: string;
  // Overall tone preset for scripts
  tone?: string;

  // ─── Recommended optionals (sharper scripts) ────────────────────────────
  audiencePainPoint?: string;
  audienceLevel?: AudienceLevel;
  audienceTransformation?: string;
  catchphrases?: string;
  avoidWords?: string;
  hookStyle?: string;
  ctaStyle?: string;
  contentPillars?: string;
  preferredVideoLength?: VideoLength;

  // ─── Advanced optionals (fine-tune voice) ───────────────────────────────
  age?: number;
  whatMakesDifferent?: string;
  personalStory?: string;
  credentials?: string;
  addressForm?: AddressForm;
  usesSlang?: boolean;
  usesMemes?: boolean;
  usesCursing?: boolean;
  bestVideoHooks?: string;
  hookFormulas?: string;

  // ─── Plan / billing (server-managed) ────────────────────────────────────
  plan?: PlanTier;
  planExpiry?: string;
  razorpaySubscriptionId?: string;

  // ─── Server-managed trial / usage (Admin SDK only — see firestore.rules) ─
  scriptTrialLastUsedAt?: Timestamp | null;
  repurposingTrialLastUsedAt?: Timestamp | null;
  scriptUsageThisMonth?: number;
  repurposingUsageThisMonth?: number;
  scriptUsageMonth?: string;
  repurposingUsageMonth?: string;
}

export interface Result {
  id?: string;
  audioFileName: string;
  audioStoragePath: string;
  audioSizeBytes: number;
  fileType?: string;
  status: 'processing' | 'complete' | 'failed';
  createdAt: any;
  expiresAt?: any;
  uid?: string;
  transcript?: string;
  titles?: { title: string; reason: string }[];
  timestamps?: string;
  description?: string;
  thumbnailPromptImagen?: string;
  thumbnailPromptChatGPT?: string;
  // Document analysis outputs (PDF / image uploads)
  summary?: string;
  errorMessage?: string;
  outputLanguage?: string;
  partialErrors?: Record<string, string> | null;
  cached?: boolean;
  // MultiPost output, persisted on the result doc by the generateRepurposing
  // Cloud Function when a resultId is passed. Auto-deletes with the rest of
  // the result document via the deleteOldAudio scheduled job (3 hours).
  multiPostOutput?: {
    x?: string[];
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
}
