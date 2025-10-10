// src/games/maze/Maze3DRenderer.tsx

import React, { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { IGameRenderer as IGameRendererBase, MazeConfig, CameraMode } from '../../types';
import type { MazeGameState } from './types';
import { RobotCharacter } from './components/RobotCharacter';
import { CameraRig } from './components/CameraRig';
import BlockComponent from './components/Block';
import { Collectible } from './components/Collectible';
import { Portal } from './components/Portal';
import { SwitchComponent } from './components/Switch';

interface IGameRenderer extends IGameRendererBase {
  cameraMode?: CameraMode;
  onActionComplete?: () => void;
  onTeleportComplete?: () => void;
}

const TILE_SIZE = 2;

// --- Helper Components ---

const FinishMarker: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    const height = 0.5;
    const radius = TILE_SIZE / 4;
    return (
        <mesh position={[position[0], position[1] + height / 2, position[2]]}>
            <cylinderGeometry args={[radius, radius, height, 32]} />
            <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
        </mesh>
    );
};

const Scene: React.FC<{ 
  gameConfig: MazeConfig; 
  gameState: MazeGameState; 
  onActionComplete: () => void;
  onTeleportComplete: () => void; // Nhận prop mới
  robotRef: React.RefObject<THREE.Group>;
}> = ({ gameConfig, gameState, onActionComplete, onTeleportComplete, robotRef }) => {
  const activePlayer = gameState.players[gameState.activePlayerId];
  
  const robotPosition = useMemo(() => {
    if (!activePlayer) return new THREE.Vector3(0, 0, 0);
    // For TeleportIn, the visual position should be the target, not the old logical position
    if (activePlayer.pose === 'TeleportIn' && activePlayer.teleportTarget) {
        const { x, y, z } = activePlayer.teleportTarget;
        return new THREE.Vector3(x * TILE_SIZE, (y-1) * TILE_SIZE + TILE_SIZE/2, z*TILE_SIZE);
    }
    const groundY = (activePlayer.y - 1) * TILE_SIZE;
    const surfaceY = groundY + TILE_SIZE / 2;

    return new THREE.Vector3(
        activePlayer.x * TILE_SIZE,
        surfaceY,
        activePlayer.z * TILE_SIZE
    );
  }, [activePlayer]);

  if (!activePlayer) return null;

  return (
    <group>
      {gameState.blocks.map((block, index) => (
        <BlockComponent 
          key={`block-${index}`} 
          modelKey={block.modelKey} 
          position={[
            block.position.x * TILE_SIZE, 
            block.position.y * TILE_SIZE, 
            block.position.z * TILE_SIZE
          ]} 
        />
      ))}

      {gameState.collectibles.map((item) => (
        <Collectible
          key={item.id}
          collectibleType={item.type}
          position={[
            item.position.x * TILE_SIZE,
            (item.position.y - 1) * TILE_SIZE + TILE_SIZE / 2,
            item.position.z * TILE_SIZE,
          ]}
        />
      ))}

      {gameState.interactibles.map((item) => {
        if (item.type === 'portal') {
          return (
            <Portal
              key={item.id}
              color={item.color}
              position={[
                item.position.x * TILE_SIZE,
                (item.position.y - 0.54) * TILE_SIZE + 0.1, 
                item.position.z * TILE_SIZE,
              ]}
            />
          );
        }
        if (item.type === 'switch') {
          const isOn = gameState.interactiveStates[item.id] === 'on';
          return (
            <SwitchComponent
              key={item.id}
              isOn={isOn}
              position={[
                item.position.x * TILE_SIZE,
                (item.position.y - 1) * TILE_SIZE + TILE_SIZE / 2,
                item.position.z * TILE_SIZE,
              ]}
            />
          );
        }
        return null;
      })}

      <FinishMarker 
        position={[
          gameConfig.finish.x * TILE_SIZE, 
          (gameConfig.finish.y - 1) * TILE_SIZE + TILE_SIZE / 2,
          (gameConfig.finish.z ?? gameConfig.finish.y) * TILE_SIZE
        ]} 
      />
      
      <RobotCharacter 
        ref={robotRef}
        position={robotPosition} 
        direction={activePlayer.direction}
        animationName={activePlayer.pose || 'Idle'}
        onTweenComplete={onActionComplete}
        onTeleportOutComplete={onTeleportComplete} 
      />
    </group>
  );
};

// --- Main Renderer Component ---

export const Maze3DRenderer: IGameRenderer = ({ gameState, gameConfig, cameraMode = 'Follow', onActionComplete = () => {}, onTeleportComplete = () => {} }) => {
    const mazeState = gameState as MazeGameState;
    const mazeConfig = gameConfig as MazeConfig;
    const robotRef = useRef<THREE.Group>(null);
    
    if (!mazeState || !mazeConfig) return null;

    return (
      <Canvas
        camera={{ position: [10, 20, 25], fov: 50 }}
        shadows
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#1a0c2b']} />
        <fog attach="fog" args={['#1a0c2b', 20, 50]} />
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 20, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        <CameraRig targetRef={robotRef} mode={cameraMode} />
        
        <Scene 
          gameConfig={mazeConfig} 
          gameState={mazeState} 
          onActionComplete={onActionComplete} 
          robotRef={robotRef}
          onTeleportComplete={onTeleportComplete}
        />
      </Canvas>
    );
};