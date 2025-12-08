import { useState, useEffect } from 'react';
import _ from 'lodash'; // Import lodash để xử lý object an toàn
import './QuestDetailsPanel.css';
import { BlocklyModal } from '../PropertiesPanel/BlocklyModal'; // Import modal mới
import '../PropertiesPanel/BlocklyModal.css'; // Import CSS cho modal

import { toolboxPresets } from '../../config/toolboxPresets'; // THÊM MỚI: Import danh sách toolbox
interface QuestDetailsPanelProps {
  metadata: Record<string, any> | null;
  onMetadataChange: (path: string, value: any) => void;
  onSolveMaze: () => void; // SỬA ĐỔI: Hàm giải không cần tham số nữa
}

// Helper để lấy giá trị lồng sâu trong object
// Cập nhật: Hàm này giờ sẽ nhận một mảng các key để tránh xung đột khi key chứa dấu chấm.
const getDeepValue = (obj: any, path: string) => {
  // Tách đường dẫn chỉ ở những dấu chấm không nằm trong key của translation
  // Cách tiếp cận đơn giản và an toàn hơn là truy cập từng cấp
  return path.split('.').reduce((o, k) => (o || {})[k], obj);
};

/**
 * [REWRITTEN] Biên dịch một đối tượng structuredSolution (JSON) thành chuỗi XML của Blockly.
 * Hàm này sử dụng DOM API để xây dựng cây XML một cách an toàn và chính xác,
 * thay vì ghép chuỗi thủ công.
 * @param structuredSolution Đối tượng chứa `main` và `procedures`.
 * @returns Một chuỗi XML hoàn chỉnh.
 */
