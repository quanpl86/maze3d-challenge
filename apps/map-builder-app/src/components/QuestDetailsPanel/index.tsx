import { useState, useEffect } from 'react';
import _ from 'lodash'; // Import lodash để xử lý object an toàn
import './QuestDetailsPanel.css';
import { BlocklyModal } from '../PropertiesPanel/BlocklyModal'; // Import modal mới
import '../PropertiesPanel/BlocklyModal.css'; // Import CSS cho modal

interface QuestDetailsPanelProps {
  metadata: Record<string, any> | null;
  onMetadataChange: (path: string, value: any) => void;
}

// Helper để lấy giá trị lồng sâu trong object
// Cập nhật: Hàm này giờ sẽ nhận một mảng các key để tránh xung đột khi key chứa dấu chấm.
const getDeepValue = (obj: any, path: string) => {
  // Tách đường dẫn chỉ ở những dấu chấm không nằm trong key của translation
  // Cách tiếp cận đơn giản và an toàn hơn là truy cập từng cấp
  return path.split('.').reduce((o, k) => (o || {})[k], obj);
};

export function QuestDetailsPanel({ metadata, onMetadataChange }: QuestDetailsPanelProps) {
  // Hàm cập nhật metadata mới, xử lý các key có dấu chấm
  const handleComplexChange = (path: string, value: any) => {
    if (!metadata) return;

    // Tạo một bản sao sâu của metadata để tránh thay đổi trực tiếp state
    const newMetadata = _.cloneDeep(metadata);

    // Sử dụng lodash.set để cập nhật giá trị một cách an toàn
    // Nó sẽ tạo các object lồng nhau nếu cần, nhưng sẽ xử lý đúng key cuối cùng
    _.set(newMetadata, path, value);

    // Thay vì gửi toàn bộ object, chúng ta sẽ lặp qua và gửi từng key-value
    // để ghi đè lên state của component cha, tránh lỗi tạo ra key rỗng "".
    Object.keys(newMetadata).forEach(key => {
      onMetadataChange(key, newMetadata[key]);
    });
  };

  // State cục bộ cho các editor để cập nhật UI ngay lập tức khi gõ
  const [localSolution, setLocalSolution] = useState('');
  const [localStartBlocks, setLocalStartBlocks] = useState('');
  const [isBlocklyModalOpen, setBlocklyModalOpen] = useState(false); // State để quản lý modal

  useEffect(() => {
    // Cập nhật state cục bộ khi metadata từ bên ngoài thay đổi (ví dụ: import file mới)
    if (metadata) {
      setLocalSolution(JSON.stringify(metadata.solution, null, 2));
      // Lấy chuỗi XML "sạch" và chuyển nó thành dạng "escaped" để hiển thị và sao chép dễ dàng
      const rawXml = getDeepValue(metadata, 'blocklyConfig.startBlocks') || '';
      const escapedXml = rawXml.replace(/"/g, '\\"');
      setLocalStartBlocks(escapedXml);
    } else {
      setLocalSolution('');
      setLocalStartBlocks('');
    }
  }, [metadata]); // Chạy lại khi metadata thay đổi

  if (!metadata) {
    return (
      <aside className="quest-details-panel empty-state">
        <p>Import một file Quest để chỉnh sửa thông tin chi tiết.</p>
      </aside>
    );
  }

  const titleKey = metadata.titleKey || '';
  const descriptionKey = metadata.questTitleKey || metadata.descriptionKey || '';

  return (
    <aside className="quest-details-panel" key={metadata.id}>
      {/* Render Modal nếu isBlocklyModalOpen là true */}
      {isBlocklyModalOpen && (
        <BlocklyModal
          // Luôn truyền vào modal chuỗi XML đã được "làm sạch" (loại bỏ dấu \)
          initialXml={localStartBlocks.replace(/\\"/g, '"')}
          onClose={() => setBlocklyModalOpen(false)}
          onSave={(newXml) => {
            // Khi lưu, chuyển chuỗi XML "sạch" thành dạng "escaped" để hiển thị và lưu
            const escapedXml = newXml.replace(/"/g, '\\"');
            setLocalStartBlocks(escapedXml);
            // Cập nhật ngay lập tức vào state cha để thay đổi được lưu
            handleComplexChange('blocklyConfig.startBlocks', newXml); // Lưu chuỗi "sạch" vào metadata
            setBlocklyModalOpen(false);
          }}
        />
      )}
      <h2>Quest Details</h2>

      <div className="quest-prop-group">
        <label>ID</label>
        <input
          type="text"
          defaultValue={metadata.id || ''}
          onBlur={(e) => handleComplexChange('id', e.target.value)}
        />
      </div>

      <div className="quest-prop-group">
        <label>Level</label>
        <input
          type="number"
          defaultValue={metadata.level || 0}
          onBlur={(e) => handleComplexChange('level', parseInt(e.target.value, 10))}
        />
      </div>

      <h3 className="props-title">Translations</h3>
      {/* Chỉ render các trường translations khi các key tồn tại để đảm bảo getDeepValue hoạt động đúng */}
      {titleKey && descriptionKey && (
        <>
          <div className="quest-prop-group">
            <label>Tiêu đề (VI)</label>
            <input
              type="text"
              defaultValue={metadata?.translations?.vi?.[titleKey] || ''}
              onBlur={(e) => handleComplexChange(`translations.vi['${titleKey}']`, e.target.value)}
            />
          </div>
          <div className="quest-prop-group">
            <label>Mô tả (VI)</label>
            <textarea
              defaultValue={metadata?.translations?.vi?.[descriptionKey] || ''}
              onBlur={(e) => handleComplexChange(`translations.vi['${descriptionKey}']`, e.target.value)}
            />
          </div>

          <div className="quest-prop-group">
            <label>Title (EN)</label>
            <input
              type="text"
              defaultValue={metadata?.translations?.en?.[titleKey] || ''}
              onBlur={(e) => handleComplexChange(`translations.en['${titleKey}']`, e.target.value)}
            />
          </div>
          <div className="quest-prop-group">
            <label>Description (EN)</label>
            <textarea
              defaultValue={metadata?.translations?.en?.[descriptionKey] || ''}
              onBlur={(e) => handleComplexChange(`translations.en['${descriptionKey}']`, e.target.value)}
            />
          </div>
        </>
      )}

      <h3 className="props-title">Blockly Config</h3>
      <div className="quest-prop-group">
        <label>Max Blocks</label>
        <input
          type="number"
          defaultValue={getDeepValue(metadata, 'blocklyConfig.maxBlocks') || 0}
          onBlur={(e) => handleComplexChange('blocklyConfig.maxBlocks', parseInt(e.target.value, 10))}
        />
      </div>
      <div className="quest-prop-group">
        <div className="label-with-button">
          <label>Start Blocks (XML)</label>
          <button className="action-button" onClick={() => setBlocklyModalOpen(true)}>
            Hiển thị Blocks
          </button>
        </div>
        <textarea
          value={localStartBlocks}
          onChange={(e) => setLocalStartBlocks(e.target.value)}
          onBlur={() => handleComplexChange('blocklyConfig.startBlocks', localStartBlocks.replace(/\\"/g, '"'))}
          rows={4}
        />
      </div>

      <h3 className="props-title">Solution</h3>
       <div className="quest-prop-group">
        <label>Solution (JSON)</label>
        <textarea
          className="json-editor-small"
          value={localSolution}
          onChange={(e) => setLocalSolution(e.target.value)}
          // Cập nhật state cha khi người dùng click ra ngoài, đồng thời validate JSON
          onBlur={() => {
            try {
              const parsed = JSON.parse(localSolution);
              handleComplexChange('solution', parsed);
            } catch (error) {
              console.warn("Invalid JSON in solution field", error);
            } // Nếu JSON không hợp lệ, không cập nhật state cha nhưng giữ nguyên text đã nhập
          }}
          rows={10}
        />
      </div>
    </aside>
  );
}
