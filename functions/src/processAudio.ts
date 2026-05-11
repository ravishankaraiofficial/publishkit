import * as functions from 'firebase-functions';
import * as os from 'os';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import { db, storage } from './lib/firestore';
import { verifyWhitelist } from './middleware/auth';
import { checkRateLimit, incrementRateLimit } from './middleware/rateLimit';
import { transcribeAudio } from './transcribe';
import { generateOutputs, analyzeDocument } from './generate';
import { geminiApiKey } from './lib/gemini';

const CACHE_WINDOW_DAYS = 7;
const CACHE_WINDOW_MS = CACHE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

type OutputLanguage = "English" | "Hindi";

function normalizeLanguage(input: any): OutputLanguage {
  return input === "Hindi" ? "Hindi" : "English";
}

function sanitizeString(input: any): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'`]/g, '')
    .slice(0, 500);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 255);
}

async function findCachedResult(
  uid: string,
  audioFileName: string,
  audioSizeBytes: number,
  outputLanguage: OutputLanguage
): Promise<string | null> {
  const cutoffMs = Date.now() - CACHE_WINDOW_MS;

  const snapshot = await db
    .collection(`users/${uid}/results`)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.status !== 'complete') continue;
    if (data.audioFileName !== audioFileName) continue;
    if (data.audioSizeBytes !== audioSizeBytes) continue;
    if (data.outputLanguage && data.outputLanguage !== outputLanguage) continue;

    const created = data.createdAt?.toMillis ? data.createdAt.toMillis() : 0;
    if (created >= cutoffMs) {
      return doc.id;
    }
  }

  return null;
}

export const processAudio = functions
  .runWith({ timeoutSeconds: 120, memory: '512MB' })
  .https.onCall(async (data, context) => {
    try {
      // Security: App Check enforcement
      if (!context.app) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'The function must be called from an App Check verified app.'
        );
      }

      await verifyWhitelist(context, data.fingerprint);
      const uid = context.auth!.uid;

      const storagePath = sanitizeString(data.storagePath);
      const audioFileName = sanitizeFileName(data.audioFileName || '');
      const audioSizeBytes = typeof data.audioSizeBytes === 'number' ? data.audioSizeBytes : 0;
      const fileType: string = typeof data.fileType === 'string' ? data.fileType : 'audio/mpeg';
      const outputLanguage = normalizeLanguage(data.outputLanguage);

      if (!storagePath || !audioFileName) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required arguments');
      }

      // Cache check (same filename + filesize within last 7 days)
      const cachedId = await findCachedResult(uid, audioFileName, audioSizeBytes, outputLanguage);
      if (cachedId) {
        return { resultId: cachedId, cached: true };
      }

      const usageRef = await checkRateLimit(uid);
      await incrementRateLimit(usageRef);

      const resultRef = db.collection(`users/${uid}/results`).doc();
      const resultId = resultRef.id;
      const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + THREE_HOURS_MS);

      await resultRef.set({
        uid,
        audioFileName,
        audioStoragePath: storagePath,
        audioSizeBytes,
        fileType,
        outputLanguage,
        generateThumbnails: data.generateThumbnails === true,
        status: 'processing',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
      });

      return { resultId, cached: false };
    } catch (error: any) {
      // Never return internal error details to client
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('processAudio error:', error?.message);
      throw new functions.https.HttpsError('internal', 'Processing could not be started.');
    }
  });

export const processAudioWorker = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB', secrets: [geminiApiKey] })
  .firestore.document('users/{uid}/results/{resultId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (data.status !== 'processing') return;

    const { uid, resultId } = context.params;
    const storagePath = data.audioStoragePath;
    const fileType: string = data.fileType || 'audio/mpeg';
    const outputLanguage: OutputLanguage = normalizeLanguage(data.outputLanguage);
    const resultRef = snap.ref;
    let localFilePath = '';

    try {
      const bucket = storage.bucket();
      const file = bucket.file(storagePath);

      const tempDir = os.tmpdir();
      localFilePath = path.join(tempDir, path.basename(storagePath));
      await file.download({ destination: localFilePath });

      const isDocument = fileType === 'application/pdf' || fileType.startsWith('image/');

      if (isDocument) {
        // Document / image flow: pass file directly to Gemini for analysis
        const outputs = await analyzeDocument(localFilePath, fileType, outputLanguage);
        await resultRef.update({
          ...outputs,
          status: 'complete',
        });
      } else {
        // Audio flow: transcribe then generate YouTube metadata
        const [metadata] = await file.getMetadata();
        const mimeType = metadata.contentType || fileType;

        const transcript = await transcribeAudio(localFilePath, mimeType);

        const profileDoc = await db.doc(`users/${uid}`).get();
        let profile = profileDoc.data();

        if (!profile) {
          profile = {
            name: 'Guest',
            appearance: 'A generic avatar.',
            brandColor1: '#E05A1E',
            brandColor2: '#0D0D0D',
            language: outputLanguage,
            niche: 'General content',
          };
        }

        const outputs = await generateOutputs(
          transcript,
          profile,
          outputLanguage,
          data.generateThumbnails === true
        );

        await resultRef.update({
          transcript,
          ...outputs,
          status: 'complete',
        });
      }
    } catch (error: any) {
      // Log full error internally, never expose to client
      console.error(`Processing failed for result ${resultId}:`, error?.message);
      await resultRef.update({
        status: 'failed',
        errorMessage: 'Processing failed. Please try again.',
      });
    } finally {
      if (localFilePath && fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    }
  });
