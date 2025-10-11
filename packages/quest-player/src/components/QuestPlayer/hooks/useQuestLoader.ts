import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Quest, IGameEngine, IGameRenderer, MazeConfig } from '../../../types';
import { initializeGame } from '../../../games/GameBlockManager';
import { gameRegistry } from '../../../games';
import type { TurtleEngine } from '../../../games/turtle/TurtleEngine';
import type { DrawingCommand } from '../../../games/turtle/types';

export const useQuestLoader = (questData: Quest | null) => {
  const { t } = useTranslation();
  const [GameRenderer, setGameRenderer] = useState<IGameRenderer | null>(null);
  const [solutionCommands, setSolutionCommands] = useState<DrawingCommand[] | null>(null);
  const [error, setError] = useState<string>('');
  const engineRef = useRef<IGameEngine | null>(null);
  const [isQuestReady, setIsQuestReady] = useState(false);

  useEffect(() => {
    if (!questData) {
      setGameRenderer(null);
      engineRef.current = null;
      setError('');
      setIsQuestReady(false);
      return;
    }

    let isMounted = true;
    const loadQuest = () => {
      try {
        console.log('[DEBUG] 1. useQuestLoader: Starting to load quest for gameType:', questData.gameType);
        setIsQuestReady(false);
        setError('');
        
        const gameModule = gameRegistry[questData.gameType];
        if (!gameModule) {
          throw new Error(`Game module for type "${questData.gameType}" not found in registry.`);
        }

        console.log('[DEBUG] 2. useQuestLoader: initializeGame has been called.');
        initializeGame(questData.gameType, t);
        if (!isMounted) return;

        const engine = new gameModule.GameEngine(questData.gameConfig);
        engineRef.current = engine;

        if (questData.gameType === 'turtle' && (engine as TurtleEngine).runHeadless && (questData.solution as any).solutionScript) {
          const commands = (engine as TurtleEngine).runHeadless((questData.solution as any).solutionScript);
          setSolutionCommands(commands);
        } else {
          setSolutionCommands(null);
        }
        
        if (questData.gameType === 'maze' && gameModule.Renderers) {
            const mazeConfig = questData.gameConfig as MazeConfig;
            const rendererType = mazeConfig.renderer || '2d';
            const SelectedRenderer = gameModule.Renderers[rendererType] || gameModule.Renderers['2d'];
            setGameRenderer(() => SelectedRenderer ?? null);
        } else if (gameModule.GameRenderer) {
            setGameRenderer(() => gameModule.GameRenderer ?? null);
        } else {
            throw new Error(`No suitable renderer found for game type "${questData.gameType}".`);
        }

        console.log('[DEBUG] 3. useQuestLoader: Renderer is set. Quest is now ready.');
        setIsQuestReady(true);

      } catch (err) {
        if (isMounted) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(`Could not load game module for ${questData.gameType}: ${errorMessage}`);
            setIsQuestReady(false);
        }
      }
    };

    loadQuest();

    return () => { isMounted = false; };
  }, [questData, t]);

  return { GameRenderer, engineRef, solutionCommands, error, isQuestReady };
};