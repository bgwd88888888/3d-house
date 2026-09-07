/**
 * 程序化材质风化：通过 onBeforeCompile 注入低频噪声，
 * 为墙体添加污渍/色差，为屋顶打破贴图整齐重复的"贴片感"，
 * 并为木作门窗略提木纹对比与局部暗化。
 *
 * 噪声基于已有 UV；墙体另用局部几何位置定位墙脚、窗下和檐下污渍。
 * 不需要额外贴图。
 */
import { Vector4 } from "three";
import type { WebGLProgramParametersWithUniforms, WebGLRenderer } from "three";
import type { HouseSpec } from "@/lib/geoBuildings";

const NOISE_GLSL = `
float wxHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float wxNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = wxHash(i);
  float b = wxHash(i + vec2(1.0, 0.0));
  float c = wxHash(i + vec2(0.0, 1.0));
  float d = wxHash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float wxFbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * wxNoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}
`;

/**
 * 墙体风化：主体保留轻微灰泥色差，明显污渍只落在墙脚、真实窗位下方和檐下。
 * 位置遮罩使用模型坐标，避免窗洞侧壁的 UV 投影改变污渍高度。
 */
export function applyWallWeathering(
  shader: WebGLProgramParametersWithUniforms,
  _renderer: WebGLRenderer,
  spec: HouseSpec,
): void {
  const windowFaces: [number, readonly number[]][] = [
    [0, spec.windows.front],
    [-1, spec.windows.left],
    [1, spec.windows.right],
  ];
  const windowBounds = windowFaces.flatMap(([face, centers]) =>
    centers.map((center) => new Vector4(
      center - spec.windows.width * 0.5,
      center + spec.windows.width * 0.5,
      spec.windows.sillHeight,
      face,
    )),
  );
  shader.uniforms.wxHouseShape = {
    value: new Vector4(spec.width * 0.5, spec.wallHeight, spec.depth * 0.5, spec.roofHeight),
  };
  // 无窗配置仍保留合法的 uniform 数组长度；下面的静态循环次数为 0。
  shader.uniforms.wxWindowBounds = { value: windowBounds.length ? windowBounds : [new Vector4()] };
  shader.vertexShader = shader.vertexShader
    .replace(
      "#include <common>",
      `#include <common>
      varying vec3 vWxWallPosition;
      varying vec3 vWxWallNormal;
      `,
    )
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vWxWallPosition = transformed;
      vWxWallNormal = normal;
      `,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      ${NOISE_GLSL}
      varying vec3 vWxWallPosition;
      varying vec3 vWxWallNormal;
      uniform vec4 wxHouseShape;
      uniform vec4 wxWindowBounds[${Math.max(1, windowBounds.length)}];
      float wxWallFacade(float face) {
        if (face == 0.0) {
          return step(0.9, vWxWallNormal.z)
            * smoothstep(wxHouseShape.z - 0.04, wxHouseShape.z, vWxWallPosition.z);
        }
        return step(0.9, vWxWallNormal.x * face)
          * smoothstep(wxHouseShape.x - 0.04, wxHouseShape.x, vWxWallPosition.x * face);
      }
      float wxWallEave() {
        float frontBack = step(0.9, abs(vWxWallNormal.z))
          * smoothstep(wxHouseShape.z - 0.04, wxHouseShape.z, abs(vWxWallPosition.z));
        float gable = max(wxWallFacade(-1.0), wxWallFacade(1.0));
        float gableTop = wxHouseShape.y + wxHouseShape.w
          * (1.0 - abs(vWxWallPosition.z) / wxHouseShape.z);
        float wallTop = mix(wxHouseShape.y, gableTop, gable);
        float belowEave = wallTop - vWxWallPosition.y;
        return max(frontBack, gable) * smoothstep(0.0, 0.08, belowEave)
          * (1.0 - smoothstep(0.2, 0.65, belowEave));
      }
      float wxWallWeather(vec2 uv) {
        float damp = 1.0 - smoothstep(0.12, 0.9, vWxWallPosition.y);
        float grime = damp * (0.12 + 0.18 * wxFbm(uv * vec2(0.7, 1.1) + 3.0));
        float eaveDust = wxWallEave() * (0.05 + 0.07 * wxNoise(uv * vec2(3.6, 0.8) + 9.0));
        return clamp(grime + eaveDust, 0.0, 0.34);
      }
      float wxWallMottle(vec2 uv) {
        return wxFbm(uv * 1.05 + 5.0) * 0.46
          + wxNoise(uv * 3.4 + 31.0) * 0.34
          + wxNoise(uv * 9.5 + 71.0) * 0.2;
      }
      float wxWallMicro(vec2 uv) {
        return wxNoise(uv * 22.0 + 41.0) * 0.65
          + wxNoise(uv * 48.0 + 83.0) * 0.35;
      }
      float wxWallAlgae(vec2 uv) {
        float damp = 1.0 - smoothstep(0.05, 0.42, vWxWallPosition.y);
        // 不可用标识符 patch：WebGL2/GLSL3 保留字，会导致墙材质 shader 编译失败而不绘制
        float algaePatch = smoothstep(0.38, 0.82, wxFbm(uv * vec2(0.75, 1.25) + 63.0));
        float edge = smoothstep(0.55, 0.9, wxNoise(uv * 3.2 + 101.0));
        return damp * (algaePatch * 0.1 + edge * 0.035);
      }
      float wxWallLeak(vec2 uv) {
        float leak = 0.0;
        for (int i = 0; i < ${windowBounds.length}; i++) {
          vec4 bounds = wxWindowBounds[i];
          float facade = wxWallFacade(bounds.w);
          float across = bounds.w == 0.0 ? vWxWallPosition.x : vWxWallPosition.z;
          float underSill = bounds.z - vWxWallPosition.y;
          float windowWidth = smoothstep(bounds.x - 0.08, bounds.x + 0.14, across)
            * (1.0 - smoothstep(bounds.y - 0.14, bounds.y + 0.08, across));
          float trail = smoothstep(0.0, 0.06, underSill)
            * (1.0 - smoothstep(0.2, 0.95, underSill));
          leak = max(leak, facade * windowWidth * trail);
        }
        return leak * (0.05 + 0.11 * pow(wxNoise(uv * vec2(12.0, 1.1) + 44.0), 2.0));
      }
      `,
    )
    .replace(
      "#include <map_fragment>",
      `#ifdef USE_MAP
        vec4 wxSampledDiffuse = texture2D( map, vMapUv );
        diffuseColor *= wxSampledDiffuse;
      #endif
      {
        float wxWeather = wxWallWeather(vMapUv);
        float wxMottle = wxWallMottle(vMapUv);
        float wxMicro = wxWallMicro(vMapUv);
        float wxAlgae = wxWallAlgae(vMapUv);
        float wxLeak = wxWallLeak(vMapUv);
        // 主墙面保留轻微暖色差与颗粒，不再叠加大面积深色斑块。
        diffuseColor.rgb *= mix(vec3(0.95, 0.93, 0.9), vec3(1.04, 1.02, 0.99), wxMottle);
        diffuseColor.rgb *= mix(0.98, 1.02, wxMicro);
        // 污渍偏褐灰，近地面更脏
        vec3 wxDirt = diffuseColor.rgb * vec3(0.68, 0.62, 0.52);
        diffuseColor.rgb = mix(diffuseColor.rgb, wxDirt, wxWeather);
        // 水渍更深褐
        vec3 wxLeakCol = diffuseColor.rgb * vec3(0.64, 0.6, 0.52);
        diffuseColor.rgb = mix(diffuseColor.rgb, wxLeakCol, wxLeak);
        // 墙脚青苔/藻类色偏
        vec3 wxMoss = diffuseColor.rgb * vec3(0.72, 0.8, 0.64);
        diffuseColor.rgb = mix(diffuseColor.rgb, wxMoss, wxAlgae);
      }
      `,
    )
    .replace(
      "#include <roughnessmap_fragment>",
      `float roughnessFactor = roughness;
      #ifdef USE_ROUGHNESSMAP
        vec4 wxTexelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
        roughnessFactor *= wxTexelRoughness.g;
      #endif
      {
        float wxWeatherR = wxWallWeather(vRoughnessMapUv);
        float wxMicroR = wxWallMicro(vRoughnessMapUv);
        float wxMottleR = wxWallMottle(vRoughnessMapUv);
        float wxLeakR = wxWallLeak(vRoughnessMapUv);
        float wxAlgaeR = wxWallAlgae(vRoughnessMapUv);
        roughnessFactor = clamp(
          roughnessFactor
            + wxWeatherR * 0.18
            + wxLeakR * 0.08
            + wxAlgaeR * 0.06
            + wxMicroR * 0.04
            + (1.0 - wxMottleR) * 0.03,
          0.0,
          1.0
        );
      }
      `,
    );
}

