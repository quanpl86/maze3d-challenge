import { PlacedObject, MapTheme, BuildableAsset } from '../../types'; // Thêm MapTheme từ types
import { v4 as uuidv4 } from 'uuid';
import ThemeSelector from './ThemeSelector'; // SỬA ĐỔI: Đường dẫn import gọn hơn

interface PropertiesPanelProps {
  selectedObjects: PlacedObject[]; // Nhận mảng các đối tượng
  onUpdateObject: (updatedObject: PlacedObject) => void;
  onClearSelection: () => void;
  onDeleteSelection: () => void; // THAY ĐỔI: Xóa cả vùng chọn
  onRotateSelection: () => void; // THÊM MỚI: Xoay cả vùng chọn
  onAddObject: (newObject: PlacedObject) => void;
  onCopyAsset: (id: string) => void; // Prop mới để sao chép asset
  currentMapItems: string[];
  mapTheme: MapTheme;
  onThemeChange: (newTheme: MapTheme) => void;
  // Thêm file css đã bị thiếu
  className?: string;
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
  // THÊM MỚI: Trình chỉnh sửa riêng cho thuộc tính 'direction'
  if (key === 'direction') {
    return (
      <select value={value} onChange={(e) => onChange(key, parseInt(e.target.value, 10))}>
        <option value="0">0 (East, +X)</option>
        <option value="1">1 (North, -Z)</option>
        <option value="2">2 (West, -X)</option>
        <option value="3">3 (South, +Z)</option>
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

// --- COMPONENT MỚI: Giao diện khi chọn nhiều đối tượng ---
const MultipleSelectionPanel = ({
  count,
  onClear,
  onDelete,
  onRotate,
}: {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  onRotate: () => void;
}) => (
  <>
    <div className="panel-header">
      <h2>Multiple Objects</h2>
      <button onClick={onClear} className="clear-btn">✖</button>
    </div>
    <div className="prop-group info-group">
      <label>Selected</label>
      <span>{count} items</span>
    </div>
    <div className="selection-controls">
      <h3 className="props-title">Actions</h3>
      <div className="action-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button onClick={onRotate} className="action-btn">
          <span className="icon">🔄</span>
          Rotate (R)
        </button>
        <button onClick={onDelete} className="action-btn delete-btn">
          <span className="icon">🗑️</span>
          Delete All
        </button>
      </div>
    </div>
  </>
);

export function PropertiesPanel({
  selectedObjects,
  onUpdateObject,
  onClearSelection,
  onDeleteSelection,
  onRotateSelection,
  onAddObject,
  onCopyAsset,
  currentMapItems,
  mapTheme,
  onThemeChange
}: PropertiesPanelProps) {
  const selectedObject = selectedObjects.length === 1 ? selectedObjects[0] : null;

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
    <aside className="properties-panel"> {/* Giữ lại class này */}
      <ThemeSelector currentMapItems={currentMapItems} selectedTheme={mapTheme} onSelectTheme={onThemeChange} /> 

      {/* --- LOGIC MỚI: Hiển thị panel phù hợp --- */}
      {selectedObjects.length > 1 ? (
        <MultipleSelectionPanel
          count={selectedObjects.length}
          onClear={onClearSelection}
          onDelete={onDeleteSelection}
          onRotate={onRotateSelection}
        />
      ) : selectedObject ? (
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
              <button onClick={onDeleteSelection} className="action-btn delete-btn">
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