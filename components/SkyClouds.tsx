"use client";

/**
 * 天空云层：大量中小积云环绕铺满天空，远近分层（近大近实、远扁远淡）；
 * 每朵体量云都配一层偏蓝灰的云底，做出「顶亮底蓝灰」的体积明暗。
 */
import { Cloud, Clouds } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, MeshBasicMaterial, type Group } from "three";
import type { WeatherPreset } from "@/lib/weatherPresets";

class SoftCloudMaterial extends MeshBasicMaterial {
  constructor() {
    super({
      toneMapped: false,
      fog: false,
      transparent: true,
      depthWrite: false,
      color: 0xffffff,
    });
  }
}

type SkyCloudsProps = {
  preset: WeatherPreset;
};

type CloudTier = "hero" | "main" | "secondary" | "thin" | "band" | "underside";

type CloudSpec = {
  seed: number;
  tier: CloudTier;
  position: readonly [number, number, number];
  scale: number;
  volume: number;
  segments: number;
  bounds: readonly [number, number, number];
  opacityMul: number;
  /** 相对 preset.cloudColor：>1 更亮，<1 偏灰蓝 */
  tint: number;
  shadow?: boolean;
};

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** 太阳大致方位（sunny 预设 sunPosition 归一化后的水平分量），云底阴影朝反方向微偏，增加方向感 */
const SUN_BEARING_X = 0.5;
const SUN_BEARING_Z = 0.36;

