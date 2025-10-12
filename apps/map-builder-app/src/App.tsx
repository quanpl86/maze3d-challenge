import { useState } from 'react';
import { AssetPalette } from './components/AssetPalette';
import { BuilderScene } from './components/BuilderScene';
import { buildableAssetGroups } from './config/gameAssets';
import { type BuildableAsset, type PlacedObject, type BuilderMode, type BoxDimensions } from './types';
import './App.css';

const defaultAsset = buildableAssetGroups[0]?.items[0];

function App() {
  const [selectedAsset, setSelectedAsset] = useState<BuildableAsset | null>(defaultAsset);
  const [placedObjects, setPlacedObjects] = useState<PlacedObject[]>([]);
  const [builderMode, setBuilderMode] = useState<BuilderMode>('navigate');
  const [boxDimensions, setBoxDimensions] = useState<BoxDimensions>({ width: 10, height: 10, depth: 10 });

  const handleSelectAsset = (asset: BuildableAsset) => {
    setSelectedAsset(asset);
    setBuilderMode('build');
  };

  const handleModeChange = (mode: BuilderMode) => {
    setBuilderMode(mode);
  };

  const handleDimensionsChange = (axis: keyof BoxDimensions, value: number) => {
    setBoxDimensions(prev => ({
      ...prev,
      [axis]: Math.max(1, value)
    }));
  };

  // HANDLER MỚI: Thêm đối tượng tại một tọa độ lưới
  const handleAddObject = (gridPosition: [number, number, number]) => {
    if (!selectedAsset) return;
    const id = gridPosition.join(',');
    
    // Kiểm tra xem đã có đối tượng nào ở vị trí này chưa
    if (placedObjects.some(obj => obj.id === id)) return;

    const newObject: PlacedObject = { id, position: gridPosition, asset: selectedAsset };
    setPlacedObjects(prev => [...prev, newObject]);
  };

  // HANDLER MỚI: Xóa đối tượng bằng ID của nó
  const handleRemoveObject = (id: string) => {
    setPlacedObjects(prev => prev.filter(obj => obj.id !== id));
  };


  return (
    <div className="app-container">
      <AssetPalette 
        selectedAssetKey={selectedAsset?.key || null}
        onSelectAsset={handleSelectAsset}
        currentMode={builderMode}
        onModeChange={handleModeChange}
        boxDimensions={boxDimensions}
        onDimensionsChange={handleDimensionsChange}
      />
      <BuilderScene 
        builderMode={builderMode}
        selectedAsset={selectedAsset}
        placedObjects={placedObjects}
        boxDimensions={boxDimensions}
        onModeChange={handleModeChange}
        onAddObject={handleAddObject}
        onRemoveObject={handleRemoveObject}
      />
    </div>
  );
}

export default App;