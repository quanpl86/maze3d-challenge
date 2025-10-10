// packages/quest-player/src/components/QuestPlayer/index.tsx

import React, { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';
import { BlocklyWorkspace } from 'react-blockly';
import { transform } from '@babel/standalone';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { Quest, ExecutionMode, CameraMode, ToolboxJSON, ToolboxItem, QuestPlayerSettings, QuestCompletionResult } from '../../types';
import { Visualization } from '../Visualization';
import { QuestImporter } from '../QuestImporter';
import { Dialog } from '../Dialog';
import { LanguageSelector } from '../LanguageSelector';
import { MonacoEditor } from '../MonacoEditor';
import { EditorToolbar } from '../EditorToolbar';
import { DocumentationPanel } from '../DocumentationPanel';
import { BackgroundMusic } from '../BackgroundMusic';
import { SettingsPanel } from '../SettingsPanel';
import { usePrefersColorScheme } from '../../hooks/usePrefersColorScheme';
import { useSoundManager } from '../../hooks/useSoundManager';
import type { TurtleRendererHandle } from '../../games/turtle/TurtleRenderer';
import { getFailureMessage, processToolbox, createBlocklyTheme } from './utils';
import { useQuestLoader } from './hooks/useQuestLoader';
import { useEditorManager } from './hooks/useEditorManager';
import { useGameLoop } from './hooks/useGameLoop';
import '../../App.css';
import './QuestPlayer.css';

type StandaloneProps = {
  isStandalone?: true;
  initialSettings?: QuestPlayerSettings;
  onQuestLoad?: (quest: Quest) => void;
  onQuestComplete?: (result: QuestCompletionResult) => void;
};

type LibraryProps = {
  isStandalone: false;
  questData: Quest;
  initialSettings?: QuestPlayerSettings;
  onQuestComplete: (result: QuestCompletionResult) => void;
  onQuestLoad?: (quest: Quest) => void; // onQuestLoad is not used in library mode but good to have for type consistency
};

export type QuestPlayerProps = StandaloneProps | LibraryProps;

const START_BLOCK_TYPE = 'maze_start';

export const QuestPlayer: React.FC<QuestPlayerProps> = (props) => {
  const { t, i18n } = useTranslation();
  
  const isStandalone = props.isStandalone !== false;

  // Internal state for standalone mode
  const [internalQuestData, setInternalQuestData] = useState<Quest | null>(null);
  // Effective quest data depends on the mode
  const questData = isStandalone ? internalQuestData : props.questData;
  
  const [importError, setImportError] = useState<string>('');
  const [dialogState, setDialogState] = useState({ isOpen: false, title: '', message: '' });
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [dynamicToolboxConfig, setDynamicToolboxConfig] = useState<ToolboxJSON | null>(null);
  
  // Settings States
  const [renderer, setRenderer] = useState<'geras' | 'zelos'>('zelos');
  const [blocklyThemeName, setBlocklyThemeName] = useState<'zelos' | 'classic'>('zelos');
  const [gridEnabled, setGridEnabled] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [colorSchemeMode, setColorSchemeMode] = useState<'auto' | 'light' | 'dark'>('auto');
  const [toolboxMode, setToolboxMode] = useState<'default' | 'simple' | 'test'>('default');
  const [cameraMode, setCameraMode] = useState<CameraMode>('Follow');
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('run');

  // Refs
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const rendererRef = useRef<TurtleRendererHandle>(null);
  const initialToolboxConfigRef = useRef<ToolboxJSON | null>(null);

  // Hooks
  const prefersColorScheme = usePrefersColorScheme();
  const effectiveColorScheme = useMemo(() => {
    if (colorSchemeMode === 'auto') return prefersColorScheme;
    return colorSchemeMode;
  }, [colorSchemeMode, prefersColorScheme]);

  useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${effectiveColorScheme}`);
  }, [effectiveColorScheme]);

  const handleGameEnd = useCallback((result: QuestCompletionResult) => {
    if (isStandalone) {
      if (result.isSuccess) {
        const unitLabel = result.unitLabel === 'block' ? 'blockCount' : 'lineCount';
        setDialogState({ 
            isOpen: true, 
            title: t('Games.dialogCongratulations'), 
            message: t('Games.dialogGoodJob', { [unitLabel]: result.unitCount }) 
        });
      } else {
        setDialogState({ 
            isOpen: true, 
            title: t('Games.dialogTryAgain'), 
            message: getFailureMessage(t, (result.finalState as any).result) 
        });
      }
    } else {
      props.onQuestComplete(result);
    }
    // Also call onQuestComplete in standalone mode if it was provided
    if (isStandalone && props.onQuestComplete) {
      props.onQuestComplete(result);
    }
  }, [isStandalone, props, t]);
  
  const { GameRenderer, engineRef, solutionCommands, error: questLoaderError } = useQuestLoader(questData);
  const { currentEditor, aceCode, setAceCode, handleEditorChange } = useEditorManager(questData, workspaceRef);
  const { playSound } = useSoundManager(questData?.sounds, soundsEnabled);
  
  // Generate userCode string for useGameLoop dependency
  const userCodeForLoop = useMemo(() => {
    if (currentEditor === 'monaco') return aceCode;
    if (workspaceRef.current) {
        const startBlock = workspaceRef.current.getTopBlocks(true).find(b => b.type === START_BLOCK_TYPE);
        if (startBlock) {
            const code = javascriptGenerator.blockToCode(startBlock);
            return Array.isArray(code) ? code[0] : (code || '');
        }
    }
    return '';
  }, [currentEditor, aceCode, workspaceRef.current]);

  const { 
    currentGameState, 
    playerStatus, 
    runGame, 
    resetGame, 
    pauseGame, 
    resumeGame, 
    stepForward,
    handleActionComplete,
    handleTeleportComplete
  } = useGameLoop(engineRef, questData, rendererRef, handleGameEnd, playSound, setHighlightedBlockId, currentEditor, userCodeForLoop, workspaceRef);

  useEffect(() => {
    if (questData?.blocklyConfig) {
      const processedToolbox = processToolbox(questData.blocklyConfig.toolbox, t);
      initialToolboxConfigRef.current = processedToolbox;
      setDynamicToolboxConfig(processedToolbox);
    }
  }, [questData, t]);

  useLayoutEffect(() => {
    if (questData?.translations) {
      Object.keys(questData.translations).forEach((langCode) => {
        i18n.addResourceBundle(langCode, 'translation', questData.translations![langCode], true, true);
      });
      i18n.changeLanguage(i18n.language);
    }
  }, [questData, i18n]);

  useEffect(() => { if (questLoaderError) setImportError(questLoaderError); }, [questLoaderError]);
  useEffect(() => { if (engineRef.current) resetGame(); }, [engineRef.current, resetGame]);

  const handleRun = (mode: ExecutionMode) => {
    setExecutionMode(mode);
    let codeToRun = '';
    if (currentEditor === 'monaco') {
      try {
        const es5Code = transform(aceCode, { presets: ['env'] }).code;
        if (!es5Code) throw new Error("Babel transpilation failed.");
        codeToRun = es5Code;
      } catch (e: any) {
        if (isStandalone) setDialogState({ isOpen: true, title: 'Syntax Error', message: e.message });
        return;
      }
    } else {
        codeToRun = userCodeForLoop;
    }
    runGame(codeToRun, mode);
  };
  
  const handleQuestLoad = (loadedQuest: Quest) => {
    if (isStandalone) setInternalQuestData(loadedQuest);
    if (props.onQuestLoad) props.onQuestLoad(loadedQuest);
    setImportError('');
  };

  const onWorkspaceChange = useCallback((workspace: Blockly.WorkspaceSvg) => {
    workspaceRef.current = workspace;
    if (!initialToolboxConfigRef.current) return;

    const startBlockExists = workspace.getTopBlocks(true).some(b => b.type === START_BLOCK_TYPE);
    const isStartBlockInToolbox = JSON.stringify(dynamicToolboxConfig).includes(START_BLOCK_TYPE);

    if (startBlockExists && isStartBlockInToolbox) {
      const newToolbox = JSON.parse(JSON.stringify(initialToolboxConfigRef.current));
      newToolbox.contents.forEach((category: ToolboxItem) => {
        if (category.kind === 'category' && Array.isArray(category.contents)) {
          category.contents = category.contents.filter(block => (block as any).type !== START_BLOCK_TYPE);
        }
      });
      setDynamicToolboxConfig(newToolbox);
    } else if (!startBlockExists && !isStartBlockInToolbox) {
      setDynamicToolboxConfig(initialToolboxConfigRef.current);
    }
  }, [dynamicToolboxConfig]);
  
  const is3DRenderer = questData?.gameConfig.type === 'maze' && questData.gameConfig.renderer === '3d';

  const blocklyTheme = useMemo(() => createBlocklyTheme(blocklyThemeName, effectiveColorScheme), [blocklyThemeName, effectiveColorScheme]);

  const workspaceConfiguration = useMemo(() => ({
    theme: blocklyTheme,
    renderer: renderer,
    trashcan: true,
    zoom: { controls: true, wheel: false, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
    grid: { spacing: 20, length: 3, colour: "#ccc", snap: gridEnabled },
    sounds: soundsEnabled,
  }), [blocklyTheme, renderer, gridEnabled, soundsEnabled]);

  const handleBlocklyPanelResize = useCallback(() => {
    setTimeout(() => {
      if (workspaceRef.current) Blockly.svgResize(workspaceRef.current);
    }, 0);
  }, []);

  return (
    <>
      {isStandalone && <Dialog isOpen={dialogState.isOpen} title={dialogState.title} onClose={() => setDialogState({ ...dialogState, isOpen: false })}><p>{dialogState.message}</p></Dialog>}
      <DocumentationPanel isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} gameType={questData?.gameType} />
      <BackgroundMusic src={questData?.backgroundMusic} play={playerStatus === 'running' && soundsEnabled} />
      
      <PanelGroup direction="horizontal" className="appContainer" autoSaveId="quest-player-panels">
        <Panel defaultSize={50} minSize={20}>
            <div className="visualizationColumn">
                <div className="main-content-wrapper">
                    <div className="controlsArea">
                    <div>
                        {questData && (
                        <>
                            {playerStatus === 'idle' || playerStatus === 'finished' ? (
                                <>
                                    <button className="primaryButton" onClick={() => handleRun('run')}>Run</button>
                                    <button className="primaryButton" onClick={() => handleRun('debug')}>Debug</button>
                                </>
                            ) : null}

                            {playerStatus === 'running' && executionMode === 'debug' && ( <button className="primaryButton" onClick={pauseGame}>Pause</button> )}
                            
                            {playerStatus === 'paused' && (
                                <>
                                    <button className="primaryButton" onClick={resumeGame}>Resume</button>
                                    <button className="primaryButton" onClick={stepForward}>Step Forward</button>
                                </>
                            )}

                            {playerStatus !== 'idle' && <button className="primaryButton" onClick={resetGame}>Reset</button>}
                        </>
                        )}
                    </div>
                    <div>
                        {is3DRenderer && (
                            <select value={cameraMode} onChange={(e) => setCameraMode(e.target.value as CameraMode)}>
                                <option value="Follow">Follow</option>
                                <option value="TopDown">Top Down</option>
                                <option value="Free">Free</option>
                            </select>
                        )}
                    </div>
                    </div>
                    {questData && GameRenderer ? (
                        <div className="visualization-wrapper">
                            <Visualization
                                GameRenderer={GameRenderer}
                                gameState={currentGameState}
                                gameConfig={questData.gameConfig}
                                ref={questData.gameType === 'turtle' ? rendererRef : undefined}
                                solutionCommands={solutionCommands}
                                cameraMode={cameraMode}
                                onActionComplete={handleActionComplete}
                                onTeleportComplete={handleTeleportComplete}
                            />
                        </div>
                    ) : (
                    <div className="emptyState"><h2>{ isStandalone ? t('Games.loadQuest') : t('Games.waitingForQuest')}</h2></div>
                    )}
                    {questData && ( <div className="descriptionArea">Task: {t(questData.descriptionKey)}</div> )}
                </div>
                {isStandalone && (
                  <div className="importer-container">
                      <QuestImporter onQuestLoad={handleQuestLoad} onError={setImportError} />
                      <LanguageSelector />
                      {importError && <p style={{ color: 'red' }}>{importError}</p>}
                  </div>
                )}
            </div>
        </Panel>
        <PanelResizeHandle />
        <Panel minSize={30} onResize={handleBlocklyPanelResize}>
            <div className="blocklyColumn">
                {questData && (
                    <EditorToolbar
                      supportedEditors={questData.supportedEditors || ['blockly']}
                      currentEditor={currentEditor}
                      onEditorChange={handleEditorChange}
                      onHelpClick={() => setIsDocsOpen(true)}
                      onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
                    />
                )}
                {questData && GameRenderer && dynamicToolboxConfig ? (
                    currentEditor === 'monaco' ? (
                    <MonacoEditor
                        initialCode={aceCode}
                        onChange={(value) => setAceCode(value || '')}
                    />
                    ) : (
                    <>
                        {questData?.blocklyConfig && (
                            <BlocklyWorkspace
                              key={`${questData.id}-${renderer}-${blocklyThemeName}-${effectiveColorScheme}-${toolboxMode}`}
                              className="fill-container"
                              toolboxConfiguration={dynamicToolboxConfig}
                              initialXml={questData.blocklyConfig.startBlocks}
                              workspaceConfiguration={workspaceConfiguration}
                              onWorkspaceChange={onWorkspaceChange}
                            />
                        )}
                        <SettingsPanel 
                            isOpen={isSettingsOpen}
                            renderer={renderer}
                            onRendererChange={setRenderer}
                            blocklyThemeName={blocklyThemeName}
                            onBlocklyThemeNameChange={setBlocklyThemeName}
                            gridEnabled={gridEnabled}
                            onGridChange={setGridEnabled}
                            soundsEnabled={soundsEnabled}
                            onSoundsChange={setSoundsEnabled}
                            colorSchemeMode={colorSchemeMode}
                            onColorSchemeChange={setColorSchemeMode}
                            toolboxMode={toolboxMode}
                            onToolboxModeChange={setToolboxMode}
                        />
                    </>
                    )
                ) : (
                    <div className="emptyState">
                      <h2>{t('Games.blocklyArea')}</h2>
                      <p>{t('Games.waitingForQuest')}</p>
                    </div>
                )}
            </div>
        </Panel>
      </PanelGroup>
    </>
  );
};