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
  const [isShiftDown, setIsShiftDown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const {
      builderMode, selectedAsset, placedObjects, boxDimensions, onModeChange, 
      onAddObject, onRemoveObject, selectionBounds, onSetSelectionStart, 
      onSetSelectionEnd, cameraControlsRef, selectedObjectId, onSelectObject
  } = props;

  const plane = useMemo(() => new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ visible: false, depthWrite: false, name: 'ground_plane' })
  ), []);
  
  useEffect(() => {
    if (cameraControlsRef.current) {
        const isNavigate = builderMode === 'navigate';
        cameraControlsRef.current.enabled = isNavigate;
        cameraControlsRef.current.mouseButtons.right = isNavigate ? THREE.MOUSE.ROTATE : 0;
    }
  }, [builderMode, cameraControlsRef]);

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
      if (event.key === 'Shift') setIsShiftDown(true);
      if (event.key.toLowerCase() === 'b') onModeChange('build-single');
      if (event.key.toLowerCase() === 'v') onModeChange('navigate');
      if (event.key.toLowerCase() === 's') onModeChange('build-area');
      if (event.key === 'Escape') onSelectObject(null);
    };
    const handleKeyUp = (event: KeyboardEvent) => { if (event.key === 'Shift') setIsShiftDown(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onModeChange, onSelectObject]);

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (builderMode === 'build-single') setPointer(event.pointer);
    else if (builderMode === 'build-area' && isDragging) {
      raycaster.setFromCamera(event.pointer, camera);
      const intersects = raycaster.intersectObjects([plane, ...scene.children.filter(c => c.userData.isPlacedObject)], true);
      const intersect = intersects.find(i => i.object.name !== 'RollOverMesh');
      if (intersect) {
        const gridPos = getGridPositionFromIntersection(intersect);
        if (gridPos) onSetSelectionEnd(gridPos);
      }
    }
  };

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.button !== 0) return;
    raycaster.setFromCamera(event.pointer, camera);
    const objectsToIntersect = [plane, ...scene.children.filter(c => c.userData.isPlacedObject)];
    const intersects = raycaster.intersectObjects(objectsToIntersect, true);
    const intersect = intersects.find(i => i.object.name !== 'RollOverMesh');

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
      if (isShiftDown) {
        let objectToRemove = intersect.object;
        while (objectToRemove.parent && !objectToRemove.userData.id) objectToRemove = objectToRemove.parent;
        if (objectToRemove.userData.isPlacedObject) onRemoveObject(objectToRemove.userData.id);
      } else if (selectedAsset) {
        const [x, y, z] = gridPosition;
        if (x >= 0 && x < boxDimensions.width && y >= 0 && y < boxDimensions.height && z >= 0 && z < boxDimensions.depth) onAddObject(gridPosition, selectedAsset);
      }
    } else if (builderMode === 'build-area') {
      setIsDragging(true);
      onSetSelectionStart(gridPosition);
      onSetSelectionEnd(gridPosition);
    }
  };

  const handlePointerUp = () => { if (isDragging) setIsDragging(false); };

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