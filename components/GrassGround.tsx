"use client";

/**
 * 院子草地：大范围 PBR 草坪。
 * - 双尺度贴图 + 多频世界坐标 fbm 斑块，近中远都能读出深浅变化，打破平铺感。
 * - 近院落/近相机加强磨损斑块与碎土点；汀步廊道做缝草+肩带+外晕+外圈草色软接。
 * - 池岸对齐 GARDEN_POND：湿内环→干泥肩→外缘草爬回；破碎边缘避免圆滑色带。
 * - 中远景草甸大块色差/稀疏干斑，外围别成空绿平面。
 * - 院内微起伏（建筑脚底压平）补高低层次；近处叠加解析式法线扰动。
 * - 远处颜色/法线/粗糙度向场景雾色过渡，避免提前变灰的“死绿”。
 */
import { useTexture } from "@react-three/drei";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useGrassTextures } from "@/hooks/useGrassTextures";

const GRASS_SIZE = 1100;
/** 更密的近处草纹，增强草质感与斑块边缘可读性 */
const GRASS_TILE_METERS = 2.15;
const GRASS_MACRO_TILE_METERS = 16;
const GRASS_GROUND_Y = -0.04;
/** 略加密，让院内微起伏与池边落差可读 */
const GRASS_SEGMENTS = 220;
const GRASS_NORMAL_SCALE = new THREE.Vector2(2.05, 2.05);