/** 主云 / 次云 / 薄云 / 云带：多层环绕铺满天空，避免等距棉花球 */
function buildCloudLayout(): CloudSpec[] {
  const clouds: CloudSpec[] = [];
  let seed = 17;

  const push = (
    tier: CloudTier,
    radius: number,
    yBase: number,
    angle: number,
    opts: {
      scale: number;
      volume: number;
      segments: number;
      bounds: readonly [number, number, number];
      opacityMul: number;
      tint: number;
      shadow?: boolean;
      rJitter?: number;
      yJitter?: number;
      underside?: boolean;
    },
  ) => {
    const rj = opts.rJitter ?? 18;
    const yj = opts.yJitter ?? 6;
    const r = radius + (hash01(seed) - 0.5) * rj;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = yBase + (hash01(seed + 3) - 0.5) * yj;
    const spec: CloudSpec = {
      seed,
      tier,
      position: [x, y, z],
      scale: opts.scale * (0.9 + hash01(seed + 5) * 0.22),
      volume: opts.volume * (0.92 + hash01(seed + 7) * 0.2),
      segments: opts.segments,
      bounds: opts.bounds,
      opacityMul: opts.opacityMul,
      tint: opts.tint,
      shadow: opts.shadow,
    };
    clouds.push(spec);
    seed += 3;

    // 体量云加一层偏蓝灰、朝背光方向微偏的云底，做出体积明暗（非纯灰）
    if (opts.underside) {
      clouds.push({
        seed: seed + 1000,
        tier: "underside",
        position: [
          x - SUN_BEARING_X * spec.scale * 0.9,
          y - 3.2,
          z - SUN_BEARING_Z * spec.scale * 0.9,
        ],
        scale: spec.scale * 0.95,
        volume: spec.volume * 0.66,
        segments: Math.max(10, opts.segments - 8),
        bounds: [
          opts.bounds[0] * 1.1,
          opts.bounds[1] * 0.46,
          opts.bounds[2] * 1.1,
        ],
        opacityMul: 0.44,
        tint: 0.52,
      });
      seed += 3;
    }

    return spec;
  };

  // —— 焦点云：单朵稍显眼的中型积云，作为视觉锚点（非巨大棉花球） ——
  push("hero", 150, 50, -1.5, {
    scale: 1.85,
    volume: 6.4,
    segments: 26,
    bounds: [3.2, 1.85, 2.6],
    opacityMul: 1,
    tint: 1.15,
    shadow: true,
    underside: true,
    rJitter: 8,
    yJitter: 2,
  });

  // —— 主景积云：环绕一整圈，数量多、中等体量，铺满视野上半 ——
  const mainCount = 17;
  for (let i = 0; i < mainCount; i++) {
    const a =
      (i / mainCount) * Math.PI * 2 + (hash01(i * 5 + 101) - 0.5) * 0.55;
    const r = 148 + hash01(i * 7 + 211) * 58;
    const y = 44 + hash01(i * 11 + 307) * 24;
    const scale = 1.9 + hash01(i * 13 + 409) * 1.0;
    const withUnderside = hash01(i * 17 + 503) > 0.32;
    push("main", r, y, a, {
      scale,
      volume: 3.5 + hash01(i * 19 + 601) * 1.1,
      segments: 16,
      bounds: [2.2, 1.35, 1.85],
      opacityMul: 0.68 + hash01(i * 23 + 701) * 0.18,
      tint: 0.9 + hash01(i * 29 + 809) * 0.32,
      shadow: i % 6 === 0,
      underside: withUnderside,
      rJitter: 14,
      yJitter: 4,
    });
  }

  // —— 次云：更小更密，填补主云间隙 ——
  const secondaryCount = 22;
  for (let i = 0; i < secondaryCount; i++) {
    const a =
      (i / secondaryCount) * Math.PI * 2 +
      (hash01(i * 6 + 1103) - 0.5) * 0.6;
    const r = 155 + hash01(i * 8 + 1201) * 78;
    const y = 34 + hash01(i * 10 + 1307) * 40;
    const nearHorizon = y < 46;
    const withUnderside = hash01(i * 15 + 1409) > 0.75;
    push("secondary", r, y, a, {
      scale: nearHorizon ? 1.45 + hash01(i + 1500) * 0.5 : 1.7 + hash01(i + 1600) * 0.7,
      volume: nearHorizon ? 2.1 : 2.9,
      segments: 13,
      bounds: nearHorizon ? [2.5, 0.78, 1.5] : [2.05, 1.05, 1.6],
      opacityMul: nearHorizon ? 0.46 : 0.6,
      tint: nearHorizon ? 0.78 : 0.88 + hash01(i + 1700) * 0.16,
      shadow: false,
      underside: withUnderside && !nearHorizon,
      rJitter: 20,
      yJitter: 6,
    });
  }

  // —— 薄云：远、扁、淡，铺出远景层次 ——
  const thinCount = 14;
  for (let i = 0; i < thinCount; i++) {
    const a =
      (i / thinCount) * Math.PI * 2 + (hash01(i * 4 + 2101) - 0.5) * 0.5;
    const r = 232 + hash01(i * 9 + 2203) * 55;
    const y = 32 + hash01(i * 12 + 2309) * 44;
    const nearHorizon = y < 48;
    push("thin", r, y, a, {
      scale: nearHorizon ? 3.6 + hash01(i + 2400) * 1.0 : 4.2 + hash01(i + 2500) * 1.0,
      volume: nearHorizon ? 1.4 : 2.0,
      segments: 8,
      bounds: nearHorizon ? [4.8, 0.38, 1.1] : [4.2, 0.5, 1.25],
      opacityMul: nearHorizon ? 0.26 : 0.34,
      tint: nearHorizon ? 0.68 : 0.76,
      shadow: false,
      rJitter: 26,
      yJitter: 6,
    });
  }

  // —— 云带：拉长薄层，打破「只有团块」的观感 ——
  const bandCount = 8;
  for (let i = 0; i < bandCount; i++) {
    const a =
      (i / bandCount) * Math.PI * 2 + (hash01(i * 3 + 3101) - 0.5) * 0.4;
    const r = 218 + hash01(i * 6 + 3203) * 46;
    const y = 34 + hash01(i * 8 + 3307) * 26;
    push("band", r, y, a, {
      scale: 4.8 + hash01(i + 3400) * 1.0,
      volume: 1.6,
      segments: 8,
      bounds: [5.8, 0.3, 1.0],
      opacityMul: 0.24,
      tint: 0.73,
      shadow: false,
      rJitter: 18,
      yJitter: 4,
    });
  }

  return clouds;
}

