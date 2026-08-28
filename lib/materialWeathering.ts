/**
 * 程序化材质风化：通过 onBeforeCompile 注入低频噪声，
 * 为墙体添加污渍/色差，为屋顶打破贴图整齐重复的"贴片感"，
 * 并为木作门窗略提木纹对比与局部暗化。
 *
 * 均基于已有 UV（vMapUv 等于世界单位缩放后的 UV，见 geoBuildings.scaleBoxUvs），
 * 不需要额外贴图或 vWorldPosition。
 */
import type { WebGLProgramParametersWithUniforms, WebGLRenderer } from "three";

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
 * 墙体风化：底部潮湿污渍 + 雨痕 + 大/中/细尺度斑驳色差，
 * 并显著提高污渍处粗糙度，避免灰泥墙均匀过白、发塑料感。
 */
export function applyWallWeathering(
  shader: WebGLProgramParametersWithUniforms,
  _renderer: WebGLRenderer,
): void {
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      ${NOISE_GLSL}
      float wxWallWeather(vec2 uv) {
        float damp = smoothstep(0.92, -0.22, uv.y);
        float midDamp = smoothstep(1.35, 0.15, uv.y);
        float grime = damp * (0.42 + 0.58 * wxFbm(uv * vec2(0.42, 0.78) + 3.0));
        float grimeMid = midDamp * smoothstep(0.4, 0.88, wxFbm(uv * 0.7 + 29.0)) * 0.28;
        float blotch = smoothstep(0.28, 0.88, wxFbm(uv * 0.95 + 17.0)) * 0.55;
        float blotch2 = smoothstep(0.48, 0.9, wxNoise(uv * 2.1 + 53.0)) * 0.28;
        float blotch3 = smoothstep(0.62, 0.95, wxNoise(uv * 5.4 + 91.0)) * 0.14;
        float streak = pow(wxNoise(vec2(uv.x * 3.6 + 9.0, uv.y * 0.22)), 1.85)
          * smoothstep(1.2, 0.02, uv.y) * 0.42;
        float streak2 = pow(wxNoise(vec2(uv.x * 6.8 + 21.0, uv.y * 0.48)), 2.6)
          * smoothstep(1.0, 0.12, uv.y) * 0.22;
        float streak3 = pow(wxNoise(vec2(uv.x * 11.0 + 37.0, uv.y * 0.7)), 3.2)
          * smoothstep(0.75, 0.18, uv.y) * 0.12;
        return clamp(
          grime + grimeMid + blotch + blotch2 + blotch3 + streak + streak2 + streak3,
          0.0,
          0.92
        );
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
        float damp = smoothstep(0.72, -0.12, uv.y);
        // 不可用标识符 patch：WebGL2/GLSL3 保留字，会导致墙材质 shader 编译失败而不绘制
        float algaePatch = smoothstep(0.38, 0.82, wxFbm(uv * vec2(0.75, 1.25) + 63.0));
        float edge = smoothstep(0.55, 0.9, wxNoise(uv * 3.2 + 101.0));
        return damp * (algaePatch * 0.34 + edge * 0.12);
      }
      float wxWallLeak(vec2 uv) {
        // 窗下/墙中部水渍暗斑
        float band = smoothstep(0.35, 0.7, uv.y) * smoothstep(1.15, 0.55, uv.y);
        return band * pow(wxNoise(vec2(uv.x * 5.5 + 44.0, uv.y * 0.35)), 2.4) * 0.26;
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
        // 大尺度冷暖色差，打破均匀灰泥白
        diffuseColor.rgb *= mix(vec3(0.74, 0.72, 0.68), vec3(1.14, 1.07, 0.96), wxMottle);
        diffuseColor.rgb *= mix(0.9, 1.08, wxMicro);
        // 污渍偏褐灰，近地面更脏
        vec3 wxDirt = diffuseColor.rgb * vec3(0.38, 0.34, 0.28);
        diffuseColor.rgb = mix(diffuseColor.rgb, wxDirt, wxWeather);
        // 水渍更深褐
        vec3 wxLeakCol = diffuseColor.rgb * vec3(0.42, 0.4, 0.36);
        diffuseColor.rgb = mix(diffuseColor.rgb, wxLeakCol, wxLeak);
        // 墙脚青苔/藻类色偏
        vec3 wxMoss = diffuseColor.rgb * vec3(0.62, 0.78, 0.58);
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
            + wxWeatherR * 0.48
            + wxLeakR * 0.2
            + wxAlgaeR * 0.14
            + wxMicroR * 0.14
            + (1.0 - wxMottleR) * 0.09,
          0.0,
          1.0
        );
      }
      `,
    );
}

/**
 * 陶土筒瓦轻度风化：微小 UV 偏移与冷暖差，保留瓦垄朝向。
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
        float wxTint = wxRoofTint(vMapUv);
        float wxShade = wxRoofShade(vMapUv);
        float wxTile = wxRoofTileVar(vMapUv);
        sampledDiffuseColor.rgb *= mix(0.9, 1.08, wxTint);
        sampledDiffuseColor.rgb *= mix(0.92, 1.06, wxShade);
        sampledDiffuseColor.rgb *= mix(vec3(0.9, 0.86, 0.82), vec3(1.08, 1.02, 0.96), wxTile);
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
