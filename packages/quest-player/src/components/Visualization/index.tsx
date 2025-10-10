// src/components/Visualization/index.tsx

import { forwardRef } from 'react';
import type { IGameRenderer, GameState, GameConfig, CameraMode } from '../../types';

interface VisualizationProps {
  GameRenderer: IGameRenderer;
  gameState: GameState | null;
  gameConfig: GameConfig;
  solutionCommands?: any[] | null; 
  cameraMode?: CameraMode;
  onActionComplete: () => void;
  onTeleportComplete?: () => void;
}

export const Visualization = forwardRef<any, VisualizationProps>(
  (
    {
      GameRenderer,
      gameState,
      gameConfig,
      solutionCommands,
      cameraMode,
      onActionComplete,
      onTeleportComplete, 
    },
    ref
  ) => {
    const containerStyle: React.CSSProperties = {
      flexGrow: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'var(--visualization-bg)',
      position: 'relative',
      overflow: 'hidden',
    };

    if (!GameRenderer || !gameState || !gameConfig) {
      return (
        <div style={containerStyle}>
          <span>Initializing Visualization...</span>
        </div>
      );
    }

    return (
      <GameRenderer
        ref={ref}
        gameState={gameState}
        gameConfig={gameConfig}
        solutionCommands={solutionCommands}
        cameraMode={cameraMode}
        onActionComplete={onActionComplete}
        onTeleportComplete={onTeleportComplete}
      />
    );
  }
);