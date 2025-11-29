import './JsonOutputPanel.css';

interface JsonOutputPanelProps {
  editedJson: string;
  onJsonChange: (newJson: string) => void;
  onRender: () => void;
}

export function JsonOutputPanel({ editedJson, onJsonChange, onRender }: JsonOutputPanelProps) {
  return (
    <div className="json-output-panel">
      <h2>JSON Output / Editor</h2>
      <textarea
        className="json-editor"
        value={editedJson}
        onChange={(e) => onJsonChange(e.target.value)}
        spellCheck="false"
      />
      <button className="render-button" onClick={onRender}>
        Render Map from JSON
      </button>
    </div>
  );
}