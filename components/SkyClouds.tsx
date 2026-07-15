"use client";

/**
 * 天空云层：颜色随天气变化；绕场景中心环形慢转，分布更散。
 */
import { Cloud, Clouds } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { MeshBasicMaterial, type Group } from "three";
import type { WeatherPreset } from "@/lib/weatherPresets";

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

/** 多圈、多方位铺开，避免挤成一条远环或全飘走 */
function buildCloudLayout(): CloudSpec[] {
  const rings = [
    { radius: 95, y: 48, count: 5, scale: 3.6, volume: 4.8, segments: 18, shadow: true },
    { radius: 150, y: 54, count: 6, scale: 4.2, volume: 5.4, segments: 20, shadow: true },
    { radius: 210, y: 58, count: 7, scale: 5.0, volume: 5.0, segments: 16, shadow: false },
    { radius: 280, y: 62, count: 6, scale: 5.8, volume: 4.2, segments: 14, shadow: false },
  ] as const;

  const clouds: CloudSpec[] = [];
  let seed = 11;

  for (const ring of rings) {
    for (let i = 0; i < ring.count; i += 1) {
      // 各圈错开相位，看起来更散
      const angle =
        (i / ring.count) * Math.PI * 2 +
        ring.radius * 0.01 +
        (seed % 5) * 0.17;
      const jitterR = ((seed * 13) % 17) * 0.35 - 3;
      const r = ring.radius + jitterR;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = ring.y + ((seed * 7) % 9) * 0.35 - 1.2;
      const flat = ring.radius > 200;
      clouds.push({
        seed,
        position: [x, y, z],
        scale: ring.scale + ((seed % 5) - 2) * 0.12,
        volume: ring.volume,
        segments: ring.segments,
        bounds: flat
          ? [3.8, 0.9, 1.8]
          : [2.3, 1.7, 2.3],
        shadow: ring.shadow && i % 2 === 0,
      });
      seed += 2;
    }
  }

  return clouds;
}

const CLOUD_LAYOUT = buildCloudLayout();

/** 角速度：rad/s，再乘 preset.cloudSpeed 做天气差异 */
const ORBIT_BASE = 0.012;

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
  const orbitRef = useRef<Group>(null);

  const shadows = useMemo(() => {
    if (!preset.cloudShadows) return [];
    return CLOUD_LAYOUT.filter((c) => c.shadow).map((cloud) => {
      const pos = projectCloudShadow(cloud.position, preset.sunPosition);
      const size = cloud.scale * 1.7;
      return {
        key: `shadow-${cloud.seed}`,
        position: pos,
        scale: [size * 1.2, size * 0.85] as [number, number],
      };
    });
  }, [preset.cloudShadows, preset.sunPosition]);

  useFrame((_, delta) => {
    const group = orbitRef.current;
    if (!group) return;
    // cloudSpeed 约 1~2：折成很慢的环形角速度
    group.rotation.y += ORBIT_BASE * (preset.cloudSpeed / 1.4) * delta;
  });

  return (
    <group ref={orbitRef}>
      <Clouds
        key={preset.cloudColor}
        material={CleanCloudMaterial}
        frustumCulled={false}
        limit={480}
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
            color={preset.cloudColor}
            speed={0.06}
            growth={2.2}
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
              opacity={0.1}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
