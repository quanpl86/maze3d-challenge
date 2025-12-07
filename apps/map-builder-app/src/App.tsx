import { useState, useMemo, useRef, useEffect, useCallback, MouseEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AssetPalette } from './components/AssetPalette';
import { BuilderScene, type SceneController } from './components/BuilderScene';
import { ViewControls } from './components/ViewControls';
import { PropertiesPanel } from './components/PropertiesPanel';
import { QuestDetailsPanel } from './components/QuestDetailsPanel'; // THÊM MỚI
import { Themes } from './components/PropertiesPanel/theme'; // THÊM MỚI: Import theme
import { toolboxPresets } from './config/toolboxPresets'; // THÊM MỚI: Import toolbox presets
import { solveMaze } from './components/QuestDetailsPanel/gameSolver'; // THÊM MỚI: Import solver
import { JsonOutputPanel } from './components/JsonOutputPanel';
import { buildableAssetGroups } from './config/gameAssets';
import { WelcomeModal } from './components/WelcomeModal'; // THÊM MỚI: Import WelcomeModal
import { type BuildableAsset, type PlacedObject, type BuilderMode, type BoxDimensions, type FillOptions, type SelectionBounds, type MapTheme } from './types';
import _ from 'lodash'; // THÊM MỚI: Import lodash để so sánh object
import './App.css';

const defaultAsset = buildableAssetGroups[0]?.items[0];

