// src/components/QuestPlayer/hooks/useQuestLoader.ts

import { useState, useEffect, useRef } from 'react';
import type { Quest, IGameEngine, IGameRenderer, MazeConfig } from '../../../types';
import { initializeGame } from '../../../games/GameBlockManager';
import { gameRegistry } from '../../../games';
import type { TurtleEngine } from '../../../games/turtle/TurtleEngine';
import type { DrawingCommand } from '../../../games/turtle/types';
import { useTranslation } from 'react-i18next';

export const useQuestLoader = (questData: Quest | null) => {
  const { t } = useTranslation();
  const [GameRenderer, setGameRenderer] = useState<IGameRenderer | null>(null);
  const [solutionCommands, setSolutionCommands] = useState<DrawingCommand[] | null>(null);
  const [error, setError] = useState<string>('');
  const engineRef = useRef<IGameEngine | null>(null);
  const [isQuestReady, setIsQuestReady] = useState(false); // New state to manage readiness

  useEffect(() => {
    if (!questData) {
      setGameRenderer(null);
      engineRef.current = null;
      setError('');
      setIsQuestReady(false); // Reset readiness
      return;
    }

    let isMounted = true;
    const loadQuest = async () => {
      try {
        setIsQuestReady(false); // Set to loading state
        setError('');
        
        const gameModule = gameRegistry[questData.gameType];
        if (!gameModule) {
          throw new Error(`Game module for type "${questData.gameType}" not found in registry.`);
        }

        // Initialize Blockly blocks for the game. This is the critical async step.
        await initializeGame(questData.gameType, t);
        if (!isMounted) return;

        // All subsequent setup is synchronous
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

        // Only set to ready after all setup is complete
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