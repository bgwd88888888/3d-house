"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { KungfuFighter, type KungfuFighterProps } from "./KungfuFighter";

export function KungfuCanvas({ characterKey, ...props }: KungfuFighterProps & { characterKey: number }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [2.4, 1.65, 3.75], fov: 34, near: 0.1, far: 30 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
    >
      <color attach="background" args={["#08090b"]} />
      <fog attach="fog" args={["#08090b", 7, 15]} />
      <ambientLight intensity={0.32} />
      <hemisphereLight args={["#bfcde1", "#151213", 0.75]} />
      <spotLight
        position={[1.4, 5.4, 2.5]}
        color="#ffe2c1"
        intensity={95}
        angle={0.36}
        penumbra={0.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
      />
      <spotLight position={[-2.5, 3.4, -2]} color="#8caeff" intensity={65} angle={0.48} penumbra={1} />
      <spotLight position={[0, 2.2, 4]} color="#f3f0ed" intensity={18} angle={0.65} penumbra={1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#141518" roughness={0.82} metalness={0.1} />
      </mesh>
      <Suspense key={characterKey} fallback={null}>
        <KungfuFighter {...props} />
      </Suspense>
      <OrbitControls
        makeDefault
        target={[0, 0.93, 0]}
        enablePan={false}
        enableDamping
        minDistance={3.2}
        maxDistance={6.5}
        minPolarAngle={Math.PI * 0.3}
        maxPolarAngle={Math.PI * 0.48}
      />
    </Canvas>
  );
}
