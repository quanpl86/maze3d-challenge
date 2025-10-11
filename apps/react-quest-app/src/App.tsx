import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// Import library components and types
import {
  QuestPlayer,
  Dialog,
  questSchema,
  type Quest,
  type QuestCompletionResult,
  type SolutionConfig,
  type GameState
} from '@repo/quest-player';

// Import local components
import { QuestSidebar, type QuestInfo } from './components/QuestSidebar';
import './App.css';

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  stars?: number;
  optimalBlocks?: number;
  code?: string;
}

function solutionHasOptimalBlocks(solution: SolutionConfig): solution is SolutionConfig & { optimalBlocks: number } {
    return solution.optimalBlocks !== undefined;
}

function App() {
  const { t } = useTranslation();
  
  // State for the entire app
  const [allQuests, setAllQuests] = useState<QuestInfo[]>([]);
  const [currentQuestPath, setCurrentQuestPath] = useState<string | null>(null);
  const [questData, setQuestData] = useState<Quest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [dialogState, setDialogState] = useState<DialogState>({ isOpen: false, title: '', message: '' });

  // Fetch the list of all quests on initial mount
  useEffect(() => {
    const fetchQuestIndex = async () => {
      try {
        const response = await fetch('/quests/index.json');
        if (!response.ok) throw new Error('Failed to fetch quest index.');
        
        const data: QuestInfo[] = await response.json();
        data.sort((a, b) => {
          if (a.gameType < b.gameType) return -1;
          if (a.gameType > b.gameType) return 1;
          return a.level - b.level;
        });
        
        setAllQuests(data);
        
        // Automatically load the first quest
        if (data.length > 0) {
          handleQuestSelect(data[0].path);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load quest list:", error);
        setIsLoading(false);
      }
    };
    
    fetchQuestIndex();
  }, []); // Empty dependency array ensures this runs only once

  const handleQuestSelect = useCallback(async (path: string) => {
    if (currentQuestPath === path && questData) return; // Don't reload the same quest

    setIsLoading(true);
    setCurrentQuestPath(path);
    setQuestData(null); // Clear previous quest data

    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Failed to fetch quest data from ${path}`);
      
      const data = await response.json();
      const validationResult = questSchema.safeParse(data);

      if (validationResult.success) {
        setQuestData(validationResult.data as Quest);
      } else {
        console.error("Quest validation failed:", validationResult.error);
        alert(`Error: Invalid quest file format.\n${validationResult.error.issues[0].message}`);
      }
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [currentQuestPath, questData]);


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

  return (
    <div className="app-container">
      <Dialog 
        isOpen={dialogState.isOpen} 
        title={dialogState.title} 
        onClose={() => setDialogState({ ...dialogState, isOpen: false })}
      >
        {/* Dialog content remains the same */}
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
        allQuests={allQuests}
        currentQuestPath={currentQuestPath}
        onQuestSelect={handleQuestSelect}
      />

      <main className="main-content-area">
        {isLoading || !questData ? (
          <div className="emptyState">
            <h2>{isLoading ? "Loading..." : "Select a Quest"}</h2>
          </div>
        ) : (
          <QuestPlayer 
            isStandalone={false}
            questData={questData}
            onQuestComplete={handleQuestComplete}
          />
        )}
      </main>
    </div>
  );
}

export default App;