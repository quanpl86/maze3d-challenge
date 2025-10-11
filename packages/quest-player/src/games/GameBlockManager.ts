// packages/quest-player/src/games/GameBlockManager.ts
import type { TFunction } from 'i18next'; // Import TFunction

export async function initializeGame(gameType: string, t: TFunction): Promise<void> { // Thêm đối số t
  try {
    const blockModule = await import(`./${gameType}/blocks.ts`);
    if (blockModule && typeof blockModule.init === 'function') {
      // Truyền hàm t vào hàm init của game
      blockModule.init(t); 
      console.log(`Block definitions for game '${gameType}' have been initialized.`);
    } else {
      throw new Error(`Module for '${gameType}' does not have a valid 'init' export.`);
    }
  } catch (err) {
    console.error(`Failed to initialize block definitions for game '${gameType}':`, err);
    throw err;
  }
}