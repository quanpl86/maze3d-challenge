import { useMemo } from 'react';
import * as THREE from 'three';
import type { BoxDimensions } from '../../types';

const TILE_SIZE = 2;

interface BoundingBoxProps {
  dimensions: BoxDimensions;
}

export function BoundingBox({ dimensions }: BoundingBoxProps) {
  const { scale, position } = useMemo(() => {
    const scaleVec: [number, number, number] = [
      dimensions.width * TILE_SIZE,
      dimensions.height * TILE_SIZE,
      dimensions.depth * TILE_SIZE,
    ];

    const positionVec: [number, number, number] = [
      (dimensions.width / 2) * TILE_SIZE - (TILE_SIZE / 2),
      (dimensions.height / 2) * TILE_SIZE - (TILE_SIZE / 2),
      (dimensions.depth / 2) * TILE_SIZE - (TILE_SIZE / 2),
    ];

    return { scale: scaleVec, position: positionVec };
  }, [dimensions]);

  return (
    <mesh position={position}>
      <boxGeometry args={scale} />
      <meshBasicMaterial color="#00ffff" wireframe />
    </mesh>
  );
}