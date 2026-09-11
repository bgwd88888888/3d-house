"use client";

/**
 * 室内灯火 Canvas：独立灯光与近距轨道，可按预设机位切换。
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomScene } from "./RoomScene";
import {
  DEFAULT_ROOM_VIEW,
  ROOM,
  ROOM_VIEWS,
  type RoomViewId,
} from "@/lib/roomSpec";

const VIEW_POSES = Object.fromEntries(
  ROOM_VIEWS.map((view) => [
    view.id,
    {
      eye: new THREE.Vector3(...view.eye),
      target: new THREE.Vector3(...view.target),
    },
  ]),
) as Record<RoomViewId, { eye: THREE.Vector3; target: THREE.Vector3 }>;

const DEFAULT_TARGET = VIEW_POSES.salon.target.toArray() as [number, number, number];
const DEFAULT_EYE = VIEW_POSES.salon.eye.toArray() as [number, number, number];
const BG = "#241910";
const FOG = "#241910";
const LERP_SECONDS = 0.72;

type OrbitLike = {
  target: THREE.Vector3;
  enabled: boolean;
  update: () => void;
};

function RoomLights() {
  const windowZ = ROOM.innerDepth * 0.5 + 3.4;
  return (
    <>
      <hemisphereLight
        intensity={0.42}
        color="#8a6854"
        groundColor="#1a1410"
      />
      <directionalLight
        intensity={0.62}
        color="#e8c49a"
        position={[0.4, 2.6, windowZ]}
      />
      <pointLight
        position={[3.05, 1.48, 0.35]}
        color="#e2b894"
        intensity={5.5}
        distance={6.5}
        decay={2}
      />
    </>
  );
}

function WindowOutlook() {
  const z = ROOM.innerDepth * 0.5 + 10;
  return (
    <group>
      <mesh position={[0, 2.4, z]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[42, 18]} />
        <meshBasicMaterial color="#4e3228" />
      </mesh>
      <mesh rotation={[-Math.PI * 0.5, 0, 0]} position={[0, -0.2, z - 2]}>
        <planeGeometry args={[42, 24]} />
        <meshBasicMaterial color="#14100e" />
      </mesh>
      <mesh position={[-2.4, 1.05, z - 3.6]}>
        <coneGeometry args={[1.05, 2.5, 5]} />
        <meshBasicMaterial color="#19120e" />
      </mesh>
      <mesh position={[2.6, 0.85, z - 3]}>
        <coneGeometry args={[0.7, 1.85, 5]} />
        <meshBasicMaterial color="#17110d" />
      </mesh>
    </group>
  );
}

function RoomCameraRig({
  view,
  shot,
}: {
  view: RoomViewId;
  shot: number;
}) {
  const { camera, controls } = useThree();
  const fromEye = useRef(new THREE.Vector3());
  const fromTarget = useRef(new THREE.Vector3());
  const progress = useRef(1);

  useEffect(() => {
    progress.current = 0;
  }, [view, shot]);

  useFrame((_, delta) => {
    const orbit = controls as OrbitLike | null;
    if (!orbit?.target) return;
    const pose = VIEW_POSES[view];
    /* eslint-disable react-hooks/immutability -- 预设机位过渡要写相机、轨道目标与控件开关 */
    if (progress.current >= 1) {
      orbit.enabled = true;
      return;
    }
    if (progress.current === 0) {
      fromEye.current.copy(camera.position);
      fromTarget.current.copy(orbit.target);
    }
    progress.current = Math.min(1, progress.current + delta / LERP_SECONDS);
    const ease = 1 - (1 - progress.current) ** 3;
    camera.position.lerpVectors(fromEye.current, pose.eye, ease);
    orbit.target.lerpVectors(fromTarget.current, pose.target, ease);
    orbit.enabled = false;
    /* eslint-enable react-hooks/immutability */
    camera.lookAt(orbit.target);
    orbit.update();
  });

  return null;
}

function RoomCameraBounds() {
  const { camera } = useThree();
  const pad = 0.48;
  const maxZ = ROOM.innerDepth * 0.5 - 0.24;

  useFrame(() => {
    /* eslint-disable react-hooks/immutability -- OrbitControls 之后把相机限制在房间内 */
    camera.position.x = THREE.MathUtils.clamp(
      camera.position.x,
      -ROOM.innerWidth * 0.5 + pad,
      ROOM.innerWidth * 0.5 - pad,
    );
    camera.position.y = THREE.MathUtils.clamp(
      camera.position.y,
      0.42,
      ROOM.innerHeight - 0.3,
    );
    camera.position.z = THREE.MathUtils.clamp(
      camera.position.z,
      -ROOM.innerDepth * 0.5 + pad,
      maxZ,
    );
    /* eslint-enable react-hooks/immutability */
  });

  return null;
}

export function RoomCanvas({
  className,
  view = DEFAULT_ROOM_VIEW,
  shot = 0,
}: {
  className?: string;
  view?: RoomViewId;
  shot?: number;
}) {
  return (
    <Canvas
      className={className}
      dpr={[1, 1.5]}
      camera={{
        position: DEFAULT_EYE,
        fov: 44,
        near: 0.08,
        far: 90,
      }}
      gl={{
        antialias: true,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.94,
      }}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[FOG, 16, 42]} />
      <RoomLights />
      <RoomCameraRig view={view} shot={shot} />
      <RoomCameraBounds />
      <Suspense fallback={null}>
        <Environment frames={1} preset="apartment" environmentIntensity={0.08} />
        <RoomScene />
      </Suspense>
      <WindowOutlook />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minPolarAngle={0.18}
        maxPolarAngle={Math.PI / 2 - 0.08}
        minDistance={0.7}
        maxDistance={7.2}
        target={DEFAULT_TARGET}
      />
    </Canvas>
  );
}
