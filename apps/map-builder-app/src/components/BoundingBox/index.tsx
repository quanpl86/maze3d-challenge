import { useMemo } from 'react';
import * as THREE from 'three';
import type { BoxDimensions } from '../../types';

const TILE_SIZE = 2;

// <<< THAY ĐỔI 1: Thêm 'position' vào interface Props
interface BoundingBoxProps {
  dimensions: BoxDimensions;
  position: [number, number, number];
}

export function BoundingBox({ dimensions, position }: BoundingBoxProps) {
  // Sử dụng useMemo để tránh việc tính toán lại geometry trên mỗi lần render
  const geometry = useMemo(() => {
    const { width, height, depth } = dimensions;
    // Tạo một BoxGeometry với kích thước đã nhân với TILE_SIZE
    const boxGeometry = new THREE.BoxGeometry(
      width * TILE_SIZE,
      height * TILE_SIZE,
      depth * TILE_SIZE
    );
    // EdgesGeometry sẽ tạo ra các đường viền cho hình hộp
    return new THREE.EdgesGeometry(boxGeometry);
  }, [dimensions]);

  return (
    // <<< THAY ĐỔI 2: Dùng một <group> để áp dụng vị trí `position`
    // Geometry của hình hộp giờ đây được tạo ra ở gốc tọa độ (0,0,0)
    // và toàn bộ group sẽ được di chuyển đến vị trí mong muốn.
    <group position={position}>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color="#00ffff" />
      </lineSegments>
    </group>
  );
}