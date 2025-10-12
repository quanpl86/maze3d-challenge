export type BuilderMode = 'navigate' | 'build-single' | 'build-area';

export interface FillOptions {
  type: 'volume' | 'shell';
  pattern: 'solid' | 'checkerboard';
  spacing: number; // Khoảng cách giữa các khối (chỉ áp dụng cho checkerboard)
}

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
// Định nghĩa kiểu cho vùng chọn, lưu trữ tọa độ lưới thực tế
export interface SelectionBounds {
    min: [number, number, number];
    max: [number, number, number];
}