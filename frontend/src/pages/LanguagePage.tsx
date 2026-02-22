import { motion } from 'framer-motion';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { useTranslation } from '../i18n/useTranslation';
import type { Locale } from '../i18n/translations';
import { Globe, Check } from 'lucide-react';

export function LanguagePage() {
  const { t, locale, setLocale, locales } = useTranslation();

  return (
    <PageWrapper title={t('page.language.title')}>
      <p className="text-text-secondary text-sm mb-8">{t('page.language.subtitle')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {locales.map((l, i) => {
          const isActive = locale === l.code;
          return (
            <motion.div
              key={l.code}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className={`p-5 cursor-pointer border-2 transition-all ${
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:border-primary/30'
                }`}
                onClick={() => setLocale(l.code as Locale)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{l.flag}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-text-primary text-lg">{l.nativeLabel}</div>
                    <div className="text-sm text-text-secondary">{l.label}</div>
                    <div className="text-xs text-text-secondary/60 mt-0.5 uppercase tracking-wider">{l.dir === 'rtl' ? 'Right-to-left' : 'Left-to-right'}</div>
                  </div>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="h-8 w-8 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Check className="h-4 w-4 text-white" />
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="mt-8 p-6">
        <div className="flex items-center gap-3 mb-3">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-text-primary">{t('page.language.current')}</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{locales.find((l) => l.code === locale)?.flag}</span>
          <div>
            <div className="font-medium text-text-primary">{locales.find((l) => l.code === locale)?.nativeLabel}</div>
            <div className="text-sm text-text-secondary">{locales.find((l) => l.code === locale)?.label}</div>
          </div>
        </div>
        <p className="text-xs text-text-secondary/60 mt-4">
          Your language preference is saved locally and will persist across sessions.
        </p>
      </Card>
    </PageWrapper>
  );
}
