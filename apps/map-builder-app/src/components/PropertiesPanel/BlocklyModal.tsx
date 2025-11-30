import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import * as En from 'blockly/msg/en'; // Import gói ngôn ngữ tiếng Anh
import Dark from '@blockly/theme-dark'; // Import theme tối
import { useTranslation } from 'react-i18next'; // 1. Import hook useTranslation
import { TFunction } from 'i18next';
import 'blockly/blocks'; // <-- Thêm dòng này để import các khối lệnh tiêu chuẩn
import './BlocklyModal.css';
// --- Bắt đầu thay đổi cho giao diện Scratch ---
const customCategoryStyles = {
  'events_category': { colour: '#ff6f00ff' }, // Vàng cho Sự kiện
  'movement_category': { colour: '#4C97FF' }, // Xanh dương cho Di chuyển
  'actions_category': { colour: '#995ba5' }, // Tím cho Hành động
  'logic_category': { colour: '#5B80A5' }, // Ghi đè màu Logic nếu muốn
  'loops_category': { colour: '#FFAB19' }, // Ghi đè màu Vòng lặp nếu muốn
  'math_category': { colour: '#59C059' }, // Xanh lá cho Toán
  'variable_category': { colour: '#FF8C1A' }, // Cam cho Biến
  'procedure_category': { colour: '#FF6680' }, // Hồng cho Hàm
};

// Tạo một theme mới kế thừa từ Zelos và thêm các style tùy chỉnh
const scratchWithCustomCategoriesTheme = Blockly.Theme.defineTheme('scratch_custom', {
  name: 'scratch_custom', // <-- Thêm thuộc tính name vào đây
  base: Dark, // Kế thừa từ theme Dark
  categoryStyles: {
    ...Dark.categoryStyles, // Lấy tất cả style gốc của Dark
    ...customCategoryStyles, // Ghi đè và bổ sung các style của chúng ta
  },
  blockStyles: {
    ...Blockly.Themes.Zelos.blockStyles, // Lấy style khối từ theme sáng để giữ màu gốc
    'events_category': { "colourPrimary": "#ff6f00", "colourTertiary": "#c55600" },
    'movement_category': { "colourPrimary": "#4C97FF", "colourTertiary": "#3373CC" },
    'actions_category': { "colourPrimary": "#995ba5", "colourTertiary": "#7d4a88" },
    'loops_category': { "colourPrimary": "#FFAB19", "colourTertiary": "#CF8B17" },
    'logic_category': { "colourPrimary": "#5B80A5", "colourTertiary": "#4A6A88" },
    // Ghi đè style của các khối lệnh tiêu chuẩn để chúng có màu của danh mục
    'loop_blocks': { "colourPrimary": "#FFAB19", "colourTertiary": "#CF8B17" },
    'logic_blocks': { "colourPrimary": "#5B80A5", "colourTertiary": "#4A6A88" },
    'math_blocks': { "colourPrimary": "#59C059", "colourTertiary": "#46A946" },
  },
  fontStyle: { family: 'sans-serif', weight: '700', size: 12 },
});
// --- Kết thúc thay đổi ---
// Import các thành phần cần thiết từ quest-player
import { questPlayerResources } from '@repo/quest-player/i18n';
import { initMazeBlocks } from './blocks';

interface BlocklyModalProps {
  initialXml: string;
  onClose: () => void;
  onSave: (xml: string) => void;
}

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
  const { t, i18n } = useTranslation(); // 2. Lấy hàm t và i18n instance
  const [currentXml, setCurrentXml] = useState(initialXml);

  useEffect(() => {
    // Hàm dịch trực tiếp toolbox JSON bằng i18next
    const getTranslatedToolbox = (t: TFunction) => {
      // Chuyển toolbox thành chuỗi JSON
      let toolboxString = JSON.stringify(toolboxJson);
      // Tìm và thay thế tất cả các chuỗi %{...}
      toolboxString = toolboxString.replace(/%\{BKY_([^}]+)\}/g, (match, key) => {
        // Chuyển đổi BKY_GAMES_CATMOVEMENT thành Games.catMovement
        const i18nKey = key.replace(/_/g, '.').toLowerCase();

        return t(i18nKey, { defaultValue: match }); // Dịch, nếu không có thì trả về chuỗi gốc %{...}
      });
      // Chuyển chuỗi JSON đã dịch trở lại thành đối tượng
      return JSON.parse(toolboxString);
    };

    // Chỉ khởi tạo workspace KHI i18next đã sẵn sàng và div đã tồn tại
    if (blocklyDiv.current && !workspaceRef.current && i18n.isInitialized) {
      // 1. Thiết lập ngôn ngữ gốc cho Blockly để các khối chuẩn có bản dịch.
      Blockly.setLocale(En as any);

      // 3. Khởi tạo các khối lệnh custom (maze).
      // Hàm này sẽ sử dụng các bản dịch đã được nạp ở bước trên.
      initMazeBlocks(t);

      // 4. Khởi tạo Blockly workspace với toolbox và theme đã được dịch.
      // Sử dụng convertToolboxDefToJson để đảm bảo các chuỗi %{...} được thay thế
      const translatedToolbox = getTranslatedToolbox(t);

      // Chỉ inject workspace nếu toolbox đã được dịch thành công
      if (translatedToolbox) {
        const workspace = Blockly.inject(blocklyDiv.current, {
          toolbox: translatedToolbox, // Sử dụng toolbox đã được dịch
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
    } else if (workspaceRef.current && i18n.isInitialized) {
      // Nếu workspace đã tồn tại và ngôn ngữ có thể đã thay đổi,
      // cập nhật lại toolbox để hiển thị đúng tên category.

      // Khởi tạo lại các khối lệnh để cập nhật bản dịch trong định nghĩa khối (nếu có)
      initMazeBlocks(t);

      // Dịch lại toolbox và cập nhật
      const updatedToolbox = getTranslatedToolbox(t);
      if (updatedToolbox) {
        workspaceRef.current.updateToolbox(updatedToolbox as Blockly.utils.toolbox.ToolboxDefinition);
      }
    }

    // Cleanup khi component unmount
    return () => {
      workspaceRef.current?.dispose();
      workspaceRef.current = null;
    };
  }, [initialXml, t, i18n.isInitialized, i18n.language]); // Cập nhật dependency array

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