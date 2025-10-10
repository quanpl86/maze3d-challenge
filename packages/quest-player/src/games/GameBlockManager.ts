// src/games/GameBlockManager.ts

/**
 * Dynamically imports the block definition module for a given game type
 * and calls its `init()` function to register the blocks with Blockly.
 *
 * The `init()` functions are designed to be idempotent (safe to call multiple times),
 * which makes this process robust against React's Strict Mode re-renders.
 *
 * @param gameType The type of the game to initialize (e.g., 'maze').
 * @returns A promise that resolves when the block definitions have been registered.
 */
export async function initializeGame(gameType: string): Promise<void> {
  try {
    // Dynamically import the module containing the `init` function.
    const blockModule = await import(`./${gameType}/blocks.ts`);

    // Check if the module has the expected init function.
    if (blockModule && typeof blockModule.init === 'function') {
      // Call the init function to register the blocks.
      // This is safe to call multiple times due to idempotency checks inside each init function.
      blockModule.init();
      console.log(`Block definitions for game '${gameType}' have been initialized.`);
    } else {
      throw new Error(`Module for '${gameType}' does not have a valid 'init' export.`);
    }
  } catch (err) {
    console.error(`Failed to initialize block definitions for game '${gameType}':`, err);
    // Re-throw the error so the calling component can handle it.
    throw err;
  }
}