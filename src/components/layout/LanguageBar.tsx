// Horizontally-scrollable chip bar that sits directly below the navbar on
// every page. Clicking a chip switches the entire app UI language. Output
// language (on ScriptWriter etc.) is independent and unaffected.
//
// Languages without shipped translations are still selectable but render in
// English until their locale JSON exists. This avoids hiding them and lets
// users discover what's coming.

import React from 'react';
import { OUTPUT_LANGUAGES } from '../../lib/languages';
import { useI18n, hasUiTranslation } from '../../i18n';

export const LanguageBar: React.FC = () => {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="w-full bg-neutral-950/70 border-b border-gray-800 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
        <span className="text-xs uppercase tracking-wide text-gray-500 flex-shrink-0">
          {t('languageBar.prompt')}
        </span>
        <div className="flex-1 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 min-w-max">
            {OUTPUT_LANGUAGES.map((opt) => {
              const active = lang === opt.value;
              const translated = hasUiTranslation(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLang(opt.value)}
                  title={translated ? '' : 'UI translation coming soon — falls back to English'}
                  className={[
                    'px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200',
                    active
                      ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow scale-105'
                      : 'bg-neutral-800 text-gray-300 hover:text-white hover:bg-[#E05A1E] hover:font-bold hover:scale-110 hover:shadow-[0_0_15px_rgba(224,90,30,0.4)] hover:backdrop-blur-md',
                    translated ? '' : 'opacity-60',
                  ].join(' ')}
                >
                  {opt.native}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
