// apps/map-builder-app/src/config/gameAssets.ts

import { GameAssets } from '@repo/quest-player';

// Helper function to capitalize the first letter
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface BuildableAsset {
  key: string;
  name: string;
  path: string;
  type: 'block' | 'collectible' | 'interactible';
}

export interface AssetGroup {
  name: string;
  items: BuildableAsset[];
}

// Function to transform the raw GameAssets object into a UI-friendly structure
function createBuildableAssetGroups(): AssetGroup[] {
  const groups: AssetGroup[] = [];

  // Process Blocks (Ground, Walls, etc.)
  const blockCategories = ['ground', 'stone', 'wall', 'water', 'lava', 'ice'];
  blockCategories.forEach(categoryName => {
    // @ts-ignore - Accessing GameAssets dynamically
    const categoryAssets = GameAssets.world[categoryName];
    if (categoryAssets) {
      const items: BuildableAsset[] = Object.keys(categoryAssets).map(assetName => {
        const key = `${categoryName}.${assetName}`;
        // @ts-ignore
        const path = categoryAssets[assetName];
        return {
          key,
          name: capitalize(assetName),
          path,
          type: 'block',
        };
      });

      if (items.length > 0) {
        groups.push({
          name: capitalize(categoryName),
          items,
        });
      }
    }
  });

  // Process Misc (Collectibles, Interactibles)
  const miscAssets = GameAssets.world.misc;
  const collectibleItems: BuildableAsset[] = [];
  const interactibleItems: BuildableAsset[] = [];

  Object.keys(miscAssets).forEach(assetName => {
    // @ts-ignore
    const path = miscAssets[assetName];
    const isCollectible = ['crystal', 'key'].includes(assetName);
    
    const item: BuildableAsset = {
      key: assetName, // For misc items, the key is just the name
      name: capitalize(assetName),
      path,
      type: isCollectible ? 'collectible' : 'interactible',
    };

    if (isCollectible) {
      collectibleItems.push(item);
    } else {
      interactibleItems.push(item);
    }
  });

  if (collectibleItems.length > 0) {
    groups.push({ name: 'Collectibles', items: collectibleItems });
  }
  if (interactibleItems.length > 0) {
    groups.push({ name: 'Interactibles', items: interactibleItems });
  }

  return groups;
}

export const buildableAssetGroups: AssetGroup[] = createBuildableAssetGroups();