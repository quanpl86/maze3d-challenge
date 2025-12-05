import { useState, useEffect } from 'react';
import _ from 'lodash'; // Import lodash để xử lý object an toàn
import './QuestDetailsPanel.css';
import { BlocklyModal } from '../PropertiesPanel/BlocklyModal'; // Import modal mới
import '../PropertiesPanel/BlocklyModal.css'; // Import CSS cho modal

interface QuestDetailsPanelProps {
  metadata: Record<string, any> | null;
  onMetadataChange: (path: string, value: any) => void;
  // SỬA LỖI: Thay đổi chữ ký của onSolveMaze để nó có thể nhận các tham số cần thiết cho solver.
  onSolveMaze: (params: {
    gameConfig: any;
    solutionConfig: any;
    blocklyConfig: any;
  }) => void;
}

// Helper để lấy giá trị lồng sâu trong object
// Cập nhật: Hàm này giờ sẽ nhận một mảng các key để tránh xung đột khi key chứa dấu chấm.
const getDeepValue = (obj: any, path: string) => {
  // Tách đường dẫn chỉ ở những dấu chấm không nằm trong key của translation
  // Cách tiếp cận đơn giản và an toàn hơn là truy cập từng cấp
  return path.split('.').reduce((o, k) => (o || {})[k], obj);
};

// --- START: HÀM MỚI ĐỂ BIÊN DỊCH STRUCTURED SOLUTION SANG XML ---
/**
 * Biên dịch một mảng các hành động từ structuredSolution thành chuỗi XML của Blockly.
 * @param actions Mảng các đối tượng hành động.
 * @returns Một chuỗi XML tương thích với Blockly.
 */
const compileActionsToXml = (actions: any[]): string => {
  if (!Array.isArray(actions) || actions.length === 0) {
    return '';
  }

  let previousBlockXml = '';

  // Xử lý đệ quy mảng hành động từ dưới lên để xây dựng chuỗi <next>
  for (let i = actions.length - 1; i >= 0; i--) {
    const action = actions[i];
    let currentBlockXml = '';

    switch (action.type) { // Đã thay đổi từ action.name sang action.type
      case 'maze_moveForward':
        currentBlockXml = `<block type="maze_moveForward"></block>`;
        break;
      case 'maze_turn': // Đã thay đổi từ action.name sang action.type
        // Giá trị action.direction đã là 'turnLeft' hoặc 'turnRight'
        const turnDir = action.direction;
        currentBlockXml = `<block type="maze_turn"><field name="DIR">${turnDir}</field></block>`;
        break;
      // SỬA LỖI: Thêm các trường hợp để xử lý định dạng từ "Lời Giải Cơ Bản"
      case 'maze_turnLeft':
        currentBlockXml = `<block type="maze_turn"><field name="DIR">turnLeft</field></block>`;
        break;
      case 'maze_turnRight':
        currentBlockXml = `<block type="maze_turn"><field name="DIR">turnRight</field></block>`;
        break;
      case 'maze_collect': // Thêm trường hợp cho maze_collect
        currentBlockXml = `<block type="maze_collect"></block>`;
        break;
      case 'maze_jump': // THÊM MỚI: Xử lý cho hành động jump
        currentBlockXml = `<block type="maze_jump"></block>`;
        break;
      case 'maze_toggleSwitch': // Thêm trường hợp cho maze_toggleSwitch
        currentBlockXml = `<block type="maze_toggle_switch"></block>`;
        break;
      case 'procedures_callnoreturn': // THÊM MỚI: Xử lý cho khối gọi hàm
        // SỬA LỖI: Đây là phần logic bị thiếu, gây ra lỗi "Loại hành động không xác định: CALL".
        // Nó tạo ra XML chính xác cho một khối gọi hàm.
        currentBlockXml = `<block type="procedures_callnoreturn"><mutation name="${action.mutation.name}"></mutation></block>`;
        break;
      case 'CALL': // THÊM MỚI: Xử lý cho định dạng "CALL" cũ để tương thích ngược
        // Lỗi "Loại hành động không xác định: CALL" xảy ra ở đây.
        // Thêm trường hợp này để xử lý các file JSON cũ có thể vẫn dùng "CALL".
        currentBlockXml = `<block type="procedures_callnoreturn"><mutation name="${action.name}"></mutation></block>`;
        break;
      case 'maze_repeat': // Giả định structuredSolution sử dụng 'maze_repeat' cho vòng lặp
      case 'maze_for': // THÊM MỚI: Xử lý cho vòng lặp 'maze_for'
        // Đệ quy để biên dịch các hành động con bên trong khối lặp (cả maze_repeat và maze_for)
        const innerBlocksXml = compileActionsToXml(action.actions || []);
        currentBlockXml = `
          <block type="maze_repeat">
            <value name="TIMES">
              <shadow type="math_number">
                <field name="NUM">${action.times || 1}</field>
              </shadow>
            </value>
            <statement name="DO">
              ${innerBlocksXml}
            </statement>
          </block>`;
        break;
      default:
        console.warn(`Loại hành động không xác định: ${action.type}`);
        break;
    }

    // Gắn khối trước đó vào thẻ <next> của khối hiện tại
    if (previousBlockXml) {
      currentBlockXml = currentBlockXml.replace('</block>', `<next>${previousBlockXml}</next></block>`);
    }
    previousBlockXml = currentBlockXml;
  }

  return previousBlockXml;
};
// --- END: HÀM MỚI ---

