// apps/react-quest-app/src/components/QuestSidebar/index.tsx

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@repo/quest-player';
import './QuestSidebar.css';

// SỬA ĐỔI: Interface mới, không còn 'path'
export interface QuestInfo {
  id: string; // Sử dụng id của quest làm key
  gameType: string;
  titleKey: string;
  level: number;
}

interface QuestSidebarProps {
  allQuests: QuestInfo[];
  currentQuestId: string | null; // Sửa từ currentQuestPath sang currentQuestId
  onQuestSelect: (id: string) => void; // Truyền lên id thay vì path
}

export const QuestSidebar: React.FC<QuestSidebarProps> = ({ allQuests, currentQuestId, onQuestSelect }) => {
  const { t } = useTranslation();

  const groupedQuests = useMemo(() => {
    // Logic này vẫn giữ nguyên
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
                key={quest.id} // Sử dụng id làm key
                className={`quest-item ${currentQuestId === quest.id ? 'active' : ''}`}
                onClick={() => onQuestSelect(quest.id)} // Truyền id lên
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