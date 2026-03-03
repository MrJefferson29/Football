import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from '@/locales/en.json';
import fr from '@/locales/fr.json';
import { storage } from '@/utils/storage';

const SUPPORTED_LANGS = ['en', 'fr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGS)[number];

function normalizeLang(code?: string | null): SupportedLanguage {
  const c = (code || '').toLowerCase();
  if (c.startsWith('fr')) return 'fr';
  return 'en';
}

export async function getInitialLanguage(): Promise<SupportedLanguage> {
  const saved = await storage.getLanguage();
  if (saved && SUPPORTED_LANGS.includes(saved as SupportedLanguage)) {
    return saved as SupportedLanguage;
  }

  const deviceLocale =
    Localization.getLocales?.()?.[0]?.languageCode ||
    (Localization.locale ? Localization.locale.split('-')[0] : 'en');

  return normalizeLang(deviceLocale);
}

export async function setLanguage(lang: SupportedLanguage) {
  await storage.setLanguage(lang);
  await i18n.changeLanguage(lang);
}

// Initialize i18n once
// We intentionally use "key as English text" strategy:
// - In English, missing keys show the key itself.
// - In French, keys are mapped in fr.json; missing keys fall back to key (English).
void (async () => {
  const initialLng = await getInitialLanguage();
  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en as any },
      fr: { translation: fr as any },
    },
    lng: initialLng,
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr'],
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
  });
})();

export default i18n;

