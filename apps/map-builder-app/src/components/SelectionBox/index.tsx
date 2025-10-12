import { useMemo } from 'react';
import * as THREE from 'three';
import { SelectionBounds } from '../../types';

const TILE_SIZE = 2;

interface SelectionBoxProps {
  bounds: SelectionBounds;
}

export function SelectionBox({ bounds }: SelectionBoxProps) {
  const { position, size } = useMemo(() => {
    const { min, max } = bounds;
    
    const size: [number, number, number] = [
      (max[0] - min[0] + 1) * TILE_SIZE,
      (max[1] - min[1] + 1) * TILE_SIZE,
      (max[2] - min[2] + 1) * TILE_SIZE,
    ];

    const position: [number, number, number] = [
      min[0] * TILE_SIZE + size[0] / 2,
      min[1] * TILE_SIZE + size[1] / 2,
      min[2] * TILE_SIZE + size[2] / 2,
    ];

    return { position, size };
  }, [bounds]);

  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial color="#00aaff" transparent opacity={0.3} depthWrite={false} />
    </mesh>
  );
}