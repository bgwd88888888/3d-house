"use client";

/**
 * 天空云层：主积云环绕 + 少量薄云/云带。
 * 不做云底复制、不在地面画假阴影圆盘，控制粒子上限以免拖垮帧率。
 */
import { Cloud, Clouds } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
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

type CloudTier = "hero" | "main" | "secondary" | "thin" | "band";

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
};

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** 粒子预算约 200：1×14 + 8×11 + 6×10 + 4×8 + 2×6 */
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
      rJitter?: number;
      yJitter?: number;
    },
  ) => {
    const rj = opts.rJitter ?? 18;
    const yj = opts.yJitter ?? 6;
    const r = radius + (hash01(seed) - 0.5) * rj;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = yBase + (hash01(seed + 3) - 0.5) * yj;
    clouds.push({
      seed,
      tier,
      position: [x, y, z],
      scale: opts.scale * (0.9 + hash01(seed + 5) * 0.22),
      volume: opts.volume * (0.92 + hash01(seed + 7) * 0.2),
      segments: opts.segments,
      bounds: opts.bounds,
      opacityMul: opts.opacityMul,
      tint: opts.tint,
    });
    seed += 3;
  };

  push("hero", 150, 50, -1.5, {
    scale: 1.85,
    volume: 6.4,
    segments: 14,
    bounds: [3.2, 1.85, 2.6],
    opacityMul: 1,
    tint: 1.15,
    rJitter: 8,
    yJitter: 2,
  });

  const mainCount = 8;
  for (let i = 0; i < mainCount; i++) {
    const a =
      (i / mainCount) * Math.PI * 2 + (hash01(i * 5 + 101) - 0.5) * 0.55;
    const r = 148 + hash01(i * 7 + 211) * 58;
    const y = 44 + hash01(i * 11 + 307) * 24;
    const scale = 1.9 + hash01(i * 13 + 409) * 1.0;
    push("main", r, y, a, {
      scale,
      volume: 3.5 + hash01(i * 19 + 601) * 1.1,
      segments: 11,
      bounds: [2.2, 1.35, 1.85],
      opacityMul: 0.72 + hash01(i * 23 + 701) * 0.16,
      tint: 0.9 + hash01(i * 29 + 809) * 0.32,
      rJitter: 14,
      yJitter: 4,
    });
  }

  const secondaryCount = 6;
  for (let i = 0; i < secondaryCount; i++) {
    const a =
      (i / secondaryCount) * Math.PI * 2 +
      (hash01(i * 6 + 1103) - 0.5) * 0.6;
    const r = 155 + hash01(i * 8 + 1201) * 78;
    const y = 34 + hash01(i * 10 + 1307) * 40;
    const nearHorizon = y < 46;
    push("secondary", r, y, a, {
      scale: nearHorizon
        ? 1.45 + hash01(i + 1500) * 0.5
        : 1.7 + hash01(i + 1600) * 0.7,
      volume: nearHorizon ? 2.1 : 2.9,
      segments: 10,
      bounds: nearHorizon ? [2.5, 0.78, 1.5] : [2.05, 1.05, 1.6],
      opacityMul: nearHorizon ? 0.5 : 0.64,
      tint: nearHorizon ? 0.78 : 0.88 + hash01(i + 1700) * 0.16,
      rJitter: 20,
      yJitter: 6,
    });
  }

  const thinCount = 4;
  for (let i = 0; i < thinCount; i++) {
    const a =
      (i / thinCount) * Math.PI * 2 + (hash01(i * 4 + 2101) - 0.5) * 0.5;
    const r = 232 + hash01(i * 9 + 2203) * 55;
    const y = 32 + hash01(i * 12 + 2309) * 44;
    const nearHorizon = y < 48;
    push("thin", r, y, a, {
      scale: nearHorizon
        ? 3.6 + hash01(i + 2400) * 1.0
        : 4.2 + hash01(i + 2500) * 1.0,
      volume: nearHorizon ? 1.4 : 2.0,
      segments: 8,
      bounds: nearHorizon ? [4.8, 0.38, 1.1] : [4.2, 0.5, 1.25],
      opacityMul: nearHorizon ? 0.28 : 0.36,
      tint: nearHorizon ? 0.68 : 0.76,
      rJitter: 26,
      yJitter: 6,
    });
  }

  const bandCount = 2;
  for (let i = 0; i < bandCount; i++) {
    const a =
      (i / bandCount) * Math.PI * 2 + (hash01(i * 3 + 3101) - 0.5) * 0.4;
    const r = 218 + hash01(i * 6 + 3203) * 46;
    const y = 34 + hash01(i * 8 + 3307) * 26;
    push("band", r, y, a, {
      scale: 4.8 + hash01(i + 3400) * 1.0,
      volume: 1.6,
      segments: 6,
      bounds: [5.8, 0.3, 1.0],
      opacityMul: 0.26,
      tint: 0.73,
      rJitter: 18,
      yJitter: 4,
    });
  }

  return clouds;
}

const CLOUD_LAYOUT = buildCloudLayout();

const ORBIT_BASE = 0.009;

function tintCloudColor(base: string, tint: number, tier: CloudTier): string {
  const c = new Color(base);
  if (tint >= 1) {
    c.lerp(new Color("#ffffff"), Math.min(0.45, (tint - 1) * 2.4));
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
        limit={210}
      >
        {CLOUD_LAYOUT.map((cloud) => {
          const soft = cloud.tier === "thin" || cloud.tier === "band";
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
    </group>
  );
}
