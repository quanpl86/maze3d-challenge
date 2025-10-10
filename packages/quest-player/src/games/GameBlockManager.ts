// src/games/GameBlockManager.ts

/**
 * A map to store the initialization promise for each game type.
 * This prevents race conditions caused by multiple concurrent initialization attempts,
 * especially during React 18's Strict Mode double-invoking useEffect.
 *
 * The key is the gameType (e.g., 'maze'), and the value is the Promise
 * that resolves when that game's blocks are initialized.
 */
const initializationPromises = new Map<string, Promise<void>>();

/**
 * Dynamically imports and initializes the Blockly blocks for a given game type.
 * Ensures that the initialization logic for each game type is only run once,
 * even if called multiple times concurrently.
 *
 * @param gameType The type of the game to initialize (e.g., 'maze').
 * @returns A promise that resolves when initialization is complete.
 */
export function initializeGame(gameType: string): Promise<void> {
  // If an initialization promise already exists for this game, return it.
  if (initializationPromises.has(gameType)) {
    console.log(`Initialization for '${gameType}' is already in progress or complete.`);
    return initializationPromises.get(gameType)!;
  }

  // Otherwise, start a new initialization process and store its promise.
  const promise = (async () => {
    try {
      const blockModule = await import(`./${gameType}/blocks.ts`);
      if (blockModule.init) {
        blockModule.init(); // This registers the blocks with Blockly
        console.log(`Blocks for game '${gameType}' registered successfully.`);
      } else {
        throw new Error(`Module for '${gameType}' does not have an 'init' export.`);
      }
    } catch (err) {
      console.error(`Failed to initialize game module for '${gameType}':`, err);
      // If initialization fails, remove the promise from the map so we can retry.
      initializationPromises.delete(gameType);
      // Re-throw the error so the calling component can handle it.
      throw err;
    }
  })();

  initializationPromises.set(gameType, promise);
  return promise;
}