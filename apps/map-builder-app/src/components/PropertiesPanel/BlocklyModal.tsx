import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import * as En from 'blockly/msg/en'; // Import gói ngôn ngữ tiếng Anh
import 'blockly/blocks'; // <-- Thêm dòng này để import các khối lệnh tiêu chuẩn
import './BlocklyModal.css';
// --- Bắt đầu thay đổi cho giao diện Scratch ---
const customCategoryStyles = {
  'events_category': { colour: '#ff6f00ff' }, // Vàng cho Sự kiện
  'movement_category': { colour: '#4C97FF' }, // Xanh dương cho Di chuyển
  'actions_category': { colour: '#5BC55B' }, // Xanh lá cho Hành động
  'logic_category': { colour: '#5B80A5' }, // Ghi đè màu Logic nếu muốn
  'loops_category': { colour: '#FFAB19' }, // Ghi đè màu Vòng lặp nếu muốn
};

// Tạo một theme mới kế thừa từ Zelos và thêm các style tùy chỉnh
const scratchWithCustomCategoriesTheme = Blockly.Theme.defineTheme('scratch_custom', {
  name: 'scratch_custom', // <-- Thêm thuộc tính name vào đây
  base: Blockly.Themes.Zelos, // Kế thừa từ theme Zelos
  categoryStyles: {
    ...Blockly.Themes.Zelos.categoryStyles, // Lấy tất cả style gốc của Zelos
    ...customCategoryStyles, // Ghi đè và bổ sung các style của chúng ta
  },
  blockStyles: {
    ...Blockly.Themes.Zelos.blockStyles, // Lấy tất cả style khối lệnh gốc của Zelos
    // SAO CHÉP TRỰC TIẾP CÁC STYLE CẦN THIẾT TỪ MAZE THEME
    'events_category': mazeTheme.blockStyles['events_category'],
    'movement_category': mazeTheme.blockStyles['movement_category'],
    'actions_category': mazeTheme.blockStyles['actions_category'],
  },
  fontStyle: { family: 'sans-serif', weight: '700', size: 12 },
});
// --- Kết thúc thay đổi ---
// Import các thành phần cần thiết từ quest-player
import { initMazeBlocks, mazeTheme } from './blocks';

interface BlocklyModalProps {
  initialXml: string;
  onClose: () => void;
  onSave: (xml: string) => void;
}

// Tạo một hàm dịch giả lập (dummy t function)
// Nó sẽ trả về giá trị mặc định (nếu có) hoặc chính key.
const dummyT = (key: any, options?: any): string => {
  // Nếu options là một chuỗi, nó là defaultValue
  if (typeof options === 'string') {
    return options;
  }

  // Nếu options là một object (cho interpolation),
  // tạo một chuỗi đơn giản bao gồm key và tất cả các placeholder.
  if (typeof key === 'string' && typeof options === 'object' && options !== null) {
    const placeholders = Object.values(options).join(' ');
    return `${key} ${placeholders}`;
  }
  return key; // Trả về key nếu không có options
};

// Gọi hàm init từ quest-player để đăng ký tất cả các khối lệnh một lần duy nhất
// khi module này được tải.
initMazeBlocks(dummyT as any);

