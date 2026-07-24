"use client";

/**
 * 写实池水材质：drei MeshReflectorMaterial 做真实场景反射（树木/天空/驳岸），
 * 叠加动态法线 + distortion 制造涟漪扰动与镜面高光，避免纯色平面的"贴纸感"。
 * GardenPond（西式小院）与 CourtyardKoiPond（合院锦鲤池）共用同一实现，
 * 各自通过 props 调出不同水色与反射强度。
 */
import { MeshReflectorMaterial, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";

export type PondWaterSurfaceProps = {
  /** 水面椭圆半径（世界单位），对应 circleGeometry 缩放 */
  rx: number;
  rz: number;
  position?: [number, number, number];
  /** 与驳岸走向对齐的水平微倾角，沿用既有池塘的 0.08~0.1 弧度习惯 */
  tilt?: number;
  color?: string;
  mirror?: number;
  mixStrength?: number;
  mixBlur?: number;
  /** 反射对比：>1 拉高天/树倒影可读性，近景更不像实色贴纸 */
  mixContrast?: number;
  /** 反射模糊核 [x, y]，偏低更通透锐利 */
  blur?: [number, number];
  roughness?: number;
  metalness?: number;
  resolution?: number;
  normalRepeat?: number;
  normalScale?: number;
  /** 反射畸变强度：涟漪扰动镜面，避免死板贴纸 */
  distortion?: number;
  depthScale?: number;
  /** 略抬反射平面，减轻近景与驳岸 z-fight、倒影更稳 */
  reflectorOffset?: number;
  flowSpeed?: [number, number];
  /**
   * 略透明让池底/近岸泥色透出，营造通透感。
   * 过高会冲淡反射；西式小院近景约 0.82~0.9。
   */
  opacity?: number;
};

const NORMALS_URL = "/textures/waternormals.jpg";

export function PondWaterSurface({
  rx,
  rz,
  position = [0.05, -0.015, -0.05],
  tilt = 0.1,
  color = "#28545a",
  mirror = 0.48,
  mixStrength = 2.8,
  mixBlur = 0.85,
  mixContrast = 1.35,
  blur = [160, 48],
  roughness = 0.28,
  metalness = 0.32,
  resolution = 768,
  normalRepeat = 2.2,
  normalScale = 0.45,
  distortion = 0.12,
  depthScale = 0.55,
  reflectorOffset = 0.04,
  flowSpeed = [0.026, 0.016],
  opacity = 1,
}: PondWaterSurfaceProps) {
  const waterNormals = useTexture(NORMALS_URL);
  const normalScaleVec = useMemo(
    () => new THREE.Vector2(normalScale, normalScale),
    [normalScale],
  );
  const translucent = opacity < 0.999;

  useLayoutEffect(() => {
    waterNormals.wrapS = THREE.RepeatWrapping;
    waterNormals.wrapT = THREE.RepeatWrapping;
    waterNormals.repeat.set(normalRepeat, normalRepeat);
    waterNormals.anisotropy = 8;
    waterNormals.generateMipmaps = true;
    waterNormals.minFilter = THREE.LinearMipmapLinearFilter;
    waterNormals.magFilter = THREE.LinearFilter;
    waterNormals.needsUpdate = true;
  }, [waterNormals, normalRepeat]);

  useFrame((_, delta) => {
    // 微速错位滚动，近看是细碎涟漪而非整块平移贴纸
    waterNormals.offset.x += delta * flowSpeed[0];
    waterNormals.offset.y += delta * flowSpeed[1];
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, tilt, 0]}
      position={position}
      scale={[rx, rz, 1]}
      receiveShadow
    >
      <circleGeometry args={[1, 96]} />
      <MeshReflectorMaterial
        color={color}
        metalness={metalness}
        roughness={roughness}
        blur={blur}
        mixBlur={mixBlur}
        mixStrength={mixStrength}
        mixContrast={mixContrast}
        mirror={mirror}
        resolution={resolution}
        depthScale={depthScale}
        reflectorOffset={reflectorOffset}
        // 近岸深度阈值偏低，透出驳岸泥色；远处仍保留深度雾感
        minDepthThreshold={0.12}
        maxDepthThreshold={1.05}
        depthToBlurRatioBias={0.14}
        distortion={distortion}
        distortionMap={waterNormals}
        normalMap={waterNormals}
        normalScale={normalScaleVec}
        transparent={translucent}
        opacity={opacity}
        depthWrite={!translucent}
      />
    </mesh>
  );
}
