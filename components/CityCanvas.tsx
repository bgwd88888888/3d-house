"use client";

/**
 * 3D 场景根 Canvas：灯光 / 环境 / 地面 / 房子 / 庭院装饰 / 轨道相机。
 *
 * 组装关系：
 * - CityScene     程序化房子（随 stage 渐进建造）
 * - GrassGround   草地平面 + 草叶实例
 * - GardenPeople  庭院人物（Kenney 角色 + 精灵）
 * - GardenTrees   桦树模型摆放
 *
 * 大地面平面在草地之下；Grid 仅作空间参考，可绕房子旋转观察。
 */
import { Canvas } from "@react-three/fiber";
import { Environment, Grid, OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import * as THREE from "three";
import type { BuildStage } from "@/lib/geoBuildings";
import { CityScene } from "./CityScene";
import { GrassGround } from "./GrassGround";
import { GardenPeople } from "./GardenPeople";
import { GardenTrees } from "./GardenTrees";

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
        toneMappingExposure: 0.78,
      }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFShadowMap;
      }}
    >
      <color attach="background" args={["#f1f1ef"]} />

      {/* 柔和环境光 + 主方向光（带大范围阴影） */}
      <hemisphereLight intensity={0.38} color="#fffaf2" groundColor="#afb2bd" />
      <ambientLight intensity={0.1} />
      <directionalLight
        castShadow
        intensity={0.9}
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
        <Environment preset="studio" environmentIntensity={0.22} />
        <CityScene stage={stage} />
      </Suspense>

      {/* 无限感浅灰地面（草地之下） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[2400, 2400]} />
        <meshStandardMaterial
          color="#efefee"
          roughness={0.96}
          metalness={0}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      <Suspense fallback={null}>
        <GrassGround />
      </Suspense>
      <Suspense fallback={null}>
        <GardenPeople />
      </Suspense>
      <Suspense fallback={null}>
        <GardenTrees />
      </Suspense>

      <Grid
        infiniteGrid
        fadeDistance={420}
        fadeStrength={1.2}
        cellSize={6}
        sectionSize={42}
        position={[0, -0.06, 0]}
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
