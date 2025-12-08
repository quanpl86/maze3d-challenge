// apps/react-quest-app/src/App.tsx

import { Routes, Route, useParams, useNavigate, Navigate } from 'react-router-dom';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  QuestPlayer,
  Dialog,
  questSchema,
  LanguageSelector,
  type Quest,
  type QuestCompletionResult,
  type SolutionConfig,
  type GameState,
  type QuestPlayerSettings,
} from '@repo/quest-player';
import { QuestSidebar } from './components/QuestSidebar/index';
import './App.css';

// Bọc QuestPlayer trong React.memo để ngăn re-render không cần thiết
const MemoizedQuestPlayer = React.memo(QuestPlayer);

// Mở rộng kiểu Quest để bao gồm thuộc tính 'topic' và 'groupId'
type AppQuest = Quest & { 
  topic?: string;
  groupId: string; 
};

type AppSettings = QuestPlayerSettings & { language: string };

function solutionHasOptimalBlocks(solution: SolutionConfig): solution is SolutionConfig & { optimalBlocks: number } {
    return solution.optimalBlocks !== undefined;
}
const questModules: Record<string, { default: Quest }> = import.meta.glob('../quests/**/*.json', { eager: true });

const getStoredSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem('questAppSettings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        colorSchemeMode: ['auto', 'light', 'dark'].includes(parsed.colorSchemeMode) ? parsed.colorSchemeMode : 'auto',
        soundsEnabled: typeof parsed.soundsEnabled === 'boolean' ? parsed.soundsEnabled : true,
        language: ['en', 'vi'].includes(parsed.language) ? parsed.language : 'en',
        renderer: parsed.renderer || 'zelos',
        blocklyThemeName: parsed.blocklyThemeName || 'zelos',
        gridEnabled: typeof parsed.gridEnabled === 'boolean' ? parsed.gridEnabled : true,
        cameraMode: parsed.cameraMode || 'Follow',
      };
    }
  } catch (error) {
    console.error("Failed to parse settings from localStorage", error);
  }
  return {
    colorSchemeMode: 'auto',
    soundsEnabled: true,
    language: 'en',
    renderer: 'zelos',
    blocklyThemeName: 'zelos',
    gridEnabled: true,
    cameraMode: 'Follow',
  };
};

