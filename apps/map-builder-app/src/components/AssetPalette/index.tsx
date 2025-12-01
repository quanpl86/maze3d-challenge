import { useRef, useState, useEffect } from 'react';
import { buildableAssetGroups } from '../../config/gameAssets';
import { type BuildableAsset, type BuilderMode, type BoxDimensions, type FillOptions, type SelectionBounds } from '../../types';
import './AssetPalette.css';

interface AssetPaletteProps {
  selectedAssetKey: string | null;
  onSelectAsset: (asset: BuildableAsset) => void;
  currentMode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
  boxDimensions: BoxDimensions;
  onDimensionsChange: (axis: keyof BoxDimensions, value: number) => void;
  fillOptions: FillOptions;
  onFillOptionsChange: (options: FillOptions) => void;
  onSelectionAction: (action: 'fill' | 'replace' | 'delete') => void;
  selectionBounds: SelectionBounds | null;
  onSelectionBoundsChange: (bounds: SelectionBounds) => void;
  onImportMap: (file: File) => void;
  onLoadMapFromUrl: (url: string) => void; // Thêm prop bị thiếu
}

const DimensionInputRow = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => (
    <div className="dimension-input">
      <label>{label}</label>
      <input type="number" value={value} onChange={e => onChange(parseInt(e.target.value, 10) || 0)} />
    </div>
);

