// src/games/pond/PondRenderer.tsx

import { useRef, useEffect, useMemo, useState } from 'react';
import type { IGameRenderer } from '../../types';
import type { PondGameState } from './types';
import { AvatarStats } from './AvatarStats';
import './Pond.css';

const CANVAS_SIZE = 400;
const AVATAR_SIZE = 35;
const AVATAR_HALF_SIZE = AVATAR_SIZE / 2;
const MISSILE_RADIUS = 5;
const PARTICLE_MAX_AGE = 5;

const POND_COLOURS = ['#ff8b00', '#c90015', '#166c0b', '#223068'];

const toCanvas = (val: number) => (val / 100) * (CANVAS_SIZE - AVATAR_SIZE) + AVATAR_HALF_SIZE;
const toCanvasNoMargin = (val: number) => (val / 100) * CANVAS_SIZE;

interface Particle {
  x: number;
  y: number;
  color: string;
  age: number;
}

export const PondRenderer: IGameRenderer = ({ gameState, onActionComplete = () => {} }) => {
  const state = gameState as PondGameState;
  const [spritesLoaded, setSpritesLoaded] = useState(false);
  
  const displayRef = useRef<HTMLCanvasElement>(null);
  const scratchRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  // THÊM MỚI: Gọi callback sau mỗi lần render để báo cho game loop tiếp tục
  useEffect(() => {
    onActionComplete();
  }, [gameState, onActionComplete]);

  const sprites = useMemo(() => {
      const img = new Image();
      img.src = '/assets/pond/sprites.png';
      return img;
  }, []);

  useEffect(() => {
    if (sprites.complete) {
      setSpritesLoaded(true);
    } else {
      sprites.onload = () => {
        setSpritesLoaded(true);
      };
    }
  }, [sprites]);

  useEffect(() => {
    if (!state || !spritesLoaded) return;
    if (state.isReset) {
      particlesRef.current = [];
    }

    const displayCtx = displayRef.current?.getContext('2d');
    const scratchCtx = scratchRef.current?.getContext('2d');

    if (!displayCtx || !scratchCtx) return;

    scratchCtx.fillStyle = '#527dbf';
    scratchCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const sortedAvatars = [...state.avatars].sort((a, b) => (a.dead ? -1 : 1) - (b.dead ? -1 : 1));
    for (const avatar of sortedAvatars) {
        const x = toCanvas(avatar.x);
        const y = toCanvas(100 - avatar.y);
        const colorIndex = avatar.visualizationIndex % POND_COLOURS.length;
        const spriteY = colorIndex * AVATAR_SIZE;

        scratchCtx.save();
        scratchCtx.translate(x, y);
        if (avatar.dead) {
            scratchCtx.globalAlpha = 0.25;
        }
        
        if (avatar.speed > 0) {
            let speedSprite = 0;
            if (avatar.speed > 50) speedSprite = 0;
            else if (avatar.speed > 25) speedSprite = AVATAR_SIZE;
            else speedSprite = AVATAR_SIZE * 2;
            scratchCtx.save();
            scratchCtx.rotate(-avatar.heading * Math.PI / 180);
            scratchCtx.drawImage(sprites, AVATAR_SIZE * 13, speedSprite, AVATAR_SIZE, AVATAR_SIZE, 7 - AVATAR_SIZE * 1.5, -AVATAR_HALF_SIZE, AVATAR_SIZE, AVATAR_SIZE);
            scratchCtx.restore();
        }

        scratchCtx.drawImage(sprites, 0, spriteY, AVATAR_SIZE, AVATAR_SIZE, -AVATAR_HALF_SIZE, -AVATAR_HALF_SIZE, AVATAR_SIZE, AVATAR_SIZE);

        const headRadialOffset = 12;
        const headVerticalOffset = 2;
        const radians = avatar.facing * Math.PI / 180;
        const hx = Math.cos(radians) * headRadialOffset;
        const hy = -Math.sin(radians) * headRadialOffset - headVerticalOffset;
        scratchCtx.translate(hx, hy);

        const quad = (14 - Math.round(((avatar.facing + 360) % 360) / 30)) % 12 + 1;
        const quadAngle = 30;
        let remainder = avatar.facing % quadAngle;
        if (remainder >= quadAngle / 2) remainder -= quadAngle;
        
        scratchCtx.rotate(-remainder * Math.PI / 180 / 1.5);
        scratchCtx.drawImage(sprites, quad * AVATAR_SIZE, spriteY, AVATAR_SIZE, AVATAR_SIZE, 2 - AVATAR_HALF_SIZE, 2 - AVATAR_HALF_SIZE, AVATAR_SIZE, AVATAR_SIZE);
        
        scratchCtx.restore();
    }
    
    const newParticles: Particle[] = [];
    for (const particle of particlesRef.current) {
        particle.age++;
        if (particle.age <= PARTICLE_MAX_AGE) {
            newParticles.push(particle);
            scratchCtx.save();
            scratchCtx.globalAlpha = Math.pow(1 - (particle.age / PARTICLE_MAX_AGE), 2);
            scratchCtx.fillStyle = particle.color;
            scratchCtx.beginPath();
            scratchCtx.arc(particle.x, particle.y, MISSILE_RADIUS * (1 - (particle.age / PARTICLE_MAX_AGE)), 0, 2 * Math.PI);
            scratchCtx.fill();
            scratchCtx.restore();
        }
    }
    particlesRef.current = newParticles;

    for (const missile of state.missiles) {
        const x = toCanvas(missile.x);
        const y = toCanvas(100 - missile.y);
        const shadowY = toCanvas(100 - missile.shadowY);
        const owner = state.avatars.find(a => a.id === missile.ownerId);
        const color = owner ? POND_COLOURS[owner.visualizationIndex % POND_COLOURS.length] : '#000';

        scratchCtx.beginPath();
        scratchCtx.arc(x, shadowY, Math.max(0, 1 - missile.parabola / 10) * MISSILE_RADIUS, 0, 2 * Math.PI);
        scratchCtx.fillStyle = `rgba(0, 0, 0, 0.2)`;
        scratchCtx.fill();

        particlesRef.current.push({ x, y, color, age: 0 });
    }
    
    for (const event of state.events) {
        if (event.type === 'BOOM') {
            const x = toCanvasNoMargin(event.x);
            const y = toCanvasNoMargin(100 - event.y);
            scratchCtx.beginPath();
            scratchCtx.arc(x, y, MISSILE_RADIUS * 2, 0, 2 * Math.PI);
            scratchCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            scratchCtx.lineWidth = MISSILE_RADIUS;
            scratchCtx.stroke();
        } else if (event.type === 'SCAN') {
            const avatar = state.avatars.find(a => a.id === event.avatarId);
            if(avatar) {
                const x = toCanvas(avatar.x);
                const y = toCanvas(100 - avatar.y);
                const halfRes = Math.max(event.resolution / 2, 0.5);
                const angle1 = -(event.degree + halfRes) * Math.PI / 180;
                const angle2 = -(event.degree - halfRes) * Math.PI / 180;

                scratchCtx.beginPath();
                scratchCtx.moveTo(x,y);
                const r = 200;
                scratchCtx.arc(x, y, r, angle1, angle2);
                scratchCtx.lineTo(x,y);
                
                const gradient = scratchCtx.createRadialGradient(x, y, AVATAR_HALF_SIZE, x, y, r);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                scratchCtx.fillStyle = gradient;
                scratchCtx.fill();
            }
        }
    }

    displayCtx.drawImage(scratchRef.current!, 0, 0);

  }, [state, spritesLoaded, sprites]);


  return (
    <div className="pondContainer">
      <div className="canvasWrapper">
        <canvas id="displayCanvas" ref={displayRef} width={CANVAS_SIZE} height={CANVAS_SIZE}></canvas>
        <canvas id="scratchCanvas" ref={scratchRef} width={CANVAS_SIZE} height={CANVAS_SIZE}></canvas>
      </div>
      {state && state.avatars && <AvatarStats avatars={state.avatars} />}
    </div>
  );
};