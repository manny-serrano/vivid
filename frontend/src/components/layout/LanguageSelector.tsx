import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import type { Locale } from '../../i18n/translations';

export function LanguageSelector() {
  const { locale, setLocale, localeInfo, locales } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors"
        title={localeInfo.nativeLabel}
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-medium hidden sm:inline">{localeInfo.flag}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-700/60 bg-bg-surface shadow-xl backdrop-blur-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-700/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary/60">
              Language
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {locales.map((l) => (
              <button
                key={l.code}
                onClick={() => { setLocale(l.code as Locale); setOpen(false); }}
                className={`flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors ${
                  locale === l.code
                    ? 'bg-primary/10 text-text-primary'
                    : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                }`}
              >
                <span className="text-base">{l.flag}</span>
                <div className="flex-1 text-left">
                  <div className="font-medium">{l.nativeLabel}</div>
                  <div className="text-[11px] text-text-secondary/60">{l.label}</div>
                </div>
                {locale === l.code && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
