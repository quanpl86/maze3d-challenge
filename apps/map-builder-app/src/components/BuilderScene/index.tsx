import { Suspense, useMemo, useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber/dist/declarations/src/core/events';
import { Grid, useGLTF, CameraControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { buildableAssetGroups, type AssetGroup } from '../../config/gameAssets';
import type { BuildableAsset, PlacedObject, BuilderMode, BoxDimensions, SelectionBounds } from '../../types';
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
    onAddObject: (position: [number, number, number]) => void;
    onRemoveObject: (id: string) => void;
    selectionBounds: SelectionBounds | null;
    onSetSelectionStart: (pos: [number, number, number] | null) => void;
    onSetSelectionEnd: (pos: [number, number, number] | null) => void;
}

function PlacedAsset({ object }: { object: PlacedObject; }) {
  const { scene } = useGLTF(object.asset.path);
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  
  const worldPosition: [number, number, number] = [
    object.position[0] * TILE_SIZE + TILE_SIZE / 2,
    object.position[1] * TILE_SIZE + TILE_SIZE / 2,
    object.position[2] * TILE_SIZE + TILE_SIZE / 2
  ];

  return (
    <primitive 
      object={clonedScene} 
      position={worldPosition} 
      scale={TILE_SIZE} 
      userData={{ isPlacedObject: true, id: object.id }}
    />
  );
}

function RollOverMesh({ selectedAsset }: { selectedAsset: BuildableAsset | null }) {
  const { scene } = useGLTF(selectedAsset?.path || '/assets/maze/models/stone01.glb');
  const meshToRender = useMemo(() => scene.clone(), [scene]);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true, depthWrite: false });
  meshToRender.traverse((child: THREE.Object3D) => {
    if (child instanceof THREE.Mesh) {
        child.material = material;
        child.name = "RollOverMesh";
    }
  });
  return <primitive object={meshToRender} scale={TILE_SIZE} />;
}

const SceneContent = (props: BuilderSceneProps & { cameraControlsRef: React.RefObject<CameraControls | null> }) => {
  const { camera, raycaster, scene } = useThree();
  const [pointer, setPointer] = useState(new THREE.Vector2(99, 99));
  const rollOverMeshRef = useRef<THREE.Group>(null!);
  const [isShiftDown, setIsShiftDown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const {
      builderMode, selectedAsset, placedObjects, boxDimensions, onModeChange, 
      onAddObject, onRemoveObject, selectionBounds, onSetSelectionStart, 
      onSetSelectionEnd, cameraControlsRef
  } = props;

  const plane = useMemo(() => new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ visible: false, depthWrite: false, name: 'ground_plane' })
  ), []);
  
  useEffect(() => {
    if (cameraControlsRef.current) {
      cameraControlsRef.current.enabled = (builderMode === 'navigate');
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
    };
    const handleKeyUp = (event: KeyboardEvent) => { if (event.key === 'Shift') setIsShiftDown(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onModeChange]);

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
    const intersects = raycaster.intersectObjects([plane, ...scene.children.filter(c => c.userData.isPlacedObject)], true);
    const intersect = intersects.find(i => i.object.name !== 'RollOverMesh');
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
        if (x >= 0 && x < boxDimensions.width && y >= 0 && y < boxDimensions.height && z >= 0 && z < boxDimensions.depth) onAddObject(gridPosition);
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
        {builderMode === 'build-single' && selectedAsset && <RollOverMesh selectedAsset={selectedAsset} />}
      </group>
      {placedObjects.map(obj => <Suspense key={obj.id} fallback={null}><PlacedAsset object={obj} /></Suspense>)}
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

useGLTF.preload(buildableAssetGroups.flatMap((g: AssetGroup) => g.items.map((i: BuildableAsset) => i.path)));