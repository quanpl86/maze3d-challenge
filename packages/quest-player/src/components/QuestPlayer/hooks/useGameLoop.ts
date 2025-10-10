// src/components/QuestPlayer/hooks/useGameLoop.ts

import { useState, useRef, useEffect, useCallback } from 'react';
import type { IGameEngine, GameState, Quest, StepResult, ExecutionMode } from '../../../../types';
import type { TurtleEngine } from '../../../games/turtle/TurtleEngine';
import type { TurtleRendererHandle } from '../../../games/turtle/TurtleRenderer';
import type { IMazeEngine } from '../../../games/maze/MazeEngine';

const BATCH_FRAME_DELAY = 50;
const STEP_FRAME_DELAY = 10;
const DEBUG_FRAME_DELAY = 500;

type PlayerStatus = 'idle' | 'running' | 'paused' | 'finished';

interface GameLoopResult {
  isSuccess: boolean;
  finalState: GameState;
}

export const useGameLoop = (
  engineRef: React.RefObject<IGameEngine>,
  questData: Quest | null,
  rendererRef: React.RefObject<TurtleRendererHandle>,
  onGameEnd: (result: GameLoopResult) => void,
  playSound: (name: string, volume?: number) => void,
  setHighlightedBlockId: (id: string | null) => void,
) => {
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>('idle');
  const [currentGameState, setCurrentGameState] = useState<GameState | null>(null);
  const [executionLog, setExecutionLog] = useState<GameState[] | null>(null);
  
  const frameIndex = useRef(0);
  const animationFrameId = useRef<number | null>(null);
  const lastStepTime = useRef(0);
  const executionModeRef = useRef<ExecutionMode>('run');
  const isWaitingForAnimation = useRef(false);

  const executeSingleStep = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !questData) return true;

    const handleGameOver = (finalEngineState: GameState) => {
      let isSuccess = false;
      
      if (engine.gameType === 'turtle' && rendererRef.current?.getCanvasData) {
        const { userImageData, solutionImageData } = rendererRef.current.getCanvasData();
        if (userImageData && solutionImageData) {
          isSuccess = (engine as TurtleEngine).verifySolution(userImageData, solutionImageData, questData.solution.pixelTolerance || 0);
        }
      } else {
        isSuccess = engine.checkWinCondition(finalEngineState, questData.solution);
      }

      if (isSuccess) playSound('win'); else playSound('fail');
      
      const finalState = { ...finalEngineState, result: isSuccess ? 'success' : 'failure' };
      setCurrentGameState(finalState);
      setPlayerStatus('finished');
      setHighlightedBlockId(null);
      onGameEnd({ isSuccess, finalState });
    };

    if (engine.step) {
      const result: StepResult = engine.step();
      if (result) {
        const newPose = (result.state as any).players?.[(result.state as any).activePlayerId]?.pose;

        const posesThatRequireWaiting = [
            'Walking', 'Jumping', 'TurningLeft', 'TurningRight', 'Bump',
            'TeleportOut', 'TeleportIn', 'Collecting', 'Toggling', 'Victory'
        ];

        setCurrentGameState(result.state);

        if (posesThatRequireWaiting.includes(newPose)) {
            console.log(`%c[GameLoop] Received ACTIVE state [${newPose}]. Setting isWaitingForAnimation=true`, 'color: #f39c12; font-weight: bold;');
            isWaitingForAnimation.current = true;
        } else {
            console.log(`%c[GameLoop] Received PASSIVE state [${newPose}]. Not waiting.`, 'color: #1abc9c; font-weight: bold;');
            isWaitingForAnimation.current = false;
        }

        if (executionModeRef.current === 'debug' && result.highlightedBlockId) {
          setHighlightedBlockId(result.highlightedBlockId);
        }
        if (result.done) {
          isWaitingForAnimation.current = true;
          setTimeout(() => {
            handleGameOver(result.state);
          }, 800);
          return false;
        }
      }
    } else if (executionLog) {
      isWaitingForAnimation.current = false; 
      const nextIndex = frameIndex.current + 1;
      if (nextIndex >= executionLog.length) {
        const finalState = executionLog[executionLog.length - 1];
        handleGameOver(finalState);
        return false;
      } else {
        frameIndex.current = nextIndex;
        setCurrentGameState(executionLog[nextIndex]);
      }
    }
    return true;
  }, [engineRef, questData, executionLog, rendererRef, onGameEnd, playSound, setHighlightedBlockId]);

  const handleActionComplete = useCallback(() => {
    console.log(`%c[GameLoop] handleActionComplete() CALLED.`, 'color: #2ecc71; font-weight: bold;');
    const engine = engineRef.current;

    if (engine?.gameType === 'maze') {
      const mazeEngine = engine as IMazeEngine;
      const interactionState = mazeEngine.triggerInteraction();

      if (interactionState) {
        console.log(`%c[GameLoop] Interaction triggered. Updating state to 'TeleportOut' and waiting.`, 'color: #8e44ad; font-weight: bold;');
        setCurrentGameState(interactionState);
        isWaitingForAnimation.current = true;
        return;
      }
    }
    
    isWaitingForAnimation.current = false;
  }, [engineRef]);


  const handleTeleportComplete = useCallback(() => {
    const engine = engineRef.current;
    if (engine && 'completeTeleport' in engine) {
      (engine as any).completeTeleport();
      isWaitingForAnimation.current = false;
    }
  }, [engineRef]);

  const runGame = useCallback((userCode: string, mode: ExecutionMode) => {
    const engine = engineRef.current;
    if (!engine || playerStatus === 'running' || playerStatus === 'paused') return;

    isWaitingForAnimation.current = false;
    setHighlightedBlockId(null);
    executionModeRef.current = mode;
    frameIndex.current = 0;
    lastStepTime.current = 0;
    
    engine.execute(userCode); 

    if (engine.step) {
      setExecutionLog(null);
      setCurrentGameState(engine.getInitialState());
    } else {
      // @ts-ignore
      const log = engine.log || [];
      setExecutionLog(log);
      setCurrentGameState(log[0] || engine.getInitialState());
    }

    setPlayerStatus('running');
  }, [engineRef, playerStatus, setHighlightedBlockId]);

  const resetGame = useCallback(() => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    const engine = engineRef.current;
    if (!engine) return;

    if ('reset' in engine && typeof engine.reset === 'function') {
      engine.reset();
    }

    isWaitingForAnimation.current = false;
    frameIndex.current = 0;
    setCurrentGameState(engine.getInitialState());
    setExecutionLog(null);
    setPlayerStatus('idle');
    setHighlightedBlockId(null);
  }, [engineRef, setHighlightedBlockId]);

  const pauseGame = useCallback(() => {
    if (playerStatus === 'running') {
      setPlayerStatus('paused');
    }
  }, [playerStatus]);

  const resumeGame = useCallback(() => {
    if (playerStatus === 'paused') {
      setPlayerStatus('running');
    }
  }, [playerStatus]);
  
  const stepForward = useCallback(() => {
    if (playerStatus === 'paused') {
      isWaitingForAnimation.current = false;
      executeSingleStep();
    }
  }, [playerStatus, executeSingleStep]);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (playerStatus !== 'running') {
        animationFrameId.current = null;
        return;
      }
      
      if (isWaitingForAnimation.current) {
        animationFrameId.current = requestAnimationFrame(animate);
        return;
      }

      const delay = executionModeRef.current === 'debug' ? DEBUG_FRAME_DELAY : (engineRef.current?.step ? STEP_FRAME_DELAY : BATCH_FRAME_DELAY);
      
      if (timestamp - lastStepTime.current < delay) {
        animationFrameId.current = requestAnimationFrame(animate);
        return;
      }
      lastStepTime.current = timestamp;

      const gameContinues = executeSingleStep();

      if (gameContinues) {
        animationFrameId.current = requestAnimationFrame(animate);
      } else {
        animationFrameId.current = null;
      }
    };

    if (playerStatus === 'running' && animationFrameId.current === null) {
      animationFrameId.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [playerStatus, executeSingleStep, engineRef]);

  return {
    currentGameState,
    playerStatus,
    runGame,
    resetGame,
    pauseGame,
    resumeGame,
    stepForward,
    handleActionComplete,
    handleTeleportComplete,
  };
};