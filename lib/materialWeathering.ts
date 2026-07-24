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
 * 屋顶去重复：逐格随机旋转/翻转/偏移 + 多组非整数缩放采样混合，
 * 并同步打散 normal / roughness，打断瓦片贴图拉伸与整齐重复。
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
      // 与 ROOF_TEXTURE_TILE≈1.7 配套：更密格子，逐格打散
      const float WX_ROOF_CELLS = 3.4;
      vec2 wxRoofRot90(vec2 p, float k) {
        float m = floor(mod(k * 4.0, 4.0));
        if (m < 1.0) return p;
        if (m < 2.0) return vec2(-p.y, p.x);
        if (m < 3.0) return -p;
        return vec2(p.y, -p.x);
      }
      vec2 wxRoofBomb(vec2 uv) {
        float cells = WX_ROOF_CELLS;
        vec2 cell = floor(uv * cells);
        vec2 f = fract(uv * cells);
        float h = wxHash(cell + 3.1);
        float h2 = wxHash(cell + 17.7);
        float h3 = wxHash(cell + 29.3);
        // 大偏移 + 90° 旋转/翻转，打断拉伸对齐
        vec2 local = f - 0.5;
        local.x *= mix(1.0, -1.0, step(0.5, h3));
        local = wxRoofRot90(local, h2);
        vec2 offset = vec2(h, h2) * 1.35 + vec2(h3, wxHash(cell + 51.0)) * 0.55;
        float edge = smoothstep(0.0, 0.18, min(min(f.x, f.y), min(1.0 - f.x, 1.0 - f.y)));
        vec2 warped = (local + 0.5) / cells + cell / cells + mix(vec2(0.0), offset, edge);
        // 次级格子再抖一次，避免大块仍显重复
        float cells2 = cells * 1.65;
        vec2 cellB = floor(uv * cells2);
        float hb = wxHash(cellB + 77.0);
        warped += (vec2(hb, wxHash(cellB + 91.0)) - 0.5) * 0.22 * edge;
        return warped;
      }
      vec2 wxRoofUvB(vec2 uv) {
        vec2 p = uv * 1.91 + vec2(13.7, 7.1);
        return vec2(p.x * 0.97 - p.y * 0.18, p.x * 0.18 + p.y * 0.97);
      }
      vec2 wxRoofUvC(vec2 uv) {
        vec2 p = uv * 2.63;
        return vec2(p.x * 0.88 - p.y * 0.34, p.x * 0.34 + p.y * 0.88) + vec2(4.3, 19.6);
      }
      vec2 wxRoofUvD(vec2 uv) {
        // 接近正交的慢速错位层，压低长向拉伸感
        return uv * vec2(0.73, 1.27) + vec2(27.1, 5.4)
          + wxFbm(uv * 0.35 + 6.0) * 0.15;
      }
      float wxRoofBlendMask(vec2 uv) {
        return smoothstep(0.18, 0.82, wxFbm(uv * 0.32 + 2.0));
      }
      float wxRoofBlendMask2(vec2 uv) {
        return smoothstep(0.22, 0.86, wxNoise(uv * 0.48 + 8.5));
      }
      float wxRoofBlendMask3(vec2 uv) {
        return smoothstep(0.28, 0.8, wxFbm(uv * 0.19 + 15.0)) * 0.7
          + smoothstep(0.4, 0.9, wxNoise(uv * 0.9 + 33.0)) * 0.3;
      }
      float wxRoofTileVar(vec2 uv) {
        return wxHash(floor(uv * WX_ROOF_CELLS) + 41.0);
      }
      float wxRoofTileVar2(vec2 uv) {
        return wxHash(floor(uv * WX_ROOF_CELLS * 1.65) + 63.0);
      }
      `,
    )
    .replace(
      "#include <map_fragment>",
      `#ifdef USE_MAP
        vec2 wxUvA = wxRoofBomb(vMapUv);
        vec4 wxRoofA = texture2D( map, wxUvA );
        vec4 wxRoofB = texture2D( map, wxRoofUvB(wxUvA) );
        vec4 wxRoofC = texture2D( map, wxRoofUvC(vMapUv) );
        vec4 wxRoofD = texture2D( map, wxRoofUvD(wxUvA) );
        float wxBlend = wxRoofBlendMask(vMapUv) * 0.9;
        float wxBlend2 = wxRoofBlendMask2(vMapUv) * 0.68;
        float wxBlend3 = wxRoofBlendMask3(vMapUv) * 0.48;
        vec4 sampledDiffuseColor = mix(wxRoofA, wxRoofB, wxBlend);
        sampledDiffuseColor = mix(sampledDiffuseColor, wxRoofC, wxBlend2);
        sampledDiffuseColor = mix(sampledDiffuseColor, wxRoofD, wxBlend3);
        float wxRoofTint = wxFbm(vMapUv * 0.42 + 4.2);
        float wxRoofShade = wxNoise(vMapUv * 1.35 + 12.0);
        float wxRoofMacro = wxFbm(vMapUv * 0.18 + 55.0);
        float wxTile = wxRoofTileVar(vMapUv);
        float wxTile2 = wxRoofTileVar2(vMapUv);
        sampledDiffuseColor.rgb *= mix(0.66, 1.22, wxRoofTint);
        sampledDiffuseColor.rgb *= mix(0.82, 1.12, wxRoofShade);
        sampledDiffuseColor.rgb *= mix(0.88, 1.1, wxRoofMacro);
        // 逐瓦冷暖/明暗，进一步打散重复与拉伸感
        sampledDiffuseColor.rgb *= mix(vec3(0.8, 0.76, 0.72), vec3(1.16, 1.06, 0.94), wxTile);
        sampledDiffuseColor.rgb *= mix(vec3(0.9, 0.88, 0.86), vec3(1.08, 1.02, 0.96), wxTile2);
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
        vec2 wxNUv = wxRoofBomb(vNormalMapUv);
        vec3 wxNormA = texture2D( normalMap, wxNUv ).xyz * 2.0 - 1.0;
        vec3 wxNormB = texture2D( normalMap, wxRoofUvB(wxNUv) ).xyz * 2.0 - 1.0;
        vec3 wxNormC = texture2D( normalMap, wxRoofUvC(vNormalMapUv) ).xyz * 2.0 - 1.0;
        vec3 wxNormD = texture2D( normalMap, wxRoofUvD(wxNUv) ).xyz * 2.0 - 1.0;
        float wxNBlend = wxRoofBlendMask(vNormalMapUv) * 0.9;
        float wxNBlend2 = wxRoofBlendMask2(vNormalMapUv) * 0.68;
        float wxNBlend3 = wxRoofBlendMask3(vNormalMapUv) * 0.48;
        vec3 mapN = mix(wxNormA, wxNormB, wxNBlend);
        mapN = mix(mapN, wxNormC, wxNBlend2);
        mapN = mix(mapN, wxNormD, wxNBlend3);
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
        vec2 wxRUv = wxRoofBomb(vRoughnessMapUv);
        float wxRoofRoughA = texture2D( roughnessMap, wxRUv ).g;
        float wxRoofRoughB = texture2D( roughnessMap, wxRoofUvB(wxRUv) ).g;
        float wxRoofRoughC = texture2D( roughnessMap, wxRoofUvC(vRoughnessMapUv) ).g;
        float wxRoofRoughD = texture2D( roughnessMap, wxRoofUvD(wxRUv) ).g;
        float wxRoofBlendR = wxRoofBlendMask(vRoughnessMapUv) * 0.9;
        float wxRoofBlendR2 = wxRoofBlendMask2(vRoughnessMapUv) * 0.68;
        float wxRoofBlendR3 = wxRoofBlendMask3(vRoughnessMapUv) * 0.48;
        roughnessFactor = mix(wxRoofRoughA, wxRoofRoughB, wxRoofBlendR);
        roughnessFactor = mix(roughnessFactor, wxRoofRoughC, wxRoofBlendR2);
        roughnessFactor = mix(roughnessFactor, wxRoofRoughD, wxRoofBlendR3);
      #endif
      roughnessFactor = clamp(
        roughnessFactor
          + wxFbm(vRoughnessMapUv * 0.45 + 21.0) * 0.26
          + wxNoise(vRoughnessMapUv * 2.4 + 44.0) * 0.12
          + wxRoofTileVar(vRoughnessMapUv) * 0.08
          + wxRoofTileVar2(vRoughnessMapUv) * 0.05,
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
