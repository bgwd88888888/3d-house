"use client";

/**
 * 天空云层：一朵大体主云 + 小次云 + 薄云带；
 * 近地平线更扁更淡，云底偏蓝灰以减「贴纸感」。
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

/** 主云 / 次云 / 薄云 / 云带：层次拉开，避免等距棉花球 */
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

    // 大体云加一层蓝灰底，做出体积明暗（非纯灰）
    if (opts.underside) {
      clouds.push({
        seed: seed + 1000,
        tier: "underside",
        position: [x, y - 3.2, z],
        scale: spec.scale * 0.94,
        volume: spec.volume * 0.68,
        segments: Math.max(10, opts.segments - 10),
        bounds: [
          opts.bounds[0] * 1.08,
          opts.bounds[1] * 0.48,
          opts.bounds[2] * 1.08,
        ],
        opacityMul: 0.42,
        tint: 0.55,
      });
      seed += 3;
    }

    return spec;
  };

  // —— 一朵主云：放在默认南视（-Z）前方天空 ——
  push("hero", 155, 48, -1.35, {
    scale: 6.8,
    volume: 7.4,
    segments: 34,
    bounds: [3.8, 2.2, 3.1],
    opacityMul: 1,
    tint: 1.12,
    shadow: true,
    underside: true,
    rJitter: 10,
    yJitter: 2.5,
  });

  // —— 少量中景积云：明显更小更淡；多半在南天 ——
  const mains = [
    { r: 175, y: 54, a: -0.55, scale: 3.0 },
    { r: 188, y: 58, a: -2.05, scale: 2.7 },
    { r: 168, y: 62, a: 2.7, scale: 2.5 },
  ];
  mains.forEach((c, i) => {
    push("main", c.r, c.y, c.a + hash01(i + 1) * 0.35, {
      scale: c.scale,
      volume: 4.2,
      segments: 20,
      bounds: [2.4, 1.55, 2.0],
      opacityMul: 0.72,
      tint: 1.0,
      shadow: i === 0,
      underside: i === 0,
      rJitter: 16,
      yJitter: 4,
    });
  });

  // —— 次云：更小更散 ——
  const secondary = [
    { r: 162, y: 42, a: -1.85 },
    { r: 195, y: 66, a: -0.2 },
    { r: 205, y: 50, a: -2.6 },
    { r: 178, y: 44, a: 2.2 },
  ];
  secondary.forEach((c, i) => {
    // 偏低的云更扁更淡（靠近地平线视觉）
    const nearHorizon = c.y < 55;
    push("secondary", c.r, c.y, c.a + hash01(i + 20) * 0.4, {
      scale: nearHorizon ? 2.1 : 2.55,
      volume: nearHorizon ? 2.6 : 3.4,
      segments: 14,
      bounds: nearHorizon ? [2.8, 0.85, 1.6] : [2.2, 1.15, 1.7],
      opacityMul: nearHorizon ? 0.48 : 0.62,
      tint: nearHorizon ? 0.82 : 0.9,
      shadow: false,
      rJitter: 22,
      yJitter: 5,
    });
  });

  // —— 薄云：远、扁、淡；南天多一些 ——
  const thin = [
    { r: 230, y: 38, a: -1.1 },
    { r: 250, y: 70, a: -1.9 },
    { r: 242, y: 36, a: -0.4 },
    { r: 265, y: 74, a: 2.4 },
    { r: 255, y: 40, a: -2.8 },
    { r: 275, y: 68, a: 0.9 },
  ];
  thin.forEach((c, i) => {
    const nearHorizon = c.y < 50;
    push("thin", c.r, c.y, c.a + hash01(i + 40) * 0.5, {
      scale: nearHorizon ? 4.2 : 5.2,
      volume: nearHorizon ? 1.6 : 2.4,
      segments: 8,
      bounds: nearHorizon ? [5.2, 0.42, 1.2] : [4.6, 0.55, 1.35],
      opacityMul: nearHorizon ? 0.28 : 0.38,
      tint: nearHorizon ? 0.7 : 0.78,
      shadow: false,
      rJitter: 28,
      yJitter: 6,
    });
  });

  // —— 云带：拉长薄层，打破「只有团块」 ——
  const bands = [
    { r: 220, y: 40, a: -1.55 },
    { r: 240, y: 52, a: -0.75 },
    { r: 228, y: 38, a: -2.35 },
    { r: 252, y: 58, a: 1.8 },
  ];
  bands.forEach((c, i) => {
    push("band", c.r, c.y, c.a + hash01(i + 60) * 0.35, {
      scale: 5.8,
      volume: 1.8,
      segments: 8,
      bounds: [6.5, 0.32, 1.1],
      opacityMul: 0.26,
      tint: 0.74,
      shadow: false,
      rJitter: 20,
      yJitter: 4,
    });
  });

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
        limit={720}
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
