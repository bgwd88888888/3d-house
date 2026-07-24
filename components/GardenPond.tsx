"use client";

/**
 * 庭院池塘：AssetQuest 盆体/植物 + ambientCG 岩石 PBR + 反射水面。
 * 驳岸由「碎石内圈 + 泥土外圈」两条环带打底，
 * 再环绕散置真实岩石/卵石网格，避免纯色平面圈显得单薄。
 */
import { useTexture } from "@react-three/drei";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useGardenPondAssets } from "@/hooks/useGardenPondAssets";
import { PondWaterSurface } from "./PondWaterSurface";

/** FBX 内嵌 Pond_Plants_Atlas.tga；仓库只有 PNG，且无 TGA loader → 统一改写 */
const PLANT_ATLAS_PNG =
  "/models/assetquest-pond/textures/Pond_Plants_Atlas.png";
const PROP_BASECOLOR_PNG =
  "/models/assetquest-pond/textures/Pond_Props_BaseColor.png";
/** 睡莲缺贴图时的叶绿回退，避免粉白占位 */
const PLANT_FALLBACK_COLOR = "#4a6b3a";

function rewritePondTextureUrl(url: string): string {
  const normalized = url.replace(/\\/g, "/").toLowerCase();
  if (normalized.includes("pond_plants_atlas")) return PLANT_ATLAS_PNG;
  if (
    normalized.includes("pond_props_basecolor") ||
    (normalized.includes("basecolor") &&
      (normalized.includes("pond") || normalized.includes("props")))
  ) {
    return PROP_BASECOLOR_PNG;
  }
  // 裸 .tga：按文件名兜底到 PNG，避免 TextureLoader 对 TGA 直接报错
  if (normalized.endsWith(".tga")) {
    if (normalized.includes("plant")) return PLANT_ATLAS_PNG;
    if (normalized.includes("prop") || normalized.includes("base")) {
      return PROP_BASECOLOR_PNG;
    }
  }
  return url;
}

// 模块加载即挂上：.tga → PNG，避免 TextureLoader「无 TGA loader」红字
{
  const manager = THREE.DefaultLoadingManager as THREE.LoadingManager & {
    urlModifier?: (url: string) => string;
  };
  const previous = manager.urlModifier;
  manager.setURLModifier((url) => {
    const rewritten = rewritePondTextureUrl(url);
    if (rewritten !== url) return rewritten;
    return previous ? previous(url) : url;
  });
}

/** 东南侧空地：房子右前方、皮卡偏南 */
export const GARDEN_POND = {
  x: 11.2,
  z: 10.4,
  waterRx: 1.7,
  waterRz: 1.4,
  bankPad: 0.7,
} as const;

const STONE_NORMAL = new THREE.Vector2(1.15, 1.15);
const SOIL_NORMAL = new THREE.Vector2(0.75, 0.75);

type Placed = {
  object: THREE.Object3D;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
};

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROCK_TINTS = [
  "#c9c2b6",
  "#a8a297",
  "#d2cbbd",
  "#8f8a80",
  "#b7b0a3",
  "#9a968b",
  "#c4bba8",
  "#7e7a70",
  "#b8aea0",
  "#6f6b62",
] as const;

/** 贴水线偏湿润的深色，近景能读出「水渍」 */
const WET_ROCK_TINTS = [
  "#6a655c",
  "#5a564e",
  "#7a7368",
  "#4e4a44",
  "#6e675c",
] as const;

type BankRockSpec = {
  key: string;
  source: THREE.Object3D;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  tint: string;
  /** 贴水越近越湿，粗糙度略降、略提金属感 */
  wetness: number;
};

