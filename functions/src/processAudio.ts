import * as functions from 'firebase-functions';
import * as os from 'os';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import { db, storage } from './lib/firestore';
import { verifyWhitelist } from './middleware/auth';
import { enforceRateLimit, enforceBurstLimit } from './middleware/rateLimit';
import { enforceFreeTierGuard } from './lib/freeTierGuard';
import { transcribeAudio } from './transcribe';
import { generateOutputs, analyzeDocument } from './generate';
import { geminiApiKey } from './lib/gemini';
import { coerceLanguage } from './lib/languages';

const CACHE_WINDOW_DAYS = 7;
const CACHE_WINDOW_MS = CACHE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

// Output language is validated/coerced via the shared VALID_LANGUAGES set
// in lib/languages.ts. Use a plain string here so the rest of the call chain
// (generate.ts, prompts/*) accepts the wider set of 13 languages.
type OutputLanguage = string;

function normalizeLanguage(input: any): OutputLanguage {
  return coerceLanguage(input);
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
  outputLanguage: OutputLanguage,
  generateThumbnails: boolean
): Promise<string | null> {
  const cutoffMs = Date.now() - CACHE_WINDOW_MS;

  const snapshot = await db
    .collection(`users/${uid}/results`)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    // Match both completed results (cache hit) and ongoing ones (idempotency/recovery).
    if (data.status !== 'complete' && data.status !== 'processing') continue;
    if (data.audioFileName !== audioFileName) continue;
    if (data.audioSizeBytes !== audioSizeBytes) continue;
    if (data.outputLanguage && data.outputLanguage !== outputLanguage) continue;
    if (data.generateThumbnails !== generateThumbnails) continue;

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
      const fileType = typeof data.fileType === 'string' ? data.fileType : 'audio/mpeg';
      const outputLanguage = normalizeLanguage(data.outputLanguage);
      const generateThumbnails = data.generateThumbnails === true;
      
      if (!storagePath || !audioFileName) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required arguments');
      }

      // SECURITY: Path ownership check. Prevents an attacker from passing a 
      // victim's storage path to have it analyzed and returned to the attacker.
      if (!storagePath.startsWith(`users/${uid}/`)) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Access denied: storage path must belong to the caller.'
        );
      }

      // Cache check (same filename + filesize + thumbnails flag within last 7 days)
      const cachedId = await findCachedResult(uid, audioFileName, audioSizeBytes, outputLanguage, generateThumbnails);
      if (cachedId) {
        return { resultId: cachedId, cached: true };
      }

      // Read user's plan for rate limit enforcement
      const userDoc = await db.doc(`users/${uid}`).get();
      const plan = (userDoc.data()?.plan as string) || 'free';

      // Burst rate limit: blocks single-user request floods (Free 2/min,
      // Pro 8/min, Max 20/min). Catches DoS attacks before monthly enforcement.
      await enforceBurstLimit(uid, plan);

      // Enforce atomic monthly rate limits (UID + IP based)
      const rawIp = context.rawRequest.ip || 'unknown';
      await enforceRateLimit(uid, rawIp, plan);

      // Anti-abuse: block fresh UIDs from reusing the free tier on the same
      // device/IP as a previous free-tier account. No-op for paid users.
      // Accept either `visitorId` (new convention) or `fingerprint` (existing
      // field already sent by useUpload.tsx).
      const visitorId =
        (typeof (data as any)?.visitorId === 'string' ? (data as any).visitorId : undefined) ||
        (typeof (data as any)?.fingerprint === 'string' ? (data as any).fingerprint : undefined);
      await enforceFreeTierGuard({ uid, rawIp, visitorId, plan });

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
        generateThumbnails,
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
