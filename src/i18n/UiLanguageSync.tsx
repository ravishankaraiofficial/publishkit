// Bridges the I18nProvider (which lives above AuthProvider in the tree) with
// the user's Firestore profile. Two behaviors:
//
//  1. On profile load, if profile.uiLanguage exists and differs from the
//     currently-active language, switch the UI to match. This makes the
//     user's language choice follow them across devices.
//
//  2. When the user picks a new language (LanguageBar click), persist it to
//     users/{uid}.uiLanguage so the next device sees it. Anonymous users
//     just use localStorage — no network write.
//
// Mounted once inside AuthProvider in App.tsx. Renders nothing.

import { useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from './index';
import type { OutputLanguage } from '../lib/languages';

export function UiLanguageSync() {
  const { user, profile } = useAuth();
  const { lang, setLang } = useI18n();
  // Once we've applied the profile's uiLanguage to the UI, flip this — from
  // that point on, lang changes flow the other way (UI → Firestore).
  const profileApplied = useRef(false);

  // Direction 1: profile → UI.
  useEffect(() => {
    if (!profile || profileApplied.current) return;
    const fromProfile = profile.uiLanguage as OutputLanguage | undefined;
    if (fromProfile && fromProfile !== lang) {
      setLang(fromProfile);
    }
    profileApplied.current = true;
  }, [profile, lang, setLang]);

  // Direction 2: UI → profile. Skip while we're still applying the initial
  // profile value (would cause a redundant write of the same value).
  useEffect(() => {
    if (!user || user.isAnonymous) return;
    if (!profileApplied.current) return;
    // Only write if the current lang differs from what's stored — saves a
    // round trip on first paint and avoids triggering useAuth's profile
    // re-fetch listeners unnecessarily.
    if (profile?.uiLanguage === lang) return;
    setDoc(doc(db, 'users', user.uid), { uiLanguage: lang }, { merge: true }).catch((err) => {
      console.warn('[UiLanguageSync] failed to persist uiLanguage:', err?.message);
    });
  }, [lang, user, profile?.uiLanguage]);

  return null;
}
