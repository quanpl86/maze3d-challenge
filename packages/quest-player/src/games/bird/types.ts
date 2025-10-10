// src/games/bird/types.ts

import type { GameState } from '../../types';

export interface Coordinate {
  x: number;
  y: number;
}

export interface Line {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  // Phương thức distance sẽ được thêm vào trong engine
  distance: (p: Coordinate) => number;
}

export type ResultType = 'unset' | 'success' | 'failure' | 'timeout' | 'error';

export interface BirdGameState extends GameState {
  x: number;
  y: number;
  angle: number;
  hasWorm: boolean;
  result: ResultType;
  isFinished: boolean;
  highlightedBlockId?: string;
}