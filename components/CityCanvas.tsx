"use client";

/**
 * 3D 场景根 Canvas：共用天空/天气/草地；建筑场景可切换。
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { BuildStage } from "@/lib/geoBuildings";
import {
  DEFAULT_WEATHER,
  WEATHER_PRESETS,
  type WeatherKind,
} from "@/lib/weatherPresets";
import {
  DEFAULT_SCENE,
  type SceneKind,
} from "@/lib/sceneKinds";
import { setActiveGardenScene } from "@/lib/gardenNavigation";
import { COMPOUND_HALF_X, COMPOUND_HALF_Z } from "@/lib/geoCompound";
import { CityScene } from "./CityScene";
import { GrassGround } from "./GrassGround";
import { PrairieSky } from "./PrairieSky";
import { SkyClouds } from "./SkyClouds";
import { GardenPath } from "./GardenPath";
import { GardenPond } from "./GardenPond";
import { GardenPickup } from "./GardenPickup";
import { CottageGardenPeople } from "./CottageGardenPeople";
import { CottageGardenChickens } from "./CottageGardenChickens";
import { CottageGardenTrees } from "./CottageGardenTrees";
import { CottageGardenEnclosure } from "./CottageGardenEnclosure";
import { CottageEntrance } from "./CottageEntrance";
import { ChineseGardenFeatures } from "./ChineseGardenFeatures";
import { CourtyardEntrance } from "./CourtyardEntrance";
import { CourtyardWallMurals } from "./CourtyardWallMurals";
import { GardenPeople } from "./GardenPeople";
import { GardenChickens } from "./GardenChickens";
import { GardenTrees } from "./GardenTrees";

type CityCanvasProps = {
  className?: string;
  stage: BuildStage;
  weather?: WeatherKind;
  scene?: SceneKind;
};

/**
 * 阴影只罩院子：正交半宽略大于建筑/外树，近远裁在日光到地面这一段。
 * 草地接影半径比视锥略小，避开 PCF 在阴影图边缘打出的黑块。
 */
const GARDEN_SHADOW = {
  cottage: { frustum: 44, near: 24, far: 190, grass: 38 },
  courtyard: {
    frustum: Math.ceil(Math.max(COMPOUND_HALF_X, COMPOUND_HALF_Z) + 28),
    near: 20,
    far: 240,
    grass: Math.ceil(Math.max(COMPOUND_HALF_X, COMPOUND_HALF_Z) + 20),
  },
} as const;

/** 合院默认机位约 110m 外俯视；小院近雾会把整座院子泡进白盘子。 */
function sceneFogRange(
  scene: SceneKind,
  near: number,
  far: number,
): [number, number] {
  if (scene !== "courtyard") return [near, far];
  return [near + 70, far + 115];
}

function WeatherAtmosphere({
  weather,
  scene = DEFAULT_SCENE,
}: {
  weather: WeatherKind;
  scene?: SceneKind;
}) {
  const preset = WEATHER_PRESETS[weather];
  const { gl } = useThree();
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const shadow = GARDEN_SHADOW[scene] ?? GARDEN_SHADOW.cottage;
  const [fogNear, fogFar] = sceneFogRange(
    scene,
    preset.fogNear,
    preset.fogFar,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- Three.js 渲染器通过命令式赋值同步天气曝光。
    gl.toneMappingExposure = preset.exposure;
  }, [gl, preset.exposure]);

  useLayoutEffect(() => {
    const light = sunRef.current;
    if (!light) return;
    const cam = light.shadow.camera;
    cam.left = -shadow.frustum;
    cam.right = shadow.frustum;
    cam.top = shadow.frustum;
    cam.bottom = -shadow.frustum;
    cam.near = shadow.near;
    cam.far = shadow.far;
    cam.updateProjectionMatrix();
    light.shadow.needsUpdate = true;
  }, [shadow]);

  return (
    <>
      <color attach="background" args={[preset.background]} />
      <fog
        attach="fog"
        args={[preset.fogColor, fogNear, fogFar]}
      />

      <PrairieSky weather={weather} />

      <Suspense fallback={null}>
        <SkyClouds preset={preset} />
      </Suspense>

      <hemisphereLight
        intensity={preset.hemiIntensity}
        color={preset.hemiSky}
        groundColor={preset.hemiGround}
      />
      <directionalLight
        ref={sunRef}
        castShadow
        intensity={preset.sunIntensity}
        color={preset.sunColor}
        position={preset.sunPosition}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={shadow.near}
        shadow-camera-far={shadow.far}
        shadow-camera-left={-shadow.frustum}
        shadow-camera-right={shadow.frustum}
        shadow-camera-top={shadow.frustum}
        shadow-camera-bottom={-shadow.frustum}
        // 灯光意图：缩小 PCF 模糊半径，投影边缘更清晰但仍保留柔边，避免生硬锯齿
        shadow-radius={3.5}
        shadow-bias={-0.00012}
        shadow-normalBias={0.04}
      />
      <directionalLight
        intensity={preset.fillIntensity}
        color={preset.fillColor}
        position={[-40, 32, -22]}
      />
      <directionalLight
        intensity={preset.faceFillIntensity}
        color={preset.faceFillColor}
        position={[12, 22, 70]}
      />
    </>
  );
}

