// packages/quest-player/src/index.ts

// Main component export
export { QuestPlayer } from './components/QuestPlayer';
export type { QuestPlayerProps } from './components/QuestPlayer';

// Child components (for library mode usage in apps)
export { Dialog } from './components/Dialog';
export { QuestImporter } from './components/QuestImporter';
export { LanguageSelector } from './components/LanguageSelector';

// Type exports for consumers
export type {
  Quest,
  QuestPlayerSettings,
  QuestCompletionResult,
  GameState,
  SolutionConfig
} from './types';

// NEW: Export the schema for external validation
export { questSchema } from './types/schemas';
export { GameAssets } from './games/maze/config/gameAssets';
