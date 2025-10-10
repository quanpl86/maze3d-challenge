// src/types/index.ts

// =================================================================
// ==                      QUEST DEFINITIONS                      ==
// =================================================================

// --- Toolbox Definition Types (to match react-blockly expectations) ---

interface ToolboxBlock {
  kind: 'block';
  type: string;
  inputs?: Record<string, any>;
  fields?: Record<string, any>;
}

interface ToolboxCategory {
  kind: 'category';
  name: string;
  colour?: string;
  contents: ToolboxItem[];
  categorystyle?: string;
}

interface ToolboxSeparator {
  kind: 'sep';
}

export type ToolboxItem = ToolboxBlock | ToolboxCategory | ToolboxSeparator;

export interface ToolboxJSON {
  kind: 'flyoutToolbox' | 'categoryToolbox';
  contents: ToolboxItem[];
}

// --- Main Config Interfaces ---

export interface BlocklyConfig {
  toolbox: ToolboxJSON;
  maxBlocks?: number;
  startBlocks?: string;
}

export type GameConfig = MazeConfig | TurtleConfig | PondConfig | BirdConfig;

export interface MonacoConfig {
  initialCode: string;
}

export interface Quest {
  id: string;
  gameType: 'maze' | 'bird' | 'turtle' | 'movie' | 'music' | 'pond' | 'puzzle';
  level: number;
  titleKey: string;
  descriptionKey: string;
  
  supportedEditors?: ('blockly' | 'monaco')[];

  translations?: Record<string, Record<string, string>>;

  blocklyConfig?: BlocklyConfig;
  monacoConfig?: MonacoConfig;
  
  gameConfig: GameConfig;
  solution: SolutionConfig;
  sounds?: Record<string, string>;
  backgroundMusic?: string;
}

export type ExecutionMode = 'run' | 'debug';

export type CameraMode = 'Follow' | 'TopDown' | 'Free';

// =================================================================
// ==                 GAME-SPECIFIC CONFIGURATIONS                ==
// =================================================================

export type Direction = 0 | 1 | 2 | 3;

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Block {
  modelKey: string;
  position: Position3D;
}

// --- New Interfaces for Maze Game Features ---

export interface Collectible {
  id: string;
  type: 'crystal' | 'key';
  position: Position3D;
}

export interface Switch {
  type: 'switch';
  id: string;
  position: Position3D;
  toggles?: string[];
  initialState: 'on' | 'off';
}

export interface Portal {
  type: 'portal';
  id: string;
  position: Position3D;
  color: 'blue' | 'green' | 'orange' | 'pink';
  targetId: string;
  exitDirection?: Direction;
}

export type Interactive = Switch | Portal;

export interface PlayerConfig {
  id: string;
  start: {
    x: number;
    y: number;
    z?: number;
    direction: Direction;
  };
}

// --- Updated MazeConfig ---

export interface MazeConfig {
  type: 'maze';
  renderer?: '2d' | '3d';
  map?: number[][]; 
  blocks?: Block[];
  
  player?: PlayerConfig;
  players?: PlayerConfig[];
  
  collectibles?: Collectible[];
  interactibles?: Interactive[];

  finish: { x: number, y: number, z?: number };
}


export interface TurtleConfig {
  type: 'turtle';
  player: {
    start: { x: number, y: number } & { direction: number; penDown: boolean };
  };
}

export interface PondAvatarConfig {
  name: string;
  isPlayer: boolean;
  start: { x: number, y: number };
  damage: number;
  code?: string;
}

export interface PondConfig {
  type: 'pond';
  avatars: PondAvatarConfig[];
}

interface Coordinate {
  x: number;
  y: number;
}
interface Line {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
export interface BirdConfig {
  type: 'bird';
  start: Coordinate;
  startAngle: number;
  worm: Coordinate | null;
  nest: Coordinate;
  walls: Line[];
}


// Placeholders for other game configs
// export interface MusicConfig { /* To be defined */ }

// =================================================================
// ==                   SOLUTION CONFIGURATIONS                   ==
// =================================================================

export interface SolutionConfig {
  type: 'reach_target' | 'match_drawing' | 'match_music' | 'survive_battle' | 'destroy_target';
  pixelTolerance?: number;
  solutionBlocks?: string;
  solutionScript?: string;
  optimalBlocks?: number;
  solutionMaxBlocks?: number;
}

// =================================================================
// ==                  ENGINE & RENDERER INTERFACES               ==
// =================================================================

export interface GameState {
  // Common properties can be added here if any.
}

export type StepResult = {
    done: boolean;
    state: GameState;
    highlightedBlockId?: string | null;
} | null;

export interface IGameEngine {
  readonly gameType: string;
  reset?(): void;
  getInitialState(): GameState;
  
  execute(userCode: string): void;

  step?(): StepResult;

  checkWinCondition(finalState: GameState, solutionConfig: SolutionConfig): boolean;
}

export type GameEngineConstructor = new (gameConfig: GameConfig) => IGameEngine;

export type IGameRenderer = React.FC<{
  gameState: GameState;
  gameConfig: GameConfig;
  [key: string]: any;
}>;