const jsonToXml = (structuredSolution: any): string => {
  const doc = document.implementation.createDocument(null, 'xml', null);

  // Hàm đệ quy để chuyển đổi một mảng hành động thành các khối XML và nối chúng
  const jsonToXmlRecursive = (actions: any[], parent: Element): Element | null => {
    let lastBlock: Element | null = null;

    actions.forEach(action => {
      const block = doc.createElement('block');
      // SỬA LỖI: Xử lý khối gọi hàm tạm thời 'CALL' và chuyển nó thành 'procedures_callnoreturn'
      if (action.type === 'CALL' && action.name) {
        block.setAttribute('type', 'procedures_callnoreturn');
        const mutation = doc.createElement('mutation');
        mutation.setAttribute('name', action.name);
        block.appendChild(mutation);
      } else {
        block.setAttribute('type', action.type);
      }

      // Xử lý các loại khối khác nhau
      if (action.type === 'maze_turn') {
        const field = doc.createElement('field');
        field.setAttribute('name', 'DIR');
        field.textContent = action.direction;
        block.appendChild(field);
      } else if (action.type === 'maze_is_path') {
        // SỬA LỖI: Thêm logic để xử lý hướng cho khối 'maze_is_path'.
        const field = doc.createElement('field');
        field.setAttribute('name', 'DIR');
        field.textContent = action.direction; // Lấy hướng từ JSON
        block.appendChild(field);
      } else if (action.type === 'maze_is_item_present') {
        // THÊM MỚI: Xử lý loại vật phẩm cho khối 'maze_is_item_present'.
        if (action.item_type) {
          const field = doc.createElement('field');
          field.setAttribute('name', 'TYPE');
          field.textContent = action.item_type;
          block.appendChild(field);
        }
      } else if (action.type === 'maze_is_switch_state') {
        // THÊM MỚI: Xử lý trạng thái cho khối 'maze_is_switch_state'.
        if (action.state) {
          const field = doc.createElement('field');
          field.setAttribute('name', 'STATE');
          field.textContent = action.state;
          block.appendChild(field);
        }
      } else if (action.type === 'maze_repeat' || action.type === 'maze_for') {
        const value = doc.createElement('value');
        value.setAttribute('name', 'TIMES');
        const shadow = doc.createElement('shadow');
        shadow.setAttribute('type', 'math_number');
        const field = doc.createElement('field');
        field.setAttribute('name', 'NUM');
        field.textContent = action.times?.toString() || '1';
        shadow.appendChild(field);
        value.appendChild(shadow);
        block.appendChild(value);

        if (action.actions && action.actions.length > 0) {
          const statement = doc.createElement('statement');
          statement.setAttribute('name', 'DO');
          jsonToXmlRecursive(action.actions, statement);
          block.appendChild(statement);
        }
      } else if (action.type === 'maze_forever') {
        // THÊM MỚI: Xử lý khối 'maze_forever'
        // Khối này không cần điều kiện, chỉ cần một statement 'DO'
        const statement = doc.createElement('statement');
        statement.setAttribute('name', 'DO');
        jsonToXmlRecursive(action.actions || [], statement);
        block.appendChild(statement);
      }else if (action.type === 'maze_repeat_until') {
        // THÊM MỚI: Xử lý khối 'maze_repeat_until' để tạo ra XML cho 'controls_whileUntil'
        block.setAttribute('type', 'controls_whileUntil');

        const modeField = doc.createElement('field');
        modeField.setAttribute('name', 'MODE');
        modeField.textContent = 'UNTIL'; // Luôn là UNTIL cho 'repeat_until'
        block.appendChild(modeField);

        const value = doc.createElement('value');
        value.setAttribute('name', 'BOOL');
        const conditionBlock = doc.createElement('block');
        // SỬA LỖI: Đảm bảo rằng tên điều kiện từ solver (ví dụ: 'at_finish') được chuyển đổi chính xác
        // thành tên loại khối lệnh trong Blockly (ví dụ: 'maze_at_finish').
        // Logic `maze_${action.condition}` sẽ tự động tạo ra 'maze_at_finish' một cách chính xác.
        conditionBlock.setAttribute('type', `maze_${action.condition}`);
        value.appendChild(conditionBlock);
        block.appendChild(value);

        const statement = doc.createElement('statement');
        statement.setAttribute('name', 'DO');
        jsonToXmlRecursive(action.actions || [], statement);
        block.appendChild(statement);
      } else if (action.type === 'procedures_callnoreturn') {
        const mutation = doc.createElement('mutation');
        mutation.setAttribute('name', action.mutation.name);
        block.appendChild(mutation);
      } else if (action.type === 'controls_if') {
        // THÊM MỚI: Xử lý khối 'controls_if' phức tạp
        const elseIfCount = action.else_if_actions?.length || 0;
        const elseCount = (action.else_actions && action.else_actions.length > 0) ? 1 : 0;

        if (elseIfCount > 0 || elseCount > 0) {
          const mutation = doc.createElement('mutation');
          if (elseIfCount > 0) {
            mutation.setAttribute('elseif', elseIfCount.toString());
          }
          if (elseCount > 0) {
            mutation.setAttribute('else', '1');
          }
          block.appendChild(mutation);
        }

        // Xử lý nhánh IF chính (IF0)
        if (action.condition) {
          const value0 = doc.createElement('value');
          value0.setAttribute('name', 'IF0');
          // Giả định điều kiện là một khối duy nhất
          jsonToXmlRecursive([action.condition], value0);
          block.appendChild(value0);
        }
        if (action.if_actions) {
          const statement0 = doc.createElement('statement');
          statement0.setAttribute('name', 'DO0');
          jsonToXmlRecursive(action.if_actions, statement0);
          block.appendChild(statement0);
        }

        // Xử lý các nhánh ELSEIF (IF1, IF2, ...)
        (action.else_if_actions || []).forEach((elseIfAction: any, index: number) => {
          if (elseIfAction.condition) {
            const valueN = doc.createElement('value');
            valueN.setAttribute('name', `IF${index + 1}`);
            jsonToXmlRecursive([elseIfAction.condition], valueN);
            block.appendChild(valueN);
          }
          if (elseIfAction.actions) {
            const statementN = doc.createElement('statement');
            statementN.setAttribute('name', `DO${index + 1}`);
            jsonToXmlRecursive(elseIfAction.actions, statementN);
            block.appendChild(statementN);
          }
        });

        // Xử lý nhánh ELSE
        if (action.else_actions) {
          const elseStatement = doc.createElement('statement');
          elseStatement.setAttribute('name', 'ELSE');
          jsonToXmlRecursive(action.else_actions, elseStatement);
          block.appendChild(elseStatement);
        }
      }

      if (lastBlock) {
        const next = doc.createElement('next');
        next.appendChild(block);
        lastBlock.appendChild(next);
      } else {
        parent.appendChild(block);
      }
      lastBlock = block;
    });

    return lastBlock;
  };

  // 1. Tạo khối bắt đầu (maze_start)
  const startBlock = doc.createElement('block');
  startBlock.setAttribute('type', 'maze_start');
  startBlock.setAttribute('deletable', 'false');
  startBlock.setAttribute('movable', 'false');
  
  if (structuredSolution.main && structuredSolution.main.length > 0) {
    const mainStatement = doc.createElement('statement');
    mainStatement.setAttribute('name', 'DO');
    jsonToXmlRecursive(structuredSolution.main, mainStatement);
    startBlock.appendChild(mainStatement);
  }
  doc.documentElement.appendChild(startBlock);

  // 2. Tạo các khối định nghĩa hàm (procedures)
  if (structuredSolution.procedures) {
    let yOffset = 100;
    for (const procName in structuredSolution.procedures) {
      const procActions = structuredSolution.procedures[procName];
      const procBlock = doc.createElement('block');
      procBlock.setAttribute('type', 'procedures_defnoreturn');
      procBlock.setAttribute('x', '400');
      procBlock.setAttribute('y', yOffset.toString());

      const field = doc.createElement('field');
      field.setAttribute('name', 'NAME');
      field.textContent = procName;
      procBlock.appendChild(field);

      if (procActions && procActions.length > 0) {
        const procStatement = doc.createElement('statement');
        procStatement.setAttribute('name', 'STACK');
        jsonToXmlRecursive(procActions, procStatement);
        procBlock.appendChild(procStatement);
      }
      
      doc.documentElement.appendChild(procBlock);
      yOffset += 150; // Tăng khoảng cách cho hàm tiếp theo
    }
  }

  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
};