export function QuestDetailsPanel({ metadata, onMetadataChange, onSolveMaze }: QuestDetailsPanelProps) {
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
  const [localRawActions, setLocalRawActions] = useState('');
  const [localBasicSolution, setLocalBasicSolution] = useState(''); // THÊM MỚI: State cho lời giải cơ bản
  const [localStructuredSolution, setLocalStructuredSolution] = useState('');
  const [isBlocklyModalOpen, setBlocklyModalOpen] = useState(false); // State để quản lý modal

  useEffect(() => {
    // Cập nhật state cục bộ khi metadata từ bên ngoài thay đổi (ví dụ: import file mới)
    if (metadata) {
      // SỬA LỖI: Đảm bảo `solution` luôn là một object để tránh lỗi khi truy cập thuộc tính.
      const solution = metadata.solution || { rawActions: [], structuredSolution: {} };
      setLocalSolution(JSON.stringify(solution, null, 2)); // Giữ lại để xem tổng thể
      // SỬA LỖI & CẢI TIẾN: Đảm bảo rawActions và structuredSolution luôn được cập nhật từ metadata mới nhất.
      // Điều này đồng bộ hóa kết quả từ solver (đã chuyển đổi 'CALL' thành 'procedures_callnoreturn') vào state cục bộ.
      setLocalBasicSolution(JSON.stringify(solution.basicSolution || {}, null, 2)); // THÊM MỚI: Cập nhật state lời giải cơ bản
      setLocalRawActions(JSON.stringify(solution.rawActions || [], null, 2));
      setLocalStructuredSolution(JSON.stringify(solution.structuredSolution || {}, null, 2));
    } else {
      setLocalSolution('');
      setLocalBasicSolution('');
      setLocalRawActions('');
      setLocalStructuredSolution('');
    }
  }, [metadata]);

  // --- START: HÀM XỬ LÝ SỰ KIỆN CLICK NÚT BIÊN DỊCH ---
  const handleCompileToXml = (jsonSource: string, sourceName: string) => {
    try {
      // B1: Kiểm tra xem chuỗi JSON có rỗng hay không
      if (!jsonSource || jsonSource.trim() === '') {
        alert(`Lỗi: ${sourceName} (JSON) đang trống. Vui lòng nhập dữ liệu.`);
        return;
      }

      const structuredSolution = JSON.parse(jsonSource);

      // B2: Kiểm tra xem dữ liệu đã parse có thuộc tính 'main' là một mảng không
      if (!structuredSolution || !Array.isArray(structuredSolution.main)) {
        alert('Lỗi: Dữ liệu trong Structured Solution phải là một đối tượng JSON có thuộc tính "main" là một mảng (Array) các hành động.');
        return;
      }

      let fullXmlContent = '';

      // 1. Biên dịch các hành động chính (main actions)
      const mainBlocksXml = compileActionsToXml(structuredSolution.main);
      fullXmlContent += `<block type="maze_start" deletable="false" movable="false"><statement name="DO">${mainBlocksXml}</statement></block>`;

      // 2. Biên dịch các định nghĩa hàm (procedures), nếu có
      if (structuredSolution.procedures) {
        let yOffset = 100; // Vị trí Y bắt đầu cho các khối định nghĩa hàm
        for (const procName in structuredSolution.procedures) {
          const procActions = structuredSolution.procedures[procName];
          const procInnerBlocksXml = compileActionsToXml(procActions);
          fullXmlContent += `
            <block type="procedures_defnoreturn" x="400" y="${yOffset}">
              <field name="NAME">${procName}</field>
              <comment pinned="false" h="80" w="160">Describe this function...</comment>
              <statement name="STACK">${procInnerBlocksXml}</statement>
            </block>`;
          yOffset += (procActions.length * 50) + 100; // Ước tính vị trí Y cho khối hàm tiếp theo
        }
      }
      const finalXml = `<xml>${fullXmlContent}</xml>`;

      handleComplexChange('blocklyConfig.startBlocks', finalXml); // Lưu chuỗi "sạch"
      alert('Tạo Start Blocks XML thành công!');
    } catch (error) {
      console.error("Lỗi khi biên dịch structuredSolution sang XML:", error);
      alert(`Lỗi: Không thể parse ${sourceName}. Vui lòng kiểm tra lại định dạng JSON.\n\n${error}`);
    }
  };
  // --- END: HÀM XỬ LÝ SỰ KIỆN ---

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
      {isBlocklyModalOpen && metadata.blocklyConfig && (
        <BlocklyModal
          // SỬA LỖI: Lấy XML trực tiếp từ metadata để đảm bảo luôn là dữ liệu mới nhất
          initialXml={getDeepValue(metadata, 'blocklyConfig.startBlocks') || ''}
          onClose={() => setBlocklyModalOpen(false)}
          onSave={(newXml) => {
            // Cập nhật ngay lập tức vào state cha để thay đổi được lưu.
            // Không cần state cục bộ `localStartBlocks` nữa.
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
          // SỬA LỖI: Sử dụng `value` thay vì `defaultValue` để biến nó thành một "controlled component".
          // Điều này đảm bảo input luôn hiển thị giá trị mới nhất từ prop `metadata`.
          value={getDeepValue(metadata, 'blocklyConfig.maxBlocks') || ''}
          onChange={(e) => handleComplexChange('blocklyConfig.maxBlocks', parseInt(e.target.value, 10) || 0)}
        />
      </div>
      <div className="quest-prop-group">
        <div className="label-with-button">
          <label>Start Blocks (XML)</label>
          <button className="json-action-btn" onClick={() => setBlocklyModalOpen(true)}>
            Hiển thị Blocks
          </button>
        </div>
        <textarea
          // SỬA LỖI: Hiển thị giá trị trực tiếp từ metadata và cho phép chỉnh sửa
          value={getDeepValue(metadata, 'blocklyConfig.startBlocks') || ''}
          onChange={(e) => handleComplexChange('blocklyConfig.startBlocks', e.target.value)}
          rows={26} // Tăng chiều cao của textarea từ 4 lên 8 dòng
        />
      </div>

      <div className="label-with-button">
        <h3 className="props-title" style={{ marginBottom: 0 }}>Solution</h3>
        {/* SỬA LỖI: Truyền các config cần thiết vào hàm onSolveMaze khi click.
            Điều này đảm bảo rằng solver nhận được dữ liệu chính xác để hoạt động. */}
        <button
          className="json-action-btn"
          onClick={() => onSolveMaze({
            gameConfig: metadata.gameConfig,
            // SỬA LỖI: Đảm bảo solutionConfig luôn là một object, kể cả khi metadata.solution là null/undefined.
            solutionConfig: metadata.solution || { rawActions: [], structuredSolution: {} },
            blocklyConfig: metadata.blocklyConfig
          })}>
          Tự động giải
        </button>
      </div>
      <div className="quest-prop-group">
        <label>Raw Actions (JSON)</label>
        <textarea
          className="json-editor-small"
          value={localRawActions}
          onChange={(e) => setLocalRawActions(e.target.value)}
          onBlur={() => {
            if (localRawActions.trim()) { // Chỉ parse nếu chuỗi không rỗng
              try {
                const parsed = JSON.parse(localRawActions);
                handleComplexChange('solution.rawActions', parsed);
              } catch (error) {
                console.warn("Invalid JSON in rawActions field", error);
              }
            }
          }}
          rows={6}
        />
      </div>
      <div className="quest-prop-group">
        <div className="label-with-button">
          <label>Basic Solution (JSON)</label>
          {/* THÊM MỚI: Nút để tạo start blocks từ lời giải cơ bản */}
          <button className="json-action-btn" onClick={() => handleCompileToXml(localBasicSolution, 'Basic Solution')}>
            Tạo Start Blocks từ Lời Giải Cơ Bản
          </button>
        </div>
        <textarea
          className="json-editor-small"
          value={localBasicSolution}
          onChange={(e) => setLocalBasicSolution(e.target.value)}
          onBlur={() => {
            if (localBasicSolution.trim()) {
              try {
                const parsed = JSON.parse(localBasicSolution);
                handleComplexChange('solution.basicSolution', parsed);
              } catch (error) {
                console.warn("Invalid JSON in basicSolution field", error);
              }
            }
          }}
          rows={10}
        />
      </div>
      <div className="quest-prop-group">
        <div className="label-with-button">
          <label>Structured Solution (JSON)</label>
          {/* THAY ĐỔI: Đổi tên nút và gọi hàm dùng chung */}
          <button className="json-action-btn" onClick={() => handleCompileToXml(localStructuredSolution, 'Structured Solution')}>
            Tạo Start Blocks từ Lời Giải Tối Ưu
          </button>
        </div>
        <textarea
          className="json-editor-small"
          value={localStructuredSolution}
          onChange={(e) => setLocalStructuredSolution(e.target.value)}
          onBlur={() => {
            if (localStructuredSolution.trim()) { // Chỉ parse nếu chuỗi không rỗng
              try {
                const parsed = JSON.parse(localStructuredSolution);
                handleComplexChange('solution.structuredSolution', parsed);
              } catch (error) {
                console.warn("Invalid JSON in structuredSolution field", error);
              }
            }
          }}
          rows={10}
        />
      </div>
      {/* Giữ lại trình soạn thảo solution tổng thể để tham khảo */}
      <div className="quest-prop-group">
        <label style={{ color: '#888' }}>Full Solution Object (Reference)</label>
        <textarea
          className="json-editor-small"
          value={localSolution}
          onChange={(e) => setLocalSolution(e.target.value)}
          // Cập nhật state cha khi người dùng click ra ngoài, đồng thời validate JSON
          onBlur={() => {
            if (localSolution.trim()) { // Chỉ parse nếu chuỗi không rỗng
              try {
                const parsed = JSON.parse(localSolution);
                handleComplexChange('solution', parsed);
              } catch (error) {
                console.warn("Invalid JSON in solution field", error);
              } // Nếu JSON không hợp lệ, không cập nhật state cha nhưng giữ nguyên text đã nhập
            }
          }}
          rows={10}
        />  
      </div>
    </aside>
  );
}