/** 沿池岸环形散置真实岩石/卵石网格，制造有体积的石头驳岸 */
function buildBankRockRing(
  rand: () => number,
  rockTemplates: THREE.Object3D[],
  pebbleTemplates: THREE.Object3D[],
  waterRx: number,
  waterRz: number,
  bankRx: number,
  bankRz: number,
): BankRockSpec[] {
  const count = 40;
  const specs: BankRockSpec[] = [];

  // 水线关键石：几块更大、半浸的肩石，近景一眼读出驳岸轮廓
  const keystoneCount = 7;
  for (let i = 0; i < keystoneCount; i += 1) {
    const angle =
      (i / keystoneCount) * Math.PI * 2 + (rand() - 0.5) * 0.28;
    const t = 0.04 + rand() * 0.16;
    const wetness = 0.78 + rand() * 0.22;
    const rx = waterRx + (bankRx - waterRx) * t;
    const rz = waterRz + (bankRz - waterRz) * t;
    const source =
      rockTemplates[Math.floor(rand() * rockTemplates.length) % rockTemplates.length];
    const base = 0.72 + rand() * 0.42;
    specs.push({
      key: `bank-key-${i}`,
      source,
      position: [
        Math.cos(angle) * rx,
        -0.08 - rand() * 0.06,
        Math.sin(angle) * rz,
      ],
      rotation: [
        (rand() - 0.5) * 0.45,
        rand() * Math.PI * 2,
        (rand() - 0.5) * 0.45,
      ],
      scale: [
        base * (0.9 + rand() * 0.28),
        base * (0.55 + rand() * 0.45),
        base * (0.9 + rand() * 0.28),
      ],
      tint: WET_ROCK_TINTS[Math.floor(rand() * WET_ROCK_TINTS.length)],
      wetness,
    });
  }

  for (let i = 0; i < count; i += 1) {
    const angle =
      (i / count) * Math.PI * 2 + (rand() - 0.5) * (Math.PI / count) * 2.1;
    // 偏水线一侧略密：近景驳岸轮廓更实，外缘更稀疏
    const t =
      rand() < 0.62 ? 0.02 + rand() * 0.34 : 0.3 + rand() * 0.52;
    const wetness = Math.max(0, 1 - t / 0.4);
    const rx = waterRx + (bankRx - waterRx) * t;
    const rz = waterRz + (bankRz - waterRz) * t;
    const useRock = rand() < 0.48;
    const templates = useRock ? rockTemplates : pebbleTemplates;
    const source =
      templates[Math.floor(rand() * templates.length) % templates.length];
    // 水线附近略放大，形成驳岸「肩线」
    const shoreBoost = 1 + wetness * 0.28;
    const base =
      (useRock ? 0.36 + rand() * 0.55 : 0.48 + rand() * 0.58) * shoreBoost;
    // 非均匀缩放，石头更有体块感而不是球形滚豆
    const scale: [number, number, number] = [
      base * (0.78 + rand() * 0.48),
      base * (0.42 + rand() * 0.78),
      base * (0.78 + rand() * 0.48),
    ];
    const sink = useRock
      ? -0.055 - rand() * 0.1 - wetness * 0.025
      : -0.028 - rand() * 0.055 - wetness * 0.018;
    const tintPool = wetness > 0.4 ? WET_ROCK_TINTS : ROCK_TINTS;
    specs.push({
      key: `bank-rock-${i}`,
      source,
      position: [Math.cos(angle) * rx, sink, Math.sin(angle) * rz],
      rotation: [
        (rand() - 0.5) * 0.65,
        rand() * Math.PI * 2,
        (rand() - 0.5) * 0.65,
      ],
      scale,
      tint: tintPool[Math.floor(rand() * tintPool.length)],
      wetness,
    });

    // 约半数位置再叠一小卵石，制造驳岸厚度与粗糙堆叠
    if (rand() < 0.52) {
      const nest = pebbleTemplates[
        Math.floor(rand() * pebbleTemplates.length) % pebbleTemplates.length
      ];
      const nestBase = 0.24 + rand() * 0.4;
      const nestT = Math.min(0.9, t + 0.05 + rand() * 0.16);
      const nestWet = Math.max(0, 1 - nestT / 0.4);
      const nestRx = waterRx + (bankRx - waterRx) * nestT;
      const nestRz = waterRz + (bankRz - waterRz) * nestT;
      const nestTintPool = nestWet > 0.4 ? WET_ROCK_TINTS : ROCK_TINTS;
      specs.push({
        key: `bank-nest-${i}`,
        source: nest,
        position: [
          Math.cos(angle + (rand() - 0.5) * 0.24) * nestRx,
          -0.014 - rand() * 0.032 - nestWet * 0.012,
          Math.sin(angle + (rand() - 0.5) * 0.24) * nestRz,
        ],
        rotation: [
          (rand() - 0.5) * 0.8,
          rand() * Math.PI * 2,
          (rand() - 0.5) * 0.8,
        ],
        scale: [nestBase, nestBase * (0.45 + rand() * 0.62), nestBase],
        tint: nestTintPool[Math.floor(rand() * nestTintPool.length)],
        wetness: nestWet,
      });
    }
  }
  return specs;
}

