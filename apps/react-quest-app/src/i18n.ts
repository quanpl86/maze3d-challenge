// apps/react-quest-app/src/i18n.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import các file ngôn ngữ của Blockly
import 'blockly/msg/en';
import 'blockly/msg/vi';

// Import tài nguyên dịch đã được export từ package quest-player
import { questPlayerResources } from '@repo/quest-player/i18n';

// (Tùy chọn) Nếu app của bạn có file dịch riêng, bạn có thể import chúng ở đây
// import appTranslationEN from './locales/en.json';

const resources = {
  en: {
    translation: {
      ...questPlayerResources.en.translation, // Hợp nhất bản dịch từ package
      // ...appTranslationEN, // Hợp nhất bản dịch riêng của app (nếu có)
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
      escapeValue: false, // React đã tự bảo vệ khỏi XSS
    },
    detection: {
      order: ['queryString', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['cookie', 'localStorage'],
    },
  });

export default i18n;