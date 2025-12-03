import { PlacedObject, MapTheme, BuildableAsset } from '../../types'; // Thêm MapTheme từ types
import './PropertiesPanel.css';
import { MouseEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ThemeSelector from './ThemeSelector'; // SỬA ĐỔI: Đường dẫn import gọn hơn

interface PropertiesPanelProps {
  selectedObject: PlacedObject | null;
  onUpdateObject: (updatedObject: PlacedObject) => void;
  onClearSelection: () => void;
  onDeleteObject: (id: string) => void;
  onAddObject: (newObject: PlacedObject) => void;
  // onUpdateAllObjects: (newTheme: MapTheme) => void; // Prop này không còn cần thiết
  onCopyAsset: (id: string) => void; // Prop mới để sao chép asset
  // --- START: THÊM PROPS CHO THEME ---
  currentMapItems: string[];
  mapTheme: MapTheme;
  onThemeChange: (newTheme: MapTheme) => void;
  // --- END: THÊM PROPS CHO THEME ---
}

const renderPropertyInput = (key: string, value: any, onChange: (key: string, value: any) => void) => {
  // Custom editor for 'initialState'
  if (key === 'initialState') {
    return (
      <select value={value} onChange={(e) => onChange(key, e.target.value)}>
        <option value="on">On</option>
        <option value="off">Off</option>
      </select>
    );
  }

  // Read-only for known, managed properties
  if (key === 'targetId' || key === 'type' || key === 'color') {
    return <input type="text" value={value ?? 'N/A'} readOnly />;
  }
  
  // Generic text input for other properties
  return <input type="text" value={value} onChange={(e) => onChange(key, e.target.value)} />;
};

export function PropertiesPanel({
  selectedObject,
  onUpdateObject,
  onClearSelection,
  onDeleteObject,
  onAddObject,
  // onUpdateAllObjects,
  onCopyAsset,
  currentMapItems,
  mapTheme,
  onThemeChange
}: PropertiesPanelProps) {

  // Khi có đối tượng được chọn, hiển thị cả ThemeSelector và các thuộc tính của đối tượng.
  const handleDelete = () => {
    if (!selectedObject) return; // Thêm kiểm tra null
    onDeleteObject(selectedObject.id);
  };

  const handleDuplicate = () => {
    if (!selectedObject) return;
    // Tạo vị trí mới, ví dụ dịch sang 1 đơn vị trên trục X
    const newPosition: [number, number, number] = [
      selectedObject.position[0] + 1,
      selectedObject.position[1],
      selectedObject.position[2],
    ];

    const newObject: PlacedObject = {
      ...selectedObject,
      id: uuidv4(), // Tạo ID mới duy nhất
      position: newPosition,
    };
    onAddObject(newObject);
  };

  const handleCopyAsset = () => {
    if (!selectedObject) return;
    onCopyAsset(selectedObject.id);
  };
  const handlePropertyChange = (key: string, value: any) => {
    // Nếu không có đối tượng nào được chọn, không làm gì cả
    if (!selectedObject) return;

    const updatedObject = {
      ...selectedObject,
      properties: {
        ...selectedObject.properties,
        [key]: value,
      },
    };
    onUpdateObject(updatedObject);
  };

  return (
    <aside className="properties-panel">
      <ThemeSelector currentMapItems={currentMapItems} selectedTheme={mapTheme} onSelectTheme={onThemeChange} />

      {/* Hiển thị thuộc tính chỉ khi có đối tượng được chọn */}
      {selectedObject ? (
        <>
          <div className="panel-header">
              <h2>Properties</h2>
              <button onClick={onClearSelection} className="clear-btn">✖</button>
          </div>

          <div className="prop-group info-group">
              <label>Asset</label>
              <span>{selectedObject.asset.name}</span>
          </div>
          <div className="prop-group info-group">
              <label>ID</label>
              <span className="object-id">{selectedObject.id}</span>
          </div>

          <h3 className="props-title">Custom Properties</h3>
          {Object.entries(selectedObject.properties).map(([key, value]) => (
              <div key={key} className="prop-group">
              <label>{key}</label>
              {renderPropertyInput(key, value, handlePropertyChange)}
              </div>
          ))}

          <div className="selection-controls single-object-controls">
              <h3 className="props-title">Actions</h3>
              <div className="action-description">
              Click an asset in the palette to **replace** this object.
              </div>
              <div className="action-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button onClick={handleCopyAsset} className="action-btn copy-btn">
                  <span className="icon">📋</span>
                  Copy Asset
              </button>
              <button onClick={handleDuplicate} className="action-btn duplicate-btn">
                  <span className="icon">🎨</span>
                  Duplicate
              </button>
              <button onClick={handleDelete} className="action-btn delete-btn">
                  <span className="icon">🗑️</span>
                  Delete
              </button>
              </div>
          </div>
        </>
      ) : (
        <p style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>Chọn một đối tượng để xem thuộc tính.</p>
      )}
    </aside>
  );
}