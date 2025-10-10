// src/components/QuestImporter/index.tsx

import React, { useState } from 'react';
import { questSchema } from '../../types/schemas';
import type { Quest } from '../../types';
import './QuestImporter.css'; // Sẽ được tạo ở bước sau

interface QuestImporterProps {
  onQuestLoad: (quest: Quest) => void;
  onError: (message: string) => void;
}

export const QuestImporter: React.FC<QuestImporterProps> = ({ onQuestLoad, onError }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsLoading(true);
    onError('');

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Failed to read file content.');
        }

        const jsonData = JSON.parse(text);
        const validationResult = questSchema.safeParse(jsonData);

        if (validationResult.success) {
          onQuestLoad(validationResult.data as Quest);
        } else {
          // SỬA ĐỔI: Báo lỗi chi tiết
          const firstError = validationResult.error.issues[0];
          const errorMessage = `Invalid Quest file: ${firstError.message} at path '${firstError.path.join('.')}'.`;
          console.error('Zod validation error:', validationResult.error.flatten());
          throw new Error(errorMessage);
        }
      } catch (error: any) {
        onError(error.message || 'An unknown error occurred during file processing.');
      } finally {
        setIsLoading(false);
        event.target.value = '';
      }
    };

    reader.onerror = () => {
      onError('Error reading the file.');
      setIsLoading(false);
      event.target.value = '';
    };

    reader.readAsText(file);
  };

  return (
    <div className="quest-importer-wrapper">
      <label htmlFor="quest-importer-input" className="custom-file-upload">
        Choose File
      </label>
      <input
        id="quest-importer-input"
        type="file"
        accept=".json"
        onChange={handleFileChange}
        disabled={isLoading}
      />
      {isLoading && <p>Loading...</p>}
    </div>
  );
};