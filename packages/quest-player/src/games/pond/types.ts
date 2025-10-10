// src/games/pond/types.ts

import type { GameState } from '../../types';

export interface AvatarState {
  id: string;
  name: string;
  x: number;
  y: number;
  damage: number;
  speed: number;
  desiredSpeed: number;
  heading: number; // The direction of movement
  facing: number;  // The direction the cannon/head is facing
  dead: boolean;
  visualizationIndex: number; // Used for color selection
}

export interface MissileState {
  ownerId: string;
  x: number;
  y: number;
  shadowY: number;
  parabola: number;
}

// Events are temporary, single-frame occurrences for visualization
export type PondEvent =
  | { type: 'SCAN'; avatarId: string; degree: number; resolution: number }
  | { type: 'CRASH'; avatarId: string; damage: number; x: number; y: number }
  | { type: 'BOOM'; x: number; y: number; damage: number }
  | { type: 'DIE'; avatarId: string };

/**
 * The specific game state for the Pond game.
 */
export interface PondGameState extends GameState {
  avatars: AvatarState[];
  missiles: MissileState[];
  events: PondEvent[];
  isFinished: boolean;
  ticks: number;
  rank: string[]; // Array of avatar IDs, from winner to loser
  isReset?: boolean;
}