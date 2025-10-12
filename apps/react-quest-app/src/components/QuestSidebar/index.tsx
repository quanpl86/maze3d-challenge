// apps/react-quest-app/src/components/QuestSidebar/index.tsx

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './QuestSidebar.css';

export interface QuestInfo {
  id: string;
  gameType: string;
  titleKey: string;
  level: number;
  title?: string;
  questTitleKey: string;
}

interface QuestSidebarProps {
  allQuests: QuestInfo[];
  currentQuestId: string | null;
  onQuestSelect: (id: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

export const QuestSidebar: React.FC<QuestSidebarProps> = ({ allQuests, currentQuestId, onQuestSelect, isCollapsed, onToggle, children }) => {
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

  let overallIndex = 0;

  return (
    <aside className={`quest-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && <span>{t('Games.puzzle')}</span>}
        <button onClick={onToggle} className="sidebar-toggle-button" aria-label="Toggle Sidebar">
          {isCollapsed ? '»' : '«'}
        </button>
      </div>
      <div className="quest-list-scrollable">
        {Object.entries(groupedQuests).map(([gameType, questList]) => (
          <div key={gameType} className="game-group">
            {!isCollapsed && <h3>{t(questList[0].titleKey, gameType)}</h3>}
            {questList.map((quest) => {
              overallIndex++;
              const questTitle = quest.title || t('Games.defaultQuestTitle', { level: quest.level });
              return (
                <button
                  key={quest.id}
                  className={`quest-item ${currentQuestId === quest.id ? 'active' : ''}`}
                  onClick={() => onQuestSelect(quest.id)}
                  title={isCollapsed ? questTitle : ''}
                >
                  {isCollapsed ? (
                    <span className="quest-level-bubble">{overallIndex}</span>
                  ) : (
                    questTitle
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="sidebar-footer">
        {!isCollapsed && children}
      </div>
    </aside>
  );
};