import { PlacedObject } from '../../types';
import './PropertiesPanel.css';

interface PropertiesPanelProps {
  selectedObject: PlacedObject | null;
  onUpdateObject: (updatedObject: PlacedObject) => void;
  onClearSelection: () => void;
  onDeleteObject: (id: string) => void;
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

export function PropertiesPanel({ selectedObject, onUpdateObject, onClearSelection, onDeleteObject }: PropertiesPanelProps) {

  if (!selectedObject) {
    return (
      <aside className="properties-panel empty-state">
        <p>Select an object in the scene to view its properties.</p>
        <p>(Use 'Navigate' mode and click on an object)</p>
      </aside>
    );
  }

  const handleDelete = () => {
    onDeleteObject(selectedObject.id);
    onClearSelection();
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

      {/* --- KHU VỰC ACTIONS MỚI --- */}
      <div className="selection-controls single-object-controls">
        <h3 className="props-title">Actions</h3>
        <div className="action-description">
          Click an asset in the palette to **replace** this object.
        </div>
        <div className="action-buttons">
          {/* Nút Delete được di chuyển vào đây */}
          <button onClick={handleDelete} className="action-btn delete-btn">
            <span className="icon">🗑️</span>
            Delete
          </button>
        </div>
      </div>
    </aside>
  );
}