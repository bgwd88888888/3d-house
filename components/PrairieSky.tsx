"use client";

/**
 * 白天蓝天蓝穹：天顶浅蓝、地平淡蓝灰雾化，与远草坪/场景雾衔接。
 */
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { WEATHER_PRESETS, type WeatherKind } from "@/lib/weatherPresets";

type PrairieSkyProps = {
  weather: WeatherKind;
};

const SKY_COLORS: Record<
  WeatherKind,
  { zenith: string; mid: string }
> = {
  sunny: {
    // 天空不参与曝光，颜色经输出色彩转换后保持通透浅蓝。
    zenith: "#5f9fe0",
    mid: "#9bd0f0",
  },
  cloudy: {
    zenith: "#5e7084",
    mid: "#7a8896",
  },
  dusk: {
    zenith: "#354675",
    mid: "#a06850",
  },
};

export function PrairieSky({ weather }: PrairieSkyProps) {
  const colors = SKY_COLORS[weather];
  const { fogColor } = WEATHER_PRESETS[weather];

  const material = useMemo(() => {
    const zenith = new THREE.Color(colors.zenith);
    const mid = new THREE.Color(colors.mid);
    const horizon = new THREE.Color(fogColor);

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

          // 地平线及以下固定为场景雾色，草坪远端结束时不会露出异色天空。
          // 只在地平线上方展开渐变，避免雾色被中天蓝色提前稀释。
          vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, elev));
          col = mix(col, uZenith, smoothstep(0.12, 0.50, elev));

          gl_FragColor = vec4(col, 1.0);
          // 与标准材质雾的显示颜色对齐；不对雾色额外施加曝光或 ACES。
          #include <colorspace_fragment>
        }
      `,
    });
  }, [colors.mid, colors.zenith, fogColor]);

  useEffect(() => {
    return () => material.dispose();
  }, [material]);

  return (
    <mesh renderOrder={-10} frustumCulled={false} material={material}>
      <sphereGeometry args={[900, 48, 32]} />
    </mesh>
  );
}
