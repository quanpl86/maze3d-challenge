// packages/quest-player/src/games/index.ts

import * as BirdGame from './bird';
import * as MazeGame from './maze';
import * as PondGame from './pond';
import * as TurtleGame from './turtle';

import type { GameEngineConstructor, IGameRenderer } from '../types';

interface GameModule {
    GameEngine: GameEngineConstructor;
    GameRenderer?: IGameRenderer;
    Renderers?: Record<string, IGameRenderer>; // For games with multiple renderers like Maze
}

export const gameRegistry: Record<string, GameModule> = {
    bird: BirdGame,
    maze: MazeGame,
    pond: PondGame,
    turtle: TurtleGame,
};