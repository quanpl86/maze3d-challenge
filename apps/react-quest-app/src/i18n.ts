// apps/react-quest-app/src/i18n.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import tài nguyên dịch đã được export từ package quest-player
import { questPlayerResources } from '@repo/quest-player/i18n';

const resources = {
  en: {
    translation: {
      ...questPlayerResources.en.translation,
    },
  },
  vi: {
    translation: {
      ...questPlayerResources.vi.translation,
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, 
    },
    detection: {
      order: ['queryString', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['cookie', 'localStorage'],
    },
  });

export default i18n;