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
  .use(initReactI18next) // Dòng này rất quan trọng, nó kết nối i18next với React
  .init({
    resources,
    lng: 'en', // Luôn bắt đầu với tiếng Anh
    fallbackLng: 'en', // Đặt tiếng Anh làm ngôn ngữ mặc định
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;