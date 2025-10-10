import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// Import library components and types
import {
  QuestPlayer,
  Dialog,
  questSchema, // Import schema directly from the library's entry point
  type Quest,
  type QuestCompletionResult,
  type SolutionConfig,
  type GameState
} from '@repo/quest-player';

// Import local components
import { QuestSelector } from './components/QuestSelector';
import './App.css';

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  stars?: number;
  optimalBlocks?: number;
  code?: string;
}

// A helper type guard for the solution config
function solutionHasOptimalBlocks(solution: SolutionConfig): solution is SolutionConfig & { optimalBlocks: number } {
    return solution.optimalBlocks !== undefined;
}

function App() {
  const { t } = useTranslation();
  const [questData, setQuestData] = useState<Quest | null>(null);
  const [isLoadingQuest, setIsLoadingQuest] = useState(false); // New loading state
  const [dialogState, setDialogState] = useState<DialogState>({ isOpen: false, title: '', message: '' });

  const handleQuestSelect = useCallback(async (path: string) => {
    setIsLoadingQuest(true); // Set loading to true immediately
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to fetch quest data from ${path}`);
      }
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
      setIsLoadingQuest(false); // Set loading to false after process completes
    }
  }, []);

  const handleBackToSelector = () => {
    setQuestData(null);
  };

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

  const renderContent = () => {
    if (isLoadingQuest) {
      // Render a loading indicator
      return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><h2>Loading Quest...</h2></div>;
    }

    if (questData) {
      // Render the QuestPlayer
      return (
        <>
          <button className="back-button" onClick={handleBackToSelector}>
            &larr; Choose another Quest
          </button>
          <QuestPlayer
            isStandalone={false}
            questData={questData}
            onQuestComplete={handleQuestComplete}
          />
        </>
      );
    }
    
    // Render the QuestSelector
    return <QuestSelector onQuestSelect={handleQuestSelect} />;
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
      
      {renderContent()}
    </div>
  );
}

export default App;