// src/games/maze/components/CameraRig.tsx

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { gsap } from 'gsap';
import type { CameraMode } from '../../../types';

const FOLLOW_LERP_FACTOR = 0.08;
const TRANSITION_DURATION = 0.75;

interface CameraRigProps {
  targetRef: React.RefObject<THREE.Group>;
  mode: CameraMode;
}

export const CameraRig: React.FC<CameraRigProps> = ({ targetRef, mode }) => {
  const { camera } = useThree();
  const orbitControlsRef = useRef<any>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  // useEffect để cấu hình controls khi mode thay đổi
  useEffect(() => {
    const controls = orbitControlsRef.current;
    if (!controls) return;

    // Hủy các tween cũ để tránh xung đột
    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(controls.target);

    // Lấy vị trí robot để làm cơ sở cho các tween chuyển cảnh
    const robotPosition = targetRef.current?.position || new THREE.Vector3(0, 0, 0);
    const lookAtTarget = new THREE.Vector3(robotPosition.x, robotPosition.y, robotPosition.z);

    switch (mode) {
      case 'Follow':
        controls.enabled = false;
        break;

      case 'TopDown':
        controls.enabled = true;
        controls.enablePan = true;
        controls.enableRotate = false;
        controls.enableZoom = true;

        // Tween camera đến vị trí nhìn từ trên xuống
        gsap.to(camera.position, {
          duration: TRANSITION_DURATION,
          x: robotPosition.x,
          y: robotPosition.y + 26,
          z: robotPosition.z + 0.01,
          ease: 'power2.inOut',
        });
        // Tween target của controls để nhìn vào robot
        gsap.to(controls.target, {
          duration: TRANSITION_DURATION,
          ...lookAtTarget,
          ease: 'power2.inOut',
        });
        break;

      case 'Free':
        controls.enabled = true;
        controls.enablePan = true;
        controls.enableRotate = true;
        controls.enableZoom = true;
        break;
    }
  }, [mode, targetRef, camera]);

  // useEffect để theo dõi sự tương tác của người dùng
  useEffect(() => {
    const controls = orbitControlsRef.current;
    if (!controls) return;

    const onStart = () => setIsInteracting(true);
    const onEnd = () => setIsInteracting(false);

    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);

    return () => {
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
    };
  }, []);

  // useFrame để cập nhật camera mỗi frame
  useFrame(() => {
    const controls = orbitControlsRef.current;
    if (!controls || !targetRef.current) return;

    const robotPosition = targetRef.current.position;
    const lookAtTarget = robotPosition.clone();

    if (mode === 'Follow') {
      const robotQuaternion = targetRef.current.quaternion;
      
      // Thống nhất offset ở đây
      const offset = new THREE.Vector3(-4, 10, -14); 
      offset.applyQuaternion(robotQuaternion);
      const cameraTargetPosition = robotPosition.clone().add(offset);

      // Cập nhật cả vị trí camera và điểm nhìn
      camera.position.lerp(cameraTargetPosition, FOLLOW_LERP_FACTOR);
      controls.target.lerp(lookAtTarget, FOLLOW_LERP_FACTOR);

    } else if (mode === 'TopDown' && !isInteracting) {
      // Ở chế độ TopDown, chỉ di chuyển điểm nhìn theo robot
      controls.target.lerp(lookAtTarget, FOLLOW_LERP_FACTOR);
    }
    
    // Luôn gọi update() để OrbitControls áp dụng các thay đổi
    controls.update();
  });

  return (
    <OrbitControls
      ref={orbitControlsRef}
      enableDamping={true}
      dampingFactor={0.05}
      screenSpacePanning={false}
      minDistance={2}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  );
};