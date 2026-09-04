"use client";

/**
 * 白天蓝天蓝穹：天顶浅蓝、地平淡蓝灰雾化，与远草坪/场景雾衔接。
 */
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { WeatherKind } from "@/lib/weatherPresets";

type PrairieSkyProps = {
  weather: WeatherKind;
};

const SKY_COLORS: Record<
  WeatherKind,
  { zenith: string; mid: string; horizon: string; haze: string }
> = {
  sunny: {
    // 白天通透浅蓝（偏亮以抵消 ACES）。地平用淡蓝灰，不要纸白——
    // 天空 toneMapped:false，纸白会跟走 ACES 的草地雾对不上，画出刀锋。
    zenith: "#5f9fe0",
    mid: "#9bd0f0",
    horizon: "#cfe0ea",
    haze: "#d4e4ec",
  },
  cloudy: {
    zenith: "#5e7084",
    mid: "#7a8896",
    horizon: "#6e7672",
    haze: "#6e7672",
  },
  dusk: {
    zenith: "#354675",
    mid: "#a06850",
    horizon: "#8a6e52",
    haze: "#8a6e52",
  },
};

export function PrairieSky({ weather }: PrairieSkyProps) {
  const colors = SKY_COLORS[weather];

  const material = useMemo(() => {
    const zenith = new THREE.Color(colors.zenith);
    const mid = new THREE.Color(colors.mid);
    const horizon = new THREE.Color(colors.horizon);
    const haze = new THREE.Color(colors.haze);

    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      uniforms: {
        uZenith: { value: zenith },
        uMid: { value: mid },
        uHorizon: { value: horizon },
        uHaze: { value: haze },
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
        uniform vec3 uHaze;
        varying vec3 vWorldPos;
        void main() {
          vec3 dir = normalize(vWorldPos - cameraPosition);
          float elev = dir.y;

          // 视野常用仰角大约在 -0.1~0.5 之间；让渐变主要发生在这段范围内，
          // 避免大部分画面都停在同一档「mid」色而显得扁平。
          vec3 col = mix(uHorizon, uMid, smoothstep(-0.10, 0.14, elev));
          col = mix(col, uZenith, smoothstep(0.08, 0.50, elev));

          // 加宽带、压强度：柔和大气透视，避免地平一条亮白缎带
          float hazeAmt = 1.0 - smoothstep(-0.16, 0.16, elev);
          hazeAmt = hazeAmt * hazeAmt;
          col = mix(col, uHaze, clamp(hazeAmt * 0.48, 0.0, 1.0));

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, [colors.haze, colors.horizon, colors.mid, colors.zenith]);

  useEffect(() => {
    return () => material.dispose();
  }, [material]);

  return (
    <mesh renderOrder={-10} frustumCulled={false} material={material}>
      <sphereGeometry args={[900, 48, 32]} />
    </mesh>
  );
}
