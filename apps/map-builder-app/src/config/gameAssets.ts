// apps/map-builder-app/src/config/gameAssets.ts

import { GameAssets } from '@repo/quest-player';
import { BuildableAsset, AssetGroup } from '../types';

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function createBuildableAssetGroups(): AssetGroup[] {
  const groups: AssetGroup[] = [];

  const blockCategories = ['ground', 'stone', 'wall', 'water', 'lava', 'ice'];
  blockCategories.forEach(categoryName => {
    // @ts-ignore
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

  const miscAssets = GameAssets.world.misc;
  const collectibleItems: BuildableAsset[] = [];
  const interactibleItems: BuildableAsset[] = [];

  Object.keys(miscAssets).forEach(assetName => {
    // @ts-ignore
    const path = miscAssets[assetName];
    const isCollectible = ['crystal', 'key'].includes(assetName);
    
    if (isCollectible) {
      collectibleItems.push({
        key: assetName,
        name: capitalize(assetName),
        path,
        type: 'collectible',
      });
    }
  });

  // --- THAY ĐỔI Ở ĐÂY ---
  
  interactibleItems.push(
    {
      key: 'switch',
      name: 'Switch',
      // Giữ lại mô hình này, giả sử nó tồn tại hoặc dùng tạm 1 cái khác
      path: GameAssets.world.misc.switch,
      type: 'interactible',
      defaultProperties: { initialState: 'off' }
    },
    {
      key: 'portal_blue',
      name: 'Blue Portal',
      primitiveShape: 'torus', // Sử dụng hình Torus (donut)
      type: 'interactible',
      defaultProperties: { type: 'portal', color: 'blue', targetId: null }
    },
    {
      key: 'portal_orange',
      name: 'Orange Portal',
      primitiveShape: 'torus', // Sử dụng hình Torus (donut)
      type: 'interactible',
      defaultProperties: { type: 'portal', color: 'orange', targetId: null }
    }
  );

  if (collectibleItems.length > 0) {
    groups.push({ name: 'Collectibles', items: collectibleItems });
  }
  if (interactibleItems.length > 0) {
    groups.push({ name: 'Interactibles', items: interactibleItems });
  }

  const specialItems: BuildableAsset[] = [
    {
      key: 'player_start', // Key mới
      name: 'Player Start',  // Tên mới
      primitiveShape: 'sphere', // Dùng hình cầu để đại diện
      type: 'special',
      defaultProperties: {}
    },
    {
      key: 'finish',
      name: 'Finish Point',
      primitiveShape: 'cone', 
      type: 'special',
      defaultProperties: {}
    }
  ];

  groups.push({ name: 'Special', items: specialItems });

  return groups;
}

export const buildableAssetGroups: AssetGroup[] = createBuildableAssetGroups();