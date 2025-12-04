import { Suspense, useMemo, useRef, useState, useEffect, forwardRef, useImperativeHandle, Dispatch, SetStateAction } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber/dist/declarations/src/core/events';
import { Grid, useGLTF, CameraControls, GizmoHelper, GizmoViewport, Line, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { buildableAssetGroups } from '../../config/gameAssets';
import type { BuildableAsset, PlacedObject, BuilderMode, BoxDimensions, SelectionBounds, AssetGroup } from '../../types';
import { BoundingBox } from '../BoundingBox';
import { SelectionBox } from '../SelectionBox';
import { SelectionHighlight } from '../PropertiesPanel/SelectionHighlight'; // THAY ĐỔI: Sửa đường dẫn import

const TILE_SIZE = 2;

export type SceneController = {
  changeView: (view: 'perspective' | 'top' | 'front' | 'side') => void;
};

interface BuilderSceneProps {
    builderMode: BuilderMode;
    selectedAsset: BuildableAsset | null;
    placedObjects: PlacedObject[];
    boxDimensions: BoxDimensions;
    onModeChange: (mode: BuilderMode) => void;
    onAddObject: (position: [number, number, number], asset: BuildableAsset) => void;
    onRemoveObject: (id: string) => void;
    selectionBounds: SelectionBounds | null;
    selectionStart: [number, number, number] | null; // THÊM MỚI: Định nghĩa prop selectionStart
    onSetSelectionStart: (pos: [number, number, number] | null) => void;
    onSetSelectionEnd: Dispatch<SetStateAction<[number, number, number] | null>>;    
    selectedObjectIds: string[];
    onSelectObject: (id: string | null, isShiftDown: boolean) => void;
    onMoveObject: (objectId: string, newPosition: [number, number, number]) => void;
    onMoveObjectByStep: (objectId: string, direction: 'x' | 'y' | 'z', amount: 1 | -1) => void;
    onObjectContextMenu: (event: { clientX: number, clientY: number, preventDefault: () => void }, objectId: string) => void;
    // --- START: SỬA LỖI HIỆU ỨNG ---
    isMovingObject: boolean;
    onSetIsMovingObject: (isMoving: boolean) => void;
    // --- END: SỬA LỖI HIỆU ỨNG ---
}

// --- COMPONENT MỚI ĐỂ RENDER ASSET ---
const AssetRenderer = ({ asset, properties, material }: { asset: BuildableAsset, properties?: Record<string, any>, material?: THREE.Material }) => {
  // Render mô hình GLB nếu có đường dẫn
  if (asset.path) {
    const { scene } = useGLTF(asset.path);
    const clonedScene = useMemo(() => scene.clone(), [scene]);
    if (material) {
        clonedScene.traverse((child: any) => {
            if (child.isMesh) child.material = material;
        });
    }
    return <primitive object={clonedScene} />;
  }

  // Render hình khối cơ bản
  const color = properties?.color || '#ffffffff';
  
  switch (asset.primitiveShape) {
    case 'torus':
      return (
        <mesh material={material}>
          <torusGeometry args={[0.5, 0.2, 16, 48]} />
          {!material && <meshStandardMaterial color={color} roughness={0.5} metalness={0.5} />}
        </mesh>
      );
    case 'cone':
       return (
        <mesh material={material}>
          <coneGeometry args={[0.6, 1.2, 32]} />
          {!material && <meshStandardMaterial color={"gold"} roughness={0.3} metalness={0.8} />}
        </mesh>
      );
    // Có thể thêm các hình khác ở đây
    default:
      return (
        <mesh material={material}>
          <boxGeometry args={[1, 1, 1]} />
          {!material && <meshStandardMaterial color={"magenta"} />}
        </mesh>
      );
  }
};

// --- START: THÊM LOGIC LỚP PHỦ KHI CHỌN ---
// Tạo một vật liệu (material) mới cho lớp phủ.
// Màu vàng, bán trong suốt và không bị ảnh hưởng bởi ánh sáng.
const selectionOverlayMaterial = new THREE.MeshBasicMaterial({
  color: '#ff5500',   // SỬA LỖI: Mã màu hex phải có 6 chữ số. Độ trong suốt được xử lý bởi 'opacity'.
  opacity: 0.6,     // Tăng độ đậm của lớp phủ
  transparent: true,
  depthWrite: false // Render xuyên qua các vật thể khác để đảm bảo luôn thấy
});

function PlacedAsset({ object, isSelected, isHovered, onContextMenu }: { object: PlacedObject; isSelected: boolean, isHovered: boolean, onContextMenu: (e: ThreeEvent<MouseEvent>) => void }) {
  const worldPosition: [number, number, number] = [
    object.position[0] * TILE_SIZE + TILE_SIZE / 2,
    object.position[1] * TILE_SIZE + TILE_SIZE / 2,
    object.position[2] * TILE_SIZE + TILE_SIZE / 2
  ];

  return (
    <group 
      position={worldPosition} 
      rotation={object.rotation}
      scale={TILE_SIZE} 
      userData={{ isPlacedObject: true, id: object.id }}
      onContextMenu={onContextMenu}
    >
      <AssetRenderer asset={object.asset} properties={object.properties} />
      
      {/* --- THAY ĐỔI: Logic hiển thị hiệu ứng chọn và hover --- */}
      {isSelected ? (
        // Khi được chọn, render thêm một AssetRenderer nữa với vật liệu phủ màu vàng.
        // Chúng ta tăng nhẹ scale để tránh z-fighting (hiện tượng các bề mặt chồng lấn gây nhấp nháy).
        <group scale={[1.02, 1.02, 1.02]}>
          <AssetRenderer asset={object.asset} material={selectionOverlayMaterial} />
        </group>
      ) : (
        // Khi không được chọn, chỉ hiển thị hiệu ứng hover (viền xanh) nếu có.
        isHovered && <Outlines thickness={0.03} color="#66aaff" />
      )}
    </group>
  );
}

function RollOverMesh({ selectedAsset }: { selectedAsset: BuildableAsset | null }) {
    if (!selectedAsset) return null;

    const material = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true, depthWrite: false });

    return (
        <group scale={TILE_SIZE}>
            <AssetRenderer asset={selectedAsset} material={material}/>
        </group>
    );
}

