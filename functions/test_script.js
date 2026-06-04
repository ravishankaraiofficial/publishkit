const { initializeApp } = require('firebase-admin/app');
initializeApp();

const { generateScriptFromContent } = require('./lib/generate');

async function test() {
  const profile = {
    name: 'Test',
    appearance: 'A generic avatar.',
    brandColor1: '#E05A1E',
    brandColor2: '#0D0D0D',
    language: 'English',
    niche: 'General content',
  };
  try {
    const res = await generateScriptFromContent(
      'This is a test transcript of 30 seconds audio.',
      profile,
      'Casual',
      '30s',
      'English',
      'free'
    );
    console.log(res);
  } catch (err) {
    console.error(err);
  }
}
test();