/**
 * HÀM MỚI: Chuẩn hóa các hành động trong một lời giải (basic hoặc structured).
 * Đảm bảo các hành động như rẽ trái/phải luôn có định dạng { type: 'maze_turn', direction: '...' }.
 * @param actions Mảng các hành động cần chuẩn hóa.
 * @returns Mảng các hành động đã được chuẩn hóa.
 */
const normalizeActions = (actions: any[]): any[] => {
  if (!Array.isArray(actions)) return [];
  return actions.map(action => {
    if (!action || typeof action !== 'object') return action;

    // Chuẩn hóa các hành động rẽ
    if (action.type === 'maze_turnLeft' || action.type === 'turnLeft') {
      return { type: 'maze_turn', direction: 'turnLeft' };
    }
    if (action.type === 'maze_turnRight' || action.type === 'turnRight') {
      return { type: 'maze_turn', direction: 'turnRight' };
    }
    // Chuẩn hóa toggleSwitch
    if (action.type === 'maze_toggleSwitch') {
      return { type: 'maze_toggle_switch' };
    }

    // Đệ quy cho các khối lồng nhau
    if (action.actions && Array.isArray(action.actions)) {
      return { ...action, actions: normalizeActions(action.actions) };
    }

    return action;
  });
};

const normalizeSolution = (solution: any) => {
  if (!solution) return {};
  const newSolution = _.cloneDeep(solution);
  if (newSolution.basicSolution && newSolution.basicSolution.main) {
    newSolution.basicSolution.main = normalizeActions(newSolution.basicSolution.main);
  }
  // Có thể mở rộng để chuẩn hóa cả structuredSolution nếu cần
  return newSolution;
};

