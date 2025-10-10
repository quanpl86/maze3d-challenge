// src/components/MonacoEditor/index.tsx

import React from 'react';
import Editor from '@monaco-editor/react';
import { usePrefersColorScheme } from '../../hooks/usePrefersColorScheme';

interface MonacoEditorProps {
  initialCode: string;
  onChange: (value: string | undefined) => void;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({ initialCode, onChange }) => {
  const colorScheme = usePrefersColorScheme();

  const editorOptions = {
    fontSize: 14,
    minimap: {
      enabled: false,
    },
    scrollBeyondLastLine: false,
    wordWrap: 'on' as const,
  };

  return (
    <Editor
      height="100%"
      width="100%"
      language="javascript"
      theme={colorScheme === 'dark' ? 'vs-dark' : 'light'}
      defaultValue={initialCode}
      onChange={onChange}
      options={editorOptions}
      // You can add an onMount handler to add custom language definitions (e.g., for Pond API)
      // onMount={handleEditorDidMount}
    />
  );
};