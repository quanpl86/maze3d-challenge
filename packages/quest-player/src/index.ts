// packages/quest-player/src/index.ts

// Main component export
export { QuestPlayer } from './components/QuestPlayer';

// Child components (for library mode usage in apps)
export { Dialog } from './components/Dialog';
export { QuestImporter } from './components/QuestImporter';
export { LanguageSelector } from './components/LanguageSelector';

// Type exports for consumers
export type {
  Quest,
  QuestPlayerSettings,
  QuestCompletionResult,
  GameState, // Exporting GameState as it's part of the result
  SolutionConfig // Exporting SolutionConfig for the same reason
} from './types';

// i18n instance
export { default as i18n } from './i18n';