const CLOUD_LAYOUT = buildCloudLayout();

const ORBIT_BASE = 0.009;

function projectCloudShadow(
  cloudPos: readonly [number, number, number],
  sunPos: readonly [number, number, number],
): [number, number, number] {
  const [sx, sy, sz] = sunPos;
  const len = Math.hypot(sx, sy, sz) || 1;
  const dx = sx / len;
  const dy = sy / len;
  const dz = sz / len;
  const t = cloudPos[1] / Math.max(dy, 0.15);
  return [cloudPos[0] - dx * t, 0.03, cloudPos[2] - dz * t];
}

function tintCloudColor(base: string, tint: number, tier: CloudTier): string {
  const c = new Color(base);
  if (tint >= 1) {
    c.lerp(new Color("#ffffff"), Math.min(0.45, (tint - 1) * 2.4));
  } else if (tier === "underside") {
    // 云底：蓝灰，避免纯灰贴纸底
    c.lerp(new Color("#7a9ab8"), 0.62);
    c.multiplyScalar(0.82);
  } else {
    c.lerp(new Color("#9ab4cc"), 1 - tint);
    c.multiplyScalar(0.92 + tint * 0.08);
  }
  if (tier === "thin" || tier === "band") {
    c.lerp(new Color("#b8cad8"), 0.4);
  }
  return `#${c.getHexString()}`;
}

export function SkyClouds({ preset }: SkyCloudsProps) {
  const orbitRef = useRef<Group>(null);

  const shadows = useMemo(() => {
    if (!preset.cloudShadows) return [];
    return CLOUD_LAYOUT.filter(
      (c) => c.shadow && (c.tier === "hero" || c.tier === "main"),
    ).map((cloud) => {
      const pos = projectCloudShadow(cloud.position, preset.sunPosition);
      const size = cloud.scale * (cloud.tier === "hero" ? 2.1 : 1.7);
      return {
        key: `shadow-${cloud.seed}`,
        position: pos,
        scale: [size * 1.3, size * 0.75] as [number, number],
      };
    });
  }, [preset.cloudShadows, preset.sunPosition]);

  useFrame((_, delta) => {
    const group = orbitRef.current;
    if (!group) return;
    group.rotation.y += ORBIT_BASE * (preset.cloudSpeed / 1.4) * delta;
  });

  return (
    <group ref={orbitRef}>
      <Clouds
        key={preset.cloudColor}
        material={SoftCloudMaterial}
        frustumCulled={false}
        limit={1400}
      >
        {CLOUD_LAYOUT.map((cloud) => {
          const soft =
            cloud.tier === "thin" ||
            cloud.tier === "band" ||
            cloud.tier === "underside";
          return (
            <Cloud
              key={cloud.seed}
              seed={cloud.seed}
              position={[...cloud.position]}
              scale={cloud.scale}
              volume={cloud.volume}
              segments={cloud.segments}
              bounds={[...cloud.bounds]}
              concentrate={soft ? "random" : "inside"}
              smallestVolume={cloud.tier === "hero" ? 0.55 : 0.24}
              opacity={Math.min(1, preset.cloudOpacity * cloud.opacityMul)}
              color={tintCloudColor(preset.cloudColor, cloud.tint, cloud.tier)}
              speed={soft ? 0.03 : 0.048}
              growth={cloud.tier === "hero" ? 1.25 : soft ? 2.6 : 2.0}
              fade={soft ? 360 : cloud.tier === "hero" ? 210 : 250}
            />
          );
        })}
      </Clouds>

      {shadows.map((shadow) => (
        <group key={shadow.key} position={shadow.position}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[shadow.scale[0], shadow.scale[1], 1]}
            renderOrder={-1}
          >
            <circleGeometry args={[1, 32]} />
            <meshBasicMaterial
              color="#2a3320"
              transparent
              opacity={0.08}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
