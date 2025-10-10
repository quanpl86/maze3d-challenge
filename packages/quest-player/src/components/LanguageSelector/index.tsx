// src/components/LanguageSelector/index.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Tiếng Việt' },
];

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const langCode = event.target.value;
    i18n.changeLanguage(langCode);
  };

  return (
    <select onChange={changeLanguage} value={i18n.language.split('-')[0]}>
      {languages.map(({ code, name }) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );
};