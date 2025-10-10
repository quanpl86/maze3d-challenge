// src/games/GameBlockManager.ts

/**
 * A map to keep track of which game types have had their blocks loaded.
 * The key is the gameType (e.g., 'maze'), and the value is a boolean.
 */
const loadedBlockSets = new Set<string>();

/**
 * Dynamically imports and executes the Blockly block definitions for a given game type.
 * Ensures that the definition logic for each game type is only run once per application lifecycle.
 *
 * @param gameType The type of the game to initialize (e.g., 'maze').
 * @returns A promise that resolves when the block definitions have been loaded and executed.
 */
export async function initializeGame(gameType: string): Promise<void> {
  // If this game's blocks have already been loaded, we don't need to do anything.
  if (loadedBlockSets.has(gameType)) {
    return;
  }

  try {
    // The dynamic import itself triggers the execution of the top-level code
    // in the blocks.ts file, which registers the blocks with Blockly.
    await import(`./${gameType}/blocks.ts`);
    console.log(`Block definitions for game '${gameType}' loaded and registered.`);
    
    // Mark this game type as loaded to prevent re-importing.
    loadedBlockSets.add(gameType);
  } catch (err) {
    console.error(`Failed to load block definitions for game '${gameType}':`, err);
    // Re-throw the error so the calling component can handle it.
    throw err;
  }
}