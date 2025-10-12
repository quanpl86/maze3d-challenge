// apps/react-quest-app/src/components/QuestSelector/index.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@repo/quest-player';
import './QuestSelector.css';

interface QuestInfo {
  path: string;
  gameType: string;
  titleKey: string;
  level: number;
}

interface QuestSelectorProps {
  onQuestSelect: (path: string) => void;
}

export const QuestSelector: React.FC<QuestSelectorProps> = ({ onQuestSelect }) => {
  const { t } = useTranslation();
  const [quests, setQuests] = useState<QuestInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuests = async () => {
      try {
        setLoading(true);
        const response = await fetch('/quests/index.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch quest index: ${response.statusText}`);
        }
        const data: QuestInfo[] = await response.json();
        // Sắp xếp các quest theo loại game và sau đó là level
        data.sort((a, b) => {
          if (a.gameType < b.gameType) return -1;
          if (a.gameType > b.gameType) return 1;
          return a.level - b.level;
        });
        setQuests(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuests();
  }, []);

  const groupedQuests = useMemo(() => {
    return quests.reduce((acc, quest) => {
      const { gameType } = quest;
      if (!acc[gameType]) {
        acc[gameType] = [];
      }
      acc[gameType].push(quest);
      return acc;
    }, {} as Record<string, QuestInfo[]>);
  }, [quests]);

  if (loading) {
    return <div>Loading quests...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="quest-selector-container">
      <h1>{t('Games.loadQuest')}</h1>
      {Object.entries(groupedQuests).map(([gameType, questList]) => (
        <div key={gameType} className="game-group">
          <h2>{t(questList[0].titleKey, gameType)}</h2>
          <div className="quest-list">
            {questList.map((quest) => (
              <div
                key={quest.path}
                className="quest-card"
                onClick={() => onQuestSelect(quest.path)}
                role="button"
                tabIndex={0}
              >
                <h3>{quest.level}</h3>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};