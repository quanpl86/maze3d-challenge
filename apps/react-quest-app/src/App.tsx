// apps/react-quest-app/src/App.tsx

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

// Mở rộng kiểu Quest để bao gồm thuộc tính 'topic'
type AppQuest = Quest & { topic?: string };

type AppSettings = QuestPlayerSettings & { language: string };

function solutionHasOptimalBlocks(solution: SolutionConfig): solution is SolutionConfig & { optimalBlocks: number } {
    return solution.optimalBlocks !== undefined;
}

const questModules: Record<string, { default: Quest }> = import.meta.glob('../quests/*.json', { eager: true });

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


function App() {
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
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const effectiveColorScheme = settings.colorSchemeMode === 'auto'
      ? (mediaQuery.matches ? 'dark' : 'light')
      : settings.colorSchemeMode;
    
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${effectiveColorScheme}`);

    const handleChange = (e: MediaQueryListEvent) => {
        if (settings.colorSchemeMode === 'auto') {
            const newColorScheme = e.matches ? 'dark' : 'light';
            document.body.classList.remove('theme-light', 'theme-dark');
            document.body.classList.add(`theme-${newColorScheme}`);
        }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.colorSchemeMode]);

  const handleSettingsChange = (newSettings: QuestPlayerSettings) => {
    setSettings((prev: AppSettings) => ({ ...prev, ...newSettings }));
  };

  const handleLanguageChange = (lang: string) => {
    setSettings((prev: AppSettings) => ({ ...prev, language: lang }));
  };

  const sortedQuests = useMemo<AppQuest[]>(() => {
    // Lấy toàn bộ dữ liệu quest, không chỉ QuestInfo
    const quests: AppQuest[] = Object.values(questModules).map(module => module.default as AppQuest);
    quests.sort((a, b) => {
      // Sắp xếp theo topic trước, sau đó đến level
      const topicA = a.topic || 'z'; // Đẩy các quest không có topic xuống cuối
      const topicB = b.topic || 'z';
      if (topicA < topicB) return -1;
      if (topicA > topicB) return 1;
      return (a.level || 0) - (b.level || 0);
    });
    return quests;
  }, []);

  const [currentQuestId, setCurrentQuestId] = useState<string | null>(sortedQuests[0]?.id || null);
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

  useEffect(() => {
    if (currentQuestId) {
      setIsLoading(true);
      setQuestData(null);
      
      setTimeout(() => {
        const targetModule = Object.values(questModules).find(module => module.default.id === currentQuestId);
        if (targetModule) {
          const validationResult = questSchema.safeParse(targetModule.default);
          if (validationResult.success) {
            const newQuestData = validationResult.data as AppQuest;
            
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
  }, [currentQuestId, i18n]);

  const handleQuestSelect = useCallback((id: string) => {
    if (id === currentQuestId) return;
    setCurrentQuestId(id);
  }, [currentQuestId]);
  
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
        allQuests={sortedQuests}
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

export default App;