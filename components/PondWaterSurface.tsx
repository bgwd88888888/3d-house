"use client";

/**
 * 简单池水：滚动法线涟漪，不做场景反射。
 * 径向浅岸到深水的水色在 fragment 里混合；GardenPond 与 CourtyardKoiPond 共用。
 */
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type PondWaterSurfaceProps = {
  rx: number;
  rz: number;
  position?: [number, number, number];
  tilt?: number;
  color?: string;
  shallowColor?: string;
  deepColor?: string;
  roughness?: number;
  metalness?: number;
  normalRepeat?: number;
  normalScale?: number;
  flowSpeed?: readonly [number, number];
  opacity?: number;
  /** 相对 opacity 的乘数：岸边更透，让已有浅水底透出来。 */
  shallowOpacity?: number;
  deepOpacity?: number;
};

const NORMALS_URL = "/textures/waternormals.jpg";
const POND_DEPTH_KEY = "pond-water-depth-v4";

function toLinear(hex: string): THREE.Color {
  return new THREE.Color(hex).convertSRGBToLinear();
}

export function PondWaterSurface({
  rx,
  rz,
  position = [0.05, -0.015, -0.05],
  tilt = 0.02,
  color = "#28545a",
  shallowColor,
  deepColor,
  roughness = 0.42,
  metalness = 0.08,
  normalRepeat = 2.2,
  normalScale = 0.45,
  flowSpeed = [0.026, 0.016],
  opacity = 1,
  shallowOpacity = 1,
  deepOpacity = 1,
}: PondWaterSurfaceProps) {
  const waterNormals = useTexture(NORMALS_URL);
  const flowSpeedRef = useRef(flowSpeed);
  flowSpeedRef.current = flowSpeed;
  const translucent = opacity < 0.999 || shallowOpacity < 0.999;
  const normalScaleVec = useMemo(
    () => new THREE.Vector2(normalScale, normalScale),
    [normalScale],
  );

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      envMapIntensity: 0,
      transparent: translucent,
      opacity,
      depthWrite: !translucent,
    });
    const uniforms = {
      uShallowColor: { value: new THREE.Color() },
      uDeepColor: { value: new THREE.Color() },
      uInner: { value: 0.08 },
      uOuter: { value: 0.78 },
      uOpacityShallow: { value: 1 },
      uOpacityDeep: { value: 1 },
    };
    mat.userData.pondUniforms = uniforms;
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          /* glsl */ `#include <common>
          varying vec2 vPondCoord;`,
        )
        .replace(
          "#include <begin_vertex>",
          /* glsl */ `#include <begin_vertex>
          vPondCoord = position.xy;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          /* glsl */ `#include <common>
          varying vec2 vPondCoord;
          uniform vec3 uShallowColor;
          uniform vec3 uDeepColor;
          uniform float uInner;
          uniform float uOuter;
          uniform float uOpacityShallow;
          uniform float uOpacityDeep;
          float pondShallow = 0.0;`,
        )
        .replace(
          "#include <color_fragment>",
          /* glsl */ `#include <color_fragment>
          {
            float pondR = length(vPondCoord);
            float ang = pondR > 0.001 ? atan(vPondCoord.y, vPondCoord.x) : 0.0;
            float wobble = 0.055 * sin(ang * 3.0 + 0.5) + 0.03 * sin(ang * 7.0 - 0.8);
            pondShallow = smoothstep(uInner, uOuter, clamp(pondR + wobble * pondR, 0.0, 1.0));
            diffuseColor.rgb = mix(uDeepColor, uShallowColor, pondShallow);
            diffuseColor.a *= mix(uOpacityDeep, uOpacityShallow, pondShallow);
          }`,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          /* glsl */ `#include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor * 0.9, min(1.0, roughnessFactor + 0.07), pondShallow);`,
        );
    };
    mat.customProgramCacheKey = () => POND_DEPTH_KEY;
    return mat;
  }, [color, metalness, opacity, roughness, translucent]);

  useLayoutEffect(() => {
    const uniforms = material.userData.pondUniforms as {
      uShallowColor: { value: THREE.Color };
      uDeepColor: { value: THREE.Color };
      uOpacityShallow: { value: number };
      uOpacityDeep: { value: number };
    };
    const mid = toLinear(color);
    const shallow = shallowColor
      ? toLinear(shallowColor)
      : mid.clone().lerp(toLinear("#d0e8dc"), 0.38);
    const deep = deepColor
      ? toLinear(deepColor)
      : mid.clone().lerp(toLinear("#102422"), 0.42);
    /* eslint-disable react-hooks/immutability -- 水色 uniform 与贴图需就地更新 */
    uniforms.uShallowColor.value.copy(shallow);
    uniforms.uDeepColor.value.copy(deep);
    uniforms.uOpacityShallow.value = shallowOpacity;
    uniforms.uOpacityDeep.value = deepOpacity;
    material.color.set(color);
    material.roughness = roughness;
    material.metalness = metalness;
    material.opacity = opacity;
    material.transparent = translucent;
    material.depthWrite = !translucent;
    const hadNormalMap = material.normalMap === waterNormals;
    material.normalMap = waterNormals;
    material.normalScale.copy(normalScaleVec);
    if (!hadNormalMap) material.needsUpdate = true;
    /* eslint-enable react-hooks/immutability */
  }, [
    color,
    deepColor,
    deepOpacity,
    material,
    metalness,
    normalScaleVec,
    opacity,
    roughness,
    shallowColor,
    shallowOpacity,
    translucent,
    waterNormals,
  ]);

  useLayoutEffect(() => {
    /* eslint-disable react-hooks/immutability -- Three.js 贴图通过命令式属性同步上传参数。 */
    waterNormals.wrapS = THREE.RepeatWrapping;
    waterNormals.wrapT = THREE.RepeatWrapping;
    waterNormals.repeat.set(normalRepeat, normalRepeat);
    waterNormals.anisotropy = 4;
    waterNormals.generateMipmaps = true;
    waterNormals.minFilter = THREE.LinearMipmapLinearFilter;
    waterNormals.magFilter = THREE.LinearFilter;
    waterNormals.needsUpdate = true;
    /* eslint-enable react-hooks/immutability */
  }, [waterNormals, normalRepeat]);

  useFrame((_, delta) => {
    const [flowX, flowY] = flowSpeedRef.current;
    /* eslint-disable react-hooks/immutability -- 法线贴图偏移驱动涟漪，不重建材质 */
    waterNormals.offset.x += delta * flowX;
    waterNormals.offset.y += delta * flowY;
    /* eslint-enable react-hooks/immutability */
  });

  useLayoutEffect(() => {
    return () => material.dispose();
  }, [material]);

  return (
    <mesh
      rotation={[-Math.PI / 2, tilt, 0]}
      position={position}
      scale={[rx, rz, 1]}
      material={material}
    >
      <circleGeometry args={[1, 48]} />
    </mesh>
  );
}