export function AssetPalette({ 
  selectedAssetKey, 
  onSelectAsset, 
  currentMode, 
  onModeChange, 
  boxDimensions, 
  onDimensionsChange,
  fillOptions,
  onFillOptionsChange,
  onSelectionAction,
  selectionBounds,
  onSelectionBoundsChange,
  onImportMap,
  onLoadMapFromUrl // Nhận prop mới
}: AssetPaletteProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mapList, setMapList] = useState<Record<string, unknown> | null>(null);

  // Sử dụng import.meta.glob của Vite để lấy danh sách các file map trong thư mục public/maps
  useEffect(() => {
    // Lấy danh sách các file JSON trong thư mục public/maps
    // `eager: false` (mặc định) sẽ tạo ra các dynamic import, giúp không tải tất cả các file ngay từ đầu.
    const mapFiles = import.meta.glob('/public/maps/*.json', { eager: true });
    setMapList(mapFiles);
  }, []);

  const handleMapSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mapPath = e.target.value;
    if (mapPath) {
      // mapPath ở đây chính là URL công khai đến file JSON
      onLoadMapFromUrl(mapPath);
      // Reset dropdown để có thể chọn lại cùng một map
      e.target.value = "";
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportMap(file);
    }
    // Reset a file input value to allow re-uploading the same file
    event.target.value = '';
  };

  const handleBoundChange = (bound: 'min' | 'max', axisIndex: number, value: number) => {
    if (!selectionBounds) return;
    const newBounds = JSON.parse(JSON.stringify(selectionBounds)) as SelectionBounds;
    newBounds[bound][axisIndex] = value;
    
    // Ensure min is not greater than max
    if (newBounds.min[axisIndex] > newBounds.max[axisIndex]) {
        if(bound === 'min') newBounds.max[axisIndex] = value;
        else newBounds.min[axisIndex] = value;
    }
    
    onSelectionBoundsChange(newBounds);
  };

  return (
    <aside className="asset-palette">
      <h2>Asset Palette</h2>

      <div className="map-actions">
        <h3>Map Actions</h3>
        <button onClick={handleImportClick}>Import JSON</button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange}
          accept=".json"
          style={{ display: 'none' }} 
        />

        {/* --- TÍNH NĂNG MỚI: LOAD MAP TỪ DANH SÁCH --- */}
        <div className="palette-section">
          <h3>Load Map from Project</h3>
          <div className="prop-group">
            <select onChange={handleMapSelect} defaultValue="">
              <option value="" disabled>-- Choose a map --</option>
              {mapList && Object.keys(mapList).map(path => {
                // Lấy tên file từ đường dẫn, ví dụ: /public/maps/my-map.json -> my-map.json
                const fileName = path.split('/').pop();
                return (
                  <option key={path} value={path}>{fileName}</option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      <div className="mode-switcher">
        <button className={currentMode === 'navigate' ? 'active' : ''} onClick={() => onModeChange('navigate')}>Navigate (V)</button>
        <button className={currentMode === 'build-single' ? 'active' : ''} onClick={() => onModeChange('build-single')}>Build (B)</button>
        <button className={currentMode === 'build-area' ? 'active' : ''} onClick={() => onModeChange('build-area')}>Select Area (S)</button>
      </div>

      {selectionBounds && (
        <div className="selection-controls">
          <h3>Selection Volume</h3>
          <div className="selection-inputs">
            <div>
                <h4>Min Corner</h4>
                <DimensionInputRow label="X" value={selectionBounds.min[0]} onChange={val => handleBoundChange('min', 0, val)} />
                <DimensionInputRow label="Y" value={selectionBounds.min[1]} onChange={val => handleBoundChange('min', 1, val)} />
                <DimensionInputRow label="Z" value={selectionBounds.min[2]} onChange={val => handleBoundChange('min', 2, val)} />
            </div>
            <div>
                <h4>Max Corner</h4>
                <DimensionInputRow label="X" value={selectionBounds.max[0]} onChange={val => handleBoundChange('max', 0, val)} />
                <DimensionInputRow label="Y" value={selectionBounds.max[1]} onChange={val => handleBoundChange('max', 1, val)} />
                <DimensionInputRow label="Z" value={selectionBounds.max[2]} onChange={val => handleBoundChange('max', 2, val)} />
            </div>
          </div>

          <div className="action-buttons">
            <button onClick={() => onSelectionAction('fill')}>Fill</button>
            <button onClick={() => onSelectionAction('replace')}>Replace</button>
            <button onClick={() => onSelectionAction('delete')}>Delete</button>
          </div>
          <h4>Fill Options</h4>
          <div className="fill-options-group">
            <label>Type:</label>
            <select value={fillOptions.type} onChange={e => onFillOptionsChange({...fillOptions, type: e.target.value as FillOptions['type']})}>
              <option value="volume">Volume</option>
              <option value="shell">Shell</option>
            </select>
          </div>
          <div className="fill-options-group">
            <label>Pattern:</label>
            <select value={fillOptions.pattern} onChange={e => onFillOptionsChange({...fillOptions, pattern: e.target.value as FillOptions['pattern']})}>
              <option value="solid">Solid</option>
              <option value="checkerboard">Checkerboard</option>
            </select>
          </div>
          {fillOptions.pattern === 'checkerboard' && (
            <div className="fill-options-group">
                <label>Spacing</label>
                <input 
                    type="number" 
                    min="0"
                    value={fillOptions.spacing} 
                    onChange={e => onFillOptionsChange({...fillOptions, spacing: Math.max(0, parseInt(e.target.value, 10))})} 
                />
            </div>
          )}
        </div>
      )}

      <div className="bounding-box-controls">
        <h3>Build Area</h3>
        <DimensionInputRow label="Width" value={boxDimensions.width} onChange={val => onDimensionsChange('width', val)} />
        <DimensionInputRow label="Height" value={boxDimensions.height} onChange={val => onDimensionsChange('height', val)} />
        <DimensionInputRow label="Depth" value={boxDimensions.depth} onChange={val => onDimensionsChange('depth', val)} />
      </div>

      {buildableAssetGroups.map(group => (
        <div key={group.name} className="asset-group">
          <h3>{group.name}</h3>
          <div className="asset-grid">
            {group.items.map(item => (
              <button key={item.key} className={`asset-item ${selectedAssetKey === item.key ? 'active' : ''}`} onClick={() => onSelectAsset(item)} title={item.name}>
                {item.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}