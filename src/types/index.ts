export interface CreatorProfile {
  name: string;
  handle?: string;
  appearance: string;
  brandColor1: string;
  brandColor2: string;
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
}
