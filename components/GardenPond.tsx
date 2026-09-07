"use client";

/**
 * 庭院池塘：不规则石岸、淡出的泥岸与现有无反射水面。
 * 石头跟随岸线成组摆放，复用 AssetQuest 网格与 ambientCG 岩石贴图。
 */
import { useTexture } from "@react-three/drei";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useGardenPondAssets } from "@/hooks/useGardenPondAssets";
import { GARDEN_POND, getPondBankPoint, getPondWaterHeight, POND_WATER_POSITION, POND_WATER_TILT } from "@/lib/gardenPondLayout";
import { GardenPondBank } from "./GardenPondBank";
import { PondWaterSurface } from "./PondWaterSurface";

export { GARDEN_POND } from "@/lib/gardenPondLayout";

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
): BankRockSpec[] {
  const count = 40;
  const specs: BankRockSpec[] = [];

  // 水线关键石：几块更大、半浸的肩石，近景一眼读出驳岸轮廓
  const keystoneAngles = [0.18, 0.5, 0.8, 2.1, 2.5, 4.2, 4.7];
  const keystoneCount = keystoneAngles.length;
  for (let i = 0; i < keystoneCount; i += 1) {
    const angle =
      keystoneAngles[i] + (rand() - 0.5) * 0.28;
    const t = 0.04 + rand() * 0.16;
    const wetness = 0.78 + rand() * 0.22;
    const [x, z] = getPondBankPoint(angle, t);
    const source =
      rockTemplates[Math.floor(rand() * rockTemplates.length) % rockTemplates.length];
    const base = 0.56 + rand() * 0.34;
    specs.push({
      key: `bank-key-${i}`,
      source,
      position: [
        x,
        getPondWaterHeight(x) - 0.025 - rand() * 0.04,
        z,
      ],
      rotation: [
        (rand() - 0.5) * 0.45,
        rand() * Math.PI * 2,
        (rand() - 0.5) * 0.45,
      ],
      scale: [
        base * (0.9 + rand() * 0.28),
        base * (0.4 + rand() * 0.3),
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
    const [x, z] = getPondBankPoint(angle, t);
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
      ? -0.012 - rand() * 0.035 - wetness * 0.015
      : -0.004 - rand() * 0.008 - wetness * 0.008;
    const tintPool = wetness > 0.4 ? WET_ROCK_TINTS : ROCK_TINTS;
    specs.push({
      key: `bank-rock-${i}`,
      source,
      position: [x, getPondWaterHeight(x) + sink, z],
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
      const [nestX] = getPondBankPoint(angle + (rand() - 0.5) * 0.24, nestT);
      const nestY = getPondWaterHeight(nestX) - 0.004 - rand() * 0.008 - nestWet * 0.008;
      const [, nestZ] = getPondBankPoint(angle + (rand() - 0.5) * 0.24, nestT);
      const nestTintPool = nestWet > 0.4 ? WET_ROCK_TINTS : ROCK_TINTS;
      specs.push({
        key: `bank-nest-${i}`,
        source: nest,
        position: [
          nestX,
          nestY,
          nestZ,
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
    // eslint-disable-next-line react-hooks/immutability -- Three.js 贴图通过命令式属性同步上传参数。
    plantMap.colorSpace = THREE.SRGBColorSpace;
    plantMap.flipY = false;
    plantMap.anisotropy = 8;
    plantMap.needsUpdate = true;
  }, [plantMap]);

  const placements = useMemo(() => {
    const rocks: Placed[] = [
      {
        object: assets.rocks[0],
        position: [2.47, -0.1, -0.3],
        rotation: [0.02, 0.85, -0.06],
        scale: [1.04, 0.64, 0.88],
      },
      {
        object: assets.rocks[1],
        position: [-1.74, -0.07, -0.82],
        rotation: [-0.06, -0.9, 0.1],
        scale: [0.94, 0.68, 1.12],
      },
      {
        object: assets.rocks[2],
        position: [1.55, -0.1, -1.56],
        rotation: [0.08, 1.2, -0.05],
        scale: [0.9, 0.62, 1.04],
      },
    ];

    const pebbles: Placed[] = [
      {
        object: assets.pebbles[0],
        position: [0.9, -0.025, 1.4],
        rotation: [0.1, 0.4, -0.12],
        scale: [0.95, 0.55, 1.18],
      },
      {
        object: assets.pebbles[1],
        position: [2.75, -0.03, -1.42],
        rotation: [-0.08, 1.1, 0.15],
        scale: [1.1, 0.65, 0.92],
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
      <GardenPondBank />

      {/* 不再放 AssetQuest Pond_2 盆体：多边形托盘会从圆形驳岸下露出，显多余 */}

      <PondWaterSurface
        rx={GARDEN_POND.waterRx}
        rz={GARDEN_POND.waterRz}
        position={POND_WATER_POSITION}
        tilt={POND_WATER_TILT}
        color="#5f8f7e"
        roughness={0.38}
        metalness={0.08}
        normalRepeat={3.6}
        normalScale={0.38}
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