function App() {
  const [selectedAsset, setSelectedAsset] = useState<BuildableAsset | null>(defaultAsset);
  // --- START: THAY ĐỔI ĐỂ QUẢN LÝ LỊCH SỬ UNDO/REDO ---
  const [isPaletteVisible, setIsPaletteVisible] = useState(true); // State để quản lý hiển thị palette
  const [history, setHistory] = useState<PlacedObject[][]>([[]]); // Mảng lưu các trạng thái của placedObjects
  const [historyIndex, setHistoryIndex] = useState(0); // Con trỏ tới trạng thái hiện tại trong lịch sử
  const placedObjects = useMemo(() => history[historyIndex] || [], [history, historyIndex]);
  // --- START: SỬA LỖI ÁP DỤNG THEME NHIỀU LẦN ---
  // --- END: SỬA LỖI ÁP DỤNG THEME NHIỀU LẦN ---
  const [builderMode, setBuilderMode] = useState<BuilderMode>('build-single');
  const [sidebarWidth, setSidebarWidth] = useState(320); // State cho chiều rộng của sidebar
  const [boxDimensions, setBoxDimensions] = useState<BoxDimensions>({ width: 14, height: 14, depth: 14 });
  
  const [selectionStart, setSelectionStart] = useState<[number, number, number] | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<[number, number, number] | null>(null);
  
  const [fillOptions, setFillOptions] = useState<FillOptions>({ type: 'volume', pattern: 'solid', spacing: 1 });
  
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  
  // State mới để lưu trữ siêu dữ liệu của quest
  const [questMetadata, setQuestMetadata] = useState<Record<string, any> | null>(null);
  // SỬA LỖI: State cho theme hiện tại, được khởi tạo với theme mặc định.
  const [mapTheme, setMapTheme] = useState<MapTheme>(Themes.COMPREHENSIVE_THEMES[0]);
  const [isWelcomeModalVisible, setIsWelcomeModalVisible] = useState(false); // THÊM MỚI: State cho modal hướng dẫn

  const [currentMapFileName, setCurrentMapFileName] = useState<string>('untitled-quest.json');

  // State mới để lưu trữ chuỗi JSON đang được chỉnh sửa trong panel
  const [editedJson, setEditedJson] = useState('');

  // State mới cho menu chuột phải
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    objectId: string | null;
  }>({ visible: false, x: 0, y: 0, objectId: null });
  // State mới để quản lý hiển thị menu phụ của "Đổi Asset"
  const [assetSubMenuVisible, setAssetSubMenuVisible] = useState(false);

  // --- START: SỬA LỖI HIỆU ỨNG ---
  const [isMovingObject, setIsMovingObject] = useState(false);
  // --- END: SỬA LỖI HIỆU ỨNG ---
  const sceneRef = useRef<SceneController>(null);
  const isResizingRef = useRef(false);
  const sidebarRef = useRef<HTMLDivElement>(null); // Ref cho right-sidebar

  // --- START: LOGIC CUỘN SIDEBAR LÊN KHI CHỌN ĐỐI TƯỢNG ---
  useEffect(() => {
    // Kiểm tra localStorage để xem có nên hiển thị modal không
    const shouldShowWelcome = localStorage.getItem('showWelcomeModal') !== 'false';
    if (shouldShowWelcome) {
      setIsWelcomeModalVisible(true);
    }
  }, []); // Chạy một lần duy nhất khi component mount

  useEffect(() => {
    const lastSelectedId = selectedObjectIds[selectedObjectIds.length - 1];
    // Nếu một đối tượng được chọn (và sidebar đã được render)
    if (lastSelectedId && sidebarRef.current) {
      // Cuộn sidebar lên trên cùng một cách mượt mà
      sidebarRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [selectedObjectIds]); // Chạy effect này mỗi khi selectedObjectIds thay đổi

  // --- HÀM TIỆN ÍCH MỚI: Chuẩn hóa URL cho môi trường deploy ---
  const getCorrectedAssetUrl = (url: string): string => {
    // Logic này tìm chuỗi '/public/' và lấy tất cả mọi thứ sau nó,
    // đảm bảo đường dẫn fetch luôn đúng (ví dụ: '/templates/file.json')
    // trên cả local và Netlify.
    const publicIndex = url.indexOf('/public/');
    if (publicIndex !== -1) {
      return url.substring(publicIndex + '/public'.length);
    }
    return url;
  };

  // Đóng context menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(prev => ({ ...prev, visible: false }));
      setAssetSubMenuVisible(false); // Cũng đóng menu phụ
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);
  // --- START: LOGIC THAY ĐỔI KÍCH THƯỚC SIDEBAR ---
  const handleResizeMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize'; // Thay đổi con trỏ chuột
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!isResizingRef.current) return;
      // Tính toán chiều rộng mới, giới hạn từ 280px đến 1000px
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(Math.max(280, Math.min(newWidth, 1400)));
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = 'default'; // Trả lại con trỏ chuột mặc định
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  // --- END: LOGIC THAY ĐỔI KÍCH THƯỚC SIDEBAR ---

  // Hàm mới để cập nhật trạng thái và lưu vào lịch sử
  const setPlacedObjectsWithHistory = useCallback((updater: PlacedObject[] | ((prev: PlacedObject[]) => PlacedObject[])) => {
    const currentObjects = history[historyIndex] || [];
    const newObjects = typeof updater === 'function' ? updater(currentObjects) : updater;

    // Tránh thêm trạng thái trùng lặp vào lịch sử
    if (JSON.stringify(newObjects) === JSON.stringify(currentObjects)) {
      return;
    }

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newObjects);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const togglePalette = () => {
    setIsPaletteVisible(!isPaletteVisible);
  };

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, history.length]);

  // Thêm phím tắt cho Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bỏ qua nếu người dùng đang gõ trong một ô input, select, hoặc textarea
      const activeEl = document.activeElement;
      if (activeEl && ['INPUT', 'SELECT', 'TEXTAREA'].includes(activeEl.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? handleRedo() : handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // --- DI CHUYỂN LÊN TRÊN ĐỂ SỬA LỖI ---
  const selectionBounds: SelectionBounds | null = useMemo(() => {
    if (!selectionStart || !selectionEnd) return null;
    return {
      min: [ Math.min(selectionStart[0], selectionEnd[0]), Math.min(selectionStart[1], selectionEnd[1]), Math.min(selectionStart[2], selectionEnd[2]), ],
      max: [ Math.max(selectionStart[0], selectionEnd[0]), Math.max(selectionStart[1], selectionEnd[1]), Math.max(selectionStart[2], selectionEnd[2]), ],
    };
  }, [selectionStart, selectionEnd]);

  // --- HÀM MỚI: Xoay một hoặc nhiều đối tượng ---
  const handleRotateObject = useCallback((objectIds: string[]) => {
    setPlacedObjectsWithHistory(prev => {
      const objectIdsSet = new Set(objectIds);
      return prev.map(obj => {
        if (objectIdsSet.has(obj.id)) {
          const newRotation: [number, number, number] = [...obj.rotation];
          newRotation[1] += Math.PI / 2; // Xoay 90 độ quanh trục Y
          return { ...obj, rotation: newRotation };
        }
        return obj;
      });
    });
  }, [setPlacedObjectsWithHistory]);

  // Thêm phím tắt Delete/Backspace để xóa đối tượng được chọn
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeEl = document.activeElement;
      // Bỏ qua nếu người dùng đang gõ trong một ô input hoặc select
      if (activeEl && ['INPUT', 'SELECT', 'TEXTAREA'].includes(activeEl.tagName)) {
        return;
      }

      // --- Phím tắt di chuyển đối tượng ---
      if (selectedObjectIds.length > 0) {
        let moved = false;
        // TÍNH NĂNG MỚI: Di chuyển tất cả đối tượng đã chọn mà không bị giới hạn
        // Kích hoạt khi nhấn Ctrl + Shift + Mũi tên
        if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
          if (event.key === 'ArrowUp')    { handleMoveAllObjectsWithoutBounds('z', -1); moved = true; }
          else if (event.key === 'ArrowDown')  { handleMoveAllObjectsWithoutBounds('z', 1); moved = true; }
          else if (event.key === 'ArrowLeft')  { handleMoveAllObjectsWithoutBounds('x', -1); moved = true; }
          else if (event.key === 'ArrowRight') { handleMoveAllObjectsWithoutBounds('x', 1); moved = true; }
        }
        // Logic di chuyển cũ (có giới hạn)
        else if (event.shiftKey) {
          // Khi giữ Shift, chỉ xử lý di chuyển lên/xuống (trục Y)
          if (event.key === 'ArrowUp')      { handleMoveObject(selectedObjectIds, 'y', 1); moved = true; }
          else if (event.key === 'ArrowDown') { handleMoveObject(selectedObjectIds, 'y', -1); moved = true; }
        } 
        else {
          // Khi không giữ Shift, xử lý di chuyển trên mặt phẳng XZ
          if (event.key === 'ArrowUp')    { handleMoveObject(selectedObjectIds, 'z', -1); moved = true; }
          else if (event.key === 'ArrowDown')  { handleMoveObject(selectedObjectIds, 'z', 1); moved = true; }
          else if (event.key === 'ArrowLeft')  { handleMoveObject(selectedObjectIds, 'x', -1); moved = true; }
          else if (event.key === 'ArrowRight') { handleMoveObject(selectedObjectIds, 'x', 1); moved = true; }
        }
        
        if (moved) {
          event.preventDefault(); // Ngăn các hành vi mặc định của trình duyệt
        }
      }

      // THÊM MỚI: Phím tắt Ctrl+A để chọn tất cả
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setSelectedObjectIds(placedObjects.map(obj => obj.id));
      }

      // --- Ưu tiên các phím tắt cho vùng chọn (select area) ---
      if (selectionBounds) {
        const key = event.key.toLowerCase();
        if (key === 'f') {
          event.preventDefault();
          handleSelectionAction('fill');
        } else if (key === 'r') {
          event.preventDefault();
          handleSelectionAction('replace');
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          handleSelectionAction('delete');
        }
      } 
      // --- Nếu không có vùng chọn, xử lý phím tắt cho đối tượng đơn lẻ ---
      else if (selectedObjectIds.length > 0) {
        if (event.key.toLowerCase() === 'c') {
          event.preventDefault();
          handleCopyObject(selectedObjectIds[selectedObjectIds.length - 1]); // Sao chép đối tượng được chọn cuối cùng
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          handleRemoveMultipleObjects(selectedObjectIds);
        } else if (event.key.toLowerCase() === 'r') {
          // THÊM MỚI: Phím tắt xoay đối tượng
          event.preventDefault();
          handleRotateObject(selectedObjectIds);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectIds, selectionBounds, placedObjects, handleRotateObject]); // Thêm handleRotateObject và selectionBounds vào dependencies

  // --- HÀM MỚI: Nhân bản đối tượng ---
  const handleDuplicateObject = (objectId: string) => {
    const objectToDuplicate = placedObjects.find(obj => obj.id === objectId);
    if (!objectToDuplicate) return;

    // Tìm vị trí trống bên cạnh (ưu tiên +X, +Z, +Y)
    const offsets: [number, number, number][] = [[1, 0, 0], [0, 0, 1], [0, 1, 0], [-1, 0, 0], [0, 0, -1], [0, -1, 0]];
    let newPosition: [number, number, number] | null = null;

    for (const offset of offsets) {
      const potentialPos: [number, number, number] = [
        objectToDuplicate.position[0] + offset[0],
        objectToDuplicate.position[1] + offset[1],
        objectToDuplicate.position[2] + offset[2],
      ];
      const posString = potentialPos.join(',');
      if (!placedObjects.some(o => o.position.join(',') === posString)) {
        newPosition = potentialPos;
        break;
      }
    }
    if (newPosition) handleAddObject(newPosition, objectToDuplicate.asset);
  };

  // --- END: THAY ĐỔI ĐỂ QUẢN LÝ LỊCH SỬ UNDO/REDO ---

  const assetMap = useMemo(() => {
    const map = new Map<string, BuildableAsset>();
    buildableAssetGroups.forEach(group => {
      group.items.forEach(item => {
        map.set(item.key, item);
      });
    });
    return map;
  }, []);
  
  // --- START: LOGIC MỚI CHO VIỆC ÁP DỤNG THEME ---
  const handleThemeChange = (newTheme: MapTheme) => {
    const oldTheme = mapTheme; // Lấy theme hiện tại từ state
    const newGroundAsset = assetMap.get(newTheme.ground);
    const newObstacleAsset = assetMap.get(newTheme.obstacle);

    // Nếu không tìm thấy asset tương ứng, không thực hiện thay đổi để tránh lỗi
    if (!newGroundAsset || !newObstacleAsset) {
      console.error("Không tìm thấy asset cho theme mới. Vui lòng kiểm tra lại cấu hình assets và theme.ts.");
      return;
    }

    // Cập nhật lại toàn bộ các đối tượng trên bản đồ
    setPlacedObjectsWithHistory(prevObjects => {
      return prevObjects.map(obj => {
        // Nếu asset của đối tượng là ground của theme cũ -> đổi sang ground của theme mới
        if (obj.asset.key === oldTheme.ground) {
          return { ...obj, asset: newGroundAsset };
        }
        // Nếu asset của đối tượng là obstacle của theme cũ -> đổi sang obstacle của theme mới
        if (obj.asset.key === oldTheme.obstacle) {
          return { ...obj, asset: newObstacleAsset };
        }
        // Giữ nguyên các đối tượng khác
        return obj;
      });
    });

    setMapTheme(newTheme); // Cuối cùng, cập nhật state của theme hiện tại thành theme mới
  };

  // --- HÀM MỚI: Tự động phát hiện và thiết lập theme từ các đối tượng trên bản đồ ---
  const detectAndSetTheme = useCallback((objects: PlacedObject[]) => {
    const objectKeys = new Set(objects.map(o => o.asset.key));
    let bestMatch: MapTheme | null = null;
    let maxMatchCount = -1;

    // Duyệt qua tất cả các theme có sẵn
    for (const theme of Themes.COMPREHENSIVE_THEMES) {
      let currentMatchCount = 0;
      if (objectKeys.has(theme.ground)) currentMatchCount++;
      if (objectKeys.has(theme.obstacle)) currentMatchCount++;

      // Nếu theme này khớp hoàn hảo (cả ground và obstacle), chọn nó ngay lập tức.
      if (currentMatchCount === 2) {
        bestMatch = theme;
        break;
      }
      // Nếu không, tìm theme khớp nhiều nhất.
      if (currentMatchCount > maxMatchCount) {
        maxMatchCount = currentMatchCount;
        bestMatch = theme;
      }
    }
    // Cập nhật state nếu tìm thấy theme phù hợp.
    if (bestMatch) setMapTheme(bestMatch);
  }, []); // Hàm này không có dependencies vì nó chỉ làm việc với tham số đầu vào.
  const selectedObject = useMemo(() => {
    const lastSelectedId = selectedObjectIds[selectedObjectIds.length - 1];
    return placedObjects.find(obj => obj.id === lastSelectedId) || null;
  }, [selectedObjectIds, placedObjects]);

  const outputJsonString = useMemo(() => {
    const blocks = placedObjects.filter(o => o.asset.type === 'block').map(o => ({ modelKey: o.asset.key, position: { x: o.position[0], y: o.position[1], z: o.position[2] } }));
    const collectibles = placedObjects.filter(o => o.asset.type === 'collectible').map((o, i) => ({ id: `c${i + 1}`, type: o.asset.key, position: { x: o.position[0], y: o.position[1], z: o.position[2] } }));
    const interactibles = placedObjects.filter(o => o.asset.type === 'interactible').map(o => ({ id: o.id, ...o.properties, position: { x: o.position[0], y: o.position[1], z: o.position[2] } }));
    
    const finishObject = placedObjects.find(o => o.asset.key === 'finish');
    const finish = finishObject ? { x: finishObject.position[0], y: finishObject.position[1], z: finishObject.position[2] } : null;

    const startObject = placedObjects.find(o => o.asset.key === 'player_start');
    // CẢI TIẾN: Đọc hướng của người chơi từ `properties` của đối tượng,
    // thay vì gán cứng giá trị là 1. Mặc định vẫn là 1 nếu không được chỉ định.
    const players = startObject ? [{ id: "player1", start: { x: startObject.position[0], y: startObject.position[1], z: startObject.position[2], direction: parseFloat(startObject.properties?.direction) || 0 } }] : [];

    const gameConfig = { type: "maze", renderer: "3d", blocks, players, collectibles, interactibles, finish };

    // Nếu có siêu dữ liệu, kết hợp nó với gameConfig mới
    if (questMetadata) {
      const cleanMetadata = _.omit(questMetadata, ['__OVERWRITE__']);
      return JSON.stringify({ ...cleanMetadata, gameConfig }, null, 2);
    }
    
    // Nếu không, chỉ trả về gameConfig
    return JSON.stringify({ gameConfig }, null, 2);
  }, [placedObjects, questMetadata]);

  // Lấy danh sách các asset key đang có trên map để truyền cho ThemeSelector
  const currentMapItems = useMemo(() => {
    const itemKeys = new Set(placedObjects.map(obj => obj.asset.key));
    return Array.from(itemKeys);
  }, [placedObjects]);

  // SỬA LỖI: Tự động phát hiện theme mỗi khi danh sách đối tượng thay đổi.
  useEffect(() => {
    detectAndSetTheme(placedObjects);
  }, [placedObjects, detectAndSetTheme]);

  // Đồng bộ hóa trình soạn thảo JSON khi outputJsonString thay đổi
  useEffect(() => {
    setEditedJson(outputJsonString);
  }, [outputJsonString]);

  const handleSelectAsset = (asset: BuildableAsset) => {
    // --- LOGIC MỚI: THAY THẾ ĐỐI TƯỢNG ĐÃ CHỌN ---
    if (selectedObjectIds.length > 0) {
      setPlacedObjectsWithHistory(prev => {
        const objectIndex = prev.findIndex(obj => obj.id === selectedObjectIds[0]); // Chỉ thay thế đối tượng đầu tiên nếu chọn nhiều
        if (objectIndex === -1) return prev;

        const oldObject = prev[objectIndex];
        let finalObjects = [...prev];

        // Nếu asset mới là loại duy nhất (start/finish), xóa các asset cùng loại khác
        if (asset.key === 'finish' || asset.key === 'player_start') {
          finalObjects = finalObjects.filter(o => o.asset.key !== asset.key || o.id === oldObject.id);
        }

        // Tạo đối tượng mới để thay thế, giữ lại ID và vị trí
        const replacedObject: PlacedObject = {
          id: oldObject.id,
          position: oldObject.position,
          rotation: oldObject.rotation, // Giữ lại rotation khi thay thế
          asset: asset,
          // SỬA LỖI: Giữ lại các thuộc tính cũ và chỉ thêm các thuộc tính mặc định mới nếu chưa có.
          // Điều này đảm bảo giá trị 'direction' đã được chỉnh sửa (dưới dạng số) không bị ghi đè.
          properties: { ...asset.defaultProperties, ...oldObject.properties },
        };

        // Cập nhật đối tượng trong mảng
        const updatedIndex = finalObjects.findIndex(obj => obj.id === selectedObjectIds[0]);
        finalObjects[updatedIndex] = replacedObject;

        return finalObjects;
      });
      // Sau khi thay thế, không cần đặt selectedAsset nữa và giữ nguyên lựa chọn
      setSelectedAsset(null);
      return;
    }
    // --- KẾT THÚC LOGIC MỚI ---

    // Logic cũ: Nếu không có đối tượng nào được chọn, chuẩn bị để xây dựng
    setSelectedAsset(asset);
    setBuilderMode('build-single');
  };
  // --- START: SỬA LỖI HIỆU ỨNG ---
  // Hàm xử lý lựa chọn đối tượng mới, được gọi từ BuilderScene
  const handleSelectObject = (id: string | null, isShiftDown: boolean) => {
    if (isShiftDown) {
      // Logic chọn nhiều đối tượng
      setSelectedObjectIds(prevIds => {
        if (!id) return prevIds; // Giữ nguyên lựa chọn nếu click ra ngoài không gian
        if (prevIds.includes(id)) {
          return prevIds.filter(prevId => prevId !== id); // Bỏ chọn nếu đã có
        } else {
          return [...prevIds, id]; // Thêm vào danh sách chọn
        }
      });
    } else {
      // Logic chọn một đối tượng
      // Bắt đầu di chuyển nếu click vào đối tượng duy nhất đã được chọn
      if (id && selectedObjectIds.length === 1 && selectedObjectIds[0] === id) {
        setIsMovingObject(true);
      } else {
        // Nếu không, chỉ chọn đối tượng đó (hoặc bỏ chọn tất cả nếu click ra ngoài)
        setSelectedObjectIds(id ? [id] : []);
        setIsMovingObject(false);
      }
    }
  };
  // --- END: SỬA LỖI HIỆU ỨNG ---



  const handleModeChange = (mode: BuilderMode) => {
    setBuilderMode(mode);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const handleDimensionsChange = (axis: keyof BoxDimensions, value: number) => setBoxDimensions(prev => ({ ...prev, [axis]: Math.max(1, value) }));
  const handleSelectionBoundsChange = (newBounds: SelectionBounds) => { setSelectionStart(newBounds.min); setSelectionEnd(newBounds.max); };

  const handleAddObject = (gridPosition: [number, number, number], asset: BuildableAsset) => {
    const coordId = gridPosition.join(',');
    if (placedObjects.some(obj => obj.position.join(',') === coordId)) return;

    // --- START: LOGIC MỚI ĐỂ ÁP DỤNG THEME KHI BUILD ---
    let finalAsset = asset;
    const defaultGroundAssetKey = 'ground.checker'; // Giả sử đây là ground mặc định trong palette
    const defaultObstacleAssetKey = 'wall.brick02'; // Giả sử đây là obstacle mặc định trong palette

    // Nếu asset đang được chọn là ground mặc định, hãy thay thế nó bằng ground của theme hiện tại.
    if (asset.key === defaultGroundAssetKey) {
      const themeGroundAsset = assetMap.get(mapTheme.ground);
      if (themeGroundAsset) finalAsset = themeGroundAsset;
    }
    // Nếu asset đang được chọn là obstacle mặc định, hãy thay thế nó bằng obstacle của theme hiện tại.
    else if (asset.key === defaultObstacleAssetKey) {
      const themeObstacleAsset = assetMap.get(mapTheme.obstacle);
      if (themeObstacleAsset) finalAsset = themeObstacleAsset;
    }
    // --- END: LOGIC MỚI ---

    let objectsToAdd: PlacedObject[] = [];
    let objectsToRemove: string[] = [];

    if (finalAsset.key === 'finish' || finalAsset.key === 'player_start') {
      const existing = placedObjects.find(o => o.asset.key === finalAsset.key);
      if (existing) objectsToRemove.push(existing.id);
    }

    const newObject: PlacedObject = {
      // --- LOGIC TẠO ID MỚI ---
      id: (() => {
        // Nếu là switch, tạo id dạng s1, s2, ...
        if (finalAsset.key === 'switch') {
          const switchObjects = placedObjects.filter(o => o.asset.key === 'switch');
          const maxNum = switchObjects.reduce((max, o) => {
            const num = parseInt(o.id.substring(1), 10);
            return isNaN(num) ? max : Math.max(max, num);
          }, 0);
          return `s${maxNum + 1}`;
        }
        // Giữ nguyên logic cũ cho portal và các đối tượng khác
        return finalAsset.defaultProperties?.type === 'portal' ? `${finalAsset.key}_${uuidv4().substring(0, 4)}` : uuidv4();
      })(),
      position: gridPosition,
      rotation: [0, 0, 0], // THÊM MỚI: Khởi tạo rotation
      asset: finalAsset, // Sử dụng finalAsset đã được kiểm tra theme
      properties: finalAsset.defaultProperties ? { ...finalAsset.defaultProperties } : {},
    };

    // SỬA LỖI: Đảm bảo 'direction' luôn là số khi tạo đối tượng player_start mới.
    // Đây là bước cuối cùng để đảm bảo tính nhất quán của kiểu dữ liệu.
    if (newObject.asset.key === 'player_start' && typeof newObject.properties.direction === 'string') {
      newObject.properties.direction = parseInt(newObject.properties.direction, 10);
    }

    objectsToAdd.push(newObject);

    if (newObject.properties.type === 'portal') {
      const sameColorPortals = placedObjects.filter(o => o.id !== newObject.id && o.properties.color === newObject.properties.color);
      const unlinkedPortal = sameColorPortals.find(p => !p.properties.targetId);
      if (unlinkedPortal) {
        unlinkedPortal.properties.targetId = newObject.id;
        newObject.properties.targetId = unlinkedPortal.id;
      }
    }

    setPlacedObjectsWithHistory(prev => [...prev.filter(o => !objectsToRemove.includes(o.id)), ...objectsToAdd]);
  };

  // Hàm mới để thêm một đối tượng đã được tạo sẵn (dùng cho Duplicate)
  const handleAddNewObject = (newObject: PlacedObject) => {
    setPlacedObjectsWithHistory(prev => [...prev, newObject]);
  };

  const handleRemoveObject = (id: string) => {
    setPlacedObjectsWithHistory(prev => {
        const objectToRemove = prev.find(o => o.id === id);
        const newObjects = prev.filter(obj => obj.id !== id);
        if (objectToRemove?.properties.type === 'portal' && objectToRemove.properties.targetId) {
            const partner = newObjects.find(o => o.id === objectToRemove.properties.targetId);
            if (partner) partner.properties.targetId = null;
        }
        return newObjects;
    });
    // SỬA LỖI: Cập nhật logic để xóa ID khỏi mảng lựa chọn
    setSelectedObjectIds(prevIds => prevIds.filter(prevId => prevId !== id));
  };

  const handleRemoveMultipleObjects = (ids: string[]) => {
    setPlacedObjectsWithHistory(prev => prev.filter(obj => !ids.includes(obj.id)));
    setSelectedObjectIds([]); // Xóa tất cả lựa chọn
  };

  const handleUpdateObject = (updatedObject: PlacedObject) => {
    setPlacedObjectsWithHistory(prev => prev.map(obj => (obj.id === updatedObject.id ? updatedObject : obj)));
  };

  const handleMoveObjectToPosition = (objectId: string, newPosition: [number, number, number]) => {
    setPlacedObjectsWithHistory(prev => {
        const objectToMove = prev.find(o => o.id === objectId);
        if (!objectToMove) return prev;

        // --- VALIDATION ---
        const [nx, ny, nz] = newPosition;
        // 1. Kiểm tra có nằm ngoài vùng xây dựng không
        if (nx < 0 || nx >= boxDimensions.width || ny < 0 || ny >= boxDimensions.height || nz < 0 || nz >= boxDimensions.depth) {
            return prev; // Vị trí mới nằm ngoài giới hạn
        }
        // 2. Kiểm tra có va chạm với đối tượng khác không
        const newPosString = newPosition.join(',');
        if (prev.some(o => o.id !== objectId && o.position.join(',') === newPosString)) {
            return prev; // Đã có đối tượng khác ở vị trí mới
        }

        // Chỉ cập nhật nếu vị trí thực sự thay đổi
        if (objectToMove.position.join(',') === newPosString) return prev;

        return prev.map(o => o.id === objectId ? { ...o, position: newPosition } : o);
    });
  };

  // NÂNG CẤP: Di chuyển một hoặc nhiều đối tượng theo bước
  const handleMoveObject = (objectIds: string[], direction: 'x' | 'y' | 'z', amount: 1 | -1) => {
    setPlacedObjectsWithHistory(prev => {
        const objectsToMove = prev.filter(o => objectIds.includes(o.id));
        if (objectsToMove.length === 0) return prev;

        const axisIndex = { x: 0, y: 1, z: 2 }[direction];
        const objectIdsSet = new Set(objectIds);
        
        // --- THAY ĐỔI: Loại bỏ kiểm tra giới hạn bản đồ khi di chuyển bằng phím tắt ---
        // Logic mới sẽ chỉ kiểm tra va chạm với các đối tượng khác không nằm trong vùng chọn.
        // Điều này cho phép di chuyển tự do các đối tượng ra ngoài ranh giới.
        const canMove = objectsToMove.every(obj => {
            const newPos: [number, number, number] = [...obj.position];
            newPos[axisIndex] += amount;
            return !prev.some(other => !objectIdsSet.has(other.id) && other.position.join(',') === newPos.join(','));
        });

        if (!canMove) return prev; // Nếu có va chạm với đối tượng khác, hủy di chuyển.

        return prev.map(obj => {
            if (objectIdsSet.has(obj.id)) {
                const newPosition: [number, number, number] = [...obj.position];
                newPosition[axisIndex] += amount;
                return { ...obj, position: newPosition };
            }
            return obj;
        });
    });
  };

  // --- TÍNH NĂNG MỚI: Di chuyển tất cả đối tượng đã chọn mà không kiểm tra giới hạn ---
  const handleMoveAllObjectsWithoutBounds = (direction: 'x' | 'y' | 'z', amount: 1 | -1) => {
    setPlacedObjectsWithHistory(prev => {
        const objectIdsSet = new Set(selectedObjectIds);
        if (objectIdsSet.size === 0) return prev;

        const axisIndex = { x: 0, y: 1, z: 2 }[direction];

        // Thực hiện di chuyển mà không có bất kỳ validation nào
        return prev.map(obj => {
            if (objectIdsSet.has(obj.id)) {
                const newPosition: [number, number, number] = [...obj.position];
                newPosition[axisIndex] += amount;
                return { ...obj, position: newPosition };
            }
            return obj;
        });
    });
  };

  // --- HÀM MỚI: Sao chép asset của đối tượng để chuẩn bị đặt ---
  const handleCopyObject = (objectId: string) => {
    const objectToCopy = placedObjects.find(obj => obj.id === objectId);
    if (objectToCopy) {
      setSelectedAsset(objectToCopy.asset);
      setBuilderMode('build-single');       // Chuyển sang chế độ xây dựng
      setSelectedObjectIds([]);            // Bỏ chọn đối tượng gốc để tránh nhầm lẫn
    }
  };

  // --- START: LOGIC MENU CHUỘT PHẢI ---
  const handleObjectContextMenu = (event: { clientX: number, clientY: number, preventDefault: () => void }, objectId: string) => {
    event.preventDefault();
    // Nếu đối tượng chưa được chọn, hãy chọn nó. Nếu đã có trong danh sách chọn, giữ nguyên.
    if (!selectedObjectIds.includes(objectId)) {
      setSelectedObjectIds([objectId]);
    }
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      objectId: objectId,
    });
    setAssetSubMenuVisible(false); // Đảm bảo menu phụ luôn đóng khi mở menu chính
  };

  const handleContextMenuAction = (action: 'delete' | 'copy_asset' | 'duplicate') => {
    const objectId = contextMenu.objectId;
    if (!objectId) return;

    const targetObject = placedObjects.find(o => o.id === objectId);
    if (!targetObject) return;

    switch (action) {
      case 'delete':
        handleRemoveObject(objectId);
        break;
      case 'copy_asset':
        handleCopyObject(objectId);
        break;
      case 'duplicate':
        handleDuplicateObject(objectId);
        break;
    }
    // Ẩn menu sau khi thực hiện hành động
    setContextMenu(prev => ({ ...prev, visible: false }));
    setAssetSubMenuVisible(false);
  };

  // --- END: LOGIC MENU CHUỘT PHẢI ---


  const handleSelectionAction = (action: 'fill' | 'replace' | 'delete') => {
    if (!selectionBounds) return;
    if (action !== 'delete' && !selectedAsset) return;

    const { min, max } = selectionBounds;
    const [minX, minY, minZ] = min;
    const [maxX, maxY, maxZ] = max;
    
    // --- Cải tiến cho hành động 'delete' ---
    const affectedObjects: PlacedObject[] = [];
    let newPlacedObjects = [...placedObjects];

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          
          // Bỏ qua nếu không khớp với các tùy chọn fill/pattern
          if (fillOptions.type === 'shell') {
            const isShell = x === minX || x === maxX || y === minY || y === maxY || z === minZ || z === maxZ;
            if (!isShell) continue;
          }

          if (fillOptions.pattern === 'checkerboard') {
            const effectiveSpacing = fillOptions.spacing + 1;
            if ((x + y + z) % effectiveSpacing !== 0) continue;
          }

          // Tìm đối tượng hiện có tại vị trí
          const existingObjectIndex = newPlacedObjects.findIndex(obj => 
            obj && obj.position[0] === x && obj.position[1] === y && obj.position[2] === z
          );

          switch (action) {
            case 'fill':
              if (existingObjectIndex === -1 && selectedAsset) {
                affectedObjects.push({
                  id: uuidv4(),
                  position: [x, y, z],
                  rotation: [0, 0, 0], // THÊM MỚI: Khởi tạo rotation
                  asset: selectedAsset,
                  properties: selectedAsset.defaultProperties ? { ...selectedAsset.defaultProperties } : {}
                });
              }
              break;
            case 'replace':
              if (existingObjectIndex !== -1 && selectedAsset) {
                newPlacedObjects[existingObjectIndex] = { 
                    ...newPlacedObjects[existingObjectIndex], 
                    rotation: newPlacedObjects[existingObjectIndex].rotation || [0, 0, 0], // Giữ rotation cũ
                    asset: selectedAsset,
                    properties: selectedAsset.defaultProperties ? { ...selectedAsset.defaultProperties } : {}
                };
              }
              break;
            case 'delete':
              if (existingObjectIndex !== -1) {
                (newPlacedObjects as any[])[existingObjectIndex] = null;
              }
              break;
          }
        }
      }
    }

    // --- Logic xóa được tối ưu hóa ---
    if (action === 'delete') {
      const positionsToDelete = new Set<string>();
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          for (let z = minZ; z <= maxZ; z++) {
            if (fillOptions.type === 'shell' && !(x === minX || x === maxX || y === minY || y === maxY || z === minZ || z === maxZ)) continue;
            if (fillOptions.pattern === 'checkerboard' && (x + y + z) % (fillOptions.spacing + 1) !== 0) continue;
            positionsToDelete.add(`${x},${y},${z}`);
          }
        }
      }
      setPlacedObjectsWithHistory(prev => prev.filter(obj => !positionsToDelete.has(obj.position.join(','))));
      setSelectionStart(null);
      setSelectionEnd(null);
      return; // Kết thúc sớm để không chạy logic bên dưới
    }
    // --- Kết thúc cải tiến ---

    if (action === 'fill') {
      setPlacedObjectsWithHistory(prev => [...prev, ...affectedObjects]);
    } else if (action === 'replace') {
      setPlacedObjectsWithHistory(newPlacedObjects);
    }
    
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const handleViewChange = (view: 'perspective' | 'top' | 'front' | 'side') => sceneRef.current?.changeView(view);

  const handleImportMap = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);

        // --- LOGIC NHẬN DIỆN FORMAT ---
        let configToLoad;
        if (json.gameConfig && typeof json.gameConfig === 'object') {
          // Đây là file quest đầy đủ
          configToLoad = json.gameConfig;
          // SỬA LỖI: Giữ lại toàn bộ json làm metadata để gameConfig không bị mất
          setQuestMetadata(json); 
        } else if (json.blocks || json.players) {
          // Đây có vẻ là file chỉ có gameConfig, nhưng không có key cha
          // Để nhất quán, chúng ta sẽ coi nó là file gameConfig-only
          configToLoad = json;
          setQuestMetadata({ gameConfig: json }); // Bọc nó trong một object metadata chuẩn
          setCurrentMapFileName(file.name); // Cập nhật tên file
        } else {
            throw new Error("Invalid format: JSON does not contain a recognizable 'gameConfig' object.");
        }

        const { blocks = [], collectibles = [], interactibles = [], finish, players = [] } = configToLoad;
        const newPlacedObjects: PlacedObject[] = [];

        for (const block of blocks) {
          const asset = assetMap.get(block.modelKey); 
          if (asset && block.position) newPlacedObjects.push({ id: uuidv4(), asset, position: [block.position.x, block.position.y, block.position.z], rotation: [0, 0, 0], properties: {} });
        }
        
        for (const item of collectibles) {
          const asset = assetMap.get(item.type);
          if(asset && item.position) newPlacedObjects.push({ id: uuidv4(), asset, position: [item.position.x, item.position.y, item.position.z], rotation: [0, 0, 0], properties: {} });
        }

        for (const item of interactibles) {
          const assetKey = item.type === 'portal' ? `${item.type}_${item.color}` : item.type;
          const asset = assetMap.get(assetKey);
          if(asset && item.position) {
              const { position, ...properties } = item; // rotation không có trong file JSON cũ
              newPlacedObjects.push({ id: item.id, asset, position: [position.x, position.y, position.z], rotation: [0, 0, 0], properties });
          }
        }
        
        if (finish) {
          const asset = assetMap.get('finish');
          if (asset) newPlacedObjects.push({ id: uuidv4(), asset, position: [finish.x, finish.y, finish.z], rotation: [0, 0, 0], properties: {} });
        }

        if (players[0]?.start) {
          const asset = assetMap.get('player_start');
          const startPos = players[0].start;
          // SỬA LỖI: Đọc và lưu lại thuộc tính `direction` của người chơi khi import map.
          if (asset) newPlacedObjects.push({ 
            id: uuidv4(), 
            asset, 
            rotation: [0, 0, 0],
            position: [startPos.x, startPos.y, startPos.z], 
            properties: { direction: parseFloat(startPos.direction) || 0 } });
        }
        
        setPlacedObjectsWithHistory(newObjects => newPlacedObjects); // Bắt đầu lịch sử mới khi import
        detectAndSetTheme(newPlacedObjects); // SỬA LỖI: Cập nhật theme sau khi import
        alert('Map imported successfully!');
      } catch (error) {
        console.error("Failed to import map:", error);
        alert(`Failed to import map: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    reader.readAsText(file);
  };

  // --- HÀM MỚI: TẢI MAP TỪ URL TRONG THƯ MỤC PUBLIC ---
  const handleLoadMapFromUrl = async (url: string) => {
    const correctedUrl = getCorrectedAssetUrl(url); // Sử dụng hàm tiện ích mới

    try {
      const response = await fetch(correctedUrl); // Sử dụng URL đã được hiệu chỉnh
      if (!response.ok) {
        throw new Error(`Failed to fetch map: ${response.statusText}`);
      }
      const json = await response.json();

      let configToLoad;
      if (json.gameConfig && typeof json.gameConfig === 'object') {
        configToLoad = json.gameConfig; 
        setCurrentMapFileName(correctedUrl.split('/').pop() || 'untitled-quest.json'); // Cập nhật tên file từ URL đã sửa
        setQuestMetadata(json); // SỬA LỖI: Giữ lại toàn bộ json
        // THÊM MỚI: Đồng bộ hóa toolbox preset sau khi set metadata
        if (json.blocklyConfig) {
          syncToolboxConfig(json.blocklyConfig);
        } else {
          // Nếu file JSON cũ không có blocklyConfig, tạo một cái mặc định
          json.blocklyConfig = {
            toolboxPresetKey: 'commands_l1_move',
            toolbox: toolboxPresets['commands_l1_move']
          };
        }
      } else if (json.blocks || json.players) {
        configToLoad = json;
        setQuestMetadata({ gameConfig: json }); // SỬA LỖI: Bọc trong metadata chuẩn
      } else {
        throw new Error("Invalid format: JSON does not contain a recognizable 'gameConfig' object.");
      }

      const { blocks = [], collectibles = [], interactibles = [], finish, players = [] } = configToLoad;
      const newPlacedObjects: PlacedObject[] = [];

      for (const block of blocks) { if (assetMap.get(block.modelKey) && block.position) newPlacedObjects.push({ id: uuidv4(), asset: assetMap.get(block.modelKey)!, position: [block.position.x, block.position.y, block.position.z], rotation: [0, 0, 0], properties: {} }); }
      for (const item of collectibles) { if (assetMap.get(item.type) && item.position) newPlacedObjects.push({ id: uuidv4(), asset: assetMap.get(item.type)!, position: [item.position.x, item.position.y, item.position.z], rotation: [0, 0, 0], properties: {} }); }
      for (const item of interactibles) {
        const assetKey = item.type === 'portal' ? `${item.type}_${item.color}` : item.type;
        const asset = assetMap.get(assetKey);
        if(asset && item.position) { const { position, ...properties } = item; newPlacedObjects.push({ id: item.id, asset, position: [position.x, position.y, position.z], rotation: [0, 0, 0], properties }); }
      }
      if (finish) { const asset = assetMap.get('finish'); if (asset) newPlacedObjects.push({ id: uuidv4(), asset, position: [finish.x, finish.y, finish.z], rotation: [0, 0, 0], properties: {} }); }
      if (players[0]?.start) {
        const asset = assetMap.get('player_start');
        const startPos = players[0].start;
        // SỬA LỖI: Đọc và lưu lại thuộc tính `direction` của người chơi khi load map từ URL.
        if (asset) newPlacedObjects.push({ 
          id: uuidv4(), 
          asset, 
          rotation: [0, 0, 0],
          position: [startPos.x, startPos.y, startPos.z], 
          properties: { direction: parseFloat(startPos.direction) || 0 } });
      }
      
      setPlacedObjectsWithHistory(() => newPlacedObjects); // Bắt đầu lịch sử mới khi load map
      detectAndSetTheme(newPlacedObjects); // SỬA LỖI: Cập nhật theme sau khi load từ URL
      alert(`Map '${correctedUrl.split('/').pop()}' loaded successfully!`);

    } catch (error) {
      console.error("Failed to load map from URL:", error);
      alert(`Failed to load map from ${correctedUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // --- HÀM MỚI: CẬP NHẬT METADATA ---
  const handleMetadataChange = (path: string, value: any) => {
    setQuestMetadata(prev => {
      if (!prev) return null;

      // SỬA LỖI: Xử lý trường hợp ghi đè đặc biệt từ QuestDetailsPanel
      if (path === '__OVERWRITE__') {
        // `value` ở đây là toàn bộ đối tượng metadata mới
        return value;
      }

      // Tạo một bản sao sâu của object để tránh thay đổi trực tiếp state
      const newMeta = _.cloneDeep(prev);
      // Sử dụng lodash.set để cập nhật an toàn các đường dẫn lồng nhau
      _.set(newMeta, path, value);
      return newMeta;
    });
  };

  // --- HÀM TIỆN ÍCH MỚI: Tìm key của toolbox preset dựa trên object toolbox ---
  const findToolboxPresetKey = (toolboxObject: any): string | null => {
    if (!toolboxObject) return null;
    for (const key in toolboxPresets) {
      // Sử dụng lodash.isEqual để so sánh sâu hai object
      if (_.isEqual(toolboxPresets[key], toolboxObject)) {
        return key;
      }
    }
    return null;
  };

  // --- HÀM TIỆN ÍCH MỚI: Đồng bộ hóa toolbox và preset key ---
  const syncToolboxConfig = (config: Record<string, any>) => {
    const presetKey = findToolboxPresetKey(config.toolbox);
    // Nếu tìm thấy key, gán nó vào để dropdown hiển thị đúng.
    // Nếu không, giữ nguyên key hiện có hoặc để trống.
    if (presetKey) config.toolboxPresetKey = presetKey;
    if (!config) return;

    // Ưu tiên 1: Lấy key tường minh từ JSON (hỗ trợ cả `toolbox_preset` và `toolboxPresetKey`)
    const explicitKey = config.toolbox_preset || config.toolboxPresetKey;
    if (explicitKey && toolboxPresets[explicitKey]) {
      config.toolboxPresetKey = explicitKey; // Chuẩn hóa về một key duy nhất trong state
      config.toolbox = _.cloneDeep(toolboxPresets[explicitKey]); // Đảm bảo object toolbox khớp với key
      if (config.toolbox_preset) delete config.toolbox_preset; // Xóa key cũ để tránh dư thừa
      return;
    }

    // Ưu tiên 2: Nếu không có key tường minh, thử suy luận từ object `toolbox`
    const inferredKey = findToolboxPresetKey(config.toolbox);
    if (inferredKey) {
      config.toolboxPresetKey = inferredKey;
      return;
    }

    // Fallback: Nếu không thể xác định, đặt giá trị mặc định
    config.toolboxPresetKey = 'commands_l1_move';
    config.toolbox = _.cloneDeep(toolboxPresets['commands_l1_move']);
  };

  // --- HÀM TIỆN ÍCH MỚI: Trích xuất các khối lệnh có sẵn từ toolbox ---
  const getAvailableBlocksFromToolbox = (toolbox: any): string[] => {
    const allowedBlocks: Set<string> = new Set();
    if (!toolbox || !toolbox.contents) {
      return [];
    }

    // Hàm đệ quy để duyệt qua cấu trúc của toolbox
    const traverse = (contents: any[]) => {
      for (const item of contents) {
        if (item.kind === 'block' && item.type) {
          allowedBlocks.add(item.type);
        }
        // SỬA LỖI: Thêm kiểm tra cho các khối lệnh đặc biệt như hàm (PROCEDURE)
        if (item.kind === 'category' && item.custom === 'PROCEDURE') {
          allowedBlocks.add('PROCEDURE');
        }
        // Nếu là một category, duyệt tiếp vào contents của nó
        if (item.kind === 'category' && item.contents) {
          traverse(item.contents);
        }
      }
    };

    traverse(toolbox.contents);
    return Array.from(allowedBlocks);
  };

  // --- HÀM MỚI: RENDER LẠI MAP TỪ JSON ĐÃ CHỈNH SỬA ---
  const handleRenderEditedJson = (silent = false, preParsedJson: any = null) => {
    try {
      let json = preParsedJson ? preParsedJson : JSON.parse(editedJson);

      // --- TÍNH NĂNG MỚI: TẠO METADATA MẶC ĐỊNH NẾU CHƯA CÓ ---
      // Nếu không có metadata (trường hợp tạo map mới từ đầu), hãy tạo một bộ dữ liệu mặc định.
      if (!questMetadata && !preParsedJson) {
        const defaultId = `NEW_QUEST.${uuidv4().toUpperCase()}`;
        const defaultTitleKey = `Challenge.${defaultId}.Title`;
        const defaultDescKey = `Challenge.${defaultId}.Description`;
        const defaultToolboxKey = 'commands_l1_move'; // Chọn một toolbox mặc định

        const defaultMetadata = {
          id: defaultId,
          gameType: "maze",
          topic: "topic-title-coding_commands", // Topic mặc định
          level: 1,
          titleKey: defaultTitleKey,
          questTitleKey: defaultDescKey,
          descriptionKey: defaultDescKey,
          translations: {
            vi: { [defaultTitleKey]: "Tiêu đề mới", [defaultDescKey]: "Mô tả mới" },
            en: { [defaultTitleKey]: "New Title", [defaultDescKey]: "New Description" },
          },
          supportedEditors: ["blockly", "monaco"],
          blocklyConfig: {
            toolboxPresetKey: defaultToolboxKey, // Lưu key để hiển thị trên dropdown
            toolbox: toolboxPresets[defaultToolboxKey],
            maxBlocks: 10,
            startBlocks: '<xml><block type="maze_start" deletable="false" movable="false"></block></xml>'
          },
          // SỬA LỖI: Thêm solution object mặc định với type để pass validation
          solution: {
            type: 'reach_target',
            itemGoals: {}
          },
          // THÊM MỚI: Thêm trường sounds mặc định để đảm bảo tính toàn vẹn
          sounds: {
            "win": "/assets/maze/win.mp3",
            "fail": "/assets/maze/fail_pegman.mp3"
          },
        };
        setQuestMetadata(defaultMetadata);
        // Cập nhật json để các bước sau sử dụng metadata mới này
        json = { ...defaultMetadata, ...json };
      }

      // Nếu JSON đã được phân tích cú pháp từ trước, sử dụng nó. Nếu không, phân tích cú pháp từ state.
      let configToLoad;
      if (json.gameConfig && typeof json.gameConfig === 'object') {
        configToLoad = json.gameConfig;
        setQuestMetadata(json); // SỬA LỖI: Giữ lại toàn bộ json
        // THÊM MỚI: Đồng bộ hóa toolbox preset sau khi set metadata
        if (json.blocklyConfig) {
          syncToolboxConfig(json.blocklyConfig);
        }
      } else if (json.blocks || json.players) {
        configToLoad = json;
        setQuestMetadata({ gameConfig: json }); // SỬA LỖI: Bọc trong metadata chuẩn
      } else {
        throw new Error("Invalid format: JSON does not contain a recognizable 'gameConfig' object.");
      }

      const { blocks = [], collectibles = [], interactibles = [], finish, players = [] } = configToLoad;
      const newPlacedObjects: PlacedObject[] = [];

      for (const block of blocks) { if (assetMap.get(block.modelKey) && block.position) newPlacedObjects.push({ id: uuidv4(), asset: assetMap.get(block.modelKey)!, position: [block.position.x, block.position.y, block.position.z], rotation: [0, 0, 0], properties: {} }); }
      for (const item of collectibles) { if (assetMap.get(item.type) && item.position) newPlacedObjects.push({ id: uuidv4(), asset: assetMap.get(item.type)!, position: [item.position.x, item.position.y, item.position.z], rotation: [0, 0, 0], properties: {} }); }
      for (const item of interactibles) {
        const assetKey = item.type === 'portal' ? `${item.type}_${item.color}` : item.type;
        const asset = assetMap.get(assetKey);
        if(asset && item.position) { const { position, ...properties } = item; newPlacedObjects.push({ id: item.id, asset, position: [position.x, position.y, position.z], rotation: [0, 0, 0], properties }); }
      }
      if (finish) { const asset = assetMap.get('finish'); if (asset) newPlacedObjects.push({ id: uuidv4(), asset, position: [finish.x, finish.y, finish.z], rotation: [0, 0, 0], properties: {} }); }
      if (players[0]?.start) {
        const asset = assetMap.get('player_start');
        const startPos = players[0].start;
        // SỬA LỖI: Đọc và lưu lại thuộc tính `direction` của người chơi khi render từ JSON đã chỉnh sửa.
        if (asset) newPlacedObjects.push({ 
          id: uuidv4(), 
          asset, 
          rotation: [0, 0, 0],
          position: [startPos.x, startPos.y, startPos.z], 
          properties: { direction: parseFloat(startPos.direction) || 0 } });
      }
      
      setPlacedObjectsWithHistory(() => newPlacedObjects);
      detectAndSetTheme(newPlacedObjects); // SỬA LỖI: Cập nhật theme sau khi render từ JSON
      if (!silent) alert('Map rendered successfully from JSON!');
    } catch (error) {
      console.error("Failed to render map from JSON:", error);
      alert(`Failed to render map: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // --- HÀM MỚI: LƯU (TẢI VỀ) FILE JSON ---
  const handleSaveMap = () => {
    try {
      // Đảm bảo JSON hợp lệ trước khi lưu
      JSON.parse(editedJson);

      const blob = new Blob([editedJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentMapFileName; // Sử dụng tên file đã lưu
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Invalid JSON. Cannot save file. Please fix the errors in the JSON editor.\n\n${error}`);
    }
  };

  // --- HÀM MỚI: TÍCH HỢP BỘ GIẢI MÊ CUNG ---
  const handleSolveMaze = () => {
    // SỬA LỖI: Tái cấu trúc để không cần nhấn "Render from JSON" trước khi giải.
    // Hàm này sẽ tự động tạo gameConfig mới nhất từ `placedObjects` hiện tại.
    try {
      // 1. Tạo gameConfig mới nhất từ trạng thái `placedObjects` trên màn hình.
      const blocks = placedObjects.filter(o => o.asset.type === 'block').map(o => ({ modelKey: o.asset.key, position: { x: o.position[0], y: o.position[1], z: o.position[2] } }));
      const collectibles = placedObjects.filter(o => o.asset.type === 'collectible').map((o, i) => ({ id: `c${i + 1}`, type: o.asset.key, position: { x: o.position[0], y: o.position[1], z: o.position[2] } }));
      const interactibles = placedObjects.filter(o => o.asset.type === 'interactible').map(o => ({ id: o.id, type: o.asset.key, ...o.properties, position: { x: o.position[0], y: o.position[1], z: o.position[2] } }));
      const finishObject = placedObjects.find(o => o.asset.key === 'finish');
      const startObject = placedObjects.find(o => o.asset.key === 'player_start');
      const players = startObject ? [{ id: "player1", start: { x: startObject.position[0], y: startObject.position[1], z: startObject.position[2], direction: parseFloat(startObject.properties?.direction) || 0 } }] : [];
      
      if (!finishObject) {
        alert("Lỗi: Không tìm thấy đối tượng 'Finish' trên bản đồ. Vui lòng đặt một điểm kết thúc để có thể tự động giải.");
        return;
      }
      const finish = { x: finishObject.position[0], y: finishObject.position[1], z: finishObject.position[2] };
      const currentGC = { type: "maze", renderer: "3d", blocks, players, collectibles, interactibles, finish };

      // 2. Lấy các config khác từ state
      let currentSC = questMetadata?.solution || {};
      const currentBC = _.cloneDeep(questMetadata?.blocklyConfig || {});

      // --- CẢI TIẾN CHO SOLVER ---
      // Trích xuất các khối lệnh được phép từ toolbox và thêm vào config cho solver.
      currentBC.availableBlocks = getAvailableBlocksFromToolbox(currentBC.toolbox);

      // --- START: CẬP NHẬT ITEMGOALS TỰ ĐỘNG ---
      // Đếm số lượng crystal và switch có trên bản đồ hiện tại.
      const crystalCount = currentGC.collectibles?.filter((c: any) => c.type === 'crystal').length || 0;
      const switchCount = currentGC.interactibles?.filter((i: any) => i.type === 'switch').length || 0;

      // Tạo hoặc cập nhật đối tượng itemGoals.
      const newItemGoals: Record<string, any> = {};
      if (crystalCount > 0) {
        newItemGoals.crystal = crystalCount;
      }
      if (switchCount > 0) {
        newItemGoals.switch = switchCount;
      }
      
      // Cập nhật solution config với itemGoals mới nhất.
      currentSC.itemGoals = newItemGoals;
      // --- END: CẬP NHẬT ITEMGOALS TỰ ĐỘNG ---

      // 3. Chạy bộ giải với gameConfig vừa được tạo.
      const solution = solveMaze(currentGC, currentSC, currentBC);

      if (solution && solution.rawActions) {
        // --- START: CẬP NHẬT METADATA VỚI LỜI GIẢI MỚI ---
        const newOptimalBlocks = solution.optimalBlocks || 0;
        const newMaxBlocks = newOptimalBlocks + 5;

        // THÊM MỚI: Tạo đối tượng "lời giải cơ bản" từ rawActions.
        // Đây là một cấu trúc JSON đơn giản chỉ chứa các hành động tuần tự.
        const basicSolution = {
          // SỬA LỖI: Xử lý cả 'string' và 'Action' trong mảng rawActions.
          // Nếu là string, chuyển nó thành object. Nếu đã là object, giữ nguyên.
          main: solution.rawActions.map((action: string | { type: string }) => {
            return typeof action === 'string'
              ? { type: `maze_${action}` }
              : action;
          }),
          procedures: {}
        };

        setQuestMetadata(prev => ({
          ...prev,
          // Cập nhật gameConfig trong metadata để JSON output được đồng bộ
          gameConfig: currentGC,
          // Cập nhật blocklyConfig với maxBlocks mới
          blocklyConfig: {
            ...(prev?.blocklyConfig || {}),
            maxBlocks: newMaxBlocks,
          },
          // Hợp nhất solution config cũ với kết quả mới từ solver
          solution: {
            ...currentSC,
            type: 'reach_target', // SỬA LỖI: Đảm bảo trường type luôn tồn tại
            ...solution,
            basicSolution: basicSolution // Lưu lời giải cơ bản vào metadata
          },
        }));
        alert("Đã tìm thấy lời giải và cập nhật thành công!");
      } else {
        alert("Không tìm thấy đường đi đến điểm kết thúc.");
      }
    } catch (error) {
      alert(`Error while solving maze: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // --- HÀM MỚI: Xử lý đóng modal hướng dẫn ---
  const handleCloseWelcomeModal = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem('showWelcomeModal', 'false');
    }
    setIsWelcomeModalVisible(false);
  };

 return (
    <div className="app-container">
      {isPaletteVisible && (
        <AssetPalette
          selectedAssetKey={selectedAsset?.key || null}
          onSelectAsset={handleSelectAsset}
          currentMode={builderMode}
          onModeChange={handleModeChange}
          boxDimensions={boxDimensions}
          onDimensionsChange={handleDimensionsChange}
          fillOptions={fillOptions}
          onFillOptionsChange={setFillOptions}
          onSelectionAction={handleSelectionAction}
          selectionBounds={selectionBounds}
          onSelectionBoundsChange={handleSelectionBoundsChange}
          // SỬA LỖI: Truyền hàm tiện ích mới vào AssetPalette
          getCorrectedAssetUrl={getCorrectedAssetUrl}
          onLoadMapFromUrl={handleLoadMapFromUrl} // Truyền hàm mới vào
          onShowTutorial={() => setIsWelcomeModalVisible(true)} // THÊM MỚI: Prop để mở lại modal
          onImportMap={handleImportMap}
        />
      )}
      <div className="builder-scene-wrapper">
        <button onClick={togglePalette} className={`toggle-palette-btn ${!isPaletteVisible ? 'closed' : ''}`}>
          {isPaletteVisible ? '‹' : '›'}
        </button>
        <ViewControls onViewChange={handleViewChange} />
        <BuilderScene 
          ref={sceneRef}
          builderMode={builderMode}
          selectedAsset={selectedAsset}
          placedObjects={placedObjects}
          boxDimensions={boxDimensions}
          onModeChange={handleModeChange}
          onAddObject={handleAddObject}
          onRemoveObject={handleRemoveObject}
          selectionBounds={selectionBounds}
          selectionStart={selectionStart} // THÊM MỚI: Truyền prop selectionStart
          onSetSelectionStart={setSelectionStart}
          onSetSelectionEnd={setSelectionEnd}
          selectedObjectIds={selectedObjectIds}
          onMoveObject={handleMoveObjectToPosition}
          onMoveObjectByStep={(objectId, dir, amt) => handleMoveObject([objectId], dir, amt)}
          onSelectObject={handleSelectObject} // THAY ĐỔI: Sử dụng hàm xử lý mới
          isMovingObject={isMovingObject} // THÊM MỚI: Truyền trạng thái di chuyển xuống
          onSetIsMovingObject={setIsMovingObject} // THÊM MỚI: Cho phép Scene cập nhật trạng thái này
          onObjectContextMenu={handleObjectContextMenu}
        />
      </div>
      {/* --- START: THÊM THANH RESIZER VÀ ÁP DỤNG WIDTH ĐỘNG --- */}
      <div 
        className="resizer" 
        onMouseDown={handleResizeMouseDown}
      />
      <div ref={sidebarRef} className="right-sidebar" style={{ width: `${sidebarWidth}px` }}>
        <PropertiesPanel 
          selectedObject={selectedObject}
          onUpdateObject={handleUpdateObject}
          onDeleteObject={handleRemoveObject} // Truyền hàm xóa vào
          onAddObject={handleAddNewObject} // Thêm prop onAddObject
          onCopyAsset={handleCopyObject} // Thêm prop onCopyAsset
          currentMapItems={currentMapItems} // Prop cho theme
          mapTheme={mapTheme} // Prop cho theme
          onThemeChange={handleThemeChange} // Prop cho theme
          onClearSelection={() => setSelectedObjectIds([])}
        />
        {/* --- COMPONENT MỚI ĐƯỢC THÊM VÀO --- */}
        <QuestDetailsPanel 
          metadata={questMetadata}
          onMetadataChange={handleMetadataChange}
          onSolveMaze={handleSolveMaze} // SỬA ĐỔI: Truyền hàm giải không cần tham số
        />
        <JsonOutputPanel 
          questId={questMetadata?.id || 'untitled-quest'}
          editedJson={editedJson}
          onJsonChange={setEditedJson}
          onRender={handleRenderEditedJson}
          //onSave={handleSaveMap} // Bỏ ghi chú dòng này để kích hoạt lại nút Save
        />
      </div>
      {/* --- END: THÊM THANH RESIZER VÀ ÁP DỤNG WIDTH ĐỘNG --- */}
      {contextMenu.visible && (
        <div 
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()} // Ngăn không cho menu tự đóng khi click vào chính nó
        >
          <ul>
            <li onClick={() => handleContextMenuAction('duplicate')}>Nhân bản (Duplicate)</li>
            <li onClick={() => handleContextMenuAction('copy_asset')}>Sao chép Asset (Copy)</li>
            <li 
              className="has-submenu"
              onMouseEnter={() => setAssetSubMenuVisible(true)}
              onMouseLeave={() => setAssetSubMenuVisible(false)}
            >
              Đổi Asset (Change Asset) &raquo;
              {assetSubMenuVisible && (
                <div className="context-menu sub-menu">
                  <ul>
                    {buildableAssetGroups.map(group => (
                      <div key={group.name}>
                        <li className="separator-header">{group.name}</li>
                        {group.items.map(asset => (
                          <li key={asset.key} onClick={() => handleSelectAsset(asset)} title={asset.name}>
                            <img 
                              src={asset.thumbnail} 
                              alt={asset.name} 
                              className="context-menu-thumbnail"
                              // THÊM MỚI: Nếu ảnh không tải được, hiển thị ảnh fallback
                              onError={(e) => { e.currentTarget.src = '/assets/ui/unknown.png'; }}
                            />
                            <span>{asset.name}</span>
                          </li>
                        ))}
                      </div>
                    ))}
                  </ul>
                </div>
              )}
            </li>
            <li className="separator"></li>
            <li onClick={() => handleContextMenuAction('delete')} className="delete">Xóa (Delete)</li>
          </ul>
        </div>
      )}
      {/* --- THÊM MỚI: Render modal hướng dẫn --- */}
      {isWelcomeModalVisible && (
        <WelcomeModal onClose={handleCloseWelcomeModal} />
      )}
    </div>
  );
}

export default App;