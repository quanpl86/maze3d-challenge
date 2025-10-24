// src/components/QuestPlayer/hooks/useGameLoop.ts

import { useState, useRef, useEffect, useCallback } from 'react';
import * as Blockly from 'blockly/core';
import type { IGameEngine, GameState, Quest, StepResult, ExecutionMode, QuestCompletionResult, EditorType, MazeConfig } from '../../../types';
import type { TurtleEngine } from '../../../games/turtle/TurtleEngine';
import type { TurtleRendererHandle } from '../../../games/turtle/TurtleRenderer';
import type { IMazeEngine } from '../../../games/maze/MazeEngine';
import { calculateLogicalLines } from '../utils';
import type { MazeGameState } from '../../../games/maze/types';

const BATCH_FRAME_DELAY = 50;
const STEP_FRAME_DELAY = 10;
const DEBUG_FRAME_DELAY = 500;

type PlayerStatus = 'idle' | 'running' | 'paused' | 'finished';

const checkItemGoals = (finalState: GameState, questData: Quest): boolean => {
  const { solution, gameConfig } = questData;
  if (!solution.itemGoals) {
    return true; // Không có mục tiêu phụ, coi như hoàn thành
  }

  if (gameConfig.type === 'maze') {
    const mazeState = finalState as MazeGameState;
    const mazeConfig = gameConfig as MazeConfig;

    for (const goalType in solution.itemGoals) {
      const requiredCount = solution.itemGoals[goalType];
      if (goalType === 'switch') {
        const switchesOn = Object.values(mazeState.interactiveStates).filter(state => state === 'on').length;
        if (switchesOn < requiredCount) return false;
      } else { // Mặc định là các vật phẩm thu thập (collectibles)
        const collectedItems = (mazeConfig.collectibles || [])
          .filter(c => mazeState.collectedIds.includes(c.id) && c.type === goalType);
        if (collectedItems.length < requiredCount) return false;
      }
    }
  }
  // Có thể thêm logic cho các game khác ở đây

  return true;
};

export const useGameLoop = (
  engineRef: React.RefObject<IGameEngine>,
  questData: Quest | null,
  rendererRef: React.RefObject<TurtleRendererHandle>,
  onGameEnd: (result: QuestCompletionResult) => void,
  playSound: (name: string, volume?: number) => void,
  setHighlightedBlockId: (id: string | null) => void,
  // Thêm các tham số mới để tính toán kết quả
  currentEditor: EditorType,
  userCode: string,
  workspaceRef: React.RefObject<Blockly.WorkspaceSvg>
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
      
      if (engine.gameType === 'turtle' && rendererRef.current?.getCanvasData && questData.solution.pixelTolerance !== undefined) {
        const { userImageData, solutionImageData } = rendererRef.current.getCanvasData();
        if (userImageData && solutionImageData) {
          isSuccess = (engine as TurtleEngine).verifySolution(userImageData, solutionImageData, questData.solution.pixelTolerance);
        }
      } else {
        isSuccess = engine.checkWinCondition(finalEngineState, questData.solution);
      }

      if (isSuccess) playSound('win'); else playSound('fail');
      
      const finalStateWithSolution = { ...finalEngineState, solution: questData.solution, result: isSuccess ? 'success' : 'failure' };
      setCurrentGameState(finalStateWithSolution);
      setPlayerStatus('finished');
      setHighlightedBlockId(null);
      
      // --- [SỬA LỖI] BUILD THE COMPLETION RESULT OBJECT ---
      // Luôn tính toán dựa trên số dòng code logic của mã JavaScript được thực thi (userCode)
      // để đảm bảo tính nhất quán, bất kể người dùng đang ở editor nào.
      const unitLabel = questData.solution.optimalLines !== undefined ? 'line' : 'block';
      const unitCount = calculateLogicalLines(userCode);

      let stars = 0;
      if (isSuccess) {
        const allItemGoalsMet = checkItemGoals(finalEngineState, questData);

        if (allItemGoalsMet) {
          // Hoàn thành tất cả mục tiêu -> xét 2 hoặc 3 sao
          if (currentEditor === 'blockly' && questData.solution.optimalBlocks !== undefined) {
            stars = (unitCount <= questData.solution.optimalBlocks) ? 3 : 2;
          } else if (currentEditor === 'monaco' && questData.solution.optimalLines !== undefined) {
            stars = (unitCount <= questData.solution.optimalLines) ? 3 : 2;
          } else {
            stars = 2; // Mặc định 2 sao nếu không có optimalBlocks
          }
        } else {
          // Chỉ về đích -> 1 sao
          stars = 1;
        }
      }


      onGameEnd({
          isSuccess,
          finalState: finalStateWithSolution,
          userCode: userCode,
          unitCount,
          unitLabel,
          stars
      });
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
            isWaitingForAnimation.current = true;
        } else {
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
  }, [engineRef, questData, executionLog, rendererRef, onGameEnd, playSound, setHighlightedBlockId, currentEditor, userCode, workspaceRef]);

  const handleActionComplete = useCallback(() => {
    const engine = engineRef.current;

    if (engine?.gameType === 'maze') {
      const mazeEngine = engine as IMazeEngine;
      const interactionState = mazeEngine.triggerInteraction();

      if (interactionState) {
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

  const runGame = useCallback((codeToRun: string, mode: ExecutionMode) => {
    const engine = engineRef.current;
    if (!engine || playerStatus === 'running' || playerStatus === 'paused') return;

    isWaitingForAnimation.current = false;
    setHighlightedBlockId(null);
    executionModeRef.current = mode;
    frameIndex.current = 0;
    lastStepTime.current = 0;
    
    engine.execute(codeToRun); 

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