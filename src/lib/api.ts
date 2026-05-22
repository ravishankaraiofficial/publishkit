import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { OutputLanguage } from './languages';

export const processAudioCall = httpsCallable<{
  storagePath: string;
  audioFileName: string;
  audioSizeBytes: number;
  outputLanguage?: OutputLanguage;
  generateThumbnails?: boolean;
  fileType?: string;
  fingerprint?: string;
  generationMode?: 'metadata' | 'script';
  scriptTone?: string;
  scriptDuration?: string;
}, { resultId: string; cached?: boolean }>(functions, 'processAudio');
