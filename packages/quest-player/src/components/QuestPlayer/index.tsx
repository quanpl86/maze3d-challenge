// packages/quest-player/src/components/QuestPlayer/index.tsx

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { javascriptGenerator } from 'blockly/javascript';
import * as Blockly from 'blockly/core';
import * as Vi from 'blockly/msg/vi';
import * as En from 'blockly/msg/en';
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
import { useSoundManager } from '../../hooks/useSoundManager';
import type { TurtleRendererHandle } from '../../games/turtle/TurtleRenderer';
import { getFailureMessage, processToolbox, createBlocklyTheme } from './utils';
import { useQuestLoader } from './hooks/useQuestLoader';
import { useEditorManager } from './hooks/useEditorManager';
import { useGameLoop } from './hooks/useGameLoop';
import './QuestPlayer.css';

type StandaloneProps = {
  isStandalone?: true;
  language?: string;
  initialSettings?: QuestPlayerSettings;
  onQuestLoad?: (quest: Quest) => void;
  onQuestComplete?: (result: QuestCompletionResult) => void;
  onSettingsChange?: (newSettings: QuestPlayerSettings) => void;
};

type LibraryProps = {
  isStandalone: false;
  language: string;
  questData: Quest;
  initialSettings: QuestPlayerSettings;
  onQuestComplete: (result: QuestCompletionResult) => void;
  onSettingsChange: (newSettings: QuestPlayerSettings) => void;
  onQuestLoad?: (quest: Quest) => void;
};

export type QuestPlayerProps = (StandaloneProps | LibraryProps);

interface DisplayStats {
  blockCount?: number;
  maxBlocks?: number;
  crystalsCollected?: number;
  totalCrystals?: number;
  switchesOn?: number;
  totalSwitches?: number;
}

const START_BLOCK_TYPE = 'maze_start';

const DEFAULT_SETTINGS: Required<QuestPlayerSettings> = {
  renderer: 'zelos',
  blocklyThemeName: 'zelos',
  gridEnabled: true,
  soundsEnabled: true,
  colorSchemeMode: 'auto',
  cameraMode: 'Follow',
};

let blocklyDefaultEnglishMessages: { [key: string]: string } | null = null;


