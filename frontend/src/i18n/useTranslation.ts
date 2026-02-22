import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations, LOCALES, type Locale, type LocaleInfo } from './translations';

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => {
        const info = LOCALES.find((l) => l.code === locale);
        if (info) {
          document.documentElement.dir = info.dir;
          document.documentElement.lang = locale;
        }
        set({ locale });
      },
    }),
    { name: 'vivid-locale' },
  ),
);

export function useTranslation() {
  const { locale, setLocale } = useI18nStore();
  const localeInfo = LOCALES.find((l) => l.code === locale) as LocaleInfo;

  function t(key: string, fallback?: string): string {
    return translations[locale]?.[key] ?? translations.en[key] ?? fallback ?? key;
  }

  return { t, locale, setLocale, localeInfo, locales: LOCALES };
}
