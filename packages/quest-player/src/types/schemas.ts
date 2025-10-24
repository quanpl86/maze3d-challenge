// packages/quest-player/src/types/schemas.ts

import { z } from 'zod';
import type { Quest } from './index'; // THÊM MỚI: Import Quest interface

const toolboxJsonSchema = z.object({
  kind: z.enum(['flyoutToolbox', 'categoryToolbox']),
  contents: z.array(z.any()),
});

const blocklyConfigSchema = z.object({
  toolbox: toolboxJsonSchema,
  maxBlocks: z.number().optional(),
  startBlocks: z.string().optional(),
});

const monacoConfigSchema = z.object({
    initialCode: z.string(),
});

// --- Schemas for new Maze features ---

const position3DSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const collectibleSchema = z.object({
  id: z.string(),
  type: z.enum(['crystal', 'key']),
  position: position3DSchema,
});

const switchSchema = z.object({
  type: z.literal('switch'),
  id: z.string(),
  position: position3DSchema,
  toggles: z.array(z.string()).optional(),
  initialState: z.enum(['on', 'off']).default('off'),
});

const portalSchema = z.object({
  type: z.literal('portal'),
  id: z.string(),
  position: position3DSchema,
  color: z.enum(['blue', 'green', 'orange', 'pink']),
  targetId: z.string(),
  exitDirection: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

const interactiveSchema = z.discriminatedUnion('type', [
  switchSchema,
  portalSchema,
]);

const playerConfigSchema = z.object({
  id: z.string(),
  start: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number().optional(),
    direction: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  }),
});


// --- Game-specific Config Schemas ---

const blockSchema = z.object({
  modelKey: z.string(),
  position: position3DSchema,
});

const mazeConfigSchema = z.object({
  type: z.literal('maze'),
  renderer: z.enum(['2d', '3d']).optional(),
  map: z.array(z.array(z.number())).optional(),
  blocks: z.array(blockSchema).optional(),
  
  player: playerConfigSchema.optional(),
  players: z.array(playerConfigSchema).optional(),
  
  collectibles: z.array(collectibleSchema).optional(),
  interactibles: z.array(interactiveSchema).optional(),

  finish: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number().optional(),
  }),
}).superRefine((data, ctx) => {
  if (!data.map && !data.blocks) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Maze config must have either 'map' or 'blocks'" });
  }
  if (data.map && data.blocks) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Maze config cannot have both 'map' and 'blocks'" });
  }
  if (!data.player && !data.players) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Maze config must have either 'player' or 'players' defined" });
  }
  if (data.player && data.players) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Maze config cannot have both 'player' and 'players' defined" });
  }
});

const turtleConfigSchema = z.object({
  type: z.literal('turtle'),
  player: z.object({
    start: z.object({
      x: z.number(),
      y: z.number(),
      direction: z.number(),
      penDown: z.boolean(),
    }),
  }),
});

const pondAvatarConfigSchema = z.object({
    name: z.string(),
    isPlayer: z.boolean(),
    start: z.object({ x: z.number(), y: z.number() }),
    damage: z.number(),
    code: z.string().optional(),
});

const pondConfigSchema = z.object({
    type: z.literal('pond'),
    avatars: z.array(pondAvatarConfigSchema),
});

const coordinateSchema = z.object({ x: z.number(), y: z.number() });
const lineSchema = z.object({ x0: z.number(), y0: z.number(), x1: z.number(), y1: z.number() });
const birdConfigSchema = z.object({
  type: z.literal('bird'),
  start: coordinateSchema,
  startAngle: z.number(),
  worm: coordinateSchema.nullable(),
  nest: coordinateSchema,
  walls: z.array(lineSchema),
});

const gameConfigSchema = z.discriminatedUnion('type', [
  mazeConfigSchema,
  turtleConfigSchema,
  pondConfigSchema,
  birdConfigSchema,
]);

const solutionConfigSchema = z.object({
  type: z.enum(['reach_target', 'match_drawing', 'match_music', 'survive_battle', 'destroy_target']),
  itemGoals: z.record(z.string(), z.number()).optional(),
  pixelTolerance: z.number().optional(),
  solutionBlocks: z.string().optional(),
  solutionScript: z.string().optional(),
  optimalBlocks: z.number().optional(),
  optimalLines: z.number().optional(),
  solutionMaxBlocks: z.number().optional(),
});

// THAY ĐỔI: Thêm kiểu tường minh z.ZodType<Quest>
export const questSchema: z.ZodType<Quest> = z.object({
  id: z.string(),
  gameType: z.enum(['maze', 'bird', 'turtle', 'movie', 'music', 'pond', 'puzzle']),
  level: z.number(),
  titleKey: z.string(),
  questTitleKey: z.string(),
  title: z.string().optional(), // Trường title mới
  descriptionKey: z.string(),
  
  supportedEditors: z.array(z.enum(['blockly', 'monaco'])).default(['blockly']),

  translations: z.record(z.string(), z.record(z.string(), z.string())).optional(),

  blocklyConfig: blocklyConfigSchema.optional(),
  monacoConfig: monacoConfigSchema.optional(),

  gameConfig: gameConfigSchema,
  solution: solutionConfigSchema,
  sounds: z.record(z.string(), z.string()).optional(),
  backgroundMusic: z.string().optional(),
});