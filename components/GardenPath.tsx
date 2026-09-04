"use client";

/**
 * 门前汀步石板：独立圆角石，缝里露草；无整块碎石底床。
 * 两套 PBR 贴图交替 + 独立 UV 偏移制造石头色差；缝隙铺薄泥底、
 * 青苔斑与小草丛从石缝冒出。坐标对齐 DEFAULT_HOUSE_SPEC.door / steps。
 */
import { RoundedBox, useTexture } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import {
  cloneStoneMaps,
  type PathTextureSet,
  usePathTextures,
} from "@/hooks/usePathTextures";

/** 与 DEFAULT_HOUSE_SPEC.door.offsetX 一致 */
const DOOR_X = 2.25;
/** 下台阶前沿约 z≈6.23，第一块石板略留缝 */
const PATH_START_Z = 6.48;
const STONE_W = 0.98;
const STONE_D = 0.7;
const STONE_H = 0.11;
const STONE_GAP = 0.26;
const PATH_Y = STONE_H * 0.5 - 0.02;
const NORMAL_SCALE = new THREE.Vector2(0.62, 0.62);
const STONE_RADIUS = 0.045;
/** 草丛紧贴地面，从缝隙里冒出 */
const TUFT_Y = -0.03;
const MOSS_Y = -0.036;
const GAP_BED_Y = -0.04;

type StoneSpec = {
  key: string;
  position: [number, number, number];
  rotationY: number;
  tiltX: number;
  tiltZ: number;
  size: [number, number, number];
  tint: THREE.Color;
  variant: "primary" | "secondary";
  roughness: number;
  seed: number;
};

type TuftSpec = {
  key: string;
  position: [number, number, number];
  bladeCount: number;
  seed: number;
};

type MossSpec = {
  key: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotationY: number;
  tint: string;
};

type GapBedSpec = {
  key: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotationY: number;
  tint: string;
};

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 冷灰、暖灰、青苔灰绿、深色风化石混搭，拉开单块石材色差
const STONE_TINTS = [
  "#c9c6bf",
  "#a9a49a",
  "#d8d2c4",
  "#8f948a",
  "#bcb6a6",
  "#96998e",
  "#cdc0ab",
  "#7f8579",
  "#b0a898",
  "#6e7468",
  "#e0d8c8",
  "#9aa38f",
] as const;

// 黄绿 / 橄榄 / 冷绿 / 深墨绿混搭，缝草色差一眼能分清
const TUFT_GREENS = [
  "#6e8a3a",
  "#4f6a34",
  "#7a9448",
  "#3a5a2a",
  "#708848",
  "#5a7238",
  "#8a9c4c",
  "#2f4a28",
  "#667e40",
  "#4a6230",
] as const;
const MOSS_TINTS = [
  "#5a6e3a",
  "#4a5c32",
  "#6a7a44",
  "#3d5230",
  "#70824a",
  "#465828",
  "#5e6c36",
] as const;
const GAP_BED_TINTS = [
  "#5a6a38",
  "#4a5830",
  "#667844",
  "#3e5230",
  "#586836",
] as const;

