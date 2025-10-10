import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// Import library components and types from the single entry point
import {
  QuestPlayer,
  Dialog,
  QuestImporter,
  LanguageSelector,
  type Quest,
  type QuestCompletionResult,
  type SolutionConfig,
  type GameState
} from '@repo/quest-player';

// Import the library's bundled CSS file
// NOTE: You may need to run `pnpm build` in the root once for this file to be generated.
// import '@repo/quest-player/dist/index.css';

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
  const [importError, setImportError] = useState('');
  const [dialogState, setDialogState] = useState<DialogState>({ isOpen: false, title: '', message: '' });

  const handleQuestLoad = (loadedQuest: Quest) => {
    setQuestData(loadedQuest);
    setImportError('');
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
      
      {questData ? (
        <QuestPlayer 
          questData={questData}
          onQuestComplete={handleQuestComplete}
        />
      ) : (
        <div className="empty-app-state">
          <h1>{t('Games.loadQuest')}</h1>
          <div className="importer-container">
            <QuestImporter onQuestLoad={handleQuestLoad} onError={setImportError} />
            <LanguageSelector />
          </div>
          {importError && <p className="import-error">{importError}</p>}
        </div>
      )}
    </div>
  );
}

export default App;