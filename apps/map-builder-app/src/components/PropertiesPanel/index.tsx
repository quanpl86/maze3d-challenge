import { PlacedObject } from '../../types';
import './PropertiesPanel.css';
import { MouseEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface PropertiesPanelProps {
  selectedObject: PlacedObject | null;
  onUpdateObject: (updatedObject: PlacedObject) => void;
  onClearSelection: () => void;
  onDeleteObject: (id: string) => void;
  onAddObject: (newObject: PlacedObject) => void;
  onCopyAsset: (id: string) => void; // Prop mới để sao chép asset
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

export function PropertiesPanel({ selectedObject, onUpdateObject, onClearSelection, onDeleteObject, onAddObject, onCopyAsset }: PropertiesPanelProps) {

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    // Chỉ bỏ chọn khi click trực tiếp vào overlay, không phải vào panel con
    if (e.target === e.currentTarget) {
      onClearSelection();
    }
  };

  if (!selectedObject) {
    return (
      <aside className="properties-panel empty-state">
        <p>Select an object in the scene to view its properties.</p>
        <p>(Use 'Navigate' mode and click on an object)</p>
      </aside>
    );
  }
  // Khi có một đối tượng được chọn, chúng ta render cả panel và lớp phủ.
  // Lớp phủ sẽ bắt sự kiện click bên ngoài panel.

  const handleDelete = () => {
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
    <div className="properties-panel-overlay" onClick={handleOverlayClick}>
        <aside className="properties-panel">
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
            {/* 
              Thêm style để các nút tự động xuống dòng khi panel bị thu hẹp.
              - display: 'flex' để các nút nằm trên một hàng.
              - flexWrap: 'wrap' cho phép các nút xuống dòng.
              - gap: '8px' tạo khoảng cách giữa các nút.
            */}
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
        </aside>
    </div>
  );
}