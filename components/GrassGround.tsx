"use client";

/**
 * 院子草地：大范围 PBR 草坪。
 * - 双尺度贴图 + 世界坐标 fbm + 裸土斑块，打破平铺感。
 * - 轻微轻微起伏，增加景深层次。
 * - 法线随距离衰减；远处并入雾绿，衔接地平线。
 */
import { useTexture } from "@react-three/drei";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useGrassTextures } from "@/hooks/useGrassTextures";

const GRASS_SIZE = 1100;
/** 更密的近处草纹，增强草质感可见度 */
const GRASS_TILE_METERS = 2.4;
const GRASS_MACRO_TILE_METERS = 18;
const GRASS_GROUND_Y = -0.04;
const GRASS_SEGMENTS = 160;
const GRASS_NORMAL_SCALE = new THREE.Vector2(1.55, 1.55);

const DIRT_TEXTURE_URLS = {
  map: "/textures/ground-048/Ground048_1K-JPG_Color.jpg",
  normalMap: "/textures/ground-048/Ground048_1K-JPG_NormalGL.jpg",
  roughnessMap: "/textures/ground-048/Ground048_1K-JPG_Roughness.jpg",
};

export function GrassGround() {
  const textures = useGrassTextures();
  const dirtTextures = useTexture(DIRT_TEXTURE_URLS);
  const fineRepeat = GRASS_SIZE / GRASS_TILE_METERS;
  const macroRepeat = GRASS_SIZE / GRASS_MACRO_TILE_METERS;
  const dirtRepeat = GRASS_SIZE / 8.5;

  useLayoutEffect(() => {
    for (const texture of Object.values(textures)) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(fineRepeat, fineRepeat);
      texture.needsUpdate = true;
    }
  }, [fineRepeat, textures]);

  useLayoutEffect(() => {
    for (const [mapType, texture] of Object.entries(dirtTextures)) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(dirtRepeat, dirtRepeat);
      texture.anisotropy = textures.map.anisotropy;
      texture.colorSpace =
        mapType === "map" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.needsUpdate = true;
    }
  }, [dirtRepeat, dirtTextures, textures.map.anisotropy]);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: "#6a8458",
      roughness: 0.96,
      metalness: 0,
      normalScale: GRASS_NORMAL_SCALE,
      envMapIntensity: 0.14,
    });

    const macroScale = fineRepeat / macroRepeat;

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uDirtMap = { value: dirtTextures.map };
      shader.uniforms.uDirtRoughnessMap = { value: dirtTextures.roughnessMap };
      shader.uniforms.uMacroScale = { value: macroScale };

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          /* glsl */ `#include <common>
          varying vec3 vGroundWorld;
          float gvHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float gvNoise(vec2 p){
            vec2 i = floor(p); vec2 f = fract(p);
            float a = gvHash(i);
            float b = gvHash(i + vec2(1.0, 0.0));
            float c = gvHash(i + vec2(0.0, 1.0));
            float d = gvHash(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
          }
          float gvFbm(vec2 p){
            float s = 0.0; float amp = 0.5;
            for (int i = 0; i < 3; i++){ s += amp * gvNoise(p); p *= 2.1; amp *= 0.5; }
            return s;
          }`,
        )
        .replace(
          "#include <begin_vertex>",
          /* glsl */ `#include <begin_vertex>
          {
            // 平面本地 xy → 世界 xz；轻微起伏增加景深（院子中心压平）
            vec2 wp0 = (modelMatrix * vec4(transformed, 1.0)).xz;
            float distXZ = length(wp0);
            // 建筑区保持平整，院外再起轻微起伏
            float yardFlat = smoothstep(55.0, 120.0, distXZ);
            float h = (gvFbm(wp0 * 0.018) - 0.5) * 2.2 * yardFlat;
            h += (gvFbm(wp0 * 0.05) - 0.5) * 0.55 * yardFlat;
            transformed.z += h;
          }
          vGroundWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          /* glsl */ `#include <common>
          varying vec3 vGroundWorld;
          uniform sampler2D uDirtMap;
          uniform sampler2D uDirtRoughnessMap;
          uniform float uMacroScale;
          float grDirtMask = 0.0;
          float grHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float grNoise(vec2 p){
            vec2 i = floor(p); vec2 f = fract(p);
            float a = grHash(i);
            float b = grHash(i + vec2(1.0, 0.0));
            float c = grHash(i + vec2(0.0, 1.0));
            float d = grHash(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
          }
          float grFbm(vec2 p){
            float s = 0.0; float amp = 0.5;
            for (int i = 0; i < 4; i++){ s += amp * grNoise(p); p *= 2.03; amp *= 0.5; }
            return s;
          }`,
        )
        .replace(
          "#include <map_fragment>",
          /* glsl */ `
          #ifdef USE_MAP
          {
            vec2 wp = vGroundWorld.xz;
            float camDist = length(vViewPosition);

            vec3 fineSample = texture2D(map, vMapUv).rgb;
            vec3 macroSample = texture2D(map, vMapUv * uMacroScale).rgb;
            // 近处多留细纹，远处再混宏观层
            float macroW = mix(0.12, 0.72, smoothstep(12.0, 140.0, camDist));
            vec3 grassCol = mix(fineSample, macroSample, macroW);
            // 近处略提亮，草叶纹理更易读
            grassCol *= mix(1.08, 1.0, smoothstep(8.0, 40.0, camDist));

            float dirtMacro = grFbm(wp * 0.014 + 17.3);
            float dirtMeso = grFbm(wp * 0.06 - 4.1);
            grDirtMask = smoothstep(0.48, 0.68, dirtMacro * 0.68 + dirtMeso * 0.32);
            grDirtMask *= mix(1.0, 0.42, smoothstep(60.0, 220.0, camDist));

            vec3 dirtCol = texture2D(uDirtMap, vMapUv * 0.5).rgb * vec3(0.82, 0.76, 0.66);
            vec3 blended = mix(grassCol, dirtCol, grDirtMask * 0.82);

            float macro = grFbm(wp * 0.008);
            float meso = grFbm(wp * 0.035);
            float mix1 = clamp(macro * 0.55 + meso * 0.45, 0.0, 1.0);
            // 大尺度明暗斑更明显，中景也能读出层次
            blended *= mix(0.62, 1.16, mix1);

            vec3 dry = vec3(1.1, 0.96, 0.72);
            vec3 lush = vec3(0.8, 1.06, 0.7);
            blended *= mix(dry, lush, smoothstep(0.25, 0.7, macro));

            // 中远景并入雾灰绿；提亮远草，避免相对白天天空过暗
            float distFade = smoothstep(70.0, 280.0, camDist);
            float luma = dot(blended, vec3(0.299, 0.587, 0.114));
            blended = mix(blended, vec3(luma), distFade * 0.22);
            blended = mix(blended, vec3(0.58, 0.64, 0.52), distFade * 0.32);
            blended *= mix(1.0, 1.08, distFade);

            diffuseColor *= vec4(blended, 1.0);
          }
          #endif
          `,
        )
        .replace(
          "#include <normal_fragment_maps>",
          /* glsl */ `#include <normal_fragment_maps>
          {
            float camDist = length(vViewPosition);
            float nFade = mix(1.0, 0.06, smoothstep(24.0, 150.0, camDist));
            normal = normalize(mix(vec3(0.0, 0.0, 1.0), normal, nFade));
          }`,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          /* glsl */ `#include <roughnessmap_fragment>
          {
            float camDist = length(vViewPosition);
            roughnessFactor = mix(roughnessFactor, min(1.0, roughnessFactor + 0.12), smoothstep(35.0, 180.0, camDist));
            float dirtR = texture2D(uDirtRoughnessMap, vMapUv * 0.5).g;
            roughnessFactor = mix(roughnessFactor, dirtR, grDirtMask * 0.55);
          }`,
        );
    };

    mat.customProgramCacheKey = () => `grass-ground-v6-${macroScale.toFixed(3)}`;

    return mat;
  }, [
    dirtTextures.map,
    dirtTextures.roughnessMap,
    fineRepeat,
    macroRepeat,
  ]);

  useLayoutEffect(() => {
    /* eslint-disable react-hooks/immutability -- MeshStandardMaterial 贴图需运行时挂载 */
    material.map = textures.map;
    material.normalMap = textures.normalMap;
    material.roughnessMap = textures.roughnessMap;
    material.needsUpdate = true;
    /* eslint-enable react-hooks/immutability */
  }, [material, textures]);

  useLayoutEffect(() => {
    return () => material.dispose();
  }, [material]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, GRASS_GROUND_Y, 0]}
      receiveShadow
      material={material}
    >
      <planeGeometry
        args={[GRASS_SIZE, GRASS_SIZE, GRASS_SEGMENTS, GRASS_SEGMENTS]}
      />
    </mesh>
  );
}