// Định nghĩa Toolbox ngay trong code
const toolboxJson = {
  'kind': 'categoryToolbox', // Thay đổi thành categoryToolbox để hỗ trợ danh mục
  'contents': [
    {
      'kind': 'category',
      'name': '%{BKY_GAMES_CATMOVEMENT}',
      'categorystyle': 'movement_category',
      'contents': [
        { 'kind': 'block', 'type': 'maze_moveForward' },
        { 'kind': 'block', 'type': 'maze_jump' },
        { 'kind': 'block', 'type': 'maze_turn' },
      ]
    },
    {
      'kind': 'category',
      'name': '%{BKY_GAMES_CATLOOPS}',
      'categorystyle': 'loops_category',
      'contents': [
        { 'kind': 'block', 'type': 'maze_forever' },
        { 'kind': 'block', 'type': 'controls_whileUntil' },
        { 'kind': 'block', 'type': 'maze_repeat', 'inputs': { 'TIMES': { 'shadow': { 'type': 'math_number', 'fields': { 'NUM': 5 }}}}}
      ]
    },
    {
      'kind': 'category',
      'name': '%{BKY_GAMES_CATLOGIC}',
      'categorystyle': 'logic_category',
      'contents': [
        { 'kind': 'block', 'type': 'controls_if' },
        { 'kind': 'block', 'type': 'logic_compare' },
        { 'kind': 'block', 'type': 'logic_operation' },
        { 'kind': 'block', 'type': 'logic_negate' },
        { 'kind': 'block', 'type': 'logic_boolean' },
        { 'kind': 'block', 'type': 'maze_is_path' },
        { 'kind': 'block', 'type': 'maze_is_item_present' },
        { 'kind': 'block', 'type': 'maze_is_switch_state' },
        { 'kind': 'block', 'type': 'maze_at_finish' }
      ]
    },
    {
      'kind': 'category',
      'name': '%{BKY_GAMES_CATACTIONS}',
      'categorystyle': 'actions_category',
      'contents': [
        { 'kind': 'block', 'type': 'maze_collect' },
        { 'kind': 'block', 'type': 'maze_toggle_switch' }
      ]
    },
    {
      'kind': 'category',
      'name': '%{BKY_GAMES_CATMATH}',
      'categorystyle': 'math_category',
      'contents': [
        { 'kind': 'block', 'type': 'maze_item_count' },
        { 'kind': 'block', 'type': 'math_number' },
        { 'kind': 'block', 'type': 'math_arithmetic', 'inputs': { 'A': { 'shadow': { 'type': 'math_number', 'fields': { 'NUM': 1 }}}, 'B': { 'shadow': { 'type': 'math_number', 'fields': { 'NUM': 1 }}} }}
      ]
    },
    { 'kind': 'sep' }, // Đường kẻ phân cách
    { 'kind': 'category', 'name': '%{BKY_GAMES_CATVARIABLES}', 'custom': 'VARIABLE', 'categorystyle': 'variable_category' },
    { 'kind': 'category', 'name': '%{BKY_GAMES_CATPROCEDURES}', 'custom': 'PROCEDURE', 'categorystyle': 'procedure_category' }
  ]
};

export function BlocklyModal({ initialXml, onClose, onSave }: BlocklyModalProps) {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [currentXml, setCurrentXml] = useState(initialXml);

  useEffect(() => {
    // Thiết lập ngôn ngữ cho Blockly
    // Ép kiểu 'En' thành 'any' để vượt qua lỗi kiểm tra kiểu của TypeScript.
    Blockly.setLocale(En as any);

    if (blocklyDiv.current && !workspaceRef.current) {
      // Khởi tạo Blockly workspace
      const workspace = Blockly.inject(blocklyDiv.current, {
        toolbox: toolboxJson, // Sử dụng toolbox đã định nghĩa ở trên
        theme: scratchWithCustomCategoriesTheme, // <-- Sử dụng theme đã tùy chỉnh của chúng ta
        renderer: 'zelos', // <-- Sử dụng renderer Zelos
        scrollbars: true,
        zoom: {
          controls: true,
          wheel: true,
          startScale: 1.0,
          maxScale: 3,
          minScale: 0.3,
          scaleSpeed: 1.2,
        },
      });
      workspaceRef.current = workspace;

      // Load XML ban đầu vào workspace
      if (initialXml) {
        const xmlDom = Blockly.utils.xml.textToDom(initialXml);
        Blockly.Xml.domToWorkspace(xmlDom, workspace);
      }

      // Lắng nghe sự kiện thay đổi để cập nhật XML
      workspace.addChangeListener(() => {
        // 1. Tạo DOM XML không có thuộc tính 'id'
        const xmlDom = Blockly.Xml.workspaceToDom(workspace, true);

        // 2. Xóa các thuộc tính 'x' và 'y' khỏi các khối cấp cao nhất
        for (const child of Array.from(xmlDom.children)) {
          if (child.nodeName.toLowerCase() === 'block') {
            child.removeAttribute('x');
            child.removeAttribute('y');
          }
        }

        // 3. Chuyển DOM thành chuỗi và loại bỏ namespace 'xmlns'
        // Sử dụng XMLSerializer để có quyền kiểm soát tốt hơn
        const serializer = new XMLSerializer();
        let xmlText = serializer.serializeToString(xmlDom);

        // Loại bỏ namespace mà serializer có thể thêm vào
        xmlText = xmlText.replace(/ xmlns="https:\/\/developers\.google\.com\/blockly\/xml"/g, '');

        setCurrentXml(xmlText); // Cập nhật state với XML đã được chuẩn hóa
      });
    }

    // Cleanup khi component unmount
    return () => {
      workspaceRef.current?.dispose();
      workspaceRef.current = null;
    };
  }, [initialXml]);

  return (
    <div className="blockly-modal-overlay">
      <div className="blockly-modal-content">
        <div className="blockly-modal-header">
          <h2>Chỉnh sửa Start Blocks</h2>
          <button onClick={() => onSave(currentXml)} className="modal-btn save-btn">Lưu & Đóng</button>
          <button onClick={onClose} className="modal-btn close-btn">Đóng</button>
        </div>
        <div className="blockly-container" ref={blocklyDiv}></div>
      </div>
    </div>
  );
}