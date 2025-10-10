// src/components/QuestPlayer/hooks/useQuestLoader.ts

import { useState, useEffect, useRef } from 'react';
import type { Quest, IGameEngine, IGameRenderer, MazeConfig } from '../../../types';
import { initializeGame } from '../../../games/GameBlockManager';
import type { TurtleEngine } from '../../../games/turtle/TurtleEngine';
import type { DrawingCommand } from '../../../games/turtle/types';

export const useQuestLoader = (questData: Quest | null) => {
  const [GameRenderer, setGameRenderer] = useState<IGameRenderer | null>(null);
  const [solutionCommands, setSolutionCommands] = useState<DrawingCommand[] | null>(null);
  const [error, setError] = useState<string>('');
  const engineRef = useRef<IGameEngine | null>(null);

  useEffect(() => {
    if (!questData) {
      setGameRenderer(null);
      engineRef.current = null;
      return;
    }

    let isMounted = true;
    const loadQuest = async () => {
      try {
        setError('');
        await initializeGame(questData.gameType);

        const gameModule = await import(`../../../games/${questData.gameType}/index.ts`);
        if (!isMounted) return;

        const engine = new gameModule.GameEngine(questData.gameConfig);
        engineRef.current = engine;

        if (questData.gameType === 'turtle' && (engine as TurtleEngine).runHeadless && (questData.solution as any).solutionScript) {
          const commands = (engine as TurtleEngine).runHeadless((questData.solution as any).solutionScript);
          setSolutionCommands(commands);
        } else {
          setSolutionCommands(null);
        }
        
        // Dynamically select the renderer
        if (questData.gameType === 'maze' && gameModule.Renderers) {
            const mazeConfig = questData.gameConfig as MazeConfig;
            const rendererType = mazeConfig.renderer || '2d';
            const SelectedRenderer = gameModule.Renderers[rendererType] || gameModule.Renderers['2d'];
            setGameRenderer(() => SelectedRenderer);
        } else {
            setGameRenderer(() => gameModule.GameRenderer);
        }

      } catch (err) {
        if (isMounted) setError(`Could not load game module for ${questData.gameType}.`);
      }
    };

    loadQuest();

    return () => { isMounted = false; };
  }, [questData]);

  return { GameRenderer, engineRef, solutionCommands, error };
};