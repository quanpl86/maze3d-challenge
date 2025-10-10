// src/games/maze/components/Block.tsx

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { GameAssets } from '../config/gameAssets';

interface BlockProps {
  modelKey: string;
  position: [number, number, number];
}

const TILE_SIZE = 2;

const Block: React.FC<BlockProps> = ({ modelKey, position }) => {
  const modelKeyParts = modelKey.split('.');
  const modelCategory = modelKeyParts[0] as keyof typeof GameAssets.world;
  const modelName = modelKeyParts[1] as keyof typeof GameAssets.world[typeof modelCategory];
  // @ts-ignore
  const path = GameAssets.world[modelCategory]?.[modelName];

  if (!path) {
    console.warn(`Path not found for modelKey: ${modelKey}`);
    return null;
  }

  const { scene } = useGLTF(path, true);
  const clonedScene = useMemo(() => (scene as THREE.Group).clone(), [scene]);

  useEffect(() => {
    clonedScene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [clonedScene]);

  return (
    <primitive
      object={clonedScene}
      position={position}
      scale={TILE_SIZE}
      // SỬA LỖI: Xóa bỏ dòng ghi đè tọa độ Y.
      // `position` đã chứa tọa độ Y chính xác từ component cha.
      // position-y={TILE_SIZE / 2} 
    />
  );
};

export default React.memo(Block);