export const QuestPlayer: React.FC<QuestPlayerProps> = (props) => {
  const { t, i18n } = useTranslation();
  const language = props.language || i18n.language;

  const isStandalone = props.isStandalone !== false;

  const [loadedQuestId, setLoadedQuestId] = useState<string | null>(null);

  const [internalQuestData, setInternalQuestData] = useState<Quest | null>(null);
  const questData = isStandalone ? internalQuestData : props.questData;

  const [importError, setImportError] = useState<string>('');
  const [dialogState, setDialogState] = useState({ isOpen: false, title: '', message: '' });
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [dynamicToolboxConfig, setDynamicToolboxConfig] = useState<ToolboxJSON | null>(null);
  
  const [blocklyWorkspaceKey, setBlocklyWorkspaceKey] = useState<string>('initial-key');

  const [blockCount, setBlockCount] = useState(0);
  const [displayStats, setDisplayStats] = useState<DisplayStats>({});

  const [executionMode, setExecutionMode] = useState<ExecutionMode>('run');

  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const rendererRef = useRef<TurtleRendererHandle>(null);
  const initialToolboxConfigRef = useRef<ToolboxJSON | null>(null);

  const { GameRenderer, engineRef, solutionCommands, error: questLoaderError, isQuestReady } = useQuestLoader(questData);
  const { currentEditor, aceCode, setAceCode, handleEditorChange } = useEditorManager(questData, workspaceRef);

  const [currentUserCode, setCurrentUserCode] = useState('');

  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...props.initialSettings }), [props.initialSettings]);

  // SỬA ĐỔI: Refactor lại useEffect đồng bộ hóa ngôn ngữ
  useEffect(() => {
    if (!blocklyDefaultEnglishMessages) {
      blocklyDefaultEnglishMessages = { ...Blockly.Msg };
    }

    if (language === 'vi') {
      Blockly.setLocale(Vi.default);
    } else {
      Blockly.setLocale(blocklyDefaultEnglishMessages);
    }

    Blockly.Msg.PROCEDURES_DEFNORETURN_PROCEDURE = t('Blockly.PROCEDURES_DEFNORETURN_PROCEDURE');
    Blockly.Msg.PROCEDURES_DEFRETURN_RETURN = t('Blockly.PROCEDURES_DEFRETURN_RETURN');
    Blockly.Msg.NEW_VARIABLE = t('Blockly.NEW_VARIABLE');
    Blockly.Msg.VARIABLES_DEFAULT_NAME = t('Blockly.VARIABLES_DEFAULT_NAME');

    if (questData) {
      setBlocklyWorkspaceKey(`${questData.id}-${language}`);
    }
  }, [language, t, questData]);


  const handleSettingsChange = (newSettings: Partial<QuestPlayerSettings>) => {
    if (props.onSettingsChange) {
      props.onSettingsChange({ ...settings, ...newSettings });
    }
  };

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

  const { playSound } = useSoundManager(questData?.sounds, settings.soundsEnabled);

  const {
    currentGameState, playerStatus, runGame, resetGame,
    pauseGame, resumeGame, stepForward,
    handleActionComplete, handleTeleportComplete
  } = useGameLoop(engineRef, questData, rendererRef, handleGameEnd, playSound, setHighlightedBlockId, currentEditor, currentUserCode, workspaceRef);
  
  useEffect(() => {
    if (questData?.blocklyConfig) {
      setLoadedQuestId(null);
      const processedToolbox = processToolbox(questData.blocklyConfig.toolbox, t);
      initialToolboxConfigRef.current = processedToolbox;
      setDynamicToolboxConfig(processedToolbox);
      setLoadedQuestId(questData.id);
    } else {
      setDynamicToolboxConfig(null);
      setLoadedQuestId(null);
    }
  }, [questData, t, language]);

  useEffect(() => { if (questLoaderError) setImportError(questLoaderError); }, [questLoaderError]);

  useEffect(() => {
    if (isQuestReady && engineRef.current) {
      resetGame();
    }
  }, [isQuestReady, engineRef, resetGame]);

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

  const effectiveColorScheme = useMemo(() => {
    if (settings.colorSchemeMode === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return settings.colorSchemeMode;
  }, [settings.colorSchemeMode]);

  const blocklyTheme = useMemo(() => createBlocklyTheme(settings.blocklyThemeName, effectiveColorScheme), [settings.blocklyThemeName, effectiveColorScheme]);

  const workspaceConfiguration = useMemo(() => ({
    theme: blocklyTheme,
    renderer: settings.renderer,
    trashcan: true,
    zoom: { controls: true, wheel: false, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
    grid: { spacing: 20, length: 3, colour: "#ccc", snap: settings.gridEnabled },
    sounds: settings.soundsEnabled,
  }), [blocklyTheme, settings]);

  const handleBlocklyPanelResize = useCallback(() => {
    setTimeout(() => {
      if (workspaceRef.current) Blockly.svgResize(workspaceRef.current);
    }, 0);
  }, []);

  if (!questData && isStandalone) {
    return (
      <div className="emptyState" style={{ flexDirection: 'column', gap: '20px' }}>
        <h2>{t('Games.loadQuest')}</h2>
        <div style={{ display: 'flex', gap: '15px' }}>
          <QuestImporter onQuestLoad={handleQuestLoad} onError={setImportError} />
        </div>
        {importError && <p style={{ color: 'red', fontSize: '12px', textAlign: 'center' }}>{importError}</p>}
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
      <BackgroundMusic src={questData.backgroundMusic} play={playerStatus === 'running' && settings.soundsEnabled} />

      <PanelGroup direction="horizontal" className="quest-player-container" autoSaveId="quest-player-panels">
        <Panel defaultSize={50} minSize={20}>
          <div className="visualizationColumn">
            <div className="main-content-wrapper">
              <div className="controlsArea">
                <div>
                  {(playerStatus === 'idle' || playerStatus === 'finished') && (
                    <>
                      <button className="primaryButton" onClick={() => handleRun('run')}>{t('UI.Run')}</button>
                      <button className="primaryButton" onClick={() => handleRun('debug')}>{t('UI.Debug')}</button>
                    </>
                  )}
                  {playerStatus === 'running' && executionMode === 'debug' && (<button className="primaryButton" onClick={pauseGame}>{t('UI.Pause')}</button>)}
                  {playerStatus === 'paused' && (
                    <>
                      <button className="primaryButton" onClick={resumeGame}>{t('UI.Resume')}</button>
                      <button className="primaryButton" onClick={stepForward}>{t('UI.StepForward')}</button>
                    </>
                  )}
                  {playerStatus !== 'idle' && <button className="primaryButton" onClick={resetGame}>{t('UI.Reset')}</button>}
                </div>
                <div>
                  {is3DRenderer && (
                    <select value={settings.cameraMode} onChange={(e) => handleSettingsChange({ cameraMode: e.target.value as CameraMode })}>
                      <option value="Follow">{t('Camera.Follow')}</option>
                      <option value="TopDown">{t('Camera.TopDown')}</option>
                      <option value="Free">{t('Camera.Free')}</option>
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
                    cameraMode={settings.cameraMode}
                    onActionComplete={handleActionComplete}
                    onTeleportComplete={handleTeleportComplete}
                  />
                  <div className="stats-overlay">
                    {displayStats.blockCount != null && displayStats.maxBlocks != null && (
                      <div className="stat-item">
                        {t('UI.StatsBlocks')}: {displayStats.blockCount} / {displayStats.maxBlocks}
                      </div>
                    )}
                    {displayStats.totalCrystals != null && displayStats.totalCrystals > 0 && (
                      <div className="stat-item">
                        {t('UI.StatsCrystals')}: {displayStats.crystalsCollected ?? 0} / {displayStats.totalCrystals}
                      </div>
                    )}
                    {displayStats.totalSwitches != null && displayStats.totalSwitches > 0 && (
                      <div className="stat-item">
                        {t('UI.StatsSwitches')}: {displayStats.switchesOn ?? 0} / {displayStats.totalSwitches}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="emptyState">
                  <h2>{t('UI.LoadingVisualization')}</h2>
                  {questLoaderError && <p style={{ color: 'red' }}>{questLoaderError}</p>}
                </div>
              )}
              <div className="descriptionArea">{t('UI.TaskLabel')}: {t(questData.descriptionKey)}</div>
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
                  {questData.blocklyConfig && loadedQuestId === questData.id && (
                    <BlocklyWorkspace
                      key={`${blocklyWorkspaceKey}-${settings.renderer}-${settings.blocklyThemeName}-${effectiveColorScheme}`}
                      className="fill-container"
                      toolboxConfiguration={dynamicToolboxConfig}
                      initialXml={questData.blocklyConfig.startBlocks}
                      workspaceConfiguration={workspaceConfiguration}
                      onWorkspaceChange={onWorkspaceChange}
                    />
                  )}
                  {questData.blocklyConfig && loadedQuestId !== questData.id && (  
                    <div className="emptyState">
                      <h2>{t('UI.LoadingEditor')}</h2>
                    </div>
                  )}
                  <SettingsPanel
                    isOpen={isSettingsOpen}
                    renderer={settings.renderer}
                    onRendererChange={value => handleSettingsChange({ renderer: value })}
                    blocklyThemeName={settings.blocklyThemeName}
                    onBlocklyThemeNameChange={value => handleSettingsChange({ blocklyThemeName: value })}
                    gridEnabled={settings.gridEnabled}
                    onGridChange={value => handleSettingsChange({ gridEnabled: value })}
                    soundsEnabled={settings.soundsEnabled}
                    onSoundsChange={value => handleSettingsChange({ soundsEnabled: value })}
                    colorSchemeMode={settings.colorSchemeMode}
                    onColorSchemeChange={value => handleSettingsChange({ colorSchemeMode: value })}
                    toolboxMode={"default"}
                    onToolboxModeChange={() => { }}
                  />
                </>
              )
            ) : (
              <div className="emptyState">
                <h2>{questLoaderError ? t('UI.Error') : t('UI.LoadingEditor')}</h2>
                {questLoaderError && <p style={{ color: 'red' }}>{questLoaderError}</p>}
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>
    </>
  );
};