/**
 * 陶土筒瓦轻度风化：减弱贴图的重复明暗，保留细微陶土色差与几何瓦垄。
 */
export function applyRoofTilingBreaker(
  shader: WebGLProgramParametersWithUniforms,
  _renderer: WebGLRenderer,
): void {
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      ${NOISE_GLSL}
      vec2 wxRoofJitter(vec2 uv) {
        return uv;
      }
      float wxRoofTint(vec2 uv) {
        return wxFbm(uv * 0.28 + 4.2);
      }
      float wxRoofShade(vec2 uv) {
        return wxNoise(uv * 1.1 + 12.0);
      }
      float wxRoofTileVar(vec2 uv) {
        return wxFbm(uv * 0.55 + 41.0);
      }
      `,
    )
    .replace(
      "#include <map_fragment>",
      `#ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D( map, wxRoofJitter(vMapUv) );
        // 向原贴图的线性 RGB 均值收敛，减轻深色条纹，同时保留几何产生的阴影。
        sampledDiffuseColor.rgb = mix(vec3(0.126, 0.042, 0.018), sampledDiffuseColor.rgb, 0.82);
        float wxTint = wxRoofTint(vMapUv);
        float wxShade = wxRoofShade(vMapUv);
        float wxTile = wxRoofTileVar(vMapUv);
        sampledDiffuseColor.rgb *= mix(0.96, 1.04, wxTint);
        sampledDiffuseColor.rgb *= mix(0.97, 1.03, wxShade);
        sampledDiffuseColor.rgb *= mix(vec3(0.98, 0.95, 0.92), vec3(1.04, 1.02, 0.99), wxTile);
        diffuseColor *= sampledDiffuseColor;
      #endif
      `,
    )
    .replace(
      "#include <normal_fragment_maps>",
      `#ifdef USE_NORMALMAP_OBJECTSPACE
        normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
        #ifdef FLIP_SIDED
          normal = - normal;
        #endif
        #ifdef DOUBLE_SIDED
          normal = normal * faceDirection;
        #endif
        normal = normalize( normalMatrix * normal );
      #elif defined( USE_NORMALMAP_TANGENTSPACE )
        vec3 mapN = texture2D( normalMap, wxRoofJitter(vNormalMapUv) ).xyz * 2.0 - 1.0;
        mapN.xy *= normalScale;
        normal = normalize( tbn * mapN );
      #elif defined( USE_BUMPMAP )
        normal = perturbNormalArb( -vViewPosition, normal, dHdxy_fwd(), faceDirection );
      #endif
      `,
    )
    .replace(
      "#include <roughnessmap_fragment>",
      `float roughnessFactor = roughness;
      #ifdef USE_ROUGHNESSMAP
        roughnessFactor *= texture2D( roughnessMap, wxRoofJitter(vRoughnessMapUv) ).g;
      #endif
      roughnessFactor = clamp(
        roughnessFactor
          + wxFbm(vRoughnessMapUv * 0.42 + 21.0) * 0.08
          + wxRoofTileVar(vRoughnessMapUv) * 0.04,
        0.0,
        1.0
      );
      `,
    );
}

/**
 * 木作微调：略提木纹对比、局部暗化与粗糙变化，让门窗看起来更像旧原木而非平整贴图。
 */
export function applyWoodEnrichment(
  shader: WebGLProgramParametersWithUniforms,
  _renderer: WebGLRenderer,
): void {
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      ${NOISE_GLSL}
      `,
    )
    .replace(
      "#include <map_fragment>",
      `#ifdef USE_MAP
        vec4 wxWoodSample = texture2D( map, vMapUv );
        // 轻微提对比，突出年轮/木纹
        wxWoodSample.rgb = clamp((wxWoodSample.rgb - 0.5) * 1.18 + 0.5, 0.0, 1.0);
        float wxWoodShade = wxFbm(vMapUv * 1.6 + 9.0);
        float wxWoodEdge = wxNoise(vMapUv * 6.5 + 27.0);
        wxWoodSample.rgb *= mix(0.86, 1.08, wxWoodShade);
        wxWoodSample.rgb *= mix(0.94, 1.04, wxWoodEdge);
        // 偏暖褐，贴近西式院落木门窗
        wxWoodSample.rgb *= vec3(1.04, 0.98, 0.92);
        diffuseColor *= wxWoodSample;
      #endif
      `,
    )
    .replace(
      "#include <roughnessmap_fragment>",
      `float roughnessFactor = roughness;
      #ifdef USE_ROUGHNESSMAP
        vec4 wxTexelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
        roughnessFactor *= wxTexelRoughness.g;
      #endif
      roughnessFactor = clamp(
        roughnessFactor
          + wxFbm(vRoughnessMapUv * 2.2 + 15.0) * 0.1
          + wxNoise(vRoughnessMapUv * 8.0 + 33.0) * 0.06,
        0.0,
        1.0
      );
      `,
    );
}
