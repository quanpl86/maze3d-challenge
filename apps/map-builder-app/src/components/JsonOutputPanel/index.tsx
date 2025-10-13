import { useState } from 'react';
import './JsonOutputPanel.css';

interface JsonOutputPanelProps {
  jsonString: string;
}

export function JsonOutputPanel({ jsonString }: JsonOutputPanelProps) {
  const [copyButtonText, setCopyButtonText] = useState('Copy');

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy'), 2000);
    }, (err) => {
      console.error('Could not copy text: ', err);
      setCopyButtonText('Error!');
      setTimeout(() => setCopyButtonText('Copy'), 2000);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'map-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="json-output-panel">
      <h2>JSON Output</h2>
      <div className="json-actions">
        <button onClick={handleCopy}>{copyButtonText}</button>
        <button onClick={handleDownload}>Download</button>
      </div>
      <pre className="json-display">
        <code>{jsonString}</code>
      </pre>
    </aside>
  );
}