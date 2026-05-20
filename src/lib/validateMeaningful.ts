// Heuristic check: is the given text meaningful (not gibberish / keyboard-mash)?
//
// We don't try to be perfect — just block the obvious junk patterns so the
// generator isn't fed "asdfgh" or "................" as a positioning line.
//
// Apply this to free-text profile fields where the content is fed into a
// prompt. Do NOT apply to:
//   - YouTube handle (already validated by its own regex)
//   - enums, booleans, numeric ranges, color fields
//
// Returns true if the text looks meaningful enough, false otherwise.

const KEYBOARD_RUNS = [
  'qwerty', 'qwert', 'werty', 'asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl',
  'zxcv', 'xcvb', 'cvbn', 'vbnm', 'qazwsx', 'qazwsxedc',
  '1234', '2345', '3456', '4567', '5678', '6789', '7890',
  'abcd', 'bcde', 'cdef', 'defg',
];

// Latin vowels + common Indic vowel signs / independent vowels (Devanagari,
// Bengali, Tamil, Telugu, Kannada, Malayalam, Gujarati, Punjabi).
const VOWEL_REGEX =
  /[aeiouAEIOUअ-औा-ौঅ-ঔা-ৌஅ-ஔா-ௌఅ-ఔా-ౌಅ-ಔಾ-ೌഅ-ഔാ-ൌઅ-ઔા-ૌਅ-ਔਾ-ੌ]/;

export function isMeaningfulText(raw: string, opts: { minWords?: number } = {}): boolean {
  const text = (raw ?? '').trim();
  if (text.length === 0) return false;

  // Pure punctuation / symbols / digits.
  if (!/[A-Za-zऀ-෿]/.test(text)) return false;

  // Must contain at least one vowel (catches "xkcvbn", "ksdfng").
  if (!VOWEL_REGEX.test(text)) return false;

  // Reject single character repeated (aaaaa, ......, ----).
  const collapsed = text.replace(/\s/g, '');
  if (collapsed.length >= 4 && new Set(collapsed.toLowerCase()).size <= 1) return false;

  // Reject if >80% of chars are the same (e.g. "aaaaabaaa").
  if (collapsed.length >= 6) {
    const counts: Record<string, number> = {};
    for (const c of collapsed.toLowerCase()) counts[c] = (counts[c] ?? 0) + 1;
    const max = Math.max(...Object.values(counts));
    if (max / collapsed.length > 0.8) return false;
  }

  // Reject if the text contains a known keyboard-mash run.
  const lower = text.toLowerCase();
  for (const run of KEYBOARD_RUNS) {
    if (lower.includes(run)) return false;
  }

  // Require at least N word-like tokens for "long" fields.
  const minWords = opts.minWords ?? 1;
  if (minWords > 1) {
    const tokens = text
      .split(/\s+/)
      .filter((t) => /[A-Za-zऀ-෿]/.test(t) && t.length >= 2);
    if (new Set(tokens.map((t) => t.toLowerCase())).size < minWords) return false;
  }

  return true;
}

export const MEANINGFUL_ERROR =
  'Please write this properly so we can generate good scripts for you.';
