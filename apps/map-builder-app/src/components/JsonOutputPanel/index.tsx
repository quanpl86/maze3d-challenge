import './JsonOutputPanel.css';

interface JsonOutputPanelProps {
  editedJson: string;
  questId: string; // Giữ lại để tương thích
  onJsonChange: (newJson: string) => void;
  onRender: () => void;
  onSave: () => void;
}

export function JsonOutputPanel({ editedJson, onJsonChange, onRender, onSave }: JsonOutputPanelProps) {
  return (
    <div className="json-output-panel">
      <h2>JSON Output / Editor</h2>
      <textarea
        className="json-editor"
        value={editedJson}
        onChange={(e) => onJsonChange(e.target.value)}
        spellCheck="false"
      />
      <div className="json-actions-container">
        <button className="json-action-button" onClick={onRender}>
          Render from JSON
        </button>
        <button className="json-action-button save-button" onClick={onSave}>
          Save to File
        </button>
      </div>
    </div>
  );
}