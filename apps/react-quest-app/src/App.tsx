import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// Import library components and types
import { 
  QuestPlayer, 
  type Quest,
  type QuestCompletionResult
} from '@repo/quest-player';

// Import local app components (we'll move them from the library)
import { Dialog } from '@repo/quest-player/components/Dialog';
import { QuestImporter } from '@repo/quest-player/components/QuestImporter';
import { LanguageSelector } from '@repo/quest-player/components/LanguageSelector';

import './App.css';

// Copy CSS from the original App.css
// You might want to create a shared CSS package later
import '@repo/quest-player/App.css';
import '@repo/quest-player/components/Dialog/Dialog.css';
import '@repo/quest-player/components/QuestImporter/QuestImporter.css';

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  stars?: number;
  optimalBlocks?: number;
  code?: string;
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
    if (result.isSuccess) {
      setDialogState({
        isOpen: true,
        title: t('Games.dialogCongratulations'),
        message: t('Games.dialogGoodJob', { [result.unitLabel === 'block' ? 'blockCount' : 'lineCount']: result.unitCount }),
        stars: result.stars,
        optimalBlocks: result.finalState.solution?.optimalBlocks,
        code: result.userCode,
      });
    } else {
      const reasonKey = `Games.result${(result.finalState.result as string).charAt(0).toUpperCase() + (result.finalState.result as string).slice(1)}`;
      const translatedReason = t(reasonKey, { defaultValue: result.finalState.result as string });
      
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
          isStandalone={false}
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