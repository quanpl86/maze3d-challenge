// src/components/DocumentationPanel/index.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import './DocumentationPanel.css';

interface DocumentationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  gameType?: string;
}

export const DocumentationPanel: React.FC<DocumentationPanelProps> = ({ isOpen, onClose, gameType }) => {
  const { t, i18n } = useTranslation();

  if (!isOpen) {
    return null;
  }

  // Mặc định là 'maze' nếu không có gameType để tránh lỗi
  const currentDoc = gameType || 'maze';

  // Xác định mã ngôn ngữ (ví dụ: 'en', 'vi')
  const langCode = i18n.language.split('-')[0];
  const docUrl = `/assets/${currentDoc}/docs${langCode === 'vi' ? '-vi' : ''}.html`;

  return (
    <div className="docs-overlay">
      <div className="docs-panel">
        <div className="docs-header">
          <h3>{t('Games.help')}</h3>
          <button onClick={onClose} className="docs-close-button">&times;</button>
        </div>
        <div className="docs-body">
          <iframe
            src={docUrl}
            title="Game Documentation"
            className="docs-iframe"
            // Thêm sandbox để tăng cường bảo mật, mặc dù nội dung là của chúng ta
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
};