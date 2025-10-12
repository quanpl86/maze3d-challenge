// src/games/maze/index.ts

import { MazeEngine } from './MazeEngine';
import { Maze2DRenderer } from './Maze2DRenderer';
import { Maze3DRenderer } from './Maze3DRenderer';
import type { IGameRenderer } from '../../types';

// Export the engine constructor
export const GameEngine = MazeEngine;

export const Renderers: Record<string, IGameRenderer> = {
    '2d': Maze2DRenderer,
    '3d': Maze3DRenderer,
};