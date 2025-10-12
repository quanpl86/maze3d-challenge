import { buildableAssetGroups } from '../../config/gameAssets';
import { type BuildableAsset, type BuilderMode, type BoxDimensions } from '../../types';
import './AssetPalette.css';

interface AssetPaletteProps {
  selectedAssetKey: string | null;
  onSelectAsset: (asset: BuildableAsset) => void;
  currentMode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
  boxDimensions: BoxDimensions;
  onDimensionsChange: (axis: keyof BoxDimensions, value: number) => void;
}

export function AssetPalette({ 
  selectedAssetKey, 
  onSelectAsset, 
  currentMode, 
  onModeChange, 
  boxDimensions, 
  onDimensionsChange 
}: AssetPaletteProps) {
  return (
    <aside className="asset-palette">
      <h2>Asset Palette</h2>

      <div className="mode-switcher">
        <button
          className={currentMode === 'navigate' ? 'active' : ''}
          onClick={() => onModeChange('navigate')}
        >
          Navigate (V)
        </button>
        <button
          className={currentMode === 'build' ? 'active' : ''}
          onClick={() => onModeChange('build')}
        >
          Build (B)
        </button>
      </div>

      <div className="bounding-box-controls">
        <h3>Build Area</h3>
        <div className="dimension-input">
          <label htmlFor="width-input">Width</label>
          <input 
            type="number" 
            id="width-input" 
            value={boxDimensions.width}
            onChange={(e) => onDimensionsChange('width', parseInt(e.target.value, 10) || 1)}
          />
        </div>
        <div className="dimension-input">
          <label htmlFor="height-input">Height</label>
          <input 
            type="number" 
            id="height-input" 
            value={boxDimensions.height}
            onChange={(e) => onDimensionsChange('height', parseInt(e.target.value, 10) || 1)}
          />
        </div>
        <div className="dimension-input">
          <label htmlFor="depth-input">Depth</label>
          <input 
            type="number" 
            id="depth-input" 
            value={boxDimensions.depth}
            onChange={(e) => onDimensionsChange('depth', parseInt(e.target.value, 10) || 1)}
          />
        </div>
      </div>


      {buildableAssetGroups.map(group => (
        <div key={group.name} className="asset-group">
          <h3>{group.name}</h3>
          <div className="asset-grid">
            {group.items.map(item => (
              <button
                key={item.key}
                className={`asset-item ${selectedAssetKey === item.key ? 'active' : ''}`}
                onClick={() => onSelectAsset(item)}
                title={item.name}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}