function tintClonedObject(
  object: THREE.Object3D,
  tint: string,
  wetness = 0,
): void {
  const color = new THREE.Color(tint);
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    child.material = materials.map((mat) => {
      const next = mat.clone();
      if ("color" in next && next.color instanceof THREE.Color) {
        // 乘算保留原贴图明暗，只做色相偏移，避免整块平涂
        next.color.multiply(color);
        if (wetness > 0.2) {
          next.color.multiplyScalar(1 - wetness * 0.22);
        }
      }
      if ("roughness" in next && typeof next.roughness === "number") {
        next.roughness = THREE.MathUtils.clamp(
          next.roughness + 0.08 - wetness * 0.36,
          0.28,
          1,
        );
      }
      if ("metalness" in next && typeof next.metalness === "number") {
        next.metalness = Math.min(0.28, next.metalness + wetness * 0.16);
      }
      if ("envMapIntensity" in next && typeof next.envMapIntensity === "number") {
        next.envMapIntensity = 0.14 + wetness * 0.42;
      }
      return next;
    });
  });
}

/** 睡莲强制绑 PNG 图集，绕开 FBX 内嵌 .tga；贴图缺失时叶绿兜底 */
function bindPlantAtlas(
  object: THREE.Object3D,
  plantMap: THREE.Texture,
): void {
  const hasImage =
    plantMap.image != null ||
    (plantMap.source?.data != null && plantMap.source.data !== "");

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    child.material = materials.map((mat) => {
      const next = mat.clone();
      if ("map" in next) {
        next.map = hasImage ? plantMap : null;
      }
      if ("color" in next && next.color instanceof THREE.Color) {
        next.color.set(hasImage ? "#ffffff" : PLANT_FALLBACK_COLOR);
      }
      if ("alphaTest" in next && typeof next.alphaTest === "number") {
        next.alphaTest = hasImage ? Math.max(next.alphaTest, 0.35) : 0;
      }
      if ("side" in next) next.side = THREE.DoubleSide;
      if ("roughness" in next && typeof next.roughness === "number") {
        next.roughness = 0.86;
      }
      if ("metalness" in next && typeof next.metalness === "number") {
        next.metalness = 0;
      }
      next.needsUpdate = true;
      return next;
    });
  });
}

