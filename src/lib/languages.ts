// Shared output-language registry (frontend).
// Mirror this list in functions/src/lib/languages.ts — only 13 entries, keep them in sync.

export type OutputLanguage =
  | 'English'
  | 'Hindi'
  | 'Hinglish'
  | 'Telugu'
  | 'Tamil'
  | 'Gujarati'
  | 'Marathi'
  | 'Punjabi'
  | 'Bengali'
  | 'Malayalam'
  | 'Kannada'
  | 'Assamese'
  | 'Bhojpuri'
  | 'Urdu';

export interface OutputLanguageOption {
  value: OutputLanguage;
  label: string;
  native: string;
}

// Order is intentional — surfaced in every dropdown exactly like this.
export const OUTPUT_LANGUAGES: OutputLanguageOption[] = [
  { value: 'English',   label: 'English',   native: 'English' },
  { value: 'Hindi',     label: 'Hindi',     native: 'हिंदी' },
  { value: 'Hinglish',  label: 'Hinglish',  native: 'Hinglish' },
  { value: 'Telugu',    label: 'Telugu',    native: 'తెలుగు' },
  { value: 'Tamil',     label: 'Tamil',     native: 'தமிழ்' },
  { value: 'Gujarati',  label: 'Gujarati',  native: 'ગુજરાતી' },
  { value: 'Marathi',   label: 'Marathi',   native: 'मराठी' },
  { value: 'Punjabi',   label: 'Punjabi',   native: 'ਪੰਜਾਬੀ' },
  { value: 'Bengali',   label: 'Bengali',   native: 'বাংলা' },
  { value: 'Malayalam', label: 'Malayalam', native: 'മലയാളം' },
  { value: 'Kannada',   label: 'Kannada',   native: 'ಕನ್ನಡ' },
  { value: 'Assamese',  label: 'Assamese',  native: 'অসমীয়া' },
  { value: 'Bhojpuri',  label: 'Bhojpuri',  native: 'भोजपुरी' },
  { value: 'Urdu',      label: 'Urdu',      native: 'اردو' },
];

// Convenience tuple for zod / runtime validation.
export const OUTPUT_LANGUAGE_VALUES = OUTPUT_LANGUAGES.map(
  (l) => l.value
) as [OutputLanguage, ...OutputLanguage[]];

// Pretty display: "Hindi — हिंदी". For English we just show "English".
export function formatLanguageOption(opt: OutputLanguageOption): string {
  if (opt.value === 'English' || opt.value === 'Hinglish') return opt.label;
  return `${opt.label} — ${opt.native}`;
}

// For toast: native script if non-English, else the English label.
export function toastNativeName(lang: OutputLanguage): string {
  const found = OUTPUT_LANGUAGES.find((l) => l.value === lang);
  return found?.native ?? lang;
}
