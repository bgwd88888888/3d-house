"use client";

/**
 * 右墙（山墙、无窗侧）水墨山水墙绘：铺在檐口以下的墙身，无画框。
 */
import { useTexture } from "@react-three/drei";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { DEFAULT_HOUSE_SPEC } from "@/lib/geoBuildings";

const MURAL_URL = "/textures/wall-mural/shanshui.png";

/** 上沿相对墙顶回缩，多留一段白墙贴近檐口 */
const TOP_CLEARANCE = 0.55;
/** 左右略收，避免与转角墙体 z-fight */
const SIDE_INSET = 0.04;

export function HouseWallMural() {
  const map = useTexture(MURAL_URL);
  const { width, depth, wallHeight, foundationHeight } = DEFAULT_HOUSE_SPEC;

  useLayoutEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    map.needsUpdate = true;
  }, [map]);

  const artW = depth - SIDE_INSET * 2;
  const artH = wallHeight - TOP_CLEARANCE;
  // 贴紧右墙外侧；底边落在勒脚顶，顶边在墙顶以下
  const x = width / 2 + 0.02;
  const y = foundationHeight + artH * 0.5;

  return (
    <mesh
      position={[x, y, 0]}
      rotation={[0, Math.PI / 2, 0]}
      castShadow
      receiveShadow
    >
      <planeGeometry args={[artW, artH]} />
      <meshStandardMaterial
        map={map}
        roughness={0.84}
        metalness={0.02}
        envMapIntensity={0.26}
        color="#ffffff"
      />
    </mesh>
  );
}
