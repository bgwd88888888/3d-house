"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, Grid, OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import * as THREE from "three";
import type { BuildStage } from "@/lib/geoBuildings";
import { CityScene } from "./CityScene";

type CityCanvasProps = {
  className?: string;
  stage: BuildStage;
};

export function CityCanvas({ className, stage }: CityCanvasProps) {
  return (
    <Canvas
      className={className}
      shadows
      gl={{
        antialias: true,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.96,
      }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFShadowMap;
      }}
    >
      <color attach="background" args={["#f1f1ef"]} />

      <hemisphereLight intensity={0.6} color="#fffaf2" groundColor="#afb2bd" />
      <ambientLight intensity={0.22} />
      <directionalLight
        castShadow
        intensity={1.5}
        position={[48, 86, 56]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={520}
        shadow-camera-left={-160}
        shadow-camera-right={160}
        shadow-camera-top={160}
        shadow-camera-bottom={-160}
        shadow-normalBias={0.03}
        shadow-bias={-0.0002}
      />

      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.42} />
        <CityScene stage={stage} />
      </Suspense>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow>
        <planeGeometry args={[2400, 2400]} />
        <meshStandardMaterial color="#efefee" roughness={0.96} metalness={0} />
      </mesh>

      <Grid
        infiniteGrid
        fadeDistance={420}
        fadeStrength={1.2}
        cellSize={6}
        sectionSize={42}
        position={[0, 0.001, 0]}
        sectionColor="#d2d4db"
        cellColor="#e3e5ea"
      />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.02}
        minDistance={18}
        maxDistance={900}
        target={[0, 14, 0]}
      />
    </Canvas>
  );
}