export function QuestDetailsPanel({ metadata, onMetadataChange, onSolveMaze }: QuestDetailsPanelProps) {
  // SỬA LỖI: Tái cấu trúc hàm để có thể xử lý nhiều thay đổi cùng lúc,
  // tránh việc gọi nhiều lần gây ghi đè state.
  const handleComplexChange = (...updates: { path: string; value: any }[]) => {
    if (!metadata) return;

    // Tạo một bản sao sâu của metadata để tránh thay đổi trực tiếp state
    const newMetadata = _.cloneDeep(metadata);

    // Áp dụng tất cả các cập nhật vào bản sao
    updates.forEach(({ path, value }) => {
      _.set(newMetadata, path, value);
    });

    // Gọi onMetadataChange một lần duy nhất với toàn bộ object đã được cập nhật
    onMetadataChange('__OVERWRITE__', newMetadata);
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
      // THAY ĐỔI: Chuẩn hóa solution trước khi đưa vào state cục bộ.
      // Điều này đảm bảo dữ liệu đọc từ file JSON (có thể ở định dạng cũ)
      // được chuyển đổi sang định dạng chuẩn trước khi hiển thị và sử dụng.
      const normalizedSolution = normalizeSolution(metadata.solution);
      const solution = normalizedSolution || { rawActions: [], structuredSolution: {}, basicSolution: {} };
      setLocalSolution(JSON.stringify(solution, null, 2));
      setLocalBasicSolution(JSON.stringify(solution.basicSolution || {}, null, 2));
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
        alert(`Error: ${sourceName} (JSON) is empty. Please enter data.`);
        return;
      }

      const structuredSolution = JSON.parse(jsonSource);

      // B2: Kiểm tra xem dữ liệu đã parse có thuộc tính 'main' là một mảng không
      if (!structuredSolution || !Array.isArray(structuredSolution.main)) {
        alert('Error: Data in Structured Solution must be a JSON object with a "main" property that is an array of actions.');
        return;
      }

      // Sử dụng hàm jsonToXml đã được tái cấu trúc
      const finalXml = jsonToXml(structuredSolution);

      handleComplexChange({ path: 'blocklyConfig.startBlocks', value: finalXml }); // Lưu chuỗi "sạch"
      alert('Successfully created Start Blocks XML!');
    } catch (error) {
      console.error("Lỗi khi biên dịch JSON sang XML:", error);
      alert(`Error: Could not parse ${sourceName}. Please check the JSON format.\n\n${error}`);
    }
  };
  // --- END: HÀM XỬ LÝ SỰ KIỆN ---

  if (!metadata) {
    return (
      <aside className="quest-details-panel empty-state">
        <p>Import a Quest file to edit details.</p>
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
            handleComplexChange({ path: 'blocklyConfig.startBlocks', value: newXml }); // Lưu chuỗi "sạch" vào metadata
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
          onBlur={(e) => handleComplexChange({ path: 'id', value: e.target.value })}
        />
      </div>

      <div className="quest-prop-group">
        <label>Level</label>
        <input
          type="number"
          defaultValue={metadata.level || 0}
          onBlur={(e) => handleComplexChange({ path: 'level', value: parseInt(e.target.value, 10) })}
        />
      </div>

      <h3 className="props-title">Translations</h3>
      {/* Chỉ render các trường translations khi các key tồn tại để đảm bảo getDeepValue hoạt động đúng */}
      {titleKey && descriptionKey && (
        <>
          <div className="quest-prop-group">
            <label>Title (VI)</label>
            <input
              type="text"
              defaultValue={metadata?.translations?.vi?.[titleKey] || ''}
              onBlur={(e) => handleComplexChange({ path: `translations.vi['${titleKey}']`, value: e.target.value })}
            />
          </div>
          <div className="quest-prop-group">
            <label>Description (VI)</label>
            <textarea
              defaultValue={metadata?.translations?.vi?.[descriptionKey] || ''}
              onBlur={(e) => handleComplexChange({ path: `translations.vi['${descriptionKey}']`, value: e.target.value })}
            />
          </div>

          <div className="quest-prop-group">
            <label>Title (EN)</label>
            <input
              type="text"
              defaultValue={metadata?.translations?.en?.[titleKey] || ''}
              onBlur={(e) => handleComplexChange({ path: `translations.en['${titleKey}']`, value: e.target.value })}
            />
          </div>
          <div className="quest-prop-group">
            <label>Description (EN)</label>
            <textarea
              defaultValue={metadata?.translations?.en?.[descriptionKey] || ''}
              onBlur={(e) => handleComplexChange({ path: `translations.en['${descriptionKey}']`, value: e.target.value })}
            />
          </div>
        </>
      )}

      <h3 className="props-title">Blockly Config</h3>
      {/* --- THÊM MỚI: Dropdown chọn Toolbox --- */}
      <div className="quest-prop-group">
        <label>Toolbox Preset</label>
        <select
          className="custom-select"
          // SỬA ĐỔI: Chuyển thành controlled component bằng `value` để đảm bảo UI luôn đồng bộ.
          value={getDeepValue(metadata, 'blocklyConfig.toolboxPresetKey') || ''}
          onChange={(e) => {
            const presetKey = e.target.value;
            const selectedToolbox = toolboxPresets[presetKey];
            if (selectedToolbox) {
              // SỬA LỖI: Gọi handleComplexChange một lần với cả hai cập nhật
              handleComplexChange(
                { path: 'blocklyConfig.toolboxPresetKey', value: presetKey },
                { path: 'blocklyConfig.toolbox', value: selectedToolbox }
              );
            }
          }}
        >
          <option value="" disabled>-- Select a toolbox --</option>
          {Object.keys(toolboxPresets).map(key => (
            <option key={key} value={key}>
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      <div className="quest-prop-group">
        <label>Max Blocks</label>
        <input
          type="number"
          // SỬA LỖI: Sử dụng `value` thay vì `defaultValue` để biến nó thành một "controlled component".
          // Điều này đảm bảo input luôn hiển thị giá trị mới nhất từ prop `metadata`.
          value={getDeepValue(metadata, 'blocklyConfig.maxBlocks') || ''}
          onChange={(e) => handleComplexChange({ path: 'blocklyConfig.maxBlocks', value: parseInt(e.target.value, 10) || 0 })}
        />
      </div>
      <div className="quest-prop-group">
        <div className="label-with-button">
          <label>Start Blocks (XML)</label>
          <button className="json-action-btn" onClick={() => setBlocklyModalOpen(true)}>
            Show Blocks
          </button>
        </div>
        <textarea
          // SỬA LỖI: Hiển thị giá trị trực tiếp từ metadata và cho phép chỉnh sửa
          value={getDeepValue(metadata, 'blocklyConfig.startBlocks') || ''}
          onChange={(e) => handleComplexChange({ path: 'blocklyConfig.startBlocks', value: e.target.value })}
          rows={26} // Tăng chiều cao của textarea từ 4 lên 8 dòng
        />
      </div>

      <div className="label-with-button">
        <h3 className="props-title" style={{ marginBottom: 0 }}>Solution</h3>
        <button
          className="json-action-btn"
          onClick={onSolveMaze} // SỬA ĐỔI: Gọi trực tiếp hàm onSolveMaze
        >
          Auto-solve
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
                handleComplexChange({ path: 'solution.rawActions', value: parsed });
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
            Create Start Blocks from Basic Solution
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
                handleComplexChange({ path: 'solution.basicSolution', value: parsed });
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
            Create Start Blocks from Optimal Solution
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
                handleComplexChange({ path: 'solution.structuredSolution', value: parsed });
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
                handleComplexChange({ path: 'solution', value: parsed });
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
