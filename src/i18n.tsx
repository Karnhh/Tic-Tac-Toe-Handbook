import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'th' | 'en';
/** A message in both languages. Used by the engine so it stays UI-agnostic. */
export interface Msg { th: string; en: string }

const STORAGE_KEY = 'ttt-handbook-lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'th' || saved === 'en') return saved;
  } catch { /* storage unavailable */ }
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'th';
  return nav.toLowerCase().startsWith('th') ? 'th' : 'en';
}

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'th', setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = lang === 'th' ? 'คู่มือ Tic-Tac-Toe' : 'Tic-Tac-Toe Handbook';
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

/**
 * `t(th, en)` picks the string (or JSX) for the current language, so both
 * translations live right next to each other in the component.
 */
export function useLang() {
  const { lang, setLang } = useContext(LangCtx);
  const t = useCallback(<T,>(th: T, en: T): T => (lang === 'th' ? th : en), [lang]);
  const m = useCallback((msg: Msg) => msg[lang], [lang]);
  const num = useCallback((n: number) => n.toLocaleString(lang === 'th' ? 'th-TH' : 'en-US'), [lang]);
  return { lang, setLang, t, m, num };
}

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-toggle" role="group" aria-label="Language / ภาษา">
      <button className={lang === 'th' ? 'on' : ''} onClick={() => setLang('th')} aria-pressed={lang === 'th'}>TH</button>
      <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')} aria-pressed={lang === 'en'}>EN</button>
    </div>
  );
}
