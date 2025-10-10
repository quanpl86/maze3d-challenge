// src/components/QuestPlayer/hooks/useEditorManager.ts

import { useState, useEffect, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';
import type { Quest } from '../../../types';

export type EditorType = 'blockly' | 'monaco';

export const useEditorManager = (
  questData: Quest | null,
  workspaceRef: RefObject<Blockly.WorkspaceSvg>
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

    if (editor === 'monaco' && workspaceRef.current) {
      const code = javascriptGenerator.workspaceToCode(workspaceRef.current);
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