function AppContent() {
  const { t, i18n } = useTranslation();

  const [settings, setSettings] = useState<AppSettings>(getStoredSettings);

  useEffect(() => {
    try {
      localStorage.setItem('questAppSettings', JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save settings to localStorage", error);
    }
  }, [settings]);

  useEffect(() => {
    if (i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language, i18n]);
  
  useEffect(() => {
    const applyTheme = (isDarkMode: boolean) => {
      const newColorScheme = isDarkMode ? 'dark' : 'light';
      document.body.classList.remove('theme-light', 'theme-dark');
      document.body.classList.add(`theme-${newColorScheme}`);
    };

    const handleChange = (e: MediaQueryListEvent) => {
      if (settings.colorSchemeMode === 'auto') {
        applyTheme(e.matches);
      }
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const effectiveIsDark = settings.colorSchemeMode === 'auto' ? mediaQuery.matches : settings.colorSchemeMode === 'dark';
    applyTheme(effectiveIsDark);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.colorSchemeMode]);

  const handleSettingsChange = (newSettings: QuestPlayerSettings) => {
    setSettings((prev: AppSettings) => ({ ...prev, ...newSettings }));
  };

  const handleLanguageChange = (lang: string) => {
    setSettings((prev: AppSettings) => ({ ...prev, language: lang }));
  };

  // Lấy groupId và questId từ URL
  const { groupId, questId: questIdFromUrl } = useParams<{ groupId: string; questId: string }>();
  const navigate = useNavigate();

  // Xử lý toàn bộ quest một lần, thêm groupId và sắp xếp
  const allQuests = useMemo<AppQuest[]>(() => {
    const quests: AppQuest[] = Object.entries(questModules).map(([path, module]) => {
      const pathSegments = path.split('/');
      // Giả sử cấu trúc là ../quests/GROUP_NAME/file.json, groupName sẽ là phần tử thứ 3
      const groupId = pathSegments.length > 2 ? pathSegments[2] : 'ungrouped';
      return { ...module.default, groupId } as AppQuest;
    });

    quests.sort((a, b) => { // Sắp xếp toàn bộ danh sách
      // Sắp xếp theo topic trước, sau đó đến level
      const topicA = a.topic || 'z'; // Đẩy các quest không có topic xuống cuối
      const topicB = b.topic || 'z';
      if (topicA < topicB) return -1;
      if (topicA > topicB) return 1;
      return (a.level || 0) - (b.level || 0);
    });
    return quests;
  }, []);

  // Lọc các quest thuộc group hiện tại để hiển thị
  const questsInCurrentGroup = useMemo(() => {
    if (!groupId) return [];
    return allQuests.filter(q => q.groupId === groupId);
  }, [allQuests, groupId]);

  const [currentQuestId, setCurrentQuestId] = useState<string | null>(null);
  const [questData, setQuestData] = useState<AppQuest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    stars?: number;
    optimalBlocks?: number;
    code?: string;
  }>({ isOpen: false, title: '', message: '' });

  // Effect để đồng bộ URL và state
  useEffect(() => {
    if (!groupId || questsInCurrentGroup.length === 0) return;

    const targetQuestId = questIdFromUrl || questsInCurrentGroup[0]?.id;

    if (targetQuestId) {
      // Nếu URL không có questId, hãy cập nhật nó để trỏ đến quest đầu tiên
      if (!questIdFromUrl) {
        navigate(`/quest/${groupId}/${targetQuestId}`, { replace: true });
      }
      if (targetQuestId !== currentQuestId) {
        setCurrentQuestId(targetQuestId);
      }
    }
  }, [groupId, questIdFromUrl, questsInCurrentGroup, navigate, currentQuestId]);

  useEffect(() => {
    if (currentQuestId) {
      setIsLoading(true);
      setQuestData(null);
      
      setTimeout(() => {
        const targetQuest = allQuests.find(quest => quest.id === currentQuestId);
        if (targetQuest) {
          const validationResult = questSchema.safeParse(targetQuest);
          if (validationResult.success) {
            const newQuestData = { ...validationResult.data, groupId: targetQuest.groupId } as AppQuest;
            
            if (newQuestData.translations) {
              const translations = newQuestData.translations; // Tạo biến mới để TypeScript hiểu kiểu
              Object.keys(translations).forEach((langCode) => {
                const langTranslations = translations[langCode];
                if (langTranslations) { // Defensive: chỉ thêm nếu gói dịch thuật tồn tại
                  i18n.addResourceBundle(langCode, 'translation', langTranslations, true, true);
                }
              });
              i18n.changeLanguage(i18n.language);
            }
            
            setQuestData(newQuestData);
          } else {
            console.error("Quest validation failed:", validationResult.error);
          }
        }
        setIsLoading(false);
      }, 50);
    }
  }, [currentQuestId, i18n, allQuests]);

  const handleQuestSelect = useCallback((id: string) => {
    if (id === questIdFromUrl) return;
    // Sử dụng navigate để thay đổi URL, effect ở trên sẽ tự động cập nhật state
    navigate(`/quest/${groupId}/${id}`);
  }, [questIdFromUrl, navigate, groupId]);
  
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 250);
  }, []);

  const handleQuestComplete = useCallback((result: QuestCompletionResult) => {
    if (result.isSuccess && result.finalState.solution) {
      const unitLabel = result.unitLabel === 'block' ? 'blockCount' : 'lineCount';      
      let message = '';

      if (result.stars === 3) {
        message = t('Games.dialogExcellentSolution');
      } else if (result.stars === 2) {
        message = t('Games.dialogGoodJob', { [unitLabel]: result.unitCount });
      } else if (result.stars === 1) {
        message = t('Games.dialogPartialSuccess'); // Chuỗi dịch mới
      } else {
        message = t('Games.dialogGoodJob', { [unitLabel]: result.unitCount });
      }

      setDialogState({
        isOpen: true,
        title: t('Games.dialogCongratulations'),
        message: message,
        stars: result.stars,
        optimalBlocks: solutionHasOptimalBlocks(result.finalState.solution) ? result.finalState.solution.optimalBlocks : undefined,
        code: result.userCode,
      });
    } else {
      const resultType = (result.finalState as GameState & { result?: string }).result ?? 'failure';
      const reasonKey = `Games.result${resultType.charAt(0).toUpperCase() + resultType.slice(1)}`;
      const translatedReason = t(reasonKey, { defaultValue: resultType });
      setDialogState({ 
          isOpen: true, 
          title: t('Games.dialogTryAgain'), 
          message: `${t('Games.dialogReason')}: ${translatedReason}`
      });
    }
  }, [t]); // Thêm các phụ thuộc nếu cần

  const renderMainContent = () => {
    if (isLoading || !questData) {
      return <div className="emptyState"><h2>{t('UI.Loading')}</h2></div>;
    }
    return (
      <MemoizedQuestPlayer 
        key={questData.id}
        isStandalone={false}
        questData={questData}
        onQuestComplete={handleQuestComplete}
        initialSettings={settings}
        onSettingsChange={handleSettingsChange}
        // Prop `language` được truyền vào
        language={settings.language}
      />
    );
  };

  return (
    <div className="app-container">
      <Dialog 
        isOpen={dialogState.isOpen} 
        title={dialogState.title} 
        onClose={() => setDialogState({ ...dialogState, isOpen: false })}
      >
        {dialogState.stars !== undefined && dialogState.stars > 0 ? (
          <div className="completion-dialog-content">
            <div className="stars-header">{t('Games.dialogStarsHeader')}</div>
            <div className="stars-container">
              {[...Array(3)].map((_, i) => (
                <i key={i} className={`star ${i < (dialogState.stars || 0) ? 'fas fa-star' : 'far fa-star'}`}></i>
              ))}
            </div>
            <p className="completion-message">{dialogState.message}</p>
            {dialogState.stars === 2 && dialogState.optimalBlocks && (
              <p className="optimal-solution-info">{t('Games.dialogOptimalSolution', { optimalBlocks: dialogState.optimalBlocks })}</p>
            )}
            {dialogState.stars === 1 && <p className="optimal-solution-info">{t('Games.dialogImproveTo3Stars')}</p>} 

            {dialogState.code && ( // Luôn hiển thị code nếu có
              <details className="code-details">
                <summary>{t('Games.dialogShowCode')}</summary>
                <pre><code>{dialogState.code}</code></pre>
              </details>
            )}
          </div>
        ) : (
          <p>{dialogState.message}</p>
        )}
      </Dialog>
      
      <QuestSidebar 
        allQuests={questsInCurrentGroup}
        currentQuestId={currentQuestId}
        onQuestSelect={handleQuestSelect}
        isCollapsed={isSidebarCollapsed}
        onToggle={handleToggleSidebar}
      >
        <LanguageSelector 
            language={settings.language} 
            onChange={handleLanguageChange} 
        />
      </QuestSidebar>

      <main className="main-content-area">
        {renderMainContent()}
      </main>
    </div>
  );
}

function App() {
  // Tính toán nhóm đầu tiên để chuyển hướng mặc định
  const firstGroupId = useMemo(() => {
    const firstPath = Object.keys(questModules)[0];
    if (!firstPath) return null;
    const pathSegments = firstPath.split('/');
    return pathSegments.length > 2 ? pathSegments[2] : 'ungrouped';
  }, []);

  if (!firstGroupId) {
    return <div>No quests found. Please add quests to the 'quests' directory.</div>;
  }

  return (
    <Routes>
      {/* Route cho một quest cụ thể: /quest/group1/QUEST_ID */}
      <Route path="/quest/:groupId/:questId" element={<AppContent />} />
      {/* Route cho một nhóm: /quest/group1, sẽ tự động chuyển đến quest đầu tiên */}
      <Route path="/quest/:groupId" element={<AppContent />} />
      {/* Route mặc định, chuyển hướng đến nhóm đầu tiên tìm thấy: /quest/group1 */}
      <Route path="*" element={<Navigate to={`/quest/${firstGroupId}`} replace />} />
    </Routes>
  );
}

export default App;