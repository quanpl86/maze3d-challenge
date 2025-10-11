// apps/react-quest-app/src/App.tsx

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  QuestPlayer,
  Dialog,
  questSchema,
  type Quest,
  type QuestCompletionResult,
  type SolutionConfig,
  type GameState,
} from '@repo/quest-player';
import { QuestSidebar, type QuestInfo } from './components/QuestSidebar';
import './App.css';

function solutionHasOptimalBlocks(solution: SolutionConfig): solution is SolutionConfig & { optimalBlocks: number } {
    return solution.optimalBlocks !== undefined;
}

const questModules: Record<string, { default: Quest }> = import.meta.glob('../quests/*.json', { eager: true });

function App() {
  const { t } = useTranslation();
  
  const [currentQuestId, setCurrentQuestId] = useState<string | null>(null);
  const [questData, setQuestData] = useState<Quest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    stars?: number;
    optimalBlocks?: number;
    code?: string;
  }>({ isOpen: false, title: '', message: '' });

  const sortedQuests = useMemo<QuestInfo[]>(() => {
    const quests: QuestInfo[] = Object.values(questModules).map(module => ({
      id: module.default.id,
      level: module.default.level,
      gameType: module.default.gameType,
      titleKey: module.default.titleKey,
      title: module.default.title, // THÊM MỚI
    }));

    quests.sort((a, b) => {
      if (a.gameType < b.gameType) return -1;
      if (a.gameType > b.gameType) return 1;
      return a.level - b.level;
    });

    return quests;
  }, []);

  const handleQuestSelect = useCallback((id: string) => {
    setIsLoading(true);
    setCurrentQuestId(id);
    setQuestData(null); 

    setTimeout(() => {
        const targetModule = Object.values(questModules).find(module => module.default.id === id);

        if (targetModule) {
            const validationResult = questSchema.safeParse(targetModule.default);
            if (validationResult.success) {
                setQuestData(validationResult.data as Quest);
            } else {
                console.error("Quest validation failed:", validationResult.error);
                alert(`Error: Invalid quest file format.\n${validationResult.error.issues[0].message}`);
            }
        } else {
            console.error(`Quest with id "${id}" not found.`);
            alert(`Could not find quest with id: ${id}`);
        }
        setIsLoading(false);
    }, 10);
  }, []);

  const handleQuestComplete = useCallback((result: QuestCompletionResult) => {
    if (result.isSuccess && result.finalState.solution) {
      const unitLabel = result.unitLabel === 'block' ? 'blockCount' : 'lineCount';
      setDialogState({
        isOpen: true,
        title: t('Games.dialogCongratulations'),
        message: t('Games.dialogGoodJob', { [unitLabel]: result.unitCount }),
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
  }, [t]);

  const renderMainContent = () => {
    if (isLoading) {
      return <div className="emptyState"><h2>Loading...</h2></div>;
    }
    if (!questData) {
      return <div className="emptyState"><h2>Select a Quest</h2></div>;
    }
    return (
      <QuestPlayer 
        isStandalone={false}
        questData={questData}
        onQuestComplete={handleQuestComplete}
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
            {dialogState.stars < 3 && dialogState.optimalBlocks && (
              <p className="optimal-solution-info">{t('Games.dialogOptimalSolution', { optimalBlocks: dialogState.optimalBlocks })}</p>
            )}
            {dialogState.stars === 3 && <p className="excellent-solution">{t('Games.dialogExcellentSolution')}</p>}
            {dialogState.code && (
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
      />

      <main className="main-content-area">
        {renderMainContent()}
      </main>
    </div>
  );
}

export default App;