function buildStoneLayout(): {
  stones: StoneSpec[];
  tufts: TuftSpec[];
  mossPatches: MossSpec[];
  gapBeds: GapBedSpec[];
} {
  const rand = mulberry32(91);
  const stones: StoneSpec[] = [];
  const tufts: TuftSpec[] = [];
  const mossPatches: MossSpec[] = [];
  const gapBeds: GapBedSpec[] = [];
  let tintCursor = 0;
  const nextTint = () => {
    const base = STONE_TINTS[tintCursor % STONE_TINTS.length];
    tintCursor += 1;
    // 相邻石板亮度跨度更大，近景色差更明显
    const brightness = 0.8 + rand() * 0.42;
    const tint = new THREE.Color(base).multiplyScalar(brightness);
    // 偶发青苔倾向：略偏绿
    if (rand() < 0.28) {
      tint.offsetHSL(-0.025, 0.1, -0.05);
    }
    return tint;
  };

  const pushGapFlora = (
    keyPrefix: string,
    x: number,
    z: number,
    seedBase: number,
    alongX = false,
  ) => {
    // 缝底薄泥/草皮条，避免石缝「悬空」露出纯草地重复贴图
    const bedTint = new THREE.Color(
      GAP_BED_TINTS[Math.floor(rand() * GAP_BED_TINTS.length)],
    );
    bedTint.offsetHSL((rand() - 0.5) * 0.05, (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.08);
    gapBeds.push({
      key: `${keyPrefix}-bed`,
      position: [x, GAP_BED_Y, z],
      scale: alongX
        ? [0.22 + rand() * 0.12, 1, 0.14 + rand() * 0.1]
        : [0.16 + rand() * 0.12, 1, 0.2 + rand() * 0.12],
      rotationY: rand() * Math.PI,
      tint: `#${bedTint.getHexString()}`,
    });

    tufts.push({
      key: `${keyPrefix}-tuft`,
      position: [x + (rand() - 0.5) * 0.1, TUFT_Y, z + (rand() - 0.5) * 0.08],
      bladeCount: 7 + Math.floor(rand() * 5),
      seed: seedBase,
    });
    // 缝里第二撮草，避免单点孤草
    if (rand() > 0.2) {
      tufts.push({
        key: `${keyPrefix}-tuft-b`,
        position: [
          x + (rand() - 0.5) * 0.2,
          TUFT_Y,
          z + (rand() - 0.5) * 0.16,
        ],
        bladeCount: 4 + Math.floor(rand() * 4),
        seed: seedBase + 17,
      });
    }
    // 偶发第三撮，把缝填满一点
    if (rand() > 0.55) {
      tufts.push({
        key: `${keyPrefix}-tuft-c`,
        position: [
          x + (rand() - 0.5) * 0.22,
          TUFT_Y,
          z + (rand() - 0.5) * 0.18,
        ],
        bladeCount: 3 + Math.floor(rand() * 3),
        seed: seedBase + 31,
      });
    }

    const mossTint = new THREE.Color(
      MOSS_TINTS[Math.floor(rand() * MOSS_TINTS.length)],
    );
    mossTint.offsetHSL((rand() - 0.5) * 0.06, (rand() - 0.5) * 0.12, (rand() - 0.5) * 0.1);
    mossPatches.push({
      key: `${keyPrefix}-moss`,
      position: [x + (rand() - 0.5) * 0.08, MOSS_Y, z + (rand() - 0.5) * 0.06],
      scale: [0.14 + rand() * 0.12, 1, 0.1 + rand() * 0.1],
      rotationY: rand() * Math.PI,
      tint: `#${mossTint.getHexString()}`,
    });
    if (rand() > 0.4) {
      const mossTintB = new THREE.Color(
        MOSS_TINTS[Math.floor(rand() * MOSS_TINTS.length)],
      );
      mossTintB.offsetHSL((rand() - 0.5) * 0.08, (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.12);
      mossPatches.push({
        key: `${keyPrefix}-moss-b`,
        position: [
          x + (rand() - 0.5) * 0.18,
          MOSS_Y,
          z + (rand() - 0.5) * 0.14,
        ],
        scale: [0.09 + rand() * 0.09, 1, 0.07 + rand() * 0.07],
        rotationY: rand() * Math.PI,
        tint: `#${mossTintB.getHexString()}`,
      });
    }
  };

  const frontCount = 9;
  const frontCenters: [number, number][] = [];
  for (let i = 0; i < frontCount; i += 1) {
    const z = PATH_START_Z + i * (STONE_D + STONE_GAP) + STONE_D * 0.5;
    // 左右轻错落，避免一条死板直线
    const stagger = ((i % 2) * 2 - 1) * 0.08 + (rand() - 0.5) * 0.1;
    const rot = (rand() - 0.5) * 0.14;
    const w = STONE_W + (rand() - 0.5) * 0.14;
    const d = STONE_D + (rand() - 0.5) * 0.1;
    const h = STONE_H + (rand() - 0.5) * 0.03;
    const x = DOOR_X + stagger;
    frontCenters.push([x, z]);
    stones.push({
      key: `front-${i}`,
      position: [x, PATH_Y + (h - STONE_H) * 0.5, z],
      rotationY: rot,
      tiltX: (rand() - 0.5) * 0.05,
      tiltZ: (rand() - 0.5) * 0.05,
      size: [w, h, d],
      tint: nextTint(),
      variant: rand() < 0.5 ? "primary" : "secondary",
      roughness: 0.84 + rand() * 0.14,
      seed: 500 + i,
    });

    // 石板两侧也露一点草，缝感更强
    if (rand() > 0.28) {
      const side = rand() > 0.5 ? 1 : -1;
      tufts.push({
        key: `front-edge-${i}`,
        position: [
          x + side * (w * 0.48 + 0.05 + rand() * 0.05),
          TUFT_Y,
          z + (rand() - 0.5) * 0.14,
        ],
        bladeCount: 4 + Math.floor(rand() * 4),
        seed: 4000 + i,
      });
    }
  }

  for (let i = 0; i < frontCenters.length - 1; i += 1) {
    const [x1, z1] = frontCenters[i];
    const [x2, z2] = frontCenters[i + 1];
    pushGapFlora(`front-gap-${i}`, (x1 + x2) / 2, (z1 + z2) / 2, 1000 + i);
  }

  // 右侧支路：从第二块附近分叉，步距更大，更像汀步
  const sideCount = 7;
  const sideZ = PATH_START_Z + (STONE_D + STONE_GAP) + STONE_D * 0.15;
  const sideCenters: [number, number][] = [];
  for (let i = 0; i < sideCount; i += 1) {
    const x =
      DOOR_X +
      STONE_W * 0.65 +
      i * (STONE_D + STONE_GAP + 0.04) +
      STONE_D * 0.5;
    const zJitter = ((i % 2) * 2 - 1) * 0.07 + (rand() - 0.5) * 0.08;
    const zPull = i * 0.1;
    const z = sideZ + zJitter - zPull;
    const rot = Math.PI * 0.5 + (rand() - 0.5) * 0.12;
    const w = STONE_W * 0.9 + (rand() - 0.5) * 0.12;
    const d = STONE_D + (rand() - 0.5) * 0.08;
    const h = STONE_H + (rand() - 0.5) * 0.03;
    sideCenters.push([x, z]);
    stones.push({
      key: `side-${i}`,
      position: [x, PATH_Y + (h - STONE_H) * 0.5, z],
      rotationY: rot,
      tiltX: (rand() - 0.5) * 0.05,
      tiltZ: (rand() - 0.5) * 0.05,
      size: [w, h, d],
      tint: nextTint(),
      variant: rand() < 0.5 ? "primary" : "secondary",
      roughness: 0.84 + rand() * 0.14,
      seed: 800 + i,
    });

    if (rand() > 0.18) {
      const side = rand() > 0.5 ? 1 : -1;
      tufts.push({
        key: `side-edge-${i}`,
        position: [
          x + (rand() - 0.5) * 0.12,
          TUFT_Y,
          z + side * (d * 0.5 + 0.08 + rand() * 0.07),
        ],
        bladeCount: 4 + Math.floor(rand() * 4),
        seed: 2000 + i,
      });
    }
  }

  for (let i = 0; i < sideCenters.length - 1; i += 1) {
    const [x1, z1] = sideCenters[i];
    const [x2, z2] = sideCenters[i + 1];
    pushGapFlora(`side-gap-${i}`, (x1 + x2) / 2, (z1 + z2) / 2, 3000 + i, true);
  }

  return { stones, tufts, mossPatches, gapBeds };
}

function GrassTuft({
  position,
  bladeCount,
  seed,
}: Omit<TuftSpec, "key">) {
  const blades = useMemo(() => {
    const rand = mulberry32(seed);
    const items: {
      x: number;
      z: number;
      height: number;
      width: number;
      rotY: number;
      tilt: number;
      tiltZ: number;
      color: string;
    }[] = [];
    for (let i = 0; i < bladeCount; i += 1) {
      const color = new THREE.Color(
        TUFT_GREENS[Math.floor(rand() * TUFT_GREENS.length)],
      );
      color.offsetHSL(
        (rand() - 0.5) * 0.07,
        (rand() - 0.5) * 0.18,
        (rand() - 0.5) * 0.14,
      );
      items.push({
        x: (rand() - 0.5) * 0.18,
        z: (rand() - 0.5) * 0.18,
        height: 0.055 + rand() * 0.11,
        width: 0.008 + rand() * 0.01,
        rotY: rand() * Math.PI * 2,
        tilt: (rand() - 0.5) * 0.7,
        tiltZ: (rand() - 0.5) * 0.7,
        color: `#${color.getHexString()}`,
      });
    }
    return items;
  }, [bladeCount, seed]);

  return (
    <group position={position}>
      {blades.map((blade, index) => (
        <mesh
          key={index}
          position={[blade.x, blade.height * 0.5, blade.z]}
          rotation={[blade.tilt, blade.rotY, blade.tiltZ]}
        >
          <coneGeometry args={[blade.width, blade.height, 3]} />
          <meshStandardMaterial
            color={blade.color}
            roughness={0.92}
            metalness={0}
            envMapIntensity={0.06}
          />
        </mesh>
      ))}
    </group>
  );
}

function MossPatch({
  position,
  scale,
  rotationY,
  tint,
  map,
}: Omit<MossSpec, "key"> & { map: THREE.Texture }) {
  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, rotationY]}
      scale={scale}
      receiveShadow
    >
      <circleGeometry args={[1, 10]} />
      <meshStandardMaterial
        map={map}
        color={tint}
        roughness={0.96}
        metalness={0}
        transparent
        opacity={0.88}
        depthWrite={false}
      />
    </mesh>
  );
}

