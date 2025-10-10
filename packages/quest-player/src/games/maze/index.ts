// src/games/maze/index.ts

import { MazeEngine } from './MazeEngine';
import { Maze2DRenderer } from './Maze2DRenderer';
import { Maze3DRenderer } from './Maze3DRenderer';

// Export the engine constructor
export const GameEngine = MazeEngine;

// Export both renderers
export const Renderers = {
    '2d': Maze2DRenderer,
    '3d': Maze3DRenderer,
};