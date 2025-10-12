export type BuilderMode = 'navigate' | 'build';

export interface BuildableAsset {
    key: string;
    name: string;
    path: string;
    type: 'block' | 'collectible' | 'interactible';
}

export interface PlacedObject {
    id: string; // A unique ID, e.g., "x,y,z"
    position: [number, number, number];
    asset: BuildableAsset;
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