function GapBed({
  position,
  scale,
  rotationY,
  tint,
  map,
}: Omit<GapBedSpec, "key"> & { map: THREE.Texture }) {
  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, rotationY]}
      scale={scale}
      receiveShadow
    >
      <circleGeometry args={[1, 12]} />
      <meshStandardMaterial
        map={map}
        color={tint}
        roughness={1}
        metalness={0}
        transparent
        opacity={0.92}
        depthWrite={false}
      />
    </mesh>
  );
}

function PathStone({
  stone,
  sourceMaps,
}: {
  stone: StoneSpec;
  sourceMaps: PathTextureSet;
}) {
  const maps = useMemo(() => {
    const rand = mulberry32(stone.seed);
    const repeat: [number, number] =
      stone.variant === "primary" ? [0.48, 0.48] : [0.62, 0.62];
    return cloneStoneMaps(sourceMaps, {
      repeat,
      offset: [rand(), rand()],
      rotation: (rand() - 0.5) * 0.8,
    });
  }, [sourceMaps, stone.seed, stone.variant]);

  useEffect(() => {
    return () => {
      maps.map.dispose();
      maps.normalMap.dispose();
      maps.roughnessMap.dispose();
    };
  }, [maps]);

  return (
    <RoundedBox
      args={stone.size}
      radius={STONE_RADIUS}
      smoothness={3}
      position={stone.position}
      rotation={[stone.tiltX, stone.rotationY, stone.tiltZ]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        map={maps.map}
        normalMap={maps.normalMap}
        roughnessMap={maps.roughnessMap}
        color={stone.tint}
        roughness={stone.roughness}
        metalness={0.02}
        normalScale={NORMAL_SCALE}
        envMapIntensity={0.18}
      />
    </RoundedBox>
  );
}

export function GardenPath() {
  const textures = usePathTextures();
  const grassMap = useTexture("/textures/grass-008/Grass008_1K-JPG_Color.jpg");
  const { stones, tufts, mossPatches, gapBeds } = useMemo(
    () => buildStoneLayout(),
    [],
  );

  useLayoutEffect(() => {
    grassMap.wrapS = THREE.RepeatWrapping;
    grassMap.wrapT = THREE.RepeatWrapping;
    grassMap.repeat.set(1.6, 1.6);
    grassMap.colorSpace = THREE.SRGBColorSpace;
    grassMap.needsUpdate = true;
  }, [grassMap]);

  return (
    <group>
      {gapBeds.map((bed) => (
        <GapBed
          key={bed.key}
          position={bed.position}
          scale={bed.scale}
          rotationY={bed.rotationY}
          tint={bed.tint}
          map={grassMap}
        />
      ))}
      {stones.map((stone) => (
        <PathStone
          key={stone.key}
          stone={stone}
          sourceMaps={textures[stone.variant]}
        />
      ))}
      {mossPatches.map((patch) => (
        <MossPatch
          key={patch.key}
          position={patch.position}
          scale={patch.scale}
          rotationY={patch.rotationY}
          tint={patch.tint}
          map={grassMap}
        />
      ))}
      {tufts.map((tuft) => (
        <GrassTuft
          key={tuft.key}
          position={tuft.position}
          bladeCount={tuft.bladeCount}
          seed={tuft.seed}
        />
      ))}
    </group>
  );
}