function BankRing() {
  const stoneTextures = useTexture({
    map: "/textures/rock-023/Rock023_1K-JPG_Color.jpg",
    normalMap: "/textures/rock-023/Rock023_1K-JPG_NormalGL.jpg",
    roughnessMap: "/textures/rock-023/Rock023_1K-JPG_Roughness.jpg",
  });
  const soilTextures = useTexture({
    map: "/textures/ground-048/Ground048_1K-JPG_Color.jpg",
    normalMap: "/textures/ground-048/Ground048_1K-JPG_NormalGL.jpg",
    roughnessMap: "/textures/ground-048/Ground048_1K-JPG_Roughness.jpg",
  });

  useLayoutEffect(() => {
    for (const [key, texture] of Object.entries(stoneTextures)) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(4.2, 4.2);
      texture.colorSpace =
        key === "map" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.needsUpdate = true;
    }
  }, [stoneTextures]);

  useLayoutEffect(() => {
    for (const [key, texture] of Object.entries(soilTextures)) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2.8, 2.8);
      texture.colorSpace =
        key === "map" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.needsUpdate = true;
    }
  }, [soilTextures]);

  const { waterRx, waterRz, bankPad } = GARDEN_POND;
  const bankRx = waterRx + bankPad;
  const bankRz = waterRz + bankPad;
  // 内圈（碎石带）半径介于水面与驳岸之间
  const stoneRx = waterRx + bankPad * 0.42;
  const stoneRz = waterRz + bankPad * 0.42;
  const stoneInner = (0.95 * waterRx) / stoneRx;
  const bankInner = (0.97 * stoneRx) / bankRx;

  return (
    <>
      {/* 碎石内圈：紧贴水线的石质驳岸（偏湿暗） */}
      <mesh
        rotation={[-Math.PI / 2, 0.1, 0]}
        position={[0, -0.028, 0]}
        scale={[stoneRx, stoneRz, 1]}
        receiveShadow
      >
        <ringGeometry args={[stoneInner, 1, 72]} />
        <meshStandardMaterial
          map={stoneTextures.map}
          normalMap={stoneTextures.normalMap}
          roughnessMap={stoneTextures.roughnessMap}
          normalScale={STONE_NORMAL}
          roughness={0.88}
          metalness={0.08}
          envMapIntensity={0.28}
          color="#5e5850"
        />
      </mesh>
      {/* 略抬的碎石外缘，给驳岸一点台阶体积 */}
      <mesh
        rotation={[-Math.PI / 2, 0.1, 0]}
        position={[0, -0.01, 0]}
        scale={[stoneRx * 1.04, stoneRz * 1.04, 1]}
        receiveShadow
        castShadow
      >
        <ringGeometry args={[0.74, 0.98, 56]} />
        <meshStandardMaterial
          map={stoneTextures.map}
          normalMap={stoneTextures.normalMap}
          roughnessMap={stoneTextures.roughnessMap}
          normalScale={STONE_NORMAL}
          roughness={0.96}
          metalness={0.03}
          envMapIntensity={0.16}
          color="#8a8376"
        />
      </mesh>
      {/* 泥岸外圈，衔接草地 */}
      <mesh
        rotation={[-Math.PI / 2, 0.1, 0]}
        position={[0, -0.045, 0]}
        scale={[bankRx, bankRz, 1]}
        receiveShadow
      >
        <ringGeometry args={[bankInner, 1, 64]} />
        <meshStandardMaterial
          map={soilTextures.map}
          normalMap={soilTextures.normalMap}
          roughnessMap={soilTextures.roughnessMap}
          normalScale={SOIL_NORMAL}
          roughness={1}
          metalness={0.02}
          envMapIntensity={0.12}
          color="#8f8068"
        />
      </mesh>
      {/* 浅水底：偏橄榄泥色，近岸透出，中心略深（配合半透明水面） */}
      <mesh
        rotation={[-Math.PI / 2, 0.1, 0]}
        position={[0, -0.068, 0]}
        scale={[waterRx * 0.98, waterRz * 0.98, 1]}
        receiveShadow
      >
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial
          map={soilTextures.map}
          roughnessMap={soilTextures.roughnessMap}
          color="#3a5240"
          roughness={1}
          metalness={0}
          envMapIntensity={0.08}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0.1, 0]}
        position={[0, -0.052, 0]}
        scale={[waterRx * 0.52, waterRz * 0.52, 1]}
        receiveShadow
      >
        <circleGeometry args={[1, 32]} />
        <meshStandardMaterial
          color="#24362c"
          roughness={1}
          metalness={0}
          envMapIntensity={0.05}
        />
      </mesh>
    </>
  );
}

function PlacedAsset({
  object,
  position,
  rotation = [0, 0, 0],
  scale = 1,
}: Placed) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={object} />
    </group>
  );
}

