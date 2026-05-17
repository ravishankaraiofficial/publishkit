import type { Timestamp } from 'firebase/firestore';
import type { OutputLanguage } from '../lib/languages';

export type PlanTier = 'free' | 'pro' | 'ultra';

export interface CreatorProfile {
  name: string;
  handle?: string;
  appearance: string;
  brandColor1: string;
  brandColor2: string;
  language: OutputLanguage;
  niche: string;
  plan?: PlanTier;
  planExpiry?: string;
  razorpaySubscriptionId?: string;
  // Server-managed trial / usage fields (Admin SDK only — see firestore.rules)
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
  };
}
