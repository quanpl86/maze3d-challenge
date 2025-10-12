import { Suspense, useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Grid, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { buildableAssetGroups, type AssetGroup } from '../../config/gameAssets';
import type { BuildableAsset, PlacedObject, BuilderMode, BoxDimensions } from '../../types';
import { BoundingBox } from '../BoundingBox';

const TILE_SIZE = 2;

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
        // <<< THAY ĐỔI: Gán tên để dễ dàng bỏ qua khi raycast
        child.name = "RollOverMesh";
    }
  });
  return <primitive object={meshToRender} scale={TILE_SIZE} />;
}

function SceneContent({ builderMode, selectedAsset, placedObjects, boxDimensions, onModeChange, onAddObject, onRemoveObject }: BuilderSceneProps) {
  const { camera, raycaster, scene } = useThree();
  const [pointer, setPointer] = useState(new THREE.Vector2(99, 99));
  const rollOverMeshRef = useRef<THREE.Group>(null!);
  const [isShiftDown, setIsShiftDown] = useState(false);
  const orbitControlsRef = useRef<any>(null!);

  const plane = useMemo(() => new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ visible: false, depthWrite: false, name: 'ground_plane' })
  ), []);

  useEffect(() => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = (builderMode === 'navigate');
    }
  }, [builderMode]);

  // <<< THAY ĐỔI 1: Sửa lại công thức tính vị trí BoundingBox cho chính xác
  const boundingBoxPosition = useMemo((): [number, number, number] => {
    return [
      (boxDimensions.width * TILE_SIZE) / 2,
      (boxDimensions.height * TILE_SIZE) / 2,
      (boxDimensions.depth * TILE_SIZE) / 2,
    ];
  }, [boxDimensions]);

  useFrame(() => {
    if (builderMode !== 'build' || !rollOverMeshRef.current) {
      if (rollOverMeshRef.current) rollOverMeshRef.current.visible = false;
      return;
    }
    
    raycaster.setFromCamera(pointer, camera);
    const objectsToIntersect = [plane, ...scene.children.filter(c => c.userData.isPlacedObject)];
    const intersects = raycaster.intersectObjects(objectsToIntersect, true);

    // <<< THAY ĐỔI 2: Lọc kết quả để raycaster bỏ qua chính pointer
    const intersect = intersects.find(i => i.object.name !== 'RollOverMesh');

    if (intersect && intersect.face) {
      const newPos = new THREE.Vector3();
      newPos.copy(intersect.point).add(intersect.face.normal);
      newPos.divideScalar(TILE_SIZE).floor().multiplyScalar(TILE_SIZE).addScalar(TILE_SIZE / 2);
      
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
      if (event.key.toLowerCase() === 'b') onModeChange('build');
      if (event.key.toLowerCase() === 'v') onModeChange('navigate');
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') setIsShiftDown(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onModeChange]);

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (builderMode !== 'build') return;
    setPointer(event.pointer);
  };
  
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      if (builderMode !== 'build' || event.button !== 0) return;
      
      const objectsToIntersect = [plane, ...scene.children.filter(c => c.userData.isPlacedObject)];
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(objectsToIntersect, true);

      // <<< THAY ĐỔI 2 (Lặp lại): Lọc kết quả để bỏ qua pointer khi click
      const intersect = intersects.find(i => i.object.name !== 'RollOverMesh');

      if (intersect) {
        if (isShiftDown) {
          let objectToRemove = intersect.object;
          while(objectToRemove.parent && !objectToRemove.userData.id) {
            objectToRemove = objectToRemove.parent;
          }

          if (objectToRemove.userData.isPlacedObject) {
            onRemoveObject(objectToRemove.userData.id);
          }
        } else if (selectedAsset) {
          if (!intersect.face) return;
          const newPosVec = new THREE.Vector3();
          newPosVec.copy(intersect.point).add(intersect.face.normal);
          const gridPosition: [number, number, number] = [
            Math.floor(newPosVec.x / TILE_SIZE),
            Math.floor(newPosVec.y / TILE_SIZE),
            Math.floor(newPosVec.z / TILE_SIZE)
          ];

          const [x, y, z] = gridPosition;
          if (x >= 0 && x < boxDimensions.width && y >= 0 && y < boxDimensions.height && z >= 0 && z < boxDimensions.depth) {
            onAddObject(gridPosition);
          } else {
            console.warn("Cannot place object outside the build area.");
          }
        }
      }
  }

  return (
    <>
      <Grid position={[0, -0.01, 0]} args={[100, 100]} cellSize={TILE_SIZE} cellThickness={1} cellColor="#6f6f6f" sectionSize={10} sectionThickness={1.5} sectionColor="#2c89d7" fadeDistance={150} fadeStrength={1} infiniteGrid />
      
      {/* Cần đảm bảo component BoundingBox của bạn render tại vị trí `position` thay vì `0,0,0` */}
      <BoundingBox dimensions={boxDimensions} position={boundingBoxPosition} />
      
      <group ref={rollOverMeshRef}>
          {selectedAsset && <RollOverMesh selectedAsset={selectedAsset} />}
      </group>

      {placedObjects.map(obj => (
        <Suspense key={obj.id} fallback={null}>
            <PlacedAsset object={obj} />
        </Suspense>
      ))}
      
      <OrbitControls ref={orbitControlsRef} makeDefault />
      
      <primitive object={plane} onPointerMove={handlePointerMove} onPointerDown={handlePointerDown} onPointerOut={() => setPointer(new THREE.Vector2(99,99))} />
    </>
  );
}

interface BuilderSceneProps {
    builderMode: BuilderMode;
    selectedAsset: BuildableAsset | null;
    placedObjects: PlacedObject[];
    boxDimensions: BoxDimensions;
    onModeChange: (mode: BuilderMode) => void;
    onAddObject: (position: [number, number, number]) => void;
    onRemoveObject: (id: string) => void;
}

export function BuilderScene(props: BuilderSceneProps) {
  return (
    <div className="builder-scene-container">
      <Canvas shadows camera={{ position: [15, 20, 25], fov: 60 }} onCreated={({ scene }) => { scene.add(new THREE.AmbientLight(0.5)); }}>
        <color attach="background" args={['#1e1e1e']} />
        <directionalLight position={[10, 20, 5]} intensity={1.5} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <Suspense fallback={null}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(buildableAssetGroups.flatMap((g: AssetGroup) => g.items.map((i: BuildableAsset) => i.path)));