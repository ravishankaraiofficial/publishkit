// Shared output-language registry (backend).
// Mirror this list in src/lib/languages.ts (frontend) — keep both in sync.

export const VALID_LANGUAGES: ReadonlySet<string> = new Set([
  'English',
  'Hindi',
  'Hinglish',
  'Telugu',
  'Tamil',
  'Gujarati',
  'Marathi',
  'Punjabi',
  'Bengali',
  'Malayalam',
  'Kannada',
  'Bhojpuri',
  'Urdu',
]);

// Inline hint appended to Gemini prompts to steer output language and script.
// Empty string for English so existing prompts read identically by default.
const HINTS: Record<string, string> = {
  English:   '',
  Hindi:     ' (use Devanagari script — हिंदी)',
  Hinglish:  ' (hindi vocabulary written in english — e.g., "kaise ho?")',
  Telugu:    ' (use Telugu script — తెలుగు)',
  Tamil:     ' (use Tamil script — தமிழ்)',
  Gujarati:  ' (use Gujarati script — ગુજરાતી)',
  Marathi:   ' (use Devanagari script — मराठी; distinct from Hindi)',
  Punjabi:   ' (use Gurmukhi script — ਪੰਜਾਬੀ)',
  Bengali:   ' (use Bengali script — বাংলা)',
  Malayalam: ' (use Malayalam script — മലയാളം)',
  Kannada:   ' (use Kannada script — ಕನ್ನಡ)',
  Bhojpuri:  ' (use Devanagari script — भोजपुरी; aim for Bhojpuri vocabulary, Hindi-flavoured fallback acceptable)',
  Urdu:      ' (use Nastaliq/Arabic script — اردو)',
};

export function languageHint(lang: string): string {
  return HINTS[lang] ?? '';
}

// "Introduction" translation used as the first chapter label in timestamps.
// Falls back to English if the language is unknown.
const INTRODUCTION_WORD: Record<string, string> = {
  English:   'Introduction',
  Hindi:     'परिचय',
  Hinglish:  'Introduction',
  Telugu:    'పరిచయం',
  Tamil:     'அறிமுகம்',
  Gujarati:  'પરિચય',
  Marathi:   'प्रस्तावना',
  Punjabi:   'ਜਾਣ-ਪਛਾਣ',
  Bengali:   'ভূমিকা',
  Malayalam: 'ആമുഖം',
  Kannada:   'ಪರಿಚಯ',
  Bhojpuri:  'परिचय',
  Urdu:      'تعارف',
};

export function introductionWord(lang: string): string {
  return INTRODUCTION_WORD[lang] ?? 'Introduction';
}

// Coerce client-supplied language to a valid value (English fallback).
export function coerceLanguage(input: unknown): string {
  return typeof input === 'string' && VALID_LANGUAGES.has(input) ? input : 'English';
}

// Per-language script + name pairs used to build the forceful directive below.
// (audio prompts need this stronger steering — see strongLanguageDirective.)
interface LangConfig {
  name: string;
  script: string;
  scriptNote?: string;
}

const LANG_CONFIG: Record<string, LangConfig> = {
  English:   { name: 'English',   script: '' },
  Hindi:     { name: 'Hindi',     script: 'Devanagari' },
  Hinglish:  { name: 'Hinglish',  script: 'Latin/Roman characters' },
  Telugu:    { name: 'Telugu',    script: 'Telugu' },
  Tamil:     { name: 'Tamil',     script: 'Tamil' },
  Gujarati:  { name: 'Gujarati',  script: 'Gujarati' },
  Marathi:   { name: 'Marathi',   script: 'Devanagari', scriptNote: 'distinct from Hindi' },
  Punjabi:   { name: 'Punjabi',   script: 'Gurmukhi' },
  Bengali:   { name: 'Bengali',   script: 'Bengali' },
  Malayalam: { name: 'Malayalam', script: 'Malayalam' },
  Kannada:   { name: 'Kannada',   script: 'Kannada' },
  Bhojpuri:  { name: 'Bhojpuri',  script: 'Devanagari', scriptNote: 'Hindi-flavoured fallback acceptable' },
  Urdu:      { name: 'Urdu',      script: 'Nastaliq/Arabic' },
};

/**
 * Strong, forceful directive consumed by the audio metadata prompts
 * (titles / description / timestamps / thumbnails). The transcription-derived
 * prompts need aggressive language steering because Gemini's default behaviour
 * is to respond in the original audio language. Returns empty string for English
 * so existing prompts read identically by default.
 */
export function strongLanguageDirective(lang: string): string {
  if (lang === 'English' || !lang) return '';
  if (lang === 'Hinglish') {
    return (
      '\nCRITICAL INSTRUCTION: You MUST respond in Hinglish — Hindi vocabulary ' +
      'and grammar written in English/Latin characters (e.g., "kaise ho?", NOT ' +
      '"कैसे हो?" or "How are you?"). Do NOT respond in pure English. Do NOT use ' +
      'Devanagari script.\n'
    );
  }
  const cfg = LANG_CONFIG[lang];
  if (!cfg || !cfg.script) return '';
  const scriptHint = cfg.scriptNote ? `${cfg.script} script (${cfg.scriptNote})` : `${cfg.script} script`;
  return (
    `\nCRITICAL INSTRUCTION: You MUST translate and respond EXCLUSIVELY in ` +
    `${cfg.name} using the ${scriptHint}. Do NOT respond in English. Keep ` +
    `timestamps in numeric format only.\n`
  );
}

/**
 * Variant for the thumbnails prompt only — the *image description* must stay
 * in English (image generators need English prompts) while any text that appears
 * IN the image should be in the target language. Mirrors the existing
 * Hindi-only behaviour.
 */
export function thumbnailLanguageDirective(lang: string): string {
  if (lang === 'English' || !lang) return '';
  if (lang === 'Hinglish') {
    return (
      '\nCRITICAL INSTRUCTION: Any text that appears IN the thumbnail image MUST ' +
      'be in Hinglish (Hindi words written in English characters, e.g., "Aaja Dekh"). ' +
      'The description of the image itself should be in English so the AI image ' +
      'generator understands it.\n'
    );
  }
  const cfg = LANG_CONFIG[lang];
  if (!cfg || !cfg.script) return '';
  return (
    `\nCRITICAL INSTRUCTION: Any text that appears IN the thumbnail image MUST be ` +
    `written in ${cfg.name} (${cfg.script} script). The description of the image ` +
    `itself should be in English so the AI image generator understands it.\n`
  );
}