export function GardenPond() {
  const assets = useGardenPondAssets();
  const plantMap = useTexture(PLANT_ATLAS_PNG);

  useLayoutEffect(() => {
    plantMap.colorSpace = THREE.SRGBColorSpace;
    plantMap.flipY = false;
    plantMap.anisotropy = 8;
    plantMap.needsUpdate = true;
  }, [plantMap]);

  const placements = useMemo(() => {
    const rocks: Placed[] = [
      {
        object: assets.rocks[0],
        position: [2.25, 0, 0.4],
        rotation: [0.05, 0.6, -0.08],
      },
      {
        object: assets.rocks[1],
        position: [-2.05, 0, -0.75],
        rotation: [-0.06, -0.9, 0.1],
        scale: 1.05,
      },
      {
        object: assets.rocks[2],
        position: [0.45, 0, -1.95],
        rotation: [0.08, 1.2, -0.05],
        scale: 0.92,
      },
    ];

    const pebbles: Placed[] = [
      {
        object: assets.pebbles[0],
        position: [1.2, 0, 1.45],
        rotation: [0.1, 0.4, -0.12],
      },
      {
        object: assets.pebbles[1],
        position: [-0.95, 0, -1.6],
        rotation: [-0.08, 1.1, 0.15],
        scale: 1.1,
      },
    ];

    // 克隆后强制 PNG 图集，绕开 FBX 内嵌 .tga 无 loader 的占位问题
    const lilySources = [
      assets.lilyLeaves[0],
      assets.lilyLeaves[1],
      assets.lilyLeaves[2],
      assets.lilyBlossom,
    ].map((source) => {
      const object = source.clone(true);
      bindPlantAtlas(object, plantMap);
      return object;
    });

    const lilies: Placed[] = [
      {
        object: lilySources[0],
        position: [-0.4, -0.005, 0.2],
        rotation: [0, 0.3, 0],
      },
      {
        object: lilySources[1],
        position: [0.55, -0.005, -0.4],
        rotation: [0, 1.4, 0],
        scale: 0.9,
      },
      {
        object: lilySources[2],
        position: [0.1, -0.005, 0.65],
        rotation: [0, -0.8, 0],
        scale: 0.85,
      },
      {
        object: lilySources[3],
        position: [0.5, 0.01, -0.32],
        rotation: [0, 0.5, 0],
      },
    ];

    const rand = mulberry32(732);
    const bankRocks: Placed[] = buildBankRockRing(
      rand,
      assets.rocks,
      assets.pebbles,
      GARDEN_POND.waterRx,
      GARDEN_POND.waterRz,
      GARDEN_POND.waterRx + GARDEN_POND.bankPad,
      GARDEN_POND.waterRz + GARDEN_POND.bankPad,
    ).map((spec) => {
      const object = spec.source.clone(true);
      tintClonedObject(object, spec.tint, spec.wetness);
      return {
        object,
        position: spec.position,
        rotation: spec.rotation,
        scale: spec.scale,
      };
    });

    return { rocks, pebbles, lilies, bankRocks };
  }, [assets, plantMap]);

  return (
    <group position={[GARDEN_POND.x, 0, GARDEN_POND.z]}>
      <BankRing />

      <group position={[0, -0.045, 0]}>
        <primitive object={assets.basin} />
      </group>

      <PondWaterSurface
        rx={GARDEN_POND.waterRx}
        rz={GARDEN_POND.waterRz}
        position={[0.05, -0.008, -0.05]}
        tilt={0.1}
        // 近景强化：更高分辨率镜面 + 对比，天空/树倒影更清晰
        color="#5f8f7e"
        mirror={0.72}
        mixStrength={3.4}
        mixBlur={0.16}
        mixContrast={1.55}
        blur={[72, 24]}
        roughness={0.045}
        metalness={0.2}
        resolution={1024}
        normalRepeat={3.6}
        normalScale={0.38}
        distortion={0.14}
        depthScale={1.05}
        reflectorOffset={0.05}
        flowSpeed={[0.008, 0.005]}
        opacity={0.9}
      />

      {placements.bankRocks.map((item, index) => (
        <PlacedAsset key={`bank-rock-${index}`} {...item} />
      ))}
      {placements.rocks.map((item, index) => (
        <PlacedAsset key={`rock-${index}`} {...item} />
      ))}
      {placements.pebbles.map((item, index) => (
        <PlacedAsset key={`pebble-${index}`} {...item} />
      ))}
      {placements.lilies.map((item, index) => (
        <PlacedAsset key={`lily-${index}`} {...item} />
      ))}
    </group>
  );
}
