import React, { useEffect, forwardRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { gsap } from 'gsap';
import type { Direction } from '../../../types';

const ROBOT_MODEL_PATH = '/assets/maze/models/draco-robot.glb';

const ANIMATION_MAP: { [key: string]: string } = {
  Idle: 'Idle',
  Walking: 'Walking',
  Victory: 'Wave',
  Jumping: 'Jump',
  TurningLeft: 'Idle',
  TurningRight: 'Idle',
  // Map các pose tương tác vào một hoạt ảnh có sẵn
  Collecting: 'Wave',
  Toggling: 'Wave',
};

// Hoạt ảnh "chơi một lần"
const ONE_SHOT_ANIMATIONS = ['Victory', 'Jumping', 'Collecting', 'Toggling'];
// Hoạt ảnh CÓ chuyển động. Dùng để loại trừ việc gọi onTweenComplete từ mixer
const MOVEMENT_ONLY_ANIMATIONS = ['Jumping', 'Walking'];

const DIRECTION_TO_ROTATION: Record<Direction, number> = {
  0: Math.PI,
  1: Math.PI / 2,
  2: 0,
  3: -Math.PI / 2,
};

interface RobotCharacterProps {
  position: THREE.Vector3;
  direction: Direction;
  animationName: string;
  onTweenComplete: () => void;
  onTeleportOutComplete?: () => void;
}

const TILE_SIZE = 2;
const BUMP_DISTANCE = TILE_SIZE * 0.15;
const TURN_DURATION = 0.3;
const BUMP_DURATION = 0.15;
const TELEPORT_DURATION = 0.5;

export const RobotCharacter = forwardRef<THREE.Group, RobotCharacterProps>(
  ({ position, direction, animationName, onTweenComplete, onTeleportOutComplete }, ref) => {
    const groupRef = ref as React.RefObject<THREE.Group>;

    const { scene, animations } = useGLTF(ROBOT_MODEL_PATH);
    const { actions, mixer } = useAnimations(animations, groupRef);

    const tweenDuration = 0.8;

    // Flag để tránh double call onTweenComplete
    const isCompleting = React.useRef(false);

    // useEffect để quản lý VIỆC CHƠI hoạt ảnh
    useEffect(() => {
      const targetAnimationName = ANIMATION_MAP[animationName] || ANIMATION_MAP.Idle;
      const newAction = actions[targetAnimationName];
      if (!newAction) return;
      
      const activeAction = Object.values(actions).find(a => a && a.isRunning());
      if (newAction === activeAction) return;

      if (activeAction) activeAction.fadeOut(0.2);

      if (animationName === 'Walking') {
        const clipDuration = newAction.getClip().duration;
        newAction.timeScale = clipDuration / tweenDuration;
      } else {
        newAction.timeScale = 1;
      }

      const isMovementOnly = MOVEMENT_ONLY_ANIMATIONS.includes(animationName);

      // Chỉ gọi onTweenComplete từ mixer cho các hoạt ảnh one-shot KHÔNG có chuyển động
      if (ONE_SHOT_ANIMATIONS.includes(animationName) && !isMovementOnly) {
          newAction.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.2).play();
          newAction.clampWhenFinished = true;
          const onFinished = (event: any) => {
              if (event.action === newAction) {
                  mixer.removeEventListener('finished', onFinished);
                  if (!isCompleting.current) {
                    isCompleting.current = true;
                    console.log(`%c[RobotCharacter] Calling onTweenComplete() from One-Shot Animation '${animationName}' FINISHED.`, 'color: #e74c3c; font-weight: bold;');
                    onTweenComplete();
                  }
              }
          };
          mixer.addEventListener('finished', onFinished);
      } else {
          newAction.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.2).play();
      }
    }, [animationName, actions, mixer, onTweenComplete]);

    // useEffect để quản lý CHUYỂN ĐỘNG và các HÀNH ĐỘNG CÓ THỜI GIAN (tweens)
    useEffect(() => {
      const group = groupRef.current;
      if (!group) return;

      console.group(`%c[RobotCharacter] useEffect Triggered`, 'color: #9b59b6; font-weight: bold;');
      console.log('Received props:', { animationName, targetPosition: { x: position.x, y: position.y, z: position.z } });
      console.log('Current visual position:', { x: group.position.x, y: group.position.y, z: group.position.z });

      gsap.killTweensOf(group.position);
      gsap.killTweensOf(group.scale);
      group.scale.set(1, 1, 1);
      isCompleting.current = false; // Reset flag mỗi khi useEffect trigger

      const isMoveAnimation = ['Walking', 'Jumping'].includes(animationName);
      const isTurnAnimation = ['TurningLeft', 'TurningRight'].includes(animationName);
      const isInteractionAnimation = ['Collecting', 'Toggling'].includes(animationName);

      if (animationName === 'Bump') {
        console.log('-> Executing LOGIC BRANCH: Bump');
        const bumpOffset = new THREE.Vector3(0, 0, BUMP_DISTANCE).applyQuaternion(group.quaternion);
        const bumpPosition = new THREE.Vector3().copy(group.position).add(bumpOffset);
        gsap.to(group.position, {
          x: bumpPosition.x, y: bumpPosition.y, z: bumpPosition.z,
          duration: BUMP_DURATION, ease: 'power2.out', yoyo: true, repeat: 1,
          onComplete: () => {
            console.log('%c[RobotCharacter] Calling onTweenComplete() from Bump.', 'color: #e74c3c; font-weight: bold;');
            onTweenComplete();
          }
        });
        console.groupEnd();
        return;
      }
      
      if (animationName === 'TeleportOut') {
        console.log('-> Executing LOGIC BRANCH: TeleportOut');
        gsap.to(group.scale, {
          x: 0.01, y: 0.01, z: 0.01,
          duration: TELEPORT_DURATION, ease: 'power2.in',
          onComplete: () => {
            console.log('%c[RobotCharacter] Calling onTeleportOutComplete().', 'color: #e74c3c; font-weight: bold;');
            if (onTeleportOutComplete) onTeleportOutComplete();
          }
        });
        console.groupEnd();
        return;
      }

      if (animationName === 'TeleportIn') {
        console.log('-> Executing LOGIC BRANCH: TeleportIn');
        group.position.copy(position);
        group.scale.set(0.01, 0.01, 0.01);
        gsap.to(group.scale, {
          x: 1, y: 1, z: 1,
          duration: TELEPORT_DURATION, ease: 'power2.out',
          onComplete: () => {
            console.log('%c[RobotCharacter] Calling onTweenComplete() from TeleportIn.', 'color: #e74c3c; font-weight: bold;');
            onTweenComplete();
          }
        });
        console.groupEnd();
        return;
      }

      if (isTurnAnimation) {
        console.log('-> Executing LOGIC BRANCH: Turning');
        gsap.to({}, { 
          duration: TURN_DURATION,
          onComplete: () => {
            console.log('%c[RobotCharacter] Calling onTweenComplete() from Turn.', 'color: #e74c3c; font-weight: bold;');
            onTweenComplete();
          }
        });
        console.groupEnd();
        return;
      }
      
      if (isInteractionAnimation) {
        console.log('-> Executing LOGIC BRANCH: Interaction');
        // Không cần làm gì ở đây. `useEffect` đầu tiên đã xử lý việc
        // chơi animation một lần và gọi onTweenComplete khi nó kết thúc.
        console.groupEnd();
        return;
      }

      if (isMoveAnimation) {
        console.log('-> Executing LOGIC BRANCH: Movement');
        const startY = group.position.y;
        const targetY = position.y;
        gsap.to(group.position, {
          x: position.x, y: targetY, z: position.z,
          duration: tweenDuration, ease: 'linear',
          onUpdate: function() {
            const progress = this.progress();
            const baseY = startY + progress * (targetY - startY);
            if (animationName === 'Jumping') {
              group.position.y = baseY + Math.sin(progress * Math.PI) * (TILE_SIZE / 2);
            } else {
              group.position.y = baseY;
            }
          },
          onComplete: () => {
            // Đây là nguồn chân lý DUY NHẤT để hoàn thành một hành động di chuyển
            if (!isCompleting.current) {
              isCompleting.current = true;
              console.log(`%c[RobotCharacter] Calling onTweenComplete() from Movement '${animationName}'.`, 'color: #e74c3c; font-weight: bold;');
              onTweenComplete();
            }
          }
        });
        console.groupEnd();
        return;
      }
      
      console.log('-> Executing LOGIC BRANCH: Static Pose');
      group.position.copy(position);
      console.groupEnd();
      
    }, [position, animationName, onTweenComplete, onTeleportOutComplete, groupRef]);

    useFrame((_, delta) => {
      const group = groupRef.current;
      if (!group) return;
      const targetQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, DIRECTION_TO_ROTATION[direction], 0));
      if (!group.quaternion.equals(targetQuaternion)) {
        group.quaternion.slerp(targetQuaternion, delta * 10);
      }
    });
    
    useEffect(() => {
      scene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }, [scene]);

    return (
      <group ref={groupRef} dispose={null} scale={1}>
        <primitive 
          object={scene} 
          scale={TILE_SIZE/2*0.68}
        />
      </group>
    );
  }
);

useGLTF.preload(ROBOT_MODEL_PATH);