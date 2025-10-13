import { useState, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AssetPalette } from './components/AssetPalette';
import { BuilderScene, type SceneController } from './components/BuilderScene';
import { ViewControls } from './components/ViewControls';
import { PropertiesPanel } from './components/PropertiesPanel';
import { JsonOutputPanel } from './components/JsonOutputPanel';
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
  
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  
  // State mới để lưu trữ siêu dữ liệu của quest
  const [questMetadata, setQuestMetadata] = useState<Record<string, any> | null>(null);

  const sceneRef = useRef<SceneController>(null);

  const assetMap = useMemo(() => {
    const map = new Map<string, BuildableAsset>();
    buildableAssetGroups.forEach(group => {
      group.items.forEach(item => {
        map.set(item.key, item);
      });
    });
    return map;
  }, []);
  
  const selectedObject = useMemo(() => {
    return placedObjects.find(obj => obj.id === selectedObjectId) || null;
  }, [selectedObjectId, placedObjects]);

  const selectionBounds: SelectionBounds | null = useMemo(() => {
    if (!selectionStart || !selectionEnd) return null;
    return {
      min: [ Math.min(selectionStart[0], selectionEnd[0]), Math.min(selectionStart[1], selectionEnd[1]), Math.min(selectionStart[2], selectionEnd[2]), ],
      max: [ Math.max(selectionStart[0], selectionEnd[0]), Math.max(selectionStart[1], selectionEnd[1]), Math.max(selectionStart[2], selectionEnd[2]), ],
    };
  }, [selectionStart, selectionEnd]);

  const outputJsonString = useMemo(() => {
    const blocks = placedObjects.filter(o => o.asset.type === 'block').map(o => ({ modelKey: o.asset.key, position: { x: o.position[0], y: o.position[1], z: o.position[2] } }));
    const collectibles = placedObjects.filter(o => o.asset.type === 'collectible').map((o, i) => ({ id: `c${i + 1}`, type: o.asset.key, position: { x: o.position[0], y: o.position[1], z: o.position[2] } }));
    const interactibles = placedObjects.filter(o => o.asset.type === 'interactible').map(o => ({ id: o.id, ...o.properties, position: { x: o.position[0], y: o.position[1], z: o.position[2] } }));
    
    const finishObject = placedObjects.find(o => o.asset.key === 'finish');
    const finish = finishObject ? { x: finishObject.position[0], y: finishObject.position[1], z: finishObject.position[2] } : null;

    const startObject = placedObjects.find(o => o.asset.key === 'player_start');
    const players = startObject ? [{ id: "player1", start: { x: startObject.position[0], y: startObject.position[1], z: startObject.position[2], direction: 1 } }] : [];

    const gameConfig = { type: "maze", renderer: "3d", blocks, players, collectibles, interactibles, finish };

    // Nếu có siêu dữ liệu, kết hợp nó với gameConfig mới
    if (questMetadata) {
      return JSON.stringify({ ...questMetadata, gameConfig }, null, 2);
    }
    
    // Nếu không, chỉ trả về gameConfig
    return JSON.stringify({ gameConfig }, null, 2);
  }, [placedObjects, questMetadata]);

  const handleSelectAsset = (asset: BuildableAsset) => {
    setSelectedAsset(asset);
    setBuilderMode('build-single');
    setSelectedObjectId(null);
  };

  const handleModeChange = (mode: BuilderMode) => {
    setBuilderMode(mode);
    setSelectionStart(null);
    setSelectionEnd(null);
    if (mode !== 'navigate') {
        setSelectedObjectId(null);
    }
  };

  const handleDimensionsChange = (axis: keyof BoxDimensions, value: number) => setBoxDimensions(prev => ({ ...prev, [axis]: Math.max(1, value) }));
  const handleSelectionBoundsChange = (newBounds: SelectionBounds) => { setSelectionStart(newBounds.min); setSelectionEnd(newBounds.max); };

  const handleAddObject = (gridPosition: [number, number, number], asset: BuildableAsset) => {
    const coordId = gridPosition.join(',');
    if (placedObjects.some(obj => obj.position.join(',') === coordId)) return;
    
    let objectsToAdd: PlacedObject[] = [];
    let objectsToRemove: string[] = [];
    
    if (asset.key === 'finish' || asset.key === 'player_start') {
      const existing = placedObjects.find(o => o.asset.key === asset.key);
      if (existing) objectsToRemove.push(existing.id);
    }

    const newObject: PlacedObject = {
      id: asset.defaultProperties?.type === 'portal' ? `${asset.key}_${uuidv4().substring(0, 4)}` : uuidv4(),
      position: gridPosition,
      asset: asset,
      properties: asset.defaultProperties ? { ...asset.defaultProperties } : {},
    };
    objectsToAdd.push(newObject);

    if (newObject.properties.type === 'portal') {
      const sameColorPortals = placedObjects.filter(o => o.id !== newObject.id && o.properties.color === newObject.properties.color);
      const unlinkedPortal = sameColorPortals.find(p => !p.properties.targetId);
      if (unlinkedPortal) {
        unlinkedPortal.properties.targetId = newObject.id;
        newObject.properties.targetId = unlinkedPortal.id;
      }
    }

    setPlacedObjects(prev => [...prev.filter(o => !objectsToRemove.includes(o.id)), ...objectsToAdd]);
  };

  const handleRemoveObject = (id: string) => {
    setPlacedObjects(prev => {
        const objectToRemove = prev.find(o => o.id === id);
        const newObjects = prev.filter(obj => obj.id !== id);
        if (objectToRemove?.properties.type === 'portal' && objectToRemove.properties.targetId) {
            const partner = newObjects.find(o => o.id === objectToRemove.properties.targetId);
            if (partner) partner.properties.targetId = null;
        }
        return newObjects;
    });
  };

  const handleUpdateObject = (updatedObject: PlacedObject) => {
    setPlacedObjects(prev => prev.map(obj => (obj.id === updatedObject.id ? updatedObject : obj)));
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

          const existingObjectIndex = newPlacedObjects.findIndex(obj => 
            obj && obj.position[0] === x && obj.position[1] === y && obj.position[2] === z
          );

          switch (action) {
            case 'fill':
              if (existingObjectIndex === -1 && selectedAsset) {
                affectedObjects.push({
                  id: uuidv4(),
                  position: [x, y, z],
                  asset: selectedAsset,
                  properties: selectedAsset.defaultProperties ? { ...selectedAsset.defaultProperties } : {}
                });
              }
              break;
            case 'replace':
              if (existingObjectIndex !== -1 && selectedAsset) {
                newPlacedObjects[existingObjectIndex] = { 
                    ...newPlacedObjects[existingObjectIndex], 
                    asset: selectedAsset,
                    properties: selectedAsset.defaultProperties ? { ...selectedAsset.defaultProperties } : {}
                };
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

  const handleViewChange = (view: 'perspective' | 'top' | 'front' | 'side') => sceneRef.current?.changeView(view);

  const handleImportMap = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);

        // --- LOGIC NHẬN DIỆN FORMAT ---
        let configToLoad;
        if (json.gameConfig && typeof json.gameConfig === 'object') {
          // Đây là file quest đầy đủ
          const { gameConfig, ...metadata } = json;
          configToLoad = gameConfig;
          setQuestMetadata(metadata);
        } else if (json.blocks || json.players) {
          // Đây có vẻ là file chỉ có gameConfig, nhưng không có key cha
          // Để nhất quán, chúng ta sẽ coi nó là file gameConfig-only
          configToLoad = json;
          setQuestMetadata(null);
        } else {
            throw new Error("Invalid format: JSON does not contain a recognizable 'gameConfig' object.");
        }

        const { blocks = [], collectibles = [], interactibles = [], finish, players = [] } = configToLoad;
        const newPlacedObjects: PlacedObject[] = [];

        for (const block of blocks) {
          const asset = assetMap.get(block.modelKey);
          if (asset && block.position) newPlacedObjects.push({ id: uuidv4(), asset, position: [block.position.x, block.position.y, block.position.z], properties: {} });
        }
        
        for (const item of collectibles) {
          const asset = assetMap.get(item.type);
          if(asset && item.position) newPlacedObjects.push({ id: uuidv4(), asset, position: [item.position.x, item.position.y, item.position.z], properties: {} });
        }

        for (const item of interactibles) {
          const assetKey = item.type === 'portal' ? `${item.type}_${item.color}` : item.type;
          const asset = assetMap.get(assetKey);
          if(asset && item.position) {
              const { position, ...properties } = item;
              newPlacedObjects.push({ id: item.id, asset, position: [position.x, position.y, position.z], properties });
          }
        }
        
        if (finish) {
          const asset = assetMap.get('finish');
          if (asset) newPlacedObjects.push({ id: uuidv4(), asset, position: [finish.x, finish.y, finish.z], properties: {} });
        }

        if (players[0]?.start) {
          const asset = assetMap.get('player_start');
          const startPos = players[0].start;
          if (asset) newPlacedObjects.push({ id: uuidv4(), asset, position: [startPos.x, startPos.y, startPos.z], properties: {} });
        }
        
        setPlacedObjects(newPlacedObjects);
        alert('Map imported successfully!');
      } catch (error) {
        console.error("Failed to import map:", error);
        alert(`Failed to import map: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    reader.readAsText(file);
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
        fillOptions={fillOptions}
        onFillOptionsChange={setFillOptions}
        onSelectionAction={handleSelectionAction}
        selectionBounds={selectionBounds}
        onSelectionBoundsChange={handleSelectionBoundsChange}
        onImportMap={handleImportMap}
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
          selectedObjectId={selectedObjectId}
          onSelectObject={setSelectedObjectId}
        />
      </div>
      <div className="right-sidebar">
        <PropertiesPanel 
          selectedObject={selectedObject}
          onUpdateObject={handleUpdateObject}
          onClearSelection={() => setSelectedObjectId(null)}
        />
        <JsonOutputPanel jsonString={outputJsonString} />
      </div>
    </div>
  );
}

export default App;