const PortalConnections = ({ objects }: { objects: PlacedObject[] }) => {
    const portalPairs = useMemo(() => {
        const pairs: [PlacedObject, PlacedObject][] = [];
        const portals = objects.filter(o => o.properties.type === 'portal' && o.properties.targetId);
        const processed = new Set<string>();

        for (const portal of portals) {
            if (processed.has(portal.id)) continue;
            const target = portals.find(p => p.id === portal.properties.targetId);
            if (target && !processed.has(target.id)) {
                pairs.push([portal, target]);
                processed.add(portal.id);
                processed.add(target.id);
            }
        }
        return pairs;
    }, [objects]);

    return (
        <>
            {portalPairs.map(([p1, p2]) => {
                const startPos = new THREE.Vector3(...p1.position).multiplyScalar(TILE_SIZE).addScalar(TILE_SIZE / 2);
                const endPos = new THREE.Vector3(...p2.position).multiplyScalar(TILE_SIZE).addScalar(TILE_SIZE / 2);
                return <Line key={`${p1.id}-${p2.id}`} points={[startPos, endPos]} color={p1.properties.color || "white"} lineWidth={2} dashed dashSize={0.5} gapSize={0.2} />;
            })}
        </>
    );
};


const SceneContent = (props: BuilderSceneProps & { cameraControlsRef: React.RefObject<CameraControls | null> }) => {
  const { camera, raycaster, scene } = useThree();
  const [pointer, setPointer] = useState(new THREE.Vector2(99, 99));
  const rollOverMeshRef = useRef<THREE.Group>(null!);
  const [isShiftDown, setIsShiftDown] = useState(false); // <-- THÊM LẠI: Theo dõi phím Shift
  const [isSpaceDown, setIsSpaceDown] = useState(false); // <-- THAY ĐỔI: Theo dõi phím Space
  const [isAltDown, setIsAltDown] = useState(false);
  const [isDragging, setIsDragging] = useState(false); // Dùng cho chọn vùng
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null); // State cho hiệu ứng hover
  // Ref mới để lưu trạng thái bắt đầu kéo (vị trí đối tượng và vị trí chuột)
  const placedObjectsGroupRef = useRef<THREE.Group>(null!); // Ref cho group chứa các đối tượng
  const dragStartRef = useRef<{ objectPos: [number, number, number], mousePos: { x: number, y: number } } | null>(null);

  const {
      builderMode, selectedAsset, placedObjects, boxDimensions, onModeChange, 
      isMovingObject, onSetIsMovingObject, selectionStart,
      onAddObject, onRemoveObject, selectionBounds, onSetSelectionStart, onSetSelectionEnd, cameraControlsRef, selectedObjectIds, onSelectObject, onMoveObject, onMoveObjectByStep, onObjectContextMenu 
  } = props;

  const plane = useMemo(() => new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ visible: false, depthWrite: false, name: 'ground_plane' })
  ), []);
  
  useEffect(() => {
    const controls = cameraControlsRef.current;
    if (controls) {
        controls.enabled = true; 

        const ROTATE_ACTION = 1;
        const TRUCK_ACTION = 2;
        const NO_ACTION = 0;

        // --- LOGIC ĐIỀU HƯỚNG THEO NGỮ CẢNH (CẬP NHẬT) ---
        if (builderMode === 'build-area' || selectedObjectIds.length > 0) {
          // KHI Ở CHẾ ĐỘ CHỌN VÙNG hoặc KHI CÓ ĐỐI TƯỢNG ĐƯỢC CHỌN:
          // Dành chuột trái cho tương tác (chọn vùng, di chuyển đối tượng).
          controls.mouseButtons.left = NO_ACTION;
          // Dùng chuột phải để điều hướng.
        } else if (builderMode === 'build-single') {
          // KHI Ở CHẾ ĐỘ BUILD: Dành chuột trái để đặt khối.
          controls.mouseButtons.left = NO_ACTION;
        } else {
          // CHẾ ĐỘ NAVIGATE MẶC ĐỊNH: Dùng chuột trái để điều hướng.
          controls.mouseButtons.left = isSpaceDown ? TRUCK_ACTION : ROTATE_ACTION;
        }
        // Áp dụng cho tất cả các chế độ: Chuột phải dùng để xoay hoặc pan.
        controls.mouseButtons.right = isSpaceDown ? TRUCK_ACTION : ROTATE_ACTION;

        // Giữ nguyên các nút khác nếu cần
        controls.mouseButtons.middle = THREE.MOUSE.DOLLY;
    }
  }, [builderMode, cameraControlsRef, isSpaceDown, selectedObjectIds]); // Thêm selectedObjectIds vào dependencies

  const boundingBoxPosition = useMemo((): [number, number, number] => [
    (boxDimensions.width * TILE_SIZE) / 2,
    (boxDimensions.height * TILE_SIZE) / 2,
    (boxDimensions.depth * TILE_SIZE) / 2,
  ], [boxDimensions]);

  const getGridPositionFromIntersection = (intersect: THREE.Intersection): [number, number, number] | null => {
    if (!intersect.face) return null;
    const newPosVec = new THREE.Vector3().copy(intersect.point).add(intersect.face.normal);
    return [
      Math.floor(newPosVec.x / TILE_SIZE),
      Math.floor(newPosVec.y / TILE_SIZE),
      Math.floor(newPosVec.z / TILE_SIZE)
    ];
  };

  // --- HÀM MỚI: Tính toán vị trí lưới cho việc lựa chọn (selection) ---
  const getGridPositionForSelection = (intersect: THREE.Intersection): [number, number, number] | null => {
    // Nếu con trỏ chuột trúng một đối tượng đã đặt, chúng ta muốn chọn chính đối tượng đó.
    // Vì vậy, chúng ta trừ đi một nửa vector pháp tuyến của mặt bị trúng để lấy vị trí bên trong khối.
    if (intersect.object.name !== 'ground_plane' && intersect.face) {
        let posVec = new THREE.Vector3().copy(intersect.point).sub(intersect.face.normal.clone().multiplyScalar(0.1));
        // Hạn chế không cho tọa độ Y nhỏ hơn 0
        if (posVec.y < 0) posVec.y = 0;
        return [Math.floor(posVec.x / TILE_SIZE), Math.floor(posVec.y / TILE_SIZE), Math.floor(posVec.z / TILE_SIZE)];
    }

    // Nếu con trỏ chuột trúng mặt phẳng đất, chúng ta tính toán như bình thường.
    const posVec = new THREE.Vector3().copy(intersect.point);
    return [Math.floor(posVec.x / TILE_SIZE), Math.floor(posVec.y / TILE_SIZE), Math.floor(posVec.z / TILE_SIZE)];
  };
  // --- KẾT THÚC HÀM MỚI ---

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') setIsShiftDown(true); // <-- THÊM LẠI: Lắng nghe phím Shift
      if (event.code === 'Space') setIsSpaceDown(true); // <-- THAY ĐỔI: Lắng nghe phím Space
      if (event.key === 'Alt') setIsAltDown(true); // Bắt sự kiện nhấn Alt
      if (event.key.toLowerCase() === 'b') onModeChange('build-single');
      if (event.key.toLowerCase() === 'v') onModeChange('navigate');
      if (event.key.toLowerCase() === 's') onModeChange('build-area');
      if (event.key === 'Escape') {
        // Nếu đang có đối tượng được chọn, Esc sẽ bỏ chọn.
        // Nếu không, Esc sẽ chuyển về chế độ Navigate.
        if (selectedObjectIds.length > 0) {
          onSelectObject(null, false);
        } else {
          onModeChange('navigate');
        }
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => { 
      if (event.key === 'Shift') setIsShiftDown(false); // <-- THÊM LẠI: Lắng nghe phím Shift
      if (event.code === 'Space') setIsSpaceDown(false); // <-- THAY ĐỔI: Lắng nghe phím Space
      if (event.key === 'Alt') setIsAltDown(false); // Bắt sự kiện nhả Alt
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onModeChange, onSelectObject, selectedObjectIds]); // Thêm selectedObjectIds vào dependencies

  useFrame(() => {
    // Luôn cập nhật raycaster theo con trỏ chuột
    raycaster.setFromCamera(pointer, camera);

    // Logic cho RollOverMesh (con trỏ build)
    if (builderMode === 'build-single' && rollOverMeshRef.current) {
      const intersects = raycaster.intersectObjects([plane, ...placedObjectsGroupRef.current.children], true);
      const intersect = intersects.find(i => i.object.name !== 'RollOverMesh');

      if (intersect?.face) {
        const newPos = new THREE.Vector3().copy(intersect.point).add(intersect.face.normal)
          .divideScalar(TILE_SIZE).floor().multiplyScalar(TILE_SIZE).addScalar(TILE_SIZE / 2);
        if (!rollOverMeshRef.current.position.equals(newPos)) {
          rollOverMeshRef.current.position.copy(newPos);
        }
        rollOverMeshRef.current.visible = true;
      } else {
        rollOverMeshRef.current.visible = false;
      }
    } else if (rollOverMeshRef.current) {
      rollOverMeshRef.current.visible = false;
    }
  });
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    // --- LOGIC MỚI: Xử lý hiệu ứng Hover ---
    // Chỉ chạy khi không kéo/di chuyển đối tượng để tránh xung đột
    if (!isDragging && !isMovingObject) {
      raycaster.setFromCamera(event.pointer, camera);
      const intersects = raycaster.intersectObjects(placedObjectsGroupRef.current.children, true);
      const firstIntersect = intersects[0];

      let hoveredObject: THREE.Object3D | null | undefined = firstIntersect?.object;
      while(hoveredObject && !hoveredObject.userData.id) {
        hoveredObject = hoveredObject.parent;
      }

      // Cập nhật state nếu đối tượng hover thay đổi
      const newHoverId = hoveredObject?.userData.id || null;
      if (newHoverId !== hoveredObjectId) {
        setHoveredObjectId(newHoverId);
      }
    }

    // Luôn cập nhật vị trí con trỏ để useFrame có thể sử dụng
    setPointer(event.pointer);

    // --- Logic kéo chọn vùng ---
    if (builderMode === 'build-area' && isDragging && selectionStart) {
      if (isShiftDown) {
        // KHI GIỮ SHIFT: Chỉ điều chỉnh chiều cao (trục Y) của vùng chọn.
        const deltaY = (dragStartRef.current?.mousePos.y ?? 0) - event.clientY;
        const PIXELS_PER_UNIT = 30; // Độ nhạy: cần kéo 30px để di chuyển 1 ô.
        const unitsToMove = Math.round(deltaY / PIXELS_PER_UNIT);

        // Lấy vị trí Y ban đầu của điểm cuối (khi bắt đầu giữ Shift)
        // và cộng thêm khoảng di chuyển.
        const startY = dragStartRef.current?.objectPos[1] ?? selectionStart[1];
        let newY = startY + unitsToMove;
        if (newY < 0) newY = 0; // Đảm bảo không chọn dưới mặt đất.

        // Cập nhật điểm cuối với tọa độ Y mới, giữ nguyên X và Z.
        onSetSelectionEnd(prev => prev ? [prev[0], newY, prev[2]] : null);
      } else {
        // KHI KHÔNG GIỮ SHIFT: Kéo trên mặt phẳng XZ như bình thường.
        raycaster.setFromCamera(event.pointer, camera);
        const intersects = raycaster.intersectObjects([plane, ...placedObjectsGroupRef.current.children], true);
        const intersect = intersects.find(i => i.object.name !== 'RollOverMesh');
        if (intersect) {
          let gridPos = getGridPositionForSelection(intersect);
          if (gridPos && gridPos[1] < 0) gridPos[1] = 0;
          // Cập nhật điểm cuối với tọa độ X và Z mới, giữ nguyên Y.
          if (gridPos) onSetSelectionEnd(prev => prev ? [gridPos![0], prev[1], gridPos![2]] : gridPos);
        }
      }
    }
    // --- Logic di chuyển đối tượng ---
    if (isMovingObject && selectedObjectIds.length === 1 && dragStartRef.current) {
      if (isShiftDown) {
        // --- LOGIC SNAP DỌC (TRỤC Y) ---
        const deltaY = dragStartRef.current.mousePos.y - event.clientY; // Kéo lên -> deltaY dương
        const PIXELS_PER_UNIT = 30; // Độ nhạy: cần kéo 30px để di chuyển 1 ô
        const unitsToMove = Math.round(deltaY / PIXELS_PER_UNIT);
        
        const newY = dragStartRef.current.objectPos[1] + unitsToMove;
        const finalPos: [number, number, number] = [dragStartRef.current.objectPos[0], newY, dragStartRef.current.objectPos[2]];        
        
        onMoveObject(selectedObjectIds[0], finalPos);
      } else {
        // --- LOGIC SNAP TRÊN MẶT PHẲNG (XZ) ---
        raycaster.setFromCamera(event.pointer, camera);
        const intersects = raycaster.intersectObjects([plane], true);
        const intersect = intersects[0];
        if (intersect) {
          const newGridPos = getGridPositionFromIntersection(intersect);
          // Giữ nguyên trục Y của đối tượng hiện tại khi kéo trên mặt phẳng
          if (newGridPos) {
            const finalPos: [number, number, number] = [newGridPos[0], dragStartRef.current.objectPos[1], newGridPos[2]];
            onMoveObject(selectedObjectIds[0], finalPos);
          }
        }
      }
    }
  };

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    
    // Không cần kiểm tra phím đặc biệt ở đây nữa vì chuột trái đã được tách riêng

    if (event.button !== 0) return;
    raycaster.setFromCamera(event.pointer, camera);
    const objectsToIntersect = [plane, ...placedObjectsGroupRef.current.children];
    // --- THAY ĐỔI: Đảm bảo raycaster nhắm vào cả mặt phẳng và các đối tượng đã đặt ---
    const intersects = raycaster.intersectObjects(objectsToIntersect, true);
    // Lọc ra đối tượng rollover để tránh click vào chính nó
    const intersect = intersects.find(i => i.object.name !== 'RollOverMesh');

    // --- START: LOGIC CLICK ĐÃ ĐƯỢC TÁI CẤU TRÚC ---
    // 1. Luôn xác định đối tượng được click.
    let clickedObjectForSelection: THREE.Object3D | null | undefined = intersect?.object;
    while(clickedObjectForSelection && !clickedObjectForSelection.userData.id) {
        clickedObjectForSelection = clickedObjectForSelection.parent;
    }
    const clickedId = clickedObjectForSelection?.userData.id || null;

    // 2. Gọi hàm xử lý lựa chọn ở App.tsx.
    // App.tsx sẽ quyết định là chọn mới hay bắt đầu di chuyển.
    onSelectObject(clickedId, isShiftDown);

    // 3. Nếu App.tsx quyết định bắt đầu di chuyển, chúng ta lưu lại vị trí ban đầu.
    const objectToMove = clickedId ? placedObjects.find(o => o.id === clickedId) : null;
    if (objectToMove) {
      dragStartRef.current = { objectPos: objectToMove.position, mousePos: { x: event.clientX, y: event.clientY } };
    }
    // --- END: LOGIC CLICK ĐÃ ĐƯỢC TÁI CẤU TRÚC ---
    
    if (!intersect) return;
    const gridPosition = getGridPositionFromIntersection(intersect);
    if (!gridPosition) return;
    
    if (builderMode === 'build-single') {
      if (selectedAsset) {
        const [x, y, z] = gridPosition;
        if (x >= 0 && x < boxDimensions.width && y >= 0 && y < boxDimensions.height && z >= 0 && z < boxDimensions.depth) {
          onAddObject(gridPosition, selectedAsset);
        }
      }
    } else if (builderMode === 'build-area') {
      // --- START: CẬP NHẬT LOGIC CHỌN ĐIỂM BẮT ĐẦU ---
      let startPos: [number, number, number] | null = null;

      // Ưu tiên 1: Nếu click trúng một đối tượng, lấy vị trí của đối tượng đó làm điểm bắt đầu.
      const clickedObject = clickedId ? placedObjects.find(o => o.id === clickedId) : null;
      if (clickedObject) {
        startPos = clickedObject.position;
      } else {
        // Ưu tiên 2: Nếu không, lấy vị trí trên lưới như bình thường.
        startPos = getGridPositionForSelection(intersect);
      }

      if (!startPos) return;

      setIsDragging(true);
      onSetSelectionStart(startPos);
      onSetSelectionEnd(startPos);
      // --- END: CẬP NHẬT LOGIC CHỌN ĐIỂM BẮT ĐẦU ---
    }
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => { 
    if (isDragging) setIsDragging(false); 
    if (isMovingObject) {
      onSetIsMovingObject(false); // Cập nhật state ở App.tsx
      dragStartRef.current = null; // Xóa trạng thái khi nhả chuột
      // Logic để "commit" vị trí mới vào history có thể được thêm ở đây nếu cần
    }

    // --- THAY ĐỔI: Logic xóa đối tượng bằng Shift + Click chuột phải ---
    // Đổi từ isSpaceDown sang isShiftDown để tránh xung đột với điều hướng
    if (event.button === 2 && isShiftDown && builderMode === 'build-single') {
        raycaster.setFromCamera(event.pointer, camera);
        const objectsToIntersect = scene.children.filter(c => c.userData.isPlacedObject);
        const intersects = raycaster.intersectObjects(objectsToIntersect, true);
        const intersect = intersects.find(i => i.object.name !== 'RollOverMesh');

        if (intersect) {
            let objectToRemove = intersect.object;
            while (objectToRemove.parent && !objectToRemove.userData.id) objectToRemove = objectToRemove.parent;
            if (objectToRemove.userData.isPlacedObject) onRemoveObject(objectToRemove.userData.id);
        }
    }
  };

  return (
    <>
      <Grid position={[0, -0.01, 0]} args={[100, 100]} cellSize={TILE_SIZE} cellThickness={1} cellColor="#6f6f6f" sectionSize={10} sectionThickness={1.5} sectionColor="#2c89d7" fadeDistance={150} fadeStrength={1} infiniteGrid />
      <BoundingBox dimensions={boxDimensions} position={boundingBoxPosition} />
      {selectionBounds && <SelectionBox bounds={selectionBounds} />}
      <group ref={rollOverMeshRef}>
        <RollOverMesh selectedAsset={selectedAsset} />
      </group>
      <group ref={placedObjectsGroupRef}>
        {placedObjects.map(obj => <Suspense key={obj.id} fallback={null}><PlacedAsset 
          object={obj} 
          isSelected={selectedObjectIds.includes(obj.id)} 
          isHovered={obj.id === hoveredObjectId}
          onContextMenu={(e) => {
            e.stopPropagation();
            onObjectContextMenu(e.nativeEvent, obj.id);
          }} /></Suspense>)}
      </group>
      <PortalConnections objects={placedObjects} />
      <primitive object={plane} onPointerMove={handlePointerMove} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerOut={() => setPointer(new THREE.Vector2(99, 99))} />
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={['#ff2060', '#20ff60', '#2060ff']} labelColor="white" />
      </GizmoHelper>
    </>
  );
};

