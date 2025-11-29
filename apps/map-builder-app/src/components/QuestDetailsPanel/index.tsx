import { useState, useEffect } from 'react';
import './QuestDetailsPanel.css';

interface QuestDetailsPanelProps {
  metadata: Record<string, any> | null;
  onMetadataChange: (path: string, value: any) => void;
}

// Helper để lấy giá trị lồng sâu trong object
const getDeepValue = (obj: any, path: string) => {
  return path.split('.').reduce((o, k) => (o || {})[k], obj);
};

export function QuestDetailsPanel({ metadata, onMetadataChange }: QuestDetailsPanelProps) {
  const [localSolution, setLocalSolution] = useState('');

  useEffect(() => {
    // Cập nhật state local khi metadata thay đổi từ bên ngoài
    if (metadata?.solution) {
      setLocalSolution(JSON.stringify(metadata.solution, null, 2));
    }
  }, [metadata?.solution]);

  if (!metadata) {
    return (
      <aside className="quest-details-panel empty-state">
        <p>Import một file Quest để chỉnh sửa thông tin chi tiết.</p>
      </aside>
    );
  }

  const handleSolutionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newJson = e.target.value;
    setLocalSolution(newJson);
    try {
      // Cố gắng parse JSON để validate
      const parsed = JSON.parse(newJson);
      onMetadataChange('solution', parsed); // Nếu thành công, cập nhật state cha
    } catch (error) {
      // Nếu JSON không hợp lệ, không làm gì cả (hoặc có thể hiển thị lỗi)
      console.warn("Invalid JSON in solution field");
    }
  };

  const titleKey = metadata.titleKey || '';
  const descriptionKey = metadata.descriptionKey || '';

  return (
    <aside className="quest-details-panel">
      <h2>Quest Details</h2>

      <div className="quest-prop-group">
        <label>ID</label>
        <input
          type="text"
          value={metadata.id || ''}
          onChange={(e) => onMetadataChange('id', e.target.value)}
        />
      </div>

      <div className="quest-prop-group">
        <label>Level</label>
        <input
          type="number"
          value={metadata.level || 0}
          onChange={(e) => onMetadataChange('level', parseInt(e.target.value, 10))}
        />
      </div>

      <h3 className="props-title">Translations (Tiếng Việt)</h3>
      <div className="quest-prop-group">
        <label>Tiêu đề (VI)</label>
        <input
          type="text"
          value={getDeepValue(metadata, `translations.vi.${titleKey}`) || ''}
          onChange={(e) => onMetadataChange(`translations.vi.${titleKey}`, e.target.value)}
        />
      </div>
      <div className="quest-prop-group">
        <label>Mô tả (VI)</label>
        <textarea
          value={getDeepValue(metadata, `translations.vi.${descriptionKey}`) || ''}
          onChange={(e) => onMetadataChange(`translations.vi.${descriptionKey}`, e.target.value)}
        />
      </div>

      <h3 className="props-title">Blockly Config</h3>
      <div className="quest-prop-group">
        <label>Max Blocks</label>
        <input
          type="number"
          value={getDeepValue(metadata, 'blocklyConfig.maxBlocks') || 0}
          onChange={(e) => onMetadataChange('blocklyConfig.maxBlocks', parseInt(e.target.value, 10))}
        />
      </div>
       <div className="quest-prop-group">
        <label>Start Blocks (XML)</label>
        <textarea
          value={getDeepValue(metadata, 'blocklyConfig.startBlocks') || ''}
          onChange={(e) => onMetadataChange('blocklyConfig.startBlocks', e.target.value)}
          rows={4}
        />
      </div>

      <h3 className="props-title">Solution</h3>
       <div className="quest-prop-group">
        <label>Solution (JSON)</label>
        <textarea
          className="json-editor-small"
          value={localSolution}
          onChange={handleSolutionChange}
          rows={10}
        />
      </div>
    </aside>
  );
}
