"use client";

/**
 * 右墙（山墙、无窗侧）水墨山水墙绘：铺在檐口以下的墙身，无画框。
 */
import { useTexture } from "@react-three/drei";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import type { WebGLProgramParametersWithUniforms } from "three";
import { DEFAULT_HOUSE_SPEC } from "@/lib/geoBuildings";

const MURAL_URL = "/textures/wall-mural/shanshui.png";

/** 上沿相对墙顶回缩，多留一段白墙贴近檐口 */
const TOP_CLEARANCE = 0.55;
/** 左右略收，避免与转角墙体 z-fight */
const SIDE_INSET = 0.04;

function applyMuralWallBlend(
  shader: WebGLProgramParametersWithUniforms,
): void {
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <map_fragment>",
    `#include <map_fragment>
    float muralLightness = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
    float muralInkAlpha = 1.0 - smoothstep(0.42, 0.86, muralLightness);
    float muralPaperAlpha = mix(0.28, 1.0, muralInkAlpha);
    float muralTopAlpha = 1.0 - smoothstep(0.76, 1.0, vMapUv.y);
    diffuseColor.a *= muralPaperAlpha * muralTopAlpha;`,
  );
}

export function HouseWallMural() {
  const map = useTexture(MURAL_URL);
  const { width, depth, wallHeight, foundationHeight } = DEFAULT_HOUSE_SPEC;

  useLayoutEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    map.needsUpdate = true;
  }, [map]);

  const artW = depth - SIDE_INSET * 2;
  const artH = foundationHeight + wallHeight - TOP_CLEARANCE;
  // 贴紧右墙外侧；底边落地，顶边位置保持不变
  const x = width / 2 + 0.02;
  const y = artH * 0.5;

  return (
    <mesh
      position={[x, y, 0]}
      rotation={[0, Math.PI / 2, 0]}
      receiveShadow
    >
      <planeGeometry args={[artW, artH]} />
      <meshStandardMaterial
        map={map}
        roughness={0.84}
        metalness={0.02}
        envMapIntensity={0.26}
        color="#ffffff"
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
        onBeforeCompile={applyMuralWallBlend}
        customProgramCacheKey={() => "house-mural-wall-blend-v2"}
      />
    </mesh>
  );
}
