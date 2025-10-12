// src/games/maze/Maze2DRenderer.tsx

import React, { useMemo, useEffect } from 'react';
import type { IGameRenderer, MazeConfig, Block, PlayerConfig } from '../../types';
import type { MazeGameState, Direction } from './types';
import './Maze.css';

const SQUARE_SIZE = 50;
const PEGMAN_WIDTH = 49;
const PEGMAN_HEIGHT = 52;
const FINISH_MARKER_WIDTH = 20;
const FINISH_MARKER_HEIGHT = 34;
const SquareType = { WALL: 0, OPEN: 1, START: 2, FINISH: 3 };

const DIRECTION_TO_FRAME_MAP: Record<Direction, number> = {
  0: 8, 1: 4, 2: 0, 3: 12,
};

const POSE_TO_FRAME_MAP: Record<string, number> = {
  'victory1': 16,
  'victory2': 18,
};

const TILE_SHAPES: Record<string, [number, number]> = {
  '10010': [4, 0],  '10001': [3, 3],  '11000': [0, 1],  '10100': [0, 2],
  '11010': [4, 1],  '10101': [3, 2],  '10110': [0, 0],  '10011': [2, 0],
  '11001': [4, 2],  '11100': [2, 3],  '11110': [1, 1],  '10111': [1, 0],
  '11011': [2, 1],  '11101': [1, 2],  '11111': [2, 2],  'null0': [4, 3],
  'null1': [3, 0],  'null2': [3, 1],  'null3': [0, 3],  'null4': [1, 3],
};

const getTileStyle = (mapData: number[][], x: number, y: number): React.CSSProperties => {
  const COLS = mapData[0]?.length || 0;
  const ROWS = mapData.length;

  const normalize = (nx: number, ny: number) => {
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return '0';
    return (mapData[ny][nx] === SquareType.WALL) ? '0' : '1';
  };

  let tileShape = normalize(x, y) +
    normalize(x, y - 1) + normalize(x + 1, y) +
    normalize(x, y + 1) + normalize(x - 1, y);

  if (!TILE_SHAPES[tileShape]) {
    tileShape = 'null' + Math.floor(1 + Math.random() * 4);
  }
  const [left, top] = TILE_SHAPES[tileShape];
  
  return { left: `-${left * SQUARE_SIZE}px`, top: `-${top * SQUARE_SIZE}px` };
};

const blocksToMap = (blocks: Block[], startPlayer: PlayerConfig, finish: {x: number, z?: number}): number[][] => {
  let maxX = 0;
  let maxZ = 0;
  for (const block of blocks) {
    maxX = Math.max(maxX, block.position.x);
    maxZ = Math.max(maxZ, block.position.z);
  }

  const map: number[][] = Array(maxZ + 1).fill(0).map(() => Array(maxX + 1).fill(SquareType.OPEN));
  
  for (const block of blocks) {
    if (block.position.y === 0) {
      if (block.modelKey.includes('wall')) {
        map[block.position.z][block.position.x] = SquareType.WALL;
      }
    }
  }
  
  const startZ = startPlayer.start.z ?? startPlayer.start.y;
  if (startZ !== undefined) map[startZ][startPlayer.start.x] = SquareType.START;

  const finishZ = finish.z;
  if (finishZ !== undefined) map[finishZ][finish.x] = SquareType.FINISH;

  return map;
};


const MazeMap = React.memo(({ mapData }: { mapData: number[][] }) => {
  return (
    <>
      {mapData.map((row, y) =>
        row.map((_, x) => (
          <div
            key={`${x}-${y}`}
            className="mapCell"
            style={{ left: `${x * SQUARE_SIZE}px`, top: `${y * SQUARE_SIZE}px` }}
          >
            <div className="tileImage" style={getTileStyle(mapData, x, y)} />
          </div>
        ))
      )}
    </>
  );
});

export const Maze2DRenderer: IGameRenderer = ({ gameState, gameConfig, onActionComplete = () => {} }) => {
  const state = gameState as MazeGameState;
  const config = gameConfig as MazeConfig;

  useEffect(() => {
    onActionComplete();
  }, [gameState, onActionComplete]);

  const mapData = useMemo(() => {
    if (config.map) {
      return config.map;
    }
    if (config.blocks) {
      const startPlayer = config.players ? config.players[0] : config.player;
      if (!startPlayer) return []; // Return empty if no player config found

      const finishPos2D = { x: config.finish.x, z: config.finish.z ?? config.finish.y };
      return blocksToMap(config.blocks, startPlayer, finishPos2D);
    }
    return [];
  }, [config]);

  if (!state || !config || mapData.length === 0 || !state.players[state.activePlayerId]) return null;
  
  const activePlayer = state.players[state.activePlayerId];
  let frame: number;

  if (activePlayer.pose && POSE_TO_FRAME_MAP[activePlayer.pose] !== undefined) {
    frame = POSE_TO_FRAME_MAP[activePlayer.pose];
  } else {
    // Ensure direction is a valid key before accessing the map
    const dir = activePlayer.direction;
    frame = dir in DIRECTION_TO_FRAME_MAP ? DIRECTION_TO_FRAME_MAP[dir] : 0;
  }

  const pegmanX = activePlayer.x;
  const pegmanY = activePlayer.z;

  const pegmanStyle: React.CSSProperties = {
    left: `${pegmanX * SQUARE_SIZE + (SQUARE_SIZE - PEGMAN_WIDTH) / 2}px`,
    top: `${pegmanY * SQUARE_SIZE + (SQUARE_SIZE - PEGMAN_HEIGHT) / 2 - 10}px`,
    backgroundPosition: `-${frame * PEGMAN_WIDTH}px 0`,
  };
  
  const finishStyle: React.CSSProperties = {
    left: `${config.finish.x * SQUARE_SIZE + (SQUARE_SIZE - FINISH_MARKER_WIDTH) / 2}px`,
    top: `${(config.finish.z ?? config.finish.y) * SQUARE_SIZE + (SQUARE_SIZE - FINISH_MARKER_HEIGHT) / 2 - 15}px`,
  };

  return (
    <div className="mazeContainer">
      <div className="mazeMap">
        <MazeMap mapData={mapData} />
      </div>
      <img src="/assets/maze/marker.png" className="finishMarker" style={finishStyle} alt="Finish" />
      <div className="pegman" style={pegmanStyle} />
    </div>
  );
};