import './JsonOutputPanel.css';

export interface JsonOutputPanelProps {
  questId: string;
  editedJson: string;
  onJsonChange: (json: string) => void;
  onRender: () => void;
}

export function JsonOutputPanel({ questId, editedJson, onJsonChange, onRender }: JsonOutputPanelProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(editedJson).then(() => {
      alert('JSON content copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy JSON content.');
    });
  };

  const handleDownload = () => {
    const blob = new Blob([editedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${questId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="json-output-panel">
      <div className="panel-header">
        <h3>JSON Output / Editor</h3>
        <div className="header-buttons">
          <button onClick={handleCopy} className="json-action-btn" title="Copy JSON to clipboard">Copy</button>
          <button onClick={handleDownload} className="json-action-btn" title="Download JSON file">Download</button>
          <button onClick={onRender} className="render-btn" title="Render map from the JSON below">
            Render from JSON
          </button>
        </div>
      </div>
      <textarea
        className="json-textarea"
        value={editedJson}
        onChange={(e) => onJsonChange(e.target.value)}
        spellCheck="false"
      />
    </aside>
  );
}