import * as functions from 'firebase-functions/v1';
import { Timestamp } from 'firebase-admin/firestore';
import { db, storage } from './lib/firestore';

/**
 * Hourly cleanup — deletes Storage files older than 3 hours,
 * then deletes their matching Firestore result documents.
 *
 * Uses single-collection queries scoped to each user, so it
 * needs no special index / no collection-group exemption.
 */
export const deleteOldAudio = functions.pubsub
  .schedule('0 * * * *')
  .timeZone('UTC')
  .onRun(async (_context) => {
    const bucket = storage.bucket();
    const now = Date.now();
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    let storageDeleted = 0;
    let firestoreDeleted = 0;
    let webhookEventsDeleted = 0;

    try {
      const [files] = await bucket.getFiles({ prefix: 'users/' });

      for (const file of files) {
        if (
          !file.name.includes('/audio/') &&
          !file.name.includes('/uploads/')
        ) {
          continue;
        }

        let createdMs = 0;
        try {
          const [metadata] = await file.getMetadata();
          createdMs = new Date(metadata.timeCreated || '').getTime();
        } catch {
          continue;
        }

        if (now - createdMs <= THREE_HOURS_MS) continue;

        // Extract uid from path: users/{uid}/audio/... or users/{uid}/uploads/...
        const pathParts = file.name.split('/');
        const uid = pathParts[1];

        // Delete the Storage file
        try {
          await file.delete();
          storageDeleted++;
        } catch (err: any) {
          console.error(`Failed to delete storage file: ${file.name}`, err?.message);
          continue;
        }

        // Delete Firestore docs for this user that point at this Storage path.
        // This is a single-field equality query on a single collection — auto-indexed by default.
        if (uid) {
          try {
            const docsSnap = await db
              .collection(`users/${uid}/results`)
              .where('audioStoragePath', '==', file.name)
              .get();

            await Promise.all(docsSnap.docs.map((d) => d.ref.delete()));
            firestoreDeleted += docsSnap.size;
          } catch (err: any) {
            console.error(
              `Failed to delete Firestore docs for ${file.name}`,
              err?.message
            );
          }
        }
      }
    } catch (err: any) {
      console.error('Cleanup error:', err?.message);
    }

    // Prune Razorpay webhook event-ID dedup docs older than 7 days. Razorpay's
    // own retry window is much shorter than that, so anything older than a
    // week will never be re-delivered and the dedup record is no longer needed.
    try {
      const sevenDaysAgo = Timestamp.fromMillis(now - SEVEN_DAYS_MS);
      const oldEventsSnap = await db
        .collection('webhookEvents')
        .where('processedAt', '<', sevenDaysAgo)
        .limit(500) // Hard cap per run to keep within Firestore batched-delete safety
        .get();

      if (!oldEventsSnap.empty) {
        const batch = db.batch();
        oldEventsSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        webhookEventsDeleted = oldEventsSnap.size;
      }
    } catch (err: any) {
      console.error('webhookEvents cleanup error:', err?.message);
    }

    console.log(
      `Cleanup complete — storage files deleted: ${storageDeleted}, ` +
      `Firestore result docs deleted: ${firestoreDeleted}, ` +
      `webhookEvents pruned: ${webhookEventsDeleted}`
    );
    return null;
  });
