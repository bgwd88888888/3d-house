"use client";

/**
 * 草原风格积云：小块白团、近中远疏密分布；晴天投淡软云影。
 */
import { Cloud, Clouds } from "@react-three/drei";
import { useMemo } from "react";
import { MeshBasicMaterial } from "three";
import type { WeatherPreset } from "@/lib/weatherPresets";

/** 不受雾/色调映射影响，保持干净亮白 */
class CleanCloudMaterial extends MeshBasicMaterial {
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

type CloudSpec = {
  seed: number;
  position: readonly [number, number, number];
  scale: number;
  volume: number;
  segments: number;
  bounds: readonly [number, number, number];
  shadow?: boolean;
};

/** 俯视时落在地平线上方天空带：高度偏低、半径推远 */
const CLOUD_LAYOUT: readonly CloudSpec[] = [
  // 中远：略低、离房子更远
  { seed: 11, position: [140, 52, 95], scale: 4.2, volume: 5.5, segments: 22, bounds: [2.4, 1.8, 2.4], shadow: true },
  { seed: 13, position: [-130, 48, 110], scale: 3.8, volume: 5, segments: 20, bounds: [2.2, 1.7, 2.2], shadow: true },
  { seed: 17, position: [120, 55, -145], scale: 4.5, volume: 5.8, segments: 22, bounds: [2.5, 1.9, 2.5], shadow: true },
  { seed: 19, position: [-115, 50, -130], scale: 3.6, volume: 4.8, segments: 18, bounds: [2.1, 1.6, 2.1], shadow: true },
  { seed: 23, position: [180, 58, -70], scale: 5, volume: 6, segments: 22, bounds: [2.6, 1.7, 2.6], shadow: true },
  { seed: 29, position: [-170, 54, 90], scale: 4.6, volume: 5.6, segments: 20, bounds: [2.5, 1.65, 2.5], shadow: true },
  { seed: 31, position: [-80, 60, -185], scale: 5.2, volume: 6.2, segments: 22, bounds: [2.7, 1.75, 2.7] },
  { seed: 37, position: [155, 56, 165], scale: 4.8, volume: 5.8, segments: 20, bounds: [2.55, 1.7, 2.55] },
  // 更远、更贴地平线
  { seed: 47, position: [250, 62, -120], scale: 6.2, volume: 4.4, segments: 16, bounds: [4.0, 0.95, 1.9] },
  { seed: 53, position: [-240, 58, -175], scale: 6, volume: 4.2, segments: 16, bounds: [3.9, 0.9, 1.85] },
  { seed: 59, position: [-220, 64, 230], scale: 6.5, volume: 4.5, segments: 16, bounds: [4.2, 0.95, 1.95] },
  { seed: 61, position: [230, 60, 210], scale: 6.1, volume: 4.3, segments: 16, bounds: [4.0, 0.92, 1.9] },
  { seed: 67, position: [40, 66, -280], scale: 6.8, volume: 4.6, segments: 16, bounds: [4.4, 1.0, 2.0] },
  { seed: 71, position: [-50, 62, 290], scale: 6.4, volume: 4.4, segments: 16, bounds: [4.2, 0.95, 1.95] },
  { seed: 79, position: [300, 56, 55], scale: 5.6, volume: 3.9, segments: 14, bounds: [3.6, 0.85, 1.7] },
  { seed: 83, position: [-290, 58, 70], scale: 5.4, volume: 3.8, segments: 14, bounds: [3.5, 0.85, 1.65] },
  { seed: 89, position: [90, 64, 270], scale: 5.8, volume: 4.1, segments: 14, bounds: [3.8, 0.9, 1.8] },
  { seed: 97, position: [-95, 60, -270], scale: 5.7, volume: 4, segments: 14, bounds: [3.7, 0.88, 1.75] },
];

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

export function SkyClouds({ preset }: SkyCloudsProps) {
  const shadows = useMemo(() => {
    if (!preset.cloudShadows) return [];
    return CLOUD_LAYOUT.filter((c) => c.shadow).map((cloud) => {
      const pos = projectCloudShadow(cloud.position, preset.sunPosition);
      const size = cloud.scale * 1.8;
      return {
        key: `shadow-${cloud.seed}`,
        position: pos,
        scale: [size * 1.25, size * 0.9] as [number, number],
      };
    });
  }, [preset.cloudShadows, preset.sunPosition]);

  return (
    <>
      <Clouds
        material={CleanCloudMaterial}
        frustumCulled={false}
        limit={420}
      >
        {CLOUD_LAYOUT.map((cloud) => (
          <Cloud
            key={cloud.seed}
            seed={cloud.seed}
            position={[...cloud.position]}
            scale={cloud.scale}
            volume={cloud.volume}
            segments={cloud.segments}
            bounds={[...cloud.bounds]}
            concentrate="inside"
            smallestVolume={0.35}
            opacity={Math.min(1, preset.cloudOpacity)}
            color="#ffffff"
            speed={preset.cloudSpeed}
            growth={2.8}
            fade={260}
          />
        ))}
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
              opacity={0.12}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}
