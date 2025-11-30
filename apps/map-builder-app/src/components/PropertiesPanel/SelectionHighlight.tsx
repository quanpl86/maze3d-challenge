import { useRef }from 'react';
import { useFrame } from '@react-three/fiber';
import { Outlines } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Component để hiển thị hiệu ứng viền xoay và phát sáng cho đối tượng được chọn.
 */
export const SelectionHighlight = () => {
  const groupRef = useRef<THREE.Group>(null);

  // Sử dụng useFrame để tạo hiệu ứng animation trên mỗi frame
  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Xoay chậm group chứa hiệu ứng viền theo trục Y
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.75;
    }
  });

  return (
    // Group này sẽ chứa các hiệu ứng và được xoay
    <group ref={groupRef}>
      {/* 
        Sử dụng Outlines của Drei để tạo hiệu ứng viền.
        Màu cam và độ dày được điều chỉnh để tạo cảm giác "phát sáng".
      */}
      <Outlines thickness={0.06} color="#ff9900" />
    </group>
  );
};