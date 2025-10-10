// src/games/maze/components/Collectible.tsx

import React, { useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { GameAssets } from '../config/gameAssets';

type CollectibleType = 'crystal' | 'key';

interface CollectibleProps {
  position: [number, number, number];
  collectibleType: CollectibleType;
}

const TILE_SIZE = 2;
const ASSET_SCALE = TILE_SIZE * 0.8; // Scale asset to be smaller than a tile

export const Collectible: React.FC<CollectibleProps> = ({ position, collectibleType }) => {
  const ref = useRef<THREE.Group>(null!);
  
  const assetPath = GameAssets.world.misc[collectibleType];
  
  if (!assetPath) {
    console.warn(`Asset path not found for collectibleType: ${collectibleType}`);
    return null;
  }
  
  const { nodes } = useGLTF(assetPath, true);

  const geometry = Object.values(nodes).find(n => n instanceof THREE.Mesh)?.geometry;

  useFrame((state) => {
    if (ref.current) {
      const time = state.clock.getElapsedTime();
      ref.current.rotation.y = time * 0.7;
      ref.current.position.y = position[1] + 0.5 + Math.sin(time * 2) * 0.15;
    }
  });

  return (
    <group ref={ref} position={position} scale={ASSET_SCALE}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color="#00ffff"
          metalness={0.1}
          roughness={0}
          transmission={1.0}
          thickness={1.0}
          ior={1.7}
          emissive="#00ffff"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
};

// Preload assets for better performance
Object.values(GameAssets.world.misc).forEach(path => useGLTF.preload(path));