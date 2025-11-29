import { Suspense, useMemo, useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber/dist/declarations/src/core/events';
import { Grid, useGLTF, CameraControls, GizmoHelper, GizmoViewport, Line, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { buildableAssetGroups } from '../../config/gameAssets';
import type { BuildableAsset, PlacedObject, BuilderMode, BoxDimensions, SelectionBounds, AssetGroup } from '../../types';
import { BoundingBox } from '../BoundingBox';
import { SelectionBox } from '../SelectionBox';

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
    onSetSelectionStart: (pos: [number, number, number] | null) => void;
    onSetSelectionEnd: (pos: [number, number, number] | null) => void;
    selectedObjectId: string | null;
    onSelectObject: (id: string | null) => void;
    onMoveObject: (objectId: string, newPosition: [number, number, number]) => void;
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
  const color = properties?.color || '#ffffff';
  
  switch (asset.primitiveShape) {
    case 'torus':
      return (
        <mesh>
          <torusGeometry args={[0.5, 0.2, 16, 48]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.5} />
        </mesh>
      );
    case 'cone':
       return (
        <mesh>
          <coneGeometry args={[0.6, 1.2, 32]} />
          <meshStandardMaterial color={"gold"} roughness={0.3} metalness={0.8} />
        </mesh>
      );
    // Có thể thêm các hình khác ở đây
    default:
      return (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={"magenta"} />
        </mesh>
      );
  }
};


function PlacedAsset({ object, isSelected }: { object: PlacedObject; isSelected: boolean }) {
  const worldPosition: [number, number, number] = [
    object.position[0] * TILE_SIZE + TILE_SIZE / 2,
    object.position[1] * TILE_SIZE + TILE_SIZE / 2,
    object.position[2] * TILE_SIZE + TILE_SIZE / 2
  ];

  return (
    <group 
      position={worldPosition} 
      scale={TILE_SIZE} 
      userData={{ isPlacedObject: true, id: object.id }}
    >
      <AssetRenderer asset={object.asset} properties={object.properties} />
      {isSelected && <Outlines thickness={0.05} color="yellow" />}
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
  const [isSpaceDown, setIsSpaceDown] = useState(false); // <-- THAY ĐỔI: Theo dõi phím Space
  const [isAltDown, setIsAltDown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMovingObject, setIsMovingObject] = useState(false); // State mới để theo dõi việc kéo-thả

  const {
      builderMode, selectedAsset, placedObjects, boxDimensions, onModeChange, 
      onAddObject, onRemoveObject, selectionBounds, onSetSelectionStart, onSetSelectionEnd, cameraControlsRef, selectedObjectId, onSelectObject, onMoveObject
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

        // --- LOGIC ĐIỀU HƯỚNG THEO NGỮ CẢNH ---
        if (selectedObjectId) {
          // KHI CÓ ĐỐI TƯỢNG ĐƯỢC CHỌN: Dành chuột trái cho tương tác.
          controls.mouseButtons.left = NO_ACTION;
          // Dùng chuột phải để điều hướng.
          controls.mouseButtons.right = isSpaceDown ? TRUCK_ACTION : ROTATE_ACTION;
        } else {
          // KHI KHÔNG CÓ ĐỐI TƯỢNG NÀO ĐƯỢC CHỌN: Dùng chuột trái để điều hướng.
          controls.mouseButtons.left = isSpaceDown ? TRUCK_ACTION : ROTATE_ACTION;
          // Chuột phải vẫn có thể dùng để xoay cho nhất quán.
          controls.mouseButtons.right = ROTATE_ACTION;
        }

        // Giữ nguyên các nút khác nếu cần
        controls.mouseButtons.middle = THREE.MOUSE.DOLLY;
    }
  }, [builderMode, cameraControlsRef, isSpaceDown, selectedObjectId]); // Thêm selectedObjectId vào dependencies

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
        const posVec = new THREE.Vector3().copy(intersect.point).sub(intersect.face.normal.clone().multiplyScalar(0.1));
        return [Math.floor(posVec.x / TILE_SIZE), Math.floor(posVec.y / TILE_SIZE), Math.floor(posVec.z / TILE_SIZE)];
    }

    // Nếu con trỏ chuột trúng mặt phẳng đất, chúng ta tính toán như bình thường.
    const posVec = new THREE.Vector3().copy(intersect.point);
    return [Math.floor(posVec.x / TILE_SIZE), Math.floor(posVec.y / TILE_SIZE), Math.floor(posVec.z / TILE_SIZE)];
  };
  // --- KẾT THÚC HÀM MỚI ---

  useFrame(() => {
    if (builderMode !== 'build-single' || !rollOverMeshRef.current) {
      if (rollOverMeshRef.current) rollOverMeshRef.current.visible = false;
      return;
    }
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects([plane, ...scene.children.filter(c => c.userData.isPlacedObject)], true);
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
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') setIsSpaceDown(true); // <-- THAY ĐỔI: Lắng nghe phím Space
      if (event.key === 'Alt') setIsAltDown(true); // Bắt sự kiện nhấn Alt
      if (event.key.toLowerCase() === 'b') onModeChange('build-single');
      if (event.key.toLowerCase() === 'v') onModeChange('navigate');
      if (event.key.toLowerCase() === 's') onModeChange('build-area');
      if (event.key === 'Escape') onSelectObject(null);
    };
    const handleKeyUp = (event: KeyboardEvent) => { 
      if (event.code === 'Space') setIsSpaceDown(false); // <-- THAY ĐỔI: Lắng nghe phím Space
      if (event.key === 'Alt') setIsAltDown(false); // Bắt sự kiện nhả Alt
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onModeChange, onSelectObject]); // Không cần thêm isAltDown vào dependencies

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (builderMode === 'build-single') setPointer(event.pointer);
    else if (builderMode === 'build-area' && isDragging) {
      raycaster.setFromCamera(event.pointer, camera);
      const intersects = raycaster.intersectObjects([plane, ...scene.children.filter(c => c.userData.isPlacedObject)], true);
      const intersect = intersects.find(i => i.object.name !== 'RollOverMesh');
      if (intersect) {
        const gridPos = getGridPositionForSelection(intersect);
        if (gridPos) onSetSelectionEnd(gridPos);
      }
    } else if (isMovingObject && selectedObjectId) {
      // --- LOGIC MỚI: Di chuyển đối tượng khi kéo chuột ---
      raycaster.setFromCamera(event.pointer, camera);
      const intersects = raycaster.intersectObjects([plane], true); // Chỉ cần giao với mặt phẳng nền
      const intersect = intersects[0];
      if (intersect) {
        const newGridPos = getGridPositionFromIntersection(intersect);
        if (newGridPos) {
          onMoveObject(selectedObjectId, newGridPos);
        }
      }
    }
  };

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    
    // Không cần kiểm tra phím đặc biệt ở đây nữa vì chuột trái đã được tách riêng

    if (event.button !== 0) return;
    raycaster.setFromCamera(event.pointer, camera);
    const objectsToIntersect = [plane, ...scene.children.filter(c => c.userData.isPlacedObject)];
    const intersects = raycaster.intersectObjects(objectsToIntersect, true);
    const intersect = intersects.find(i => i.object.name !== 'RollOverMesh');

    // --- LOGIC MỚI: Bắt đầu kéo-thả đối tượng ---
    if (intersect?.object) {
        let clickedObject: THREE.Object3D | null | undefined = intersect.object;
        while(clickedObject && !clickedObject.userData.id) {
            clickedObject = clickedObject.parent;
        }
        // Nếu click vào đối tượng đã chọn, bắt đầu di chuyển
        if (clickedObject?.userData.id && clickedObject.userData.id === selectedObjectId) {
            setIsMovingObject(true);
            return; // Dừng lại để không thực hiện các hành động khác
        }
    }

    if (builderMode === 'navigate') {
        let clickedObject: THREE.Object3D | null | undefined = intersect?.object;
        while(clickedObject && !clickedObject.userData.id) {
            clickedObject = clickedObject.parent;
        }
        if (clickedObject?.userData.id) {
            onSelectObject(clickedObject.userData.id);
        } else {
            onSelectObject(null);
        }
        return;
    }
    
    if (!intersect) return;
    const gridPosition = getGridPositionFromIntersection(intersect);
    if (!gridPosition) return;
    
    if (builderMode === 'build-single') {
      // Logic đặt khối chỉ chạy khi không giữ Shift
      if (selectedAsset) {
        const [x, y, z] = gridPosition;
        if (x >= 0 && x < boxDimensions.width && y >= 0 && y < boxDimensions.height && z >= 0 && z < boxDimensions.depth) onAddObject(gridPosition, selectedAsset);
      }
    } else if (builderMode === 'build-area') {
      const selectionGridPos = getGridPositionForSelection(intersect); // Sử dụng hàm mới
      if (!selectionGridPos) return;
      setIsDragging(true);
      onSetSelectionStart(selectionGridPos);
      onSetSelectionEnd(selectionGridPos);
    }
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => { 
    if (isDragging) setIsDragging(false); 
    if (isMovingObject) {
      setIsMovingObject(false);
      // Logic để "commit" vị trí mới vào history có thể được thêm ở đây nếu cần
    }

    // Logic xóa đối tượng bằng Shift + Click chuột phải
    if (event.button === 2 && isSpaceDown && builderMode === 'build-single') { // Có thể cân nhắc đổi phím tắt này
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
      {placedObjects.map(obj => <Suspense key={obj.id} fallback={null}><PlacedAsset object={obj} isSelected={obj.id === selectedObjectId}/></Suspense>)}
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