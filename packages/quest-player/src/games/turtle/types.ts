// src/games/turtle/types.ts

import type { GameState } from '../../types';

/**
 * Defines a single drawing command.
 * The renderer will use a list of these commands to reconstruct the drawing on the scratch canvas.
 */
export type DrawingCommand =
  | { command: 'moveTo'; x: number; y: number }
  | { command: 'lineTo'; x: number; y: number }
  | { command: 'penWidth'; width: number }
  | { command: 'penColour'; colour: string }
  | { command: 'stroke' };

/**
 * Defines the state of the turtle character itself.
 */
export interface TurtleCharacterState {
  x: number;
  y: number;
  heading: number;
  penDown: boolean;
  visible: boolean;
}

/**
 * The specific game state for the Turtle game.
 */
export interface TurtleGameState extends GameState {
  // The current state of the turtle character.
  turtle: TurtleCharacterState;

  // The log of drawing commands executed so far.
  // The renderer will use this to draw on the scratch canvas.
  commands: DrawingCommand[];

  // The block ID currently being executed, for highlighting.
  highlightedBlockId: string | null;

  // Final result of the execution.
  result: 'unset' | 'success' | 'failure' | 'timeout' | 'error';
  isFinished: boolean;
}