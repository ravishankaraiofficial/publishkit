import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiApiKey } from './lib/gemini';

interface ScriptOutput {
  hook: string;
  intro: string;
  sections: Array<{ title: string; content: string }>;
  cta: string;
}

export const generateScript = functions
  .runWith({ timeoutSeconds: 60, memory: '256MB', secrets: [geminiApiKey] })
  .https.onCall(async (data, context) => {
    try {
      // Security: App Check enforcement
      if (!context.app) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'The function must be called from an App Check verified app.'
        );
      }

      // Authentication check
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
      }

      // Validate inputs
      const topic = typeof data.topic === 'string' ? data.topic.trim() : '';
      const tone = ['Casual', 'Educational', 'Storytelling'].includes(data.tone) ? data.tone : 'Casual';
      const duration = ['5', '10', '15'].includes(data.duration) ? data.duration : '10';
      const language = ['English', 'Hindi'].includes(data.language) ? data.language : 'English';

      if (!topic || topic.length === 0 || topic.length > 500) {
        throw new functions.https.HttpsError('invalid-argument', 'Topic must be between 1 and 500 characters');
      }

      // Initialize Gemini
      const apiKey = geminiApiKey.value();
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `You are an expert YouTube scriptwriter. Generate a ${duration}-minute YouTube script in ${language} with a ${tone.toLowerCase()} tone.

Topic: ${topic}

Output the script as a JSON object with exactly this structure (IMPORTANT: valid JSON only, no markdown):
{
  "hook": "30-second hook to grab attention",
  "intro": "Brief introduction (1-2 sentences)",
  "sections": [
    {
      "title": "Section Title",
      "content": "Section content (2-3 paragraphs)"
    }
  ],
  "cta": "Call to action (1-2 sentences)"
}

Requirements:
- Hook must be max 2-3 sentences, designed to hook viewers in first 30 seconds
- Intro should introduce the topic and promise value
- Create 3-4 main sections with relevant titles and detailed content
- Content should be engaging and follow the ${tone} tone
- CTA should encourage viewers to like, subscribe, or take action
- Language: ${language}${language === 'Hindi' ? ' (use Devanagari script)' : ''}
- Return ONLY valid JSON, no markdown formatting or extra text`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Parse JSON from response (handle markdown code blocks)
      let jsonText = responseText;
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        // Try to extract JSON object directly
        const objectMatch = responseText.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          jsonText = objectMatch[0];
        }
      }

      const scriptData: ScriptOutput = JSON.parse(jsonText);

      // Validate output structure
      if (
        !scriptData.hook ||
        !scriptData.intro ||
        !Array.isArray(scriptData.sections) ||
        !scriptData.cta
      ) {
        throw new Error('Invalid script structure from Gemini');
      }

      return scriptData;
    } catch (error: any) {
      console.error('generateScript error:', error?.message);

      // Return specific error messages
      if (error instanceof SyntaxError) {
        throw new functions.https.HttpsError('internal', 'Failed to parse script response. Please try again.');
      }

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', 'Failed to generate script. Please try again.');
    }
  });
