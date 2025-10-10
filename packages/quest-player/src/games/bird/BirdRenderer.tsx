// src/games/bird/BirdRenderer.tsx

import { useEffect, useReducer } from 'react';
import type { IGameRenderer, BirdConfig } from '../../types';
import type { BirdGameState } from './types';

const BIRD_ICON_SIZE = 120;
const NEST_ICON_SIZE = 100;
const WORM_ICON_SIZE = 100;
const MAP_SIZE = 400;
const WALL_THICKNESS = 10;
const FLAP_SPEED = 100; // ms per flap frame

// Function to force re-render for flap animation
const forceUpdateReducer = (x: number) => x + 1;

export const BirdRenderer: IGameRenderer = ({ gameState, gameConfig, onActionComplete = () => {} }) => {
  const state = gameState as BirdGameState;
  const config = gameConfig as BirdConfig;

  // Reducer to trigger re-renders for the flap animation
  const [, forceUpdate] = useReducer(forceUpdateReducer, 0);

  useEffect(() => {
    onActionComplete();
  }, [gameState, onActionComplete]);

  useEffect(() => {
    const flapInterval = setInterval(() => {
      forceUpdate();
    }, FLAP_SPEED);
    return () => clearInterval(flapInterval);
  }, []);

  if (!state || !config) return null;

  // --- Bird Display Logic (from displayBird) ---
  const { x, y, angle } = state;
  const currentAngle = angle; // In our step-based view, currentAngle is always the target angle

  const quad = (14 - Math.round(currentAngle / 360 * 12)) % 12;
  const quadAngle = 360 / 12;
  let remainder = currentAngle % quadAngle;
  if (remainder >= quadAngle / 2) {
    remainder -= quadAngle;
  }
  remainder *= -1;

  const flapFrame = Math.round(Date.now() / FLAP_SPEED) % 3;
  const row = flapFrame;

  const birdX = x / 100 * MAP_SIZE - BIRD_ICON_SIZE / 2;
  const birdY = (1 - y / 100) * MAP_SIZE - BIRD_ICON_SIZE / 2;
  
  const birdSpriteX = birdX - quad * BIRD_ICON_SIZE;
  const birdSpriteY = birdY - row * BIRD_ICON_SIZE;
  const birdTransform = `rotate(${remainder}, ${birdX + BIRD_ICON_SIZE / 2}, ${birdY + BIRD_ICON_SIZE / 2})`;

  // --- SVG Coordinates ---
  const nestX = config.nest.x / 100 * MAP_SIZE - NEST_ICON_SIZE / 2;
  const nestY = (1 - config.nest.y / 100) * MAP_SIZE - NEST_ICON_SIZE / 2;
  
  const wormX = config.worm ? config.worm.x / 100 * MAP_SIZE - WORM_ICON_SIZE / 2 : 0;
  const wormY = config.worm ? (1 - config.worm.y / 100) * MAP_SIZE - WORM_ICON_SIZE / 2 : 0;
  
  return (
    <svg id="svgBird" width="400px" height="400px">
      {/* Walls */}
      {config.walls.map((wall, index) => (
        <line
          key={`wall-${index}`}
          x1={wall.x0 / 100 * MAP_SIZE}
          y1={(1 - wall.y0 / 100) * MAP_SIZE}
          x2={wall.x1 / 100 * MAP_SIZE}
          y2={(1 - wall.y1 / 100) * MAP_SIZE}
          stroke="#CCB"
          strokeWidth={WALL_THICKNESS}
          strokeLinecap="round"
        />
      ))}

      {/* Nest */}
      <image
        id="nest"
        href="/assets/bird/nest.png"
        height={NEST_ICON_SIZE}
        width={NEST_ICON_SIZE}
        x={nestX}
        y={nestY}
      />

      {/* Worm */}
      {config.worm && !state.hasWorm && (
        <g id="worm" transform={`translate(${wormX} ${wormY})`}>
          <image
            href="/assets/bird/worm.png"
            height={WORM_ICON_SIZE}
            width={WORM_ICON_SIZE}
          />
        </g>
      )}

      {/* Bird's clipping path */}
      <clipPath id="birdClipPath">
        <rect 
          id="clipRect" 
          height={BIRD_ICON_SIZE} 
          width={BIRD_ICON_SIZE} 
          x={birdX}
          y={birdY}
        />
      </clipPath>

      {/* Bird */}
      <image
        id="bird"
        href="/assets/bird/birds-120.png"
        height={BIRD_ICON_SIZE * 4}
        width={BIRD_ICON_SIZE * 12}
        clipPath="url(#birdClipPath)"
        x={birdSpriteX}
        y={birdSpriteY}
        transform={birdTransform}
      />
      
      {/* Edges */}
      <rect 
        className="edges"
        height={MAP_SIZE}
        width={MAP_SIZE}
        style={{ strokeWidth: 1, stroke: '#BBA', fill: 'none' }}
      />
    </svg>
  );
};