// packages/quest-player/src/games/GameBlockManager.ts

import type { TFunction } from 'i18next';
// Import tĩnh tất cả các hàm init
import { init as initMaze } from './maze/blocks';
import { init as initBird } from './bird/blocks';
import { init as initTurtle } from './turtle/blocks';
import { init as initPond } from './pond/blocks';

// Tạo một đối tượng tra cứu (lookup object)
const initializers: Record<string, (t: TFunction) => void> = {
  maze: initMaze,
  bird: initBird,
  turtle: initTurtle,
  pond: initPond,
};

// Hàm này không cần `async` nữa
export function initializeGame(gameType: string, t: TFunction): void {
  const initFunc = initializers[gameType];
  if (initFunc) {
    try {
      initFunc(t);
      console.log(`Block definitions for game '${gameType}' have been initialized.`);
    } catch (err) {
      console.error(`Error during block initialization for game '${gameType}':`, err);
      throw err;
    }
  } else {
    const errorMessage = `Module for '${gameType}' does not have a valid 'init' export.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}