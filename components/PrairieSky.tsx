"use client";

/**
 * 白天蓝天蓝穹：天顶浅蓝、地平线灰白雾化，与亮地面一致。
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
    // 白天浅天蓝（偏亮以抵消 ACES）；地平线灰白
    zenith: "#8ec8ef",
    mid: "#b6daf2",
    horizon: "#e4e9ec",
    haze: "#d8e0e4",
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
          // 0=地平线，1=天顶；下半段多留给灰白地平线
          float h = clamp(elev * 0.62 + 0.38, 0.0, 1.0);

          vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.38, h));
          col = mix(col, uZenith, smoothstep(0.28, 0.92, h));

          // 地平线加宽灰白带，避免蓝天直接切草地
          float hazeAmt = 1.0 - smoothstep(-0.06, 0.42, h);
          hazeAmt = hazeAmt * hazeAmt * (1.2 - 0.2 * hazeAmt);
          col = mix(col, uHaze, clamp(hazeAmt * 0.92, 0.0, 1.0));

          // 略降饱和，保持白天浅蓝而非艳蓝
          float luma = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(vec3(luma), col, mix(0.72, 0.92, smoothstep(0.15, 0.55, h)));

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
