// src/components/QuestPlayer/hooks/useEditorManager.ts

import { useState, useEffect, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';
import type { Quest } from '../../../types';

export type EditorType = 'blockly' | 'monaco';

export const useEditorManager = (
  questData: Quest | null,
  workspaceRef: RefObject<Blockly.WorkspaceSvg>,
  generateSafeCode: (workspace: Blockly.WorkspaceSvg | null) => string // Thêm prop mới
) => {
  const { t } = useTranslation();
  const [currentEditor, setCurrentEditor] = useState<EditorType>('blockly');
  const [aceCode, setAceCode] = useState<string>('');

  useEffect(() => {
    if (questData) {
      const initialEditor = questData.supportedEditors?.[0] || 'blockly';
      setCurrentEditor(initialEditor);
      if (initialEditor === 'monaco' && questData.monacoConfig) {
        setAceCode(questData.monacoConfig.initialCode);
      } else {
        setAceCode('');
      }
    }
  }, [questData]);

  const handleEditorChange = (editor: EditorType) => {
    if (currentEditor === 'monaco' && editor === 'blockly') {
      if (!window.confirm(t('Games.breakLink'))) {
        return; // User cancelled the switch
      }
    }

    if (editor === 'monaco') {
      const code = generateSafeCode(workspaceRef.current); // Sử dụng hàm an toàn
      setAceCode(code);
    }
    setCurrentEditor(editor);
  };

  return {
    currentEditor,
    aceCode,
    setAceCode,
    handleEditorChange,
  };
};