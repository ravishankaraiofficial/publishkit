import * as fs from 'fs';
import { getGeminiClient } from './lib/gemini';
import { getTitlesPrompt } from './prompts/titles';
import { getTimestampsPrompt } from './prompts/timestamps';
import { getDescriptionPrompt } from './prompts/description';
import { getThumbnailsPrompt } from './prompts/thumbnails';
import { strongLanguageDirective } from './lib/languages';

// Language is validated upstream (processAudio coerces via VALID_LANGUAGES).
// This file accepts any string and lets the language helpers fall back safely.
type OutputLanguage = string;

const PER_CALL_TIMEOUT_MS = 25_000;
const DOC_CALL_TIMEOUT_MS = 60_000;

type CallResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

async function callWithTimeoutAndRetry<T>(
  fn: () => Promise<T>,
  label: string,
  timeoutMs = PER_CALL_TIMEOUT_MS
): Promise<CallResult<T>> {
  let lastError: string = "Unknown error";

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const value = await Promise.race<T>([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Timeout after ${timeoutMs}ms`)),
            timeoutMs
          )
        ),
      ]);
      return { ok: true, value };
    } catch (err: any) {
      lastError = err?.message || String(err);
      console.warn(`[generate:${label}] attempt ${attempt} failed:`, lastError);
    }
  }

  return { ok: false, error: lastError };
}

/**
 * Analyze a PDF or image file using Gemini 2.5 Flash multimodal.
 * Returns { summary, description } for the document output tabs.
 */
export async function analyzeDocument(
  localFilePath: string,
  mimeType: string,
  outputLanguage: OutputLanguage = "English"
): Promise<{ summary: string; description: string }> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.4,
    },
  });

  // Read file and encode as base64
  const fileBuffer = fs.readFileSync(localFilePath);
  const base64Data = fileBuffer.toString('base64');

  const prompt =
    `Analyze this file. Provide a 150-200 word summary and a 300-400 word detailed description. ` +
    `Output language: ${outputLanguage}.${strongLanguageDirective(outputLanguage)} ` +
    `For a PDF: summary covers main topic, key points, conclusion; description expands each key section. ` +
    `For an image: summary describes what is shown, text visible, and purpose; description covers colors, layout, text, people, objects, context. ` +
    `Return ONLY valid JSON with exactly these two keys: { "summary": string, "description": string }`;

  const result = await callWithTimeoutAndRetry(
    () => model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
      { text: prompt },
    ]),
    'analyzeDocument',
    DOC_CALL_TIMEOUT_MS
  );

  if (!result.ok) {
    console.error('[analyzeDocument] Gemini call failed:', result.error);
    throw new Error('Document analysis failed. Please try again.');
  }

  let parsed: { summary: string; description: string };
  try {
    parsed = JSON.parse(result.value.response.text());
  } catch (e) {
    console.error('[analyzeDocument] JSON parse failed:', e);
    throw new Error('Could not parse document analysis output.');
  }

  return {
    summary: (parsed.summary || '').trim(),
    description: (parsed.description || '').trim(),
  };
}

export async function generateOutputs(
  transcript: string,
  profile: any,
  outputLanguage: OutputLanguage = "English",
  generateThumbnails: boolean = false
) {
  const genAI = getGeminiClient();
  const modelJson = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
  });

  const modelText = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.7 },
  });

  const promises = [
    callWithTimeoutAndRetry(
      () => modelJson.generateContent(getTitlesPrompt(transcript, profile, outputLanguage)),
      'titles'
    ),
    callWithTimeoutAndRetry(
      () => modelText.generateContent(getTimestampsPrompt(transcript, profile, outputLanguage)),
      'timestamps'
    ),
    callWithTimeoutAndRetry(
      () => modelText.generateContent(getDescriptionPrompt(transcript, profile, outputLanguage)),
      'description'
    ),
  ];

  if (generateThumbnails) {
    promises.push(
      callWithTimeoutAndRetry(
        () => modelJson.generateContent(getThumbnailsPrompt(transcript, profile, outputLanguage)),
        'thumbnails'
      )
    );
  }

  const results = await Promise.all(promises);
  const titlesRes = results[0] as CallResult<any>;
  const timestampsRes = results[1] as CallResult<any>;
  const descriptionRes = results[2] as CallResult<any>;
  const thumbnailsRes = generateThumbnails
    ? results[3] as CallResult<any>
    : { ok: true, value: { response: { text: () => '{"imagen":"","chatgpt":""}' } } } as CallResult<any>;

  const partialErrors: Record<string, string> = {};

  // ---- Titles ----
  let titles: { title: string; reason: string }[] = [];
  if (titlesRes.ok) {
    try {
      titles = JSON.parse(titlesRes.value.response.text()).titles || [];
    } catch (e) {
      console.error('Failed to parse titles JSON');
      partialErrors.titles = 'Failed to parse titles output.';
    }
  } else {
    partialErrors.titles = titlesRes.error;
  }

  // ---- Timestamps ----
  let timestamps = '';
  if (timestampsRes.ok) {
    timestamps = timestampsRes.value.response.text().trim();
  } else {
    partialErrors.timestamps = timestampsRes.error;
  }

  // ---- Description (with timestamps placeholder replacement) ----
  let description = '';
  if (descriptionRes.ok) {
    description = descriptionRes.value.response.text().trim();
    description = description.replace('[TIMESTAMPS_PLACEHOLDER]', timestamps);
  } else {
    partialErrors.description = descriptionRes.error;
  }

  // ---- Thumbnails ----
  let thumbnails: { imagen: string; chatgpt: string } = { imagen: '', chatgpt: '' };
  if (thumbnailsRes.ok) {
    try {
      thumbnails = JSON.parse(thumbnailsRes.value.response.text());
    } catch (e) {
      console.error('Failed to parse thumbnails JSON');
      partialErrors.thumbnails = 'Failed to parse thumbnail prompts output.';
    }
  } else {
    partialErrors.thumbnails = (thumbnailsRes as CallResult<any> & { ok: false }).error;
  }

  return {
    titles,
    timestamps,
    description,
    thumbnailPromptImagen: thumbnails.imagen,
    thumbnailPromptChatGPT: thumbnails.chatgpt,
    partialErrors: Object.keys(partialErrors).length ? partialErrors : null,
  };
}

export async function generateScriptFromContent(
  contentContext: string,
  profile: any,
  tone: string,
  duration: string,
  outputLanguage: OutputLanguage,
  plan: string
) {
  const genAI = getGeminiClient();
  const { pickModel } = require('./lib/pickModel');
  const { buildScriptPrompt } = require('./lib/scriptPrompt');
  
  const modelName = pickModel(plan, 'script');
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
  });

  const prompt = buildScriptPrompt(contentContext, profile, tone, duration, outputLanguage);

  const result = await callWithTimeoutAndRetry(
    () => model.generateContent(prompt),
    'generateScriptFromContent',
    DOC_CALL_TIMEOUT_MS // Use longer timeout for scripts
  );

  if (!result.ok) {
    throw new Error('Script generation failed. Please try again.');
  }

  const responseText = result.value.response.text();

  let jsonText = responseText;
  const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  } else {
    const objectMatch = responseText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonText = objectMatch[0];
    }
  }

  let scriptData;
  try {
    scriptData = JSON.parse(jsonText);
  } catch (e) {
    throw new Error('Failed to parse script JSON output.');
  }

  if (
    !scriptData.hook ||
    !scriptData.intro ||
    !Array.isArray(scriptData.sections) ||
    !scriptData.cta
  ) {
    throw new Error('Invalid script structure from Gemini');
  }

  return scriptData;
}

