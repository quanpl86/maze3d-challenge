// src/games/maze/Maze3DRenderer.tsx

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
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

// --- [THÊM MỚI] Component quản lý camera ---
const SceneCamera: React.FC<{ blocks: MazeConfig['blocks'] }> = ({ blocks }) => {
  const { camera, scene } = useThree();

  useEffect(() => {
    if (!blocks || blocks.length === 0) {
      camera.position.set(0, 30, 25);
      camera.lookAt(0, 0, 0);
      return;
    }

    const box = new THREE.Box3();
    blocks.forEach(block => {
      box.expandByPoint(new THREE.Vector3(
        block.position.x * TILE_SIZE,
        block.position.y * TILE_SIZE,
        block.position.z * TILE_SIZE
      ));
    });

    const center = new THREE.Vector3();
    box.getCenter(center);

    const size = new THREE.Vector3();
    box.getSize(size);

    // [FIX] Check if the camera is a PerspectiveCamera before accessing 'fov'.
    const fovValue = camera instanceof THREE.PerspectiveCamera ? camera.fov : 60;

    const maxDim = Math.max(size.x, size.z); // Chỉ xét x và z để có góc nhìn tốt hơn
    const fov = fovValue * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 1.5 / Math.tan(fov / 2));
    cameraZ = Math.max(cameraZ, 15); // Đảm bảo camera không quá gần

    // Đặt camera ở một vị trí hợp lý, nhìn về phía trung tâm
    camera.position.set(center.x, center.y + cameraZ * 0.8, center.z + cameraZ);
    
    // Quan trọng: Hướng camera nhìn vào tâm của màn chơi
    camera.lookAt(center);
    
    // Cập nhật ma trận chiếu của camera
    camera.updateProjectionMatrix();

  }, [blocks, camera]);

  return null; // Component này không render gì cả, chỉ để điều khiển camera
};

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
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const robotRef = useRef<THREE.Group>(null);
    const [canvasKey, setCanvasKey] = useState(Date.now());

    if (!mazeState || !mazeConfig) return null;

    // [ĐÃ THÊM] Logic theo dõi và xử lý thay đổi kích thước
    useEffect(() => {
      const container = canvasContainerRef.current;
      if (!container) return;

      const resizeObserver = new ResizeObserver(() => {
        // Thay đổi key của Canvas để buộc nó render lại hoàn toàn với kích thước mới
        setCanvasKey(Date.now());
      });

      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    return (
      <div ref={canvasContainerRef} style={{ width: '100%', height: '100%' }}>
        <Canvas
          key={canvasKey} // Key mới để buộc re-render khi kích thước thay đổi
          shadows
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={['#1a0c2b']} />
          <fog attach="fog" args={['#1a0c2b', 60, 110]} />
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[10, 20, 35]}
            intensity={1.5}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          
          <SceneCamera blocks={mazeConfig.blocks} />
          <CameraRig targetRef={robotRef} mode={cameraMode} />
          
          <Scene 
            gameConfig={mazeConfig} 
            gameState={mazeState} 
            onActionComplete={onActionComplete} 
            robotRef={robotRef}
            onTeleportComplete={onTeleportComplete}
          />
        </Canvas>
      </div>
    );
};