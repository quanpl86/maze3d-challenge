// apps/react-quest-app/src/components/QuestSidebar.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Quest } from '@repo/quest-player';
import './QuestSidebar.css';

// Mở rộng kiểu Quest để bao gồm thuộc tính 'topic' tùy chọn
type AppQuest = Quest & { topic?: string };

export interface QuestSidebarProps {
  allQuests: AppQuest[]; // Sử dụng kiểu mở rộng AppQuest
  currentQuestId: string | null;
  onQuestSelect: (id: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

export const QuestSidebar: React.FC<QuestSidebarProps> = ({
  allQuests,
  currentQuestId,
  onQuestSelect,
  isCollapsed,
  onToggle,
  children,
}) => {
  const { t, i18n } = useTranslation();

  // Hàm trợ giúp để lấy bản dịch từ một quest cụ thể
  const getQuestTranslation = (quest: AppQuest, key: string): string => {
    const currentLang = i18n.language;
    // Ưu tiên ngôn ngữ hiện tại, fallback về tiếng Anh, cuối cùng là chính key đó
    return quest.translations?.[currentLang]?.[key] 
        || quest.translations?.['en']?.[key] 
        || t(key); // Dùng t() như một fallback cuối cùng
  };

  // 1. Nhóm các quest theo 'topic'
  const groupedQuests = allQuests.reduce((acc, quest) => {
    // Sử dụng 'uncategorized' nếu quest không có trường 'topic'
    const topicKey = quest.topic || 'uncategorized';
    if (!acc[topicKey]) {
      acc[topicKey] = [];
    }
    acc[topicKey].push(quest);
    return acc;
  }, {} as Record<string, AppQuest[]>);

  return (
    <aside className={`quest-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && <h2>{t('Games.maze')}</h2>}
        <button onClick={onToggle} className="toggle-button" aria-label={t('UI.ToggleSidebar')}>
          <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
        </button>
      </div>

      <div className="quest-list-scrollable">
        {Object.entries(groupedQuests).map(([topicKey, questsInGroup]) => {
          // Lấy tên chủ đề từ quest đầu tiên trong nhóm
          const topicTitle = topicKey === 'uncategorized'
            ? t('Games.uncategorized', 'Chưa phân loại') // Thêm key này vào i18n nếu cần
            : getQuestTranslation(questsInGroup[0], topicKey);

          return (
            <div key={topicKey} className="game-group">
              <div className="game-group-title">{topicTitle}</div>
              {questsInGroup.map((quest) => (
                <div
                  key={quest.id}
                  className={`quest-item ${quest.id === currentQuestId ? 'active' : ''}`}
                  onClick={() => onQuestSelect(quest.id)}
                >
                  <span className="quest-level">{quest.level}</span>
                  <span className="quest-title">{getQuestTranslation(quest, quest.titleKey)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">{!isCollapsed && children}</div>
    </aside>
  );
};
