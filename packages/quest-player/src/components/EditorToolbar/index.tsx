// src/components/EditorToolbar/index.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import './EditorToolbar.css';

type EditorType = 'blockly' | 'monaco';

interface EditorToolbarProps {
  supportedEditors: EditorType[];
  currentEditor: EditorType;
  onEditorChange: (editor: EditorType) => void;
  onHelpClick: () => void;
  onToggleSettings: () => void; // THÊM MỚI
}

const getEditorName = (editor: EditorType) => {
  switch (editor) {
    case 'blockly':
      return 'Blocks';
    case 'monaco':
      return 'JavaScript';
    default:
      return editor;
  }
};

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  supportedEditors,
  currentEditor,
  onEditorChange,
  onHelpClick,
  onToggleSettings, // THÊM MỚI
}) => {
  const { t } = useTranslation();
  return (
    <div className="editorToolbar">
      {/* THAY ĐỔI: Bọc các nút bên trái trong một div */}
      <div className="toolbar-left">
        <button className="primaryButton help-button" onClick={onHelpClick}>
          {t('Games.help')}
        </button>
        {/* THÊM MỚI: Nút Settings */}
        {currentEditor === 'blockly' && (
          <button onClick={onToggleSettings} className="settings-button" title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.44,0.17-0.48,0.41L9.12,4.84C8.53,5.08,8,5.4,7.5,5.78L5.11,4.82C4.89,4.75,4.64,4.82,4.52,5.03L2.6,8.35 c-0.12,0.2-0.07,0.47,0.12,0.61L4.75,10.54C4.72,10.84,4.7,11.16,4.7,11.5c0,0.34,0.02,0.66,0.07,0.96l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.48,2.03 c0.04,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.48-0.41l0.48-2.03c0.59-0.24,1.12-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.12-0.2,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.5c-1.93,0-3.5-1.57-3.5-3.5 s1.57-3.5,3.5-3.5s3.5,1.57,3.5,3.5S13.93,15.5,12,15.5z" />
            </svg>
          </button>
        )}
      </div>
      <div className="editor-switch-group">
        {supportedEditors.length > 1 ? (
          supportedEditors.map((editor) => (
            <button
              key={editor}
              className={currentEditor === editor ? 'active' : ''}
              onClick={() => onEditorChange(editor)}
            >
              {getEditorName(editor)}
            </button>
          ))
        ) : (
          <span className="editorLabel">{getEditorName(currentEditor)}</span>
        )}
      </div>
    </div>
  );
};