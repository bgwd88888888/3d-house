"use client";

/**
 * 3D 场景根 Canvas：灯光 / 环境 / 地面 / 房子 / 庭院装饰 / 轨道相机。
 *
 * 组装关系：
 * - CityScene     程序化房子（随 stage 渐进建造）
 * - GrassGround   大范围草坪地面（铺满视野）
 * - GardenPeople  庭院人物（Kenney 角色 + 精灵）
 * - GardenTrees   桦树模型摆放
 * - GardenPickup  门口皮卡（Kenney Car Kit）
 *
 * 草坪本身即地面；不再另铺灰底板 / 网格，避免露出「院子方块」边界。
 *
 * 光照：户外天空感（Sky + park HDR + 蓝天半球光 + 暖色太阳光），避免 studio 室内光。
 */
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, Sky } from "@react-three/drei";
import { Suspense } from "react";
import * as THREE from "three";
import type { BuildStage } from "@/lib/geoBuildings";
import { CityScene } from "./CityScene";
import { GrassGround } from "./GrassGround";
import { GardenPeople } from "./GardenPeople";
import { GardenTrees } from "./GardenTrees";
import { GardenPickup } from "./GardenPickup";

/** 太阳方向（与 Sky / 主平行光共用，保证天空与投影一致） */
const SUN_POSITION: [number, number, number] = [72, 58, 36];

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
        toneMappingExposure: 1.05,
      }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      {/* 浅天蓝底，Sky 罩在上面；雾与远草坪衔接 */}
      <color attach="background" args={["#c8daf0"]} />
      <fog attach="fog" args={["#c8daf0", 220, 680]} />

      <Sky
        sunPosition={SUN_POSITION}
        turbidity={3.2}
        rayleigh={1.15}
        mieCoefficient={0.004}
        mieDirectionalG={0.82}
      />

      {/* 天空散射：上方偏冷蓝，地面反弹偏草绿 */}
      <hemisphereLight intensity={0.72} color="#b9d4f5" groundColor="#9aab78" />
      {/* 主阳光：暖白、斜射，拉开阴阳面对比 */}
      <directionalLight
        castShadow
        intensity={1.55}
        color="#ffe6c2"
        position={SUN_POSITION}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={320}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
        shadow-radius={3}
        shadow-bias={-0.00015}
        shadow-normalBias={0.035}
      />
      {/* 天光补光：背阴面微弱冷调，避免死黑 */}
      <directionalLight
        intensity={0.28}
        color="#aec8e8"
        position={[-48, 36, -28]}
      />

      <Suspense fallback={null}>
        {/* 户外 HDR，替代原先的 studio 室内环境 */}
        <Environment preset="park" environmentIntensity={0.38} />
        <CityScene stage={stage} />
      </Suspense>

      <Suspense fallback={null}>
        <GrassGround />
      </Suspense>
      <Suspense fallback={null}>
        <GardenPeople />
      </Suspense>
      <Suspense fallback={null}>
        <GardenTrees />
      </Suspense>
      <Suspense fallback={null}>
        <GardenPickup />
      </Suspense>

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
