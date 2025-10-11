import React, { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { javascriptGenerator } from 'blockly/javascript';
import * as Blockly from 'blockly/core';
import { BlocklyWorkspace } from 'react-blockly';
import { transform } from '@babel/standalone';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { Quest, ExecutionMode, CameraMode, ToolboxJSON, ToolboxItem, QuestPlayerSettings, QuestCompletionResult, MazeConfig, Interactive } from '../../types';
import type { MazeGameState } from '../../games/maze/types';
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
  onQuestLoad?: (quest: Quest) => void;
};

export type QuestPlayerProps = (StandaloneProps | LibraryProps);

// KHÔI PHỤC: Interface cho state hiển thị thông số
interface DisplayStats {
  blockCount?: number;
  maxBlocks?: number;
  crystalsCollected?: number;
  totalCrystals?: number;
  switchesOn?: number;
  totalSwitches?: number;
}

const START_BLOCK_TYPE = 'maze_start';

export const QuestPlayer: React.FC<QuestPlayerProps> = (props) => {
  const { t, i18n } = useTranslation();
  
  const isStandalone = props.isStandalone !== false;

  const [internalQuestData, setInternalQuestData] = useState<Quest | null>(null);
  const questData = isStandalone ? internalQuestData : props.questData;
  
  const [importError, setImportError] = useState<string>('');
  const [dialogState, setDialogState] = useState({ isOpen: false, title: '', message: '' });
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [dynamicToolboxConfig, setDynamicToolboxConfig] = useState<ToolboxJSON | null>(null);
  
  // KHÔI PHỤC: State cho thông số
  const [blockCount, setBlockCount] = useState(0);
  const [displayStats, setDisplayStats] = useState<DisplayStats>({});

  const [renderer, setRenderer] = useState<'geras' | 'zelos'>('zelos');
  const [blocklyThemeName, setBlocklyThemeName] = useState<'zelos' | 'classic'>('zelos');
  const [gridEnabled, setGridEnabled] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [colorSchemeMode, setColorSchemeMode] = useState<'auto' | 'light' | 'dark'>('auto');
  const [toolboxMode, setToolboxMode] = useState<'default' | 'simple' | 'test'>('default');
  const [cameraMode, setCameraMode] = useState<CameraMode>('Follow');
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('run');

  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const rendererRef = useRef<TurtleRendererHandle>(null);
  const initialToolboxConfigRef = useRef<ToolboxJSON | null>(null);

  const { GameRenderer, engineRef, solutionCommands, error: questLoaderError, isQuestReady } = useQuestLoader(questData);
  const { currentEditor, aceCode, setAceCode, handleEditorChange } = useEditorManager(questData, workspaceRef);
  
  const [currentUserCode, setCurrentUserCode] = useState('');

  const prefersColorScheme = usePrefersColorScheme();
  const effectiveColorScheme = useMemo(() => {
    return colorSchemeMode === 'auto' ? prefersColorScheme : colorSchemeMode;
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
    if (isStandalone && props.onQuestComplete) {
      props.onQuestComplete(result);
    }
  }, [isStandalone, props, t]);
  
  const { playSound } = useSoundManager(questData?.sounds, soundsEnabled);
  
  const { 
    currentGameState, playerStatus, runGame, resetGame, 
    pauseGame, resumeGame, stepForward,
    handleActionComplete, handleTeleportComplete
  } = useGameLoop(engineRef, questData, rendererRef, handleGameEnd, playSound, setHighlightedBlockId, currentEditor, currentUserCode, workspaceRef);

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
  
  useEffect(() => { 
    if (isQuestReady && engineRef.current) {
        resetGame(); 
    }
  }, [isQuestReady, engineRef, resetGame]);
  
  // KHÔI PHỤC: useEffect để tính toán và cập nhật thông số hiển thị
  useEffect(() => {
    const newStats: DisplayStats = {};
    if (questData) {
        if (currentEditor === 'blockly' && questData.blocklyConfig?.maxBlocks) {
            newStats.blockCount = blockCount;
            newStats.maxBlocks = questData.blocklyConfig.maxBlocks;
        }
        if (questData.gameType === 'maze' && currentGameState) {
            const mazeConfig = questData.gameConfig as MazeConfig;
            const mazeState = currentGameState as MazeGameState;
            
            if (mazeConfig.collectibles && mazeConfig.collectibles.length > 0) {
                newStats.totalCrystals = mazeConfig.collectibles.length;
                newStats.crystalsCollected = mazeState.collectedIds.length;
            }
            const switches = mazeConfig.interactibles?.filter((i: Interactive) => i.type === 'switch');
            if (switches && switches.length > 0) {
                newStats.totalSwitches = switches.length;
                newStats.switchesOn = Object.values(mazeState.interactiveStates).filter(state => state === 'on').length;
            }
        }
    }
    setDisplayStats(newStats);
  }, [questData, currentGameState, blockCount, currentEditor]);


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
      codeToRun = currentUserCode;
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
    
    // KHÔI PHỤC: Cập nhật state blockCount
    setBlockCount(workspace.getAllBlocks(false).length);

    const startBlock = workspace.getTopBlocks(true).find(b => b.type === START_BLOCK_TYPE);
    let finalCode = '';
    if (startBlock) {
        javascriptGenerator.init(workspace);
        const rawCode = javascriptGenerator.blockToCode(startBlock);
        const mainCode = Array.isArray(rawCode) ? rawCode[0] : (rawCode || '');
        finalCode = javascriptGenerator.finish(mainCode);
    }
    setCurrentUserCode(finalCode);

    if (!initialToolboxConfigRef.current) return;
    const startBlockExists = !!startBlock;
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

  if (!questData && isStandalone) {
    return (
      <div className="emptyState" style={{flexDirection: 'column', gap: '20px'}}>
          <h2>{t('Games.loadQuest')}</h2>
          <div style={{display: 'flex', gap: '15px'}}>
            <QuestImporter onQuestLoad={handleQuestLoad} onError={setImportError} />
            <LanguageSelector />
          </div>
          {importError && <p style={{ color: 'red' }}>{importError}</p>}
      </div>
    );
  }
  
  if (!questData) {
      return <div className="emptyState"><h2>{t('Games.waitingForQuest')}</h2></div>;
  }

  return (
    <>
      <Dialog isOpen={dialogState.isOpen} title={dialogState.title} onClose={() => setDialogState({ ...dialogState, isOpen: false })}>{dialogState.message}</Dialog>
      <DocumentationPanel isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} gameType={questData.gameType} />
      <BackgroundMusic src={questData.backgroundMusic} play={playerStatus === 'running' && soundsEnabled} />
      
      <PanelGroup direction="horizontal" className="quest-player-container" autoSaveId="quest-player-panels">
        <Panel defaultSize={50} minSize={20}>
            <div className="visualizationColumn">
                <div className="main-content-wrapper">
                    <div className="controlsArea">
                      <div>
                          {(playerStatus === 'idle' || playerStatus === 'finished') && (
                              <>
                                  <button className="primaryButton" onClick={() => handleRun('run')}>Run</button>
                                  <button className="primaryButton" onClick={() => handleRun('debug')}>Debug</button>
                              </>
                          )}
                          {playerStatus === 'running' && executionMode === 'debug' && ( <button className="primaryButton" onClick={pauseGame}>Pause</button> )}
                          {playerStatus === 'paused' && (
                              <>
                                  <button className="primaryButton" onClick={resumeGame}>Resume</button>
                                  <button className="primaryButton" onClick={stepForward}>Step Forward</button>
                              </>
                          )}
                          {playerStatus !== 'idle' && <button className="primaryButton" onClick={resetGame}>Reset</button>}
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
                    {isQuestReady && GameRenderer ? (
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
                          {/* KHÔI PHỤC: JSX để hiển thị thông số */}
                          <div className="stats-overlay">
                            {displayStats.blockCount != null && displayStats.maxBlocks != null && (
                                <div className="stat-item">
                                    Blocks: {displayStats.blockCount} / {displayStats.maxBlocks}
                                </div>
                            )}
                            {displayStats.totalCrystals != null && displayStats.totalCrystals > 0 && (
                                <div className="stat-item">
                                    Crystals: {displayStats.crystalsCollected ?? 0} / {displayStats.totalCrystals}
                                </div>
                            )}
                            {displayStats.totalSwitches != null && displayStats.totalSwitches > 0 && (
                                <div className="stat-item">
                                    Switches: {displayStats.switchesOn ?? 0} / {displayStats.totalSwitches}
                                </div>
                            )}
                          </div>
                      </div>
                    ) : (
                      <div className="emptyState">
                        <h2>Loading Visualization...</h2>
                        {questLoaderError && <p style={{ color: 'red' }}>{questLoaderError}</p>}
                      </div>
                    )}
                    <div className="descriptionArea">Task: {t(questData.descriptionKey)}</div>
                </div>
            </div>
        </Panel>
        <PanelResizeHandle />
        <Panel minSize={30} onResize={handleBlocklyPanelResize}>
            <div className="blocklyColumn">
                <EditorToolbar
                  supportedEditors={questData.supportedEditors || ['blockly']}
                  currentEditor={currentEditor}
                  onEditorChange={handleEditorChange}
                  onHelpClick={() => setIsDocsOpen(true)}
                  onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
                />
                
                {isQuestReady && dynamicToolboxConfig ? (
                  currentEditor === 'monaco' ? (
                    <MonacoEditor
                        initialCode={aceCode}
                        onChange={(value) => {
                            const code = value || '';
                            setAceCode(code);
                            setCurrentUserCode(code);
                        }}
                    />
                  ) : (
                    <>
                      {questData.blocklyConfig && (
                          <BlocklyWorkspace
                            key={questData.id}
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
                    <h2>{questLoaderError ? "Error" : "Loading Editor..."}</h2>
                    {questLoaderError && <p style={{ color: 'red' }}>{questLoaderError}</p>}
                  </div>
                )}
            </div>
        </Panel>
      </PanelGroup>
    </>
  );
};