export type BuilderMode = 'navigate' | 'build-single' | 'build-area';

export interface FillOptions {
  type: 'volume' | 'shell';
  pattern: 'solid' | 'checkerboard';
  spacing: number;
}

export type PrimitiveShape = 'torus' | 'cone' | 'sphere';

export interface BuildableAsset {
    key: string;
    name: string;
    thumbnail: string;
    path?: string; // Đường dẫn không còn là bắt buộc
    primitiveShape?: PrimitiveShape; // Hình dạng cơ bản để render
    type: 'block' | 'collectible' | 'interactible' | 'special';
    defaultProperties?: Record<string, any>;
}

export interface PlacedObject {
    id: string; 
    position: [number, number, number];
    rotation: [number, number, number];
    asset: BuildableAsset;
    properties: Record<string, any>;
}

export interface AssetGroup {
    name: string;
    items: BuildableAsset[];
}

export interface BoxDimensions {
    width: number;
    height: number;
    depth: number;
}
export interface SelectionBounds {
    min: [number, number, number];
    max: [number, number, number];
}

/**
 * Định nghĩa cấu trúc cho một theme của map.
 */
export interface MapTheme {
  ground: string;
  obstacle: string;
}