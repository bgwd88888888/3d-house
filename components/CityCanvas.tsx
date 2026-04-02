"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { Suspense } from "react";
import { CityScene } from "./CityScene";

type CityCanvasProps = {
  className?: string;
};

export function CityCanvas({ className }: CityCanvasProps) {
  return (
    <Canvas className={className} shadows gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={["#080812"]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        castShadow
        intensity={1.25}
        position={[120, 200, 80]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={600}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
      />
      <Suspense fallback={null}>
        <CityScene />
      </Suspense>
      <Grid
        args={[500, 500]}
        position={[0, -0.02, 0]}
        cellSize={15}
        sectionSize={75}
        fadeDistance={650}
        sectionColor="#2a2a38"
        cellColor="#1a1a24"
        infiniteGrid
      />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.04}
        minDistance={25}
        maxDistance={900}
        target={[0, 12, 0]}
      />
    </Canvas>
  );
}
