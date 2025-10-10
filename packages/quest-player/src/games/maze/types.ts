// src/games/maze/types.ts

import type { GameState, Block, Collectible, Interactive, Direction } from '../../types';

/**
 * Defines the possible outcomes of a game execution.
 */
export type ResultType = 'unset' | 'success' | 'failure' | 'timeout' | 'error';

/**
 * Represents an entry in the unified world grid for fast physics lookups.
 */
export interface WorldGridCell {
  type: 'block' | 'collectible' | 'portal' | 'switch';
  isSolid: boolean; // True if it blocks movement (e.g., a wall), false otherwise.
  id?: string;
}

/**
 * Defines the state of a single player character.
 * An 'id' is added to uniquely identify each character.
 */
export type PlayerState = {
  id: string; // Unique identifier for the character
  x: number;
  y: number; // Represents height
  z: number; // Represents depth
  direction: Direction;
  pose?: string; // For special animations like victory dance
  
  xPrev?: number;
  yPrev?: number;
  zPrev?: number;

  teleportTarget?: {
    x: number;
    y: number;
    z: number;
    direction: Direction;
  }
};

/**
 * The specific game state for the Maze game.
 */
export interface MazeGameState extends GameState {
  // World definition (mutable)
  blocks: Block[];
  collectibles: Collectible[];
  interactibles: Interactive[];

  // A flattened, fast-lookup map of the world state for physics checks.
  worldGrid: Record<string, WorldGridCell>;

  // Player states
  players: { [id: string]: PlayerState };
  activePlayerId: string;
  
  // Gameplay progress trackers
  collectedIds: string[];
  interactiveStates: { [id: string]: string };

  // Game execution status
  result: ResultType;
  isFinished: boolean;
}