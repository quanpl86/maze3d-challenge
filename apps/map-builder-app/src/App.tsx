import { useState, useMemo, useRef } from 'react';
import { AssetPalette } from './components/AssetPalette';
import { BuilderScene, type SceneController } from './components/BuilderScene';
import { ViewControls } from './components/ViewControls';
import { buildableAssetGroups } from './config/gameAssets';
import { type BuildableAsset, type PlacedObject, type BuilderMode, type BoxDimensions, type FillOptions, type SelectionBounds } from './types';
import './App.css';

const defaultAsset = buildableAssetGroups[0]?.items[0];

function App() {
  const [selectedAsset, setSelectedAsset] = useState<BuildableAsset | null>(defaultAsset);
  const [placedObjects, setPlacedObjects] = useState<PlacedObject[]>([]);
  const [builderMode, setBuilderMode] = useState<BuilderMode>('build-single');
  const [boxDimensions, setBoxDimensions] = useState<BoxDimensions>({ width: 10, height: 10, depth: 10 });
  
  const [selectionStart, setSelectionStart] = useState<[number, number, number] | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<[number, number, number] | null>(null);
  
  const [fillOptions, setFillOptions] = useState<FillOptions>({ type: 'volume', pattern: 'solid', spacing: 1 });

  const sceneRef = useRef<SceneController>(null);

  const selectionBounds: SelectionBounds | null = useMemo(() => {
    if (!selectionStart || !selectionEnd) return null;
    return {
      min: [
        Math.min(selectionStart[0], selectionEnd[0]),
        Math.min(selectionStart[1], selectionEnd[1]),
        Math.min(selectionStart[2], selectionEnd[2]),
      ],
      max: [
        Math.max(selectionStart[0], selectionEnd[0]),
        Math.max(selectionStart[1], selectionEnd[1]),
        Math.max(selectionStart[2], selectionEnd[2]),
      ],
    };
  }, [selectionStart, selectionEnd]);

  const handleSelectAsset = (asset: BuildableAsset) => {
    setSelectedAsset(asset);
    setBuilderMode('build-single');
  };

  const handleModeChange = (mode: BuilderMode) => {
    setBuilderMode(mode);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const handleDimensionsChange = (axis: keyof BoxDimensions, value: number) => {
    setBoxDimensions(prev => ({ ...prev, [axis]: Math.max(1, value) }));
  };

  const handleSelectionBoundsChange = (newBounds: SelectionBounds) => {
    setSelectionStart(newBounds.min);
    setSelectionEnd(newBounds.max);
  };

  const handleAddObject = (gridPosition: [number, number, number]) => {
    if (!selectedAsset) return;
    const id = gridPosition.join(',');
    if (placedObjects.some(obj => obj.id === id)) return;
    const newObject: PlacedObject = { id, position: gridPosition, asset: selectedAsset };
    setPlacedObjects(prev => [...prev, newObject]);
  };

  const handleRemoveObject = (id: string) => {
    setPlacedObjects(prev => prev.filter(obj => obj.id !== id));
  };

  const handleSelectionAction = (action: 'fill' | 'replace' | 'delete') => {
    if (!selectionBounds) return;
    if (action !== 'delete' && !selectedAsset) return;

    const { min, max } = selectionBounds;
    const [minX, minY, minZ] = min;
    const [maxX, maxY, maxZ] = max;
    
    const affectedObjects: PlacedObject[] = [];
    let newPlacedObjects = [...placedObjects];

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          
          if (fillOptions.type === 'shell') {
            const isShell = x === minX || x === maxX || y === minY || y === maxY || z === minZ || z === maxZ;
            if (!isShell) continue;
          }

          if (fillOptions.pattern === 'checkerboard') {
            const effectiveSpacing = fillOptions.spacing + 1;
            if ((x + y + z) % effectiveSpacing !== 0) continue;
          }

          const id = `${x},${y},${z}`;
          const existingObjectIndex = newPlacedObjects.findIndex(obj => obj && obj.id === id);

          switch (action) {
            case 'fill':
              if (existingObjectIndex === -1 && selectedAsset) {
                affectedObjects.push({ id, position: [x, y, z], asset: selectedAsset });
              }
              break;
            case 'replace':
              if (existingObjectIndex !== -1 && selectedAsset) {
                newPlacedObjects[existingObjectIndex] = { ...newPlacedObjects[existingObjectIndex], asset: selectedAsset };
              }
              break;
            case 'delete':
              if (existingObjectIndex !== -1) {
                (newPlacedObjects as any[])[existingObjectIndex] = null;
              }
              break;
          }
        }
      }
    }

    if (action === 'fill') {
      setPlacedObjects(prev => [...prev, ...affectedObjects]);
    } else if (action === 'replace') {
      setPlacedObjects(newPlacedObjects);
    } else if (action === 'delete') {
      setPlacedObjects(newPlacedObjects.filter(Boolean));
    }
    
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const handleViewChange = (view: 'perspective' | 'top' | 'front' | 'side') => {
    sceneRef.current?.changeView(view);
  }

  return (
    <div className="app-container">
      <AssetPalette 
        selectedAssetKey={selectedAsset?.key || null}
        onSelectAsset={handleSelectAsset}
        currentMode={builderMode}
        onModeChange={handleModeChange}
        boxDimensions={boxDimensions}
        onDimensionsChange={handleDimensionsChange}
        fillOptions={fillOptions}
        onFillOptionsChange={setFillOptions}
        onSelectionAction={handleSelectionAction}
        selectionBounds={selectionBounds}
        onSelectionBoundsChange={handleSelectionBoundsChange}
      />
      <div className="builder-scene-wrapper">
        <ViewControls onViewChange={handleViewChange} />
        <BuilderScene 
          ref={sceneRef}
          builderMode={builderMode}
          selectedAsset={selectedAsset}
          placedObjects={placedObjects}
          boxDimensions={boxDimensions}
          onModeChange={handleModeChange}
          onAddObject={handleAddObject}
          onRemoveObject={handleRemoveObject}
          selectionBounds={selectionBounds}
          onSetSelectionStart={setSelectionStart}
          onSetSelectionEnd={setSelectionEnd}
        />
      </div>
    </div>
  );
}

export default App;