import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export const processAudioCall = httpsCallable<{
  storagePath: string;
  audioFileName: string;
  audioSizeBytes: number;
  outputLanguage?: "English" | "Hindi";
  generateThumbnails?: boolean;
  fileType?: string;
}, { resultId: string; cached?: boolean }>(functions, 'processAudio');
