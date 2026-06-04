// Minimal homegrown i18n. No runtime dependency — keeps the bundle small.
//
// Usage:
//   const t = useT();
//   <h1>{t('script.title')}</h1>
//
// Active language lives in:
//   - React context (this file)
//   - localStorage 'pk_ui_lang_v1' (survives reloads)
//   - users/{uid}.uiLanguage on Firestore (synced when the user is signed in)
//
// We ship full strings for en + hi today. The other 11 OUTPUT_LANGUAGES are
// accepted by the LanguageBar but currently fall back to en until their JSON
// files exist. Running `scripts/translate-locales.mjs` (one-time Gemini job)
// will populate them.

import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import en from './locales/en.json';
import hi from './locales/hi.json';
import hinglish from './locales/hinglish.json';
import te from './locales/te.json';
import ta from './locales/ta.json';
import gu from './locales/gu.json';
import mr from './locales/mr.json';
import pa from './locales/pa.json';
import bn from './locales/bn.json';
import ml from './locales/ml.json';
import kn from './locales/kn.json';
import bho from './locales/bho.json';
import ur from './locales/ur.json';
import as from './locales/as.json';
import type { OutputLanguage } from '../lib/languages';

type Dict = Record<string, string>;

// Map from OutputLanguage value to its locale dictionary. All 13 OUTPUT_LANGUAGES
// have translations shipped. Add a key here to introduce a new language.
const DICTIONARIES: Partial<Record<OutputLanguage, Dict>> = {
  English: en,
  Hindi: hi,
  Hinglish: hinglish,
  Telugu: te,
  Tamil: ta,
  Gujarati: gu,
  Marathi: mr,
  Punjabi: pa,
  Bengali: bn,
  Malayalam: ml,
  Kannada: kn,
  Bhojpuri: bho,
  Urdu: ur,
  Assamese: as,
};

const STORAGE_KEY = 'pk_ui_lang_v1';
const DEFAULT_LANG: OutputLanguage = 'English';

type TParams = Record<string, string | number>;

interface I18nCtx {
  lang: OutputLanguage;
  setLang: (l: OutputLanguage) => void;
  t: (key: string, params?: TParams) => string;
}

// Replace {placeholder} tokens in a translated string with values from params.
function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_match, name) => {
    const v = params[name];
    return v === undefined ? `{${name}}` : String(v);
  });
}

const Ctx = createContext<I18nCtx | null>(null);

function readStoredLang(): OutputLanguage {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && DICTIONARIES[v as OutputLanguage]) return v as OutputLanguage;
  } catch {
    /* ignore */
  }
  return DEFAULT_LANG;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<OutputLanguage>(readStoredLang);

  const setLang = useCallback((next: OutputLanguage) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, params?: TParams) => {
      const dict = DICTIONARIES[lang] || DICTIONARIES.English!;
      // Fall back to English, then to the raw key — UI never shows nothing.
      const template = dict[key] ?? DICTIONARIES.English![key] ?? key;
      return interpolate(template, params);
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Render-time safety: if a component using t() ever mounts outside the
    // provider (e.g. an error boundary above it), return a no-op fallback
    // instead of crashing.
    return {
      lang: DEFAULT_LANG,
      setLang: () => {},
      t: (k, params) => interpolate((en as Dict)[k] ?? k, params),
    };
  }
  return ctx;
}

// Convenience: most components only need t().
export function useT() {
  return useI18n().t;
}

// Whether a given OutputLanguage has UI translations shipped. Used by
// LanguageBar to dim languages that will currently fall back to English.
export function hasUiTranslation(lang: OutputLanguage): boolean {
  return Boolean(DICTIONARIES[lang]);
}
