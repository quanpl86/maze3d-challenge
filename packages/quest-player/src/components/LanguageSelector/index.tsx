// packages/quest-player/src/components/LanguageSelector/index.tsx

import React from 'react';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Tiếng Việt' },
];

// Định nghĩa props cho component
interface LanguageSelectorProps {
  language: string;
  onChange: (langCode: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ language, onChange }) => {
  
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const langCode = event.target.value;
    onChange(langCode);
  };

  return (
    <select onChange={handleChange} value={language}>
      {languages.map(({ code, name }) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );
};