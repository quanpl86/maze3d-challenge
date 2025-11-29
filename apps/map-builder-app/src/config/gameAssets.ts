// apps/map-builder-app/src/config/gameAssets.ts

import { GameAssets } from '@repo/quest-player';
import { BuildableAsset, AssetGroup } from '../types';

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Helper để tạo đường dẫn thumbnail từ đường dẫn model.
// Ví dụ: /assets/world/stone/models/cobble.glb -> /assets/world/stone/thumbnails/cobble.png
const createThumbnailPath = (modelPath?: string): string => {
  if (!modelPath) return '/assets/ui/unknown.png'; // Fallback cho asset không có model
  return modelPath.replace('/models/', '/thumbnails/').replace('.glb', '.png');
};
function createBuildableAssetGroups(): AssetGroup[] {
  const groups: AssetGroup[] = []; 

  const blockCategories = ['ground', 'stone', 'wall', 'water', 'lava', 'ice'];
  blockCategories.forEach(categoryName => {
    // @ts-ignore
    const categoryAssets = GameAssets.world[categoryName];
    if (categoryAssets) {
      const items: BuildableAsset[] = Object.keys(categoryAssets).map(assetName => {
        const key = `${categoryName}.${assetName}`; // Ví dụ: 'stone.stone01'
        // @ts-ignore
        const path = categoryAssets[assetName];
        return {
          key,
          name: capitalize(assetName),
          thumbnail: createThumbnailPath(path),
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

  // --- SỬA LẠI LOGIC ĐỂ LẤY ĐÚNG ASSET ---
  const collectibleItems: BuildableAsset[] = [
    { key: 'crystal', name: 'Crystal', path: GameAssets.world.misc.crystal, thumbnail: createThumbnailPath(GameAssets.world.misc.crystal), type: 'collectible' },
    { key: 'key', name: 'Key', path: GameAssets.world.misc.key, thumbnail: createThumbnailPath(GameAssets.world.misc.key), type: 'collectible' },
  ];

  // --- THAY ĐỔI Ở ĐÂY ---
  
  const interactibleItems: BuildableAsset[] = [
    {
      key: 'switch',
      name: 'Switch',
      path: GameAssets.world.misc.switch,
      thumbnail: createThumbnailPath(GameAssets.world.misc.switch),
      type: 'interactible',
      defaultProperties: { type: 'switch', initialState: 'off' }
    }, 
    {
      key: 'portal_blue',
      name: 'Blue Portal',
      thumbnail: createThumbnailPath(GameAssets.world.misc.portal), // Dùng thumbnail của portal gốc
      primitiveShape: 'torus', // Sử dụng hình Torus (donut)
      type: 'interactible',
      defaultProperties: { type: 'portal', color: 'blue', targetId: null }
    },
    {
      key: 'portal_orange',
      name: 'Orange Portal',
      thumbnail: createThumbnailPath(GameAssets.world.misc.portal), // Dùng thumbnail của portal gốc
      primitiveShape: 'torus', // Sử dụng hình Torus (donut)
      type: 'interactible',
      defaultProperties: { type: 'portal', color: 'orange', targetId: null }
    }
  ];

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
      thumbnail: '/assets/ui/player_start.png', // Dùng một ảnh UI tùy chỉnh
      primitiveShape: 'sphere', // Dùng hình cầu để đại diện
      type: 'special',
      defaultProperties: {}
    },
    {
      key: 'finish',
      name: 'Finish Point',
      thumbnail: '/assets/ui/finish.png', // Dùng một ảnh UI tùy chỉnh
      primitiveShape: 'cone',
      type: 'special',
      defaultProperties: {}
    }
  ];

  groups.push({ name: 'Special', items: specialItems });

  return groups;
}

// Sửa lỗi: Gọi hàm để tạo và export dữ liệu mới nhất có chứa thumbnail.
export const buildableAssetGroups: AssetGroup[] = createBuildableAssetGroups();