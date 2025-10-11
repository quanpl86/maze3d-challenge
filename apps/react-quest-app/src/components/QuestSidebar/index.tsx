// apps/react-quest-app/src/components/QuestSidebar/index.tsx

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@repo/quest-player';
import './QuestSidebar.css';

export interface QuestInfo {
  id: string;
  gameType: string;
  titleKey: string;
  level: number;
  title?: string; // THÊM MỚI
}

interface QuestSidebarProps {
  allQuests: QuestInfo[];
  currentQuestId: string | null;
  onQuestSelect: (id: string) => void;
}

export const QuestSidebar: React.FC<QuestSidebarProps> = ({ allQuests, currentQuestId, onQuestSelect }) => {
  const { t } = useTranslation();

  const groupedQuests = useMemo(() => {
    return allQuests.reduce((acc, quest) => {
      const { gameType } = quest;
      if (!acc[gameType]) {
        acc[gameType] = [];
      }
      acc[gameType].push(quest);
      return acc;
    }, {} as Record<string, QuestInfo[]>);
  }, [allQuests]);

  return (
    <aside className="quest-sidebar">
      <div className="sidebar-header">
        {t('Games.puzzle')}
      </div>
      <div className="quest-list-scrollable">
        {Object.entries(groupedQuests).map(([gameType, questList]) => (
          <div key={gameType} className="game-group">
            <h3>{t(questList[0].titleKey, gameType)}</h3>
            {questList.map((quest) => (
              <button
                key={quest.id}
                className={`quest-item ${currentQuestId === quest.id ? 'active' : ''}`}
                onClick={() => onQuestSelect(quest.id)}
              >
                {t('Games.puzzle')} {quest.level}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="sidebar-footer">
        <LanguageSelector />
      </div>
    </aside>
  );
};