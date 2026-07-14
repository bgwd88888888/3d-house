"use client";

/**
 * 草原式蓝天蓝穹：俯视时仍保持干净钴蓝，不靠 Preetham 地平线发白。
 */
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { WeatherKind } from "@/lib/weatherPresets";

type PrairieSkyProps = {
  weather: WeatherKind;
};

const SKY_COLORS: Record<
  WeatherKind,
  { zenith: string; mid: string; horizon: string }
> = {
  sunny: {
    zenith: "#3d8fd4",
    mid: "#6aade6",
    horizon: "#a8cff0",
  },
  cloudy: {
    zenith: "#7a8fa3",
    mid: "#9aabbc",
    horizon: "#c0c8d0",
  },
  dusk: {
    zenith: "#4a5f9a",
    mid: "#c4886a",
    horizon: "#e8b898",
  },
};

export function PrairieSky({ weather }: PrairieSkyProps) {
  const colors = SKY_COLORS[weather];

  const material = useMemo(() => {
    const zenith = new THREE.Color(colors.zenith);
    const mid = new THREE.Color(colors.mid);
    const horizon = new THREE.Color(colors.horizon);

    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      uniforms: {
        uZenith: { value: zenith },
        uMid: { value: mid },
        uHorizon: { value: horizon },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorldPos = world.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uZenith;
        uniform vec3 uMid;
        uniform vec3 uHorizon;
        varying vec3 vWorldPos;
        void main() {
          vec3 dir = normalize(vWorldPos - cameraPosition);
          float elev = dir.y;
          float h = clamp(elev * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.42, h));
          col = mix(col, uZenith, smoothstep(0.32, 0.92, h));
          float luma = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(vec3(luma), col, 1.06);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, [colors.horizon, colors.mid, colors.zenith]);

  useEffect(() => {
    return () => material.dispose();
  }, [material]);

  return (
    <mesh renderOrder={-10} frustumCulled={false} material={material}>
      <sphereGeometry args={[900, 48, 32]} />
    </mesh>
  );
}