/** 与 GardenPath / GardenPond 世界坐标对齐（西式小院） */
const PATH_DOOR_X = 2.25;
const PATH_FRONT_Z0 = 6.48;
/** 前门廊末石中心约 z≈11.63 */
const PATH_FRONT_Z1 = 11.7;
/** 侧廊约 sideZ≈7.55 */
const PATH_SIDE_Z = 7.55;
/** 侧廊末石约 x≈9.24 */
const PATH_SIDE_X1 = 9.3;
const POND_X = 11.2;
const POND_Z = 10.4;
/** 与 GARDEN_POND：water + bankPad(0.7) → bankRx/Rz */
const POND_RX = 2.4;
const POND_RZ = 2.1;
const POND_WATER_RX = 1.7;
const POND_WATER_RZ = 1.4;

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
      // 贴图与斑块噪声已经承担绝大部分颜色信息；基色只做轻微中性化，
      // 避免"材质色 × 贴图色"双重相乘把草坪压成发黑的橄榄绿。
      color: "#a8b39a",
      roughness: 0.95,
      metalness: 0,
      normalScale: GRASS_NORMAL_SCALE,
      envMapIntensity: 0.16,
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
          }
          float gvSegDist(vec2 p, vec2 a, vec2 b){
            vec2 pa = p - a; vec2 ba = b - a;
            float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
            return length(pa - ba * h);
          }`,
        )
        .replace(
          "#include <begin_vertex>",
          /* glsl */ `#include <begin_vertex>
          {
            // 平面本地 xy → 世界 xz
            vec2 wp0 = (modelMatrix * vec4(transformed, 1.0)).xz;
            float distXZ = length(wp0);
            // 建筑区保持平整，院外再起轻微起伏
            float yardFlat = smoothstep(55.0, 120.0, distXZ);
            float h = (gvFbm(wp0 * 0.018) - 0.5) * 2.2 * yardFlat;
            h += (gvFbm(wp0 * 0.05) - 0.5) * 0.55 * yardFlat;

            // 院内微起伏：建筑脚底压平，前院/侧院保留可读高低层次
            float houseClear = smoothstep(6.6, 9.2, max(abs(wp0.x) * 0.95, abs(wp0.y) * 1.15));
            float micro = (gvFbm(wp0 * 0.38 + 2.7) - 0.5) * 0.09;
            float meso = (gvFbm(wp0 * 0.14 - 1.3) - 0.5) * 0.16;
            h += (micro + meso) * houseClear * mix(1.0, 0.35, yardFlat);

            // 池岸轻微下凹，草地与驳岸衔接更自然
            vec2 pondP = (wp0 - vec2(${POND_X.toFixed(2)}, ${POND_Z.toFixed(2)}))
              / vec2(${POND_RX.toFixed(2)}, ${POND_RZ.toFixed(2)});
            float pondR = length(pondP);
            float pondBowl = (1.0 - smoothstep(0.92, 1.55, pondR)) * houseClear;
            h -= pondBowl * 0.07 * (0.55 + 0.45 * gvFbm(wp0 * 0.55));

            // 汀步廊道轻微踩实下陷
            float pathD = min(
              gvSegDist(wp0, vec2(${PATH_DOOR_X.toFixed(2)}, ${PATH_FRONT_Z0.toFixed(2)}),
                             vec2(${PATH_DOOR_X.toFixed(2)}, ${PATH_FRONT_Z1.toFixed(2)})),
              gvSegDist(wp0, vec2(${PATH_DOOR_X.toFixed(2)}, ${PATH_SIDE_Z.toFixed(2)}),
                             vec2(${PATH_SIDE_X1.toFixed(2)}, ${PATH_SIDE_Z.toFixed(2)}))
            );
            float pathDip = (1.0 - smoothstep(0.45, 1.55, pathD)) * houseClear;
            h -= pathDip * 0.035 * (0.6 + 0.4 * gvFbm(wp0 * 0.9));

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
          float grPatchMid = 0.5;
          vec2 grBumpGrad = vec2(0.0);
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
          }
          // 2 阶 fbm，专给"近处解析法线扰动"用的轻量版本（省中央差分的开销）
          float grFbm2(vec2 p){
            float s = 0.0; float amp = 0.5;
            for (int i = 0; i < 2; i++){ s += amp * grNoise(p); p *= 2.4; amp *= 0.5; }
            return s;
          }
          float grSegDist(vec2 p, vec2 a, vec2 b){
            vec2 pa = p - a; vec2 ba = b - a;
            float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
            return length(pa - ba * h);
          }
          // 破碎边缘：高频噪声撕开平滑 mask，避免圆滑色带
          float grRagged(float mask, vec2 wp, float freq, float amp){
            float n = grFbm(wp * freq);
            return smoothstep(0.0, 1.0, mask + (n - 0.5) * amp);
          }
          // 草重新爬回：在磨损带外缘用噪声“啃”出断续草斑
          float grGrassCreep(float wear, vec2 wp, float freq){
            float creep = smoothstep(0.35, 0.78, grFbm(wp * freq + 6.1));
            float edge = smoothstep(0.15, 0.75, wear) * (1.0 - smoothstep(0.55, 1.0, wear));
            return wear * (1.0 - creep * edge * 0.85);
          }`,
        )
        .replace(
          "#include <map_fragment>",
          /* glsl */ `
          #ifdef USE_MAP
          {
            vec2 wp = vGroundWorld.xz;
            float camDist = length(vViewPosition);
            // 相机近距额外抬细节（与院落半径解耦，低机位近看也生效）
            float nearCam = 1.0 - smoothstep(6.0, 22.0, camDist);

            vec3 fineSample = texture2D(map, vMapUv).rgb;
            vec3 macroSample = texture2D(map, vMapUv * uMacroScale).rgb;
            // 实拍贴图密度很高，真实观察距离下很容易被 mipmap 抹成纯色；
            // 中近景就早点接入宏观层，保留贴图本身仍有的明暗/色相差异。
            float macroW = mix(0.12, 0.8, smoothstep(7.0, 55.0, camDist));
            vec3 grassCol = mix(fineSample, macroSample, macroW);
            // 近处略提亮，草叶纹理更易读
            grassCol *= mix(1.1, 1.0, smoothstep(6.0, 36.0, camDist));

            float dirtMacro = grFbm(wp * 0.014 + 17.3);
            float dirtMeso = grFbm(wp * 0.06 - 4.1);
            float dirtFine = grFbm(wp * 0.28 + 9.7);
            float dirtMicro = grFbm(wp * 1.35 + 23.0);
            grDirtMask = smoothstep(0.46, 0.7,
              dirtMacro * 0.48 + dirtMeso * 0.28 + dirtFine * 0.16 + dirtMicro * 0.08);
            // 边缘撕碎，避免大块圆斑
            grDirtMask = grRagged(grDirtMask, wp, 0.65, 0.52);

            // —— 近院落：有机斑块磨损/色差（前院最强，勿画成矩形泥围裙）——
            float yardRad = length(wp);
            float nearYard = 1.0 - smoothstep(6.0, 34.0, yardRad);
            float nearFocus = max(nearYard, nearCam * 0.9);
            // 中远景草甸权重：院外别成一片空绿
            float midField = smoothstep(16.0, 38.0, yardRad)
              * (1.0 - smoothstep(85.0, 210.0, yardRad));
            float fieldFocus = midField * (1.0 - smoothstep(90.0, 260.0, camDist));
            float yardBlob = grFbm(wp * 0.1 + 5.2) * 0.4
              + grFbm(wp * 0.26 - 3.8) * 0.34
              + grFbm(wp * 0.72 + 14.0) * 0.26;
            float yardWear = smoothstep(0.42, 0.74, yardBlob) * nearFocus;
            yardWear = grRagged(yardWear, wp, 1.2, 0.82);
            // 近景碎斑：密而小的裸土/枯草点
            float speck = smoothstep(0.58, 0.84, grFbm(wp * 1.95 + 31.0))
              * smoothstep(0.36, 0.68, grFbm(wp * 0.95 - 9.0));
            yardWear = max(yardWear, speck * nearFocus * 0.68);
            // 门前活动区：噪声开窗，只露碎斑而非整盘泥地
            float doorPad = 1.0 - smoothstep(1.6, 6.8, length(wp - vec2(${PATH_DOOR_X.toFixed(2)}, 8.0)));
            float doorBlob = smoothstep(0.34, 0.66, grFbm(wp * 0.52 + 13.0));
            yardWear = max(yardWear, grRagged(doorPad * doorBlob * 0.95, wp, 1.5, 0.72));
            // 墙根：窄而断续的碎土
            vec2 houseHalf = vec2(6.55, 5.25);
            vec2 houseD = abs(wp) - houseHalf;
            float houseEdge = length(max(houseD, 0.0)) + min(max(houseD.x, houseD.y), 0.0);
            float foundationBand = (1.0 - smoothstep(0.0, 0.95, houseEdge))
              * smoothstep(-0.3, 0.12, houseEdge);
            float foundationWear = foundationBand
              * smoothstep(0.32, 0.64, grFbm(wp * 0.9 + 7.7))
              * smoothstep(0.26, 0.56, grFbm(wp * 2.1 - 2.2));
            foundationWear = grRagged(foundationWear, wp, 2.5, 0.85);
            yardWear = max(yardWear, foundationWear * 0.82);
            yardWear = grGrassCreep(yardWear, wp, 1.3);
            grDirtMask = max(grDirtMask, yardWear * mix(0.74, 0.92, nearCam));

            // —— 汀步廊道：缝草 + 肩带碎土 + 外晕 + 更外一圈草色软接 ——
            float pathD = min(
              grSegDist(wp, vec2(${PATH_DOOR_X.toFixed(2)}, ${PATH_FRONT_Z0.toFixed(2)}),
                            vec2(${PATH_DOOR_X.toFixed(2)}, ${PATH_FRONT_Z1.toFixed(2)})),
              grSegDist(wp, vec2(${PATH_DOOR_X.toFixed(2)}, ${PATH_SIDE_Z.toFixed(2)}),
                            vec2(${PATH_SIDE_X1.toFixed(2)}, ${PATH_SIDE_Z.toFixed(2)}))
            );
            float alongFront = wp.y;
            float alongSide = wp.x;
            float onFront = 1.0 - smoothstep(0.0, 0.9, abs(wp.x - ${PATH_DOOR_X.toFixed(2)}));
            float onSide = 1.0 - smoothstep(0.0, 0.9, abs(wp.y - ${PATH_SIDE_Z.toFixed(2)}));
            float pathAlong = mix(alongSide, alongFront, onFront / max(onFront + onSide, 1e-3));
            // 石板间隙周期 ≈ STONE_D+GAP≈0.96m
            float seamGrass = smoothstep(0.36, 0.1, abs(fract(pathAlong * 1.04) - 0.5));
            float pathShoulder = smoothstep(0.18, 0.5, pathD) * (1.0 - smoothstep(0.58, 1.7, pathD));
            float pathHalo = smoothstep(0.8, 1.45, pathD) * (1.0 - smoothstep(1.55, 2.85, pathD));
            float pathOuter = smoothstep(1.7, 2.5, pathD) * (1.0 - smoothstep(2.7, 4.1, pathD));
            float pathCenter = (1.0 - smoothstep(0.0, 0.5, pathD)) * (0.2 + 0.22 * (1.0 - seamGrass));
            float pathWear = (pathShoulder * 1.0 + pathCenter + pathHalo * 0.55 + pathOuter * 0.28)
              * mix(0.28, 1.0, grFbm(wp * 0.88 + 11.0));
            pathWear = grRagged(pathWear, wp, 1.9, 0.8);
            pathWear = grGrassCreep(pathWear, wp, 1.6);
            pathWear *= mix(1.0, 0.32, seamGrass * (1.0 - smoothstep(0.32, 0.78, pathD)));
            grDirtMask = max(grDirtMask, pathWear * mix(0.72, 0.9, nearCam));

            // —— 池岸：湿内环 → 干泥肩 → 外缘碎草/草色软接 ——
            vec2 pondEll = (wp - vec2(${POND_X.toFixed(2)}, ${POND_Z.toFixed(2)}))
              / vec2(${POND_RX.toFixed(2)}, ${POND_RZ.toFixed(2)});
            float pondR = length(pondEll);
            vec2 waterEll = (wp - vec2(${POND_X.toFixed(2)}, ${POND_Z.toFixed(2)}))
              / vec2(${POND_WATER_RX.toFixed(2)}, ${POND_WATER_RZ.toFixed(2)});
            float waterR = length(waterEll);
            float pondBank = smoothstep(0.78, 1.0, pondR) * (1.0 - smoothstep(1.02, 1.6, pondR));
            float pondFringe = smoothstep(1.1, 1.48, pondR) * (1.0 - smoothstep(1.48, 2.25, pondR));
            float pondCreep = smoothstep(1.4, 1.85, pondR) * (1.0 - smoothstep(1.95, 2.7, pondR));
            pondBank = (pondBank * 0.92 + pondFringe * 0.62 + pondCreep * 0.32)
              * mix(0.32, 1.0, grFbm(wp * 0.72 + 2.4));
            pondBank = grRagged(pondBank, wp, 1.55, 0.86);
            pondBank = grGrassCreep(pondBank, wp, 1.4);
            float pondWet = (1.0 - smoothstep(0.8, 1.32, waterR)) * 0.72
              * (1.0 - smoothstep(1.15, 1.75, pondR));
            grDirtMask = max(grDirtMask, pondBank * mix(0.8, 0.94, nearCam));

            // —— 外围草甸：稀疏干斑 + 深浅绿岛，避免远看一片空 ——
            float meadow = grFbm(wp * 0.02 + 41.0) * 0.5
              + grFbm(wp * 0.048 - 12.0) * 0.32
              + grFbm(wp * 0.11 + 7.0) * 0.18;
            float fieldDry = smoothstep(0.6, 0.8, meadow)
              * smoothstep(0.38, 0.62, grFbm(wp * 0.085 - 3.0));
            fieldDry = grRagged(fieldDry * fieldFocus * 0.42, wp, 0.45, 0.55);
            float fieldLushIsland = smoothstep(0.55, 0.78, grFbm(wp * 0.03 + 22.0))
              * fieldFocus;
            grDirtMask = max(grDirtMask, fieldDry);

            grDirtMask *= mix(1.0, 0.48, smoothstep(70.0, 260.0, camDist));
            grDirtMask = clamp(grDirtMask, 0.0, 1.0);

            vec3 dirtCol = texture2D(uDirtMap, vMapUv * 0.5).rgb * vec3(0.84, 0.77, 0.66);
            dirtCol *= mix(vec3(1.0), vec3(1.12, 0.95, 0.78), nearFocus * 0.6);
            dirtCol *= mix(vec3(1.0), vec3(0.7, 0.78, 0.68), pondWet);
            // 路径外晕/池岸外圈混回草色，软过渡
            float edgeSoft = max(max(pathHalo, pathOuter), max(pondFringe, pondCreep)) * 0.42;
            vec3 blended = mix(grassCol, dirtCol, grDirtMask * mix(0.72, 0.88, nearCam));
            blended = mix(blended, grassCol * vec3(0.9, 0.96, 0.86), edgeSoft * (1.0 - grDirtMask));

            // 多尺度斑块：近景碎簇 + 中远景大块草甸色差
            float patchLarge = grFbm(wp * 0.038 + 3.0);
            float patchMid = grFbm(wp * 0.17 - 8.0);
            float patchFine = grFbm(wp * 1.15 + 41.0);
            float patchCluster = grFbm(wp * 0.58 + 19.0);
            float patchSpeck = grFbm(wp * 2.4 + 53.0);
            float fineWeight = 1.0 - smoothstep(12.0, 95.0, camDist);
            float patchMix = clamp(
              mix(patchLarge * 0.48 + patchMid * 0.52,
                  patchLarge * 0.14 + patchMid * 0.32 + patchFine * 0.28
                    + patchCluster * 0.17 + patchSpeck * 0.09,
                  fineWeight),
              0.0, 1.0
            );
            patchMix = mix(
              patchMix,
              clamp(
                patchMix * 1.28
                  + (patchCluster - 0.5) * 0.34
                  + (patchFine - 0.5) * 0.16
                  + (patchSpeck - 0.5) * 0.12,
                0.0, 1.0
              ),
              nearFocus
            );
            // 外围抬大尺度对比，草甸岛可见
            patchMix = mix(
              patchMix,
              clamp(patchMix * 1.18 + (patchLarge - 0.5) * 0.28 + (meadow - 0.5) * 0.2, 0.0, 1.0),
              fieldFocus
            );
            grPatchMid = patchMid;
            blended *= mix(0.6, 1.32, patchMix);
            blended *= mix(vec3(1.0), vec3(0.86, 1.06, 0.82), fieldLushIsland * 0.35);

            vec3 dry = vec3(1.16, 0.9, 0.66);
            vec3 lush = vec3(0.76, 1.1, 0.74);
            float tone = smoothstep(0.24, 0.76, patchMid * 0.55 + patchCluster * 0.25 + meadow * 0.2);
            tone = mix(tone, tone * 0.5, nearFocus * 0.85);
            tone = mix(tone, min(1.0, tone + 0.24), pondWet);
            tone = mix(tone, tone * 0.74, pathShoulder * 0.55 + pathHalo * 0.25);
            tone = mix(tone, tone * 0.82, fieldDry * 0.7);
            blended *= mix(dry, lush, tone);

            // 门前/廊道旁细碎晒斑
            float sunPatch = grFbm(wp * 1.05 + 27.0);
            blended *= mix(vec3(1.0), vec3(1.14, 1.03, 0.84),
              (pathWear * 0.48 + yardWear * 0.38 + foundationWear * 0.42) * sunPatch);

            // 近处用解析梯度伪造法线扰动
            {
              float eps = 0.28;
              float hL = grFbm2((wp - vec2(eps, 0.0)) * 1.05);
              float hR = grFbm2((wp + vec2(eps, 0.0)) * 1.05);
              float hD = grFbm2((wp - vec2(0.0, eps)) * 1.05);
              float hU = grFbm2((wp + vec2(0.0, eps)) * 1.05);
              grBumpGrad = vec2(hR - hL, hU - hD) / (2.0 * eps);
              // 磨损/池岸边缘额外凹凸，碎边更可读
              float edgeBump = max(pathWear, max(pondBank, yardWear * 0.75));
              grBumpGrad += vec2(
                grFbm2(wp * 1.85) - 0.5,
                grFbm2(wp * 1.85 + 4.0) - 0.5
              ) * edgeBump * mix(1.0, 1.45, nearCam);
            }

            // 中远景向场景真实雾色靠拢
            #ifdef USE_FOG
              float distFade = smoothstep(fogNear * 0.2, fogFar * 0.92, camDist);
            #else
              float distFade = smoothstep(160.0, 520.0, camDist);
            #endif
            float luma = dot(blended, vec3(0.299, 0.587, 0.114));
            blended = mix(blended, vec3(luma), distFade * 0.16);
            #ifdef USE_FOG
              blended = mix(blended, fogColor, distFade * 0.42);
            #else
              blended = mix(blended, vec3(0.58, 0.64, 0.52), distFade * 0.3);
            #endif

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
            float nFade = mix(1.0, 0.08, smoothstep(26.0, 160.0, camDist));
            normal = normalize(mix(vec3(0.0, 0.0, 1.0), normal, nFade));
            // 叠加近处程序化簇状凹凸，法线贴图之外再补一层"能被光影读出来"的细节
            float bumpFade = 1.0 - smoothstep(12.0, 65.0, camDist);
            normal = normalize(normal + vec3(grBumpGrad * 1.15 * bumpFade, 0.0));
          }`,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          /* glsl */ `#include <roughnessmap_fragment>
          {
            float camDist = length(vViewPosition);
            roughnessFactor = mix(roughnessFactor, min(1.0, roughnessFactor + 0.12), smoothstep(35.0, 180.0, camDist));
            // 干湿/疏密斑块也让粗糙度跟着轻微起伏
            roughnessFactor = clamp(roughnessFactor + (0.5 - grPatchMid) * 0.1, 0.35, 1.0);
            float dirtR = texture2D(uDirtRoughnessMap, vMapUv * 0.5).g;
            roughnessFactor = mix(roughnessFactor, dirtR, grDirtMask * 0.58);
            // 池岸略湿、粗糙度稍降；路径肩带略干、粗糙略升
            vec2 pondEllR = (vGroundWorld.xz - vec2(${POND_X.toFixed(2)}, ${POND_Z.toFixed(2)}))
              / vec2(${POND_WATER_RX.toFixed(2)}, ${POND_WATER_RZ.toFixed(2)});
            float pondWetR = 1.0 - smoothstep(0.9, 1.4, length(pondEllR));
            roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.78, pondWetR * 0.5);
            roughnessFactor = clamp(
              roughnessFactor + grDirtMask * 0.06 * (1.0 - pondWetR),
              0.3,
              1.0
            );
          }`,
        );
    };

    mat.customProgramCacheKey = () => `grass-ground-v12-${macroScale.toFixed(3)}`;

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
