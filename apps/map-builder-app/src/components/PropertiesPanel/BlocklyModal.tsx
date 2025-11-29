import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import * as En from 'blockly/msg/en'; // Import gói ngôn ngữ tiếng Anh
import './BlocklyModal.css';
// Import các thành phần cần thiết từ quest-player
import { initMazeBlocks } from '@thanh01.pmt/quest-player';
import type { TFunction as I18nextTFunction } from 'i18next';

interface BlocklyModalProps {
  initialXml: string;
  onClose: () => void;
  onSave: (xml: string) => void;
}

// Tạo một hàm dịch giả lập (dummy t function)
// Nó sẽ trả về giá trị mặc định (nếu có) hoặc chính key.
const dummyT = (key: string, options?: string | Record<string, any>): string => {
  // Nếu options là một chuỗi, nó là defaultValue
  if (typeof options === 'string') {
    return options;
  }

  // Nếu options là một object (cho interpolation),
  // tạo một chuỗi đơn giản bao gồm key và tất cả các placeholder.
  if (typeof options === 'object' && options !== null) {
    const placeholders = Object.values(options).join(' ');
    return `${key} ${placeholders}`;
  }
  return key; // Trả về key nếu không có options
};

// Gọi hàm init từ quest-player để đăng ký tất cả các khối lệnh một lần duy nhất
// khi module này được tải.
initMazeBlocks(dummyT as I18nextTFunction);

// Định nghĩa Toolbox ngay trong code
const toolboxJson = {
  'kind': 'flyoutToolbox',
  'contents': [
    // Lấy danh sách các khối lệnh từ file blocks.ts của player
    { 'kind': 'block', 'type': 'maze_start' },
    { 'kind': 'block', 'type': 'maze_moveForward' },
    { 'kind': 'block', 'type': 'maze_jump' },
    { 'kind': 'block', 'type': 'maze_turn' },
    { 'kind': 'block', 'type': 'maze_collect' },
    { 'kind': 'block', 'type': 'maze_toggle_switch' },
    { 'kind': 'block', 'type': 'maze_forever' },
    { 'kind': 'block', 'type': 'maze_repeat' },
    { 'kind': 'block', 'type': 'maze_is_path' },
    { 'kind': 'block', 'type': 'maze_is_item_present' },
    { 'kind': 'block', 'type': 'maze_is_switch_state' },
    { 'kind': 'block', 'type': 'maze_at_finish' },
    { 'kind': 'block', 'type': 'maze_item_count' },
    { 'kind': 'block', 'type': 'math_number' }, // Giữ lại các khối cơ bản
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