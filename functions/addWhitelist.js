import * as admin from 'firebase-admin';

// Initialize the app with default credentials from the CLI
admin.initializeApp({
  projectId: 'gen-lang-client-0079285803'
});

async function run() {
  try {
    const db = admin.firestore();
    await db.collection('config').doc('whitelist').set({
      emails: ['ravishankar791001@gmail.com']
    });
    console.log('Whitelist successfully updated!');
  } catch (error) {
    console.error('Error updating whitelist:', error);
  }
}

run();