function SceneNavSync({ scene }: { scene: SceneKind }) {
  useEffect(() => {
    setActiveGardenScene(scene);
  }, [scene]);
  return null;
}

/**
 * 西式小院默认首屏：院外斜侧、轻微俯视，前景路径/池 → 中景房 → 背景树天。
 *
 * COTTAGE_CAM_EYE — 相机世界坐标
 *   x 越大越偏房子右侧；y 为人眼高度（越高越俯视，主体越靠上）；z 越大越退到院子前方
 * COTTAGE_CAM_TARGET — 注视点 / 轨道旋转中心
 *   x 靠门廊；y 越高越仰视（画面整体越往下）；z 落在房身
 *   机位较远时 y 要多调一点才看得出仰角变化
 */
// 距离收近约 6%，降低注视点以减少天空留白；眼位高于 target，避免轨道限位改写首屏角度。
const COTTAGE_CAM_EYE = new THREE.Vector3(26.98, 6, 31.728);
const COTTAGE_CAM_TARGET = new THREE.Vector3(1.6, 3.6, 2.4);

function CottageCameraRig({ active }: { active: boolean }) {
  const { camera, controls } = useThree();
  const applied = useRef(false);

  useEffect(() => {
    applied.current = false;
  }, [active]);

  useFrame(() => {
    if (!active || applied.current) return;
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const orbit = controls as {
      target?: THREE.Vector3;
      update?: () => void;
    } | null;
    if (!orbit?.target) return;

    orbit.target.copy(COTTAGE_CAM_TARGET);
    camera.position.copy(COTTAGE_CAM_EYE);
    const dist = COTTAGE_CAM_EYE.distanceTo(COTTAGE_CAM_TARGET);
    /* eslint-disable react-hooks/immutability -- PerspectiveCamera 裁剪面 */
    camera.near = Math.max(dist / 800, 0.1);
    camera.far = Math.max(dist * 40, 2000);
    /* eslint-enable react-hooks/immutability */
    camera.updateProjectionMatrix();
    camera.lookAt(COTTAGE_CAM_TARGET);
    orbit.update?.();
    applied.current = true;
  });

  return null;
}

function CottageDecor() {
  return (
    <>
      <Suspense fallback={null}>
        <GardenPath />
      </Suspense>
      <Suspense fallback={null}>
        <GardenPond />
      </Suspense>
      <Suspense fallback={null}>
        <GardenPickup />
      </Suspense>
      <Suspense fallback={null}>
        <CottageGardenPeople />
      </Suspense>
      <Suspense fallback={null}>
        <CottageGardenChickens />
      </Suspense>
      <Suspense fallback={null}>
        <CottageGardenTrees />
      </Suspense>
      <Suspense fallback={null}>
        <CottageGardenEnclosure />
      </Suspense>
    </>
  );
}

function CourtyardDecor() {
  return (
    <>
      <Suspense fallback={null}>
        <ChineseGardenFeatures />
      </Suspense>
      <Suspense fallback={null}>
        <CourtyardEntrance />
      </Suspense>
      <Suspense fallback={null}>
        <CourtyardWallMurals />
      </Suspense>
      <Suspense fallback={null}>
        <GardenPeople />
      </Suspense>
      <Suspense fallback={null}>
        <GardenChickens />
      </Suspense>
      <Suspense fallback={null}>
        <GardenTrees />
      </Suspense>
    </>
  );
}

const DEFAULT_CAMERA = {
  position: [0, 26, 108] as [number, number, number],
  fov: 42,
  near: 0.2,
  far: 2500,
};

export function CityCanvas({
  className,
  stage,
  weather = DEFAULT_WEATHER,
  scene = DEFAULT_SCENE,
}: CityCanvasProps) {
  const preset = WEATHER_PRESETS[weather];
  // 小院瞄墙腰高度，避免默认高位 target 造成俯视沙盘感；合院保持原俯视构图。
  const orbitTarget: [number, number, number] =
    scene === "cottage"
      ? [COTTAGE_CAM_TARGET.x, COTTAGE_CAM_TARGET.y, COTTAGE_CAM_TARGET.z]
      : [0, 1.2, 0];
  const minDistance = scene === "cottage" ? 4 : 10;
  const maxDistance = scene === "cottage" ? 900 : 320;

  return (
    <Canvas
      className={className}
      shadows="percentage"
      dpr={[1, 1.5]}
      camera={DEFAULT_CAMERA}
      gl={{
        antialias: true,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: preset.exposure,
      }}
    >
      <SceneNavSync scene={scene} />
      <CottageCameraRig active={scene === "cottage"} />
      <WeatherAtmosphere weather={weather} scene={scene} />

      <Suspense fallback={null}>
        <Environment
          frames={1}
          preset="park"
          environmentIntensity={preset.envIntensity}
        />
        <CityScene stage={stage} scene={scene} />
        {scene === "cottage" && stage === "details" ? (
          <CottageEntrance weather={weather} />
        ) : null}
      </Suspense>

      <Suspense fallback={null}>
        <GrassGround shadowRadius={GARDEN_SHADOW[scene].grass} />
      </Suspense>

      {scene === "cottage" ? <CottageDecor /> : <CourtyardDecor />}

      <OrbitControls
        key={scene}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.02}
        minDistance={minDistance}
        maxDistance={maxDistance}
        target={orbitTarget}
      />
    </Canvas>
  );
}
