// apps/react-quest-app/src/i18n.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import tài nguyên dịch đã được export từ package quest-player
import { questPlayerResources } from '@repo/quest-player/i18n';

// --- START: PATCH for react-quest-app ---
// Thêm các bản dịch cho category với key viết hoa để khớp với yêu cầu của Blockly
const appResources = {
  en: {
    translation: {
      "Games.catActions": "Actions",
      "Games.catEvents": "Events",
      "Games.catMovement": "Movement",
      "Games.catLoops": "Loops",
      "Games.catLogic": "Logic",
      "Games.catMath": "Math",
      "Games.catVariables": "Variables",
      "Games.catProcedures": "Functions",
    },
  },
  vi: {
    translation: {
      "Games.catActions": "Hành động",
      "Games.catEvents": "Sự kiện",
      "Games.catMovement": "Di chuyển",
      "Games.catLoops": "Vòng lặp",
      "Games.catLogic": "Logic",
      "Games.catMath": "Công thức toán",
      "Games.catVariables": "Biến",
      "Games.catProcedures": "Hàm",
    },
  },
};
// --- END: PATCH ---

const resources = {
  en: {
    translation: { ...questPlayerResources.en.translation, ...appResources.en.translation },
  },
  vi: {
    translation: { ...questPlayerResources.vi.translation, ...appResources.vi.translation },
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