export const BuilderScene = forwardRef<SceneController, BuilderSceneProps>((props, ref) => {
  const cameraControlsRef = useRef<CameraControls | null>(null);

  useImperativeHandle(ref, () => ({
    changeView: (view) => {
      const controls = cameraControlsRef.current;
      if (!controls) return;
      const { width, height, depth } = props.boxDimensions;
      const centerX = (width * TILE_SIZE) / 2;
      const centerY = (height * TILE_SIZE) / 2;
      const centerZ = (depth * TILE_SIZE) / 2;
      const distance = Math.max(width, height, depth) * TILE_SIZE * 1.5;

      switch (view) {
        case 'top': controls.setLookAt(centerX, distance, centerZ, centerX, centerY, centerZ, true); break;
        case 'front': controls.setLookAt(centerX, centerY, distance, centerX, centerY, centerZ, true); break;
        case 'side': controls.setLookAt(distance, centerY, centerZ, centerX, centerY, centerZ, true); break;
        case 'perspective':
        default: controls.setLookAt(centerX + 15, centerY + 20, centerZ + 25, centerX, centerY, centerZ, true); break;
      }
    },
  }));

  return (
    <Canvas shadows camera={{ position: [15, 20, 25], fov: 60 }} onCreated={({ scene }) => { scene.add(new THREE.AmbientLight(0.5)); }}>
      <color attach="background" args={['#1e1e1e']} />
      <directionalLight position={[10, 20, 5]} intensity={1.5} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <Suspense fallback={null}>
        <SceneContent {...props} cameraControlsRef={cameraControlsRef} />
      </Suspense>
      <CameraControls ref={cameraControlsRef} makeDefault />
    </Canvas>
  );
});

// useGLTF.preload is only for glb/gltf files
const pathsToPreload = buildableAssetGroups
  .flatMap((g: AssetGroup) => g.items.map((i: BuildableAsset) => i.path))
  .filter((path): path is string => !!path);

useGLTF.preload(pathsToPreload);