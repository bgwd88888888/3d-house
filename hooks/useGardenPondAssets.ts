"use client";

/**
 * AssetQuest Free Lowpoly Pond Kit（CC0）：FBX 网格。
 * 盆体用套件调色板；石块用 ambientCG 岩石 PBR；植物用套件图集。
 */
import { useTexture } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { FBXLoader } from "three-stdlib";

export const POND_ASSET_URLS = {
  basin: "/models/assetquest-pond/meshes/Pond_2.fbx",
  rock1: "/models/assetquest-pond/meshes/Rock_1a.fbx",
  rock2: "/models/assetquest-pond/meshes/Rock_2a.fbx",
  rock3: "/models/assetquest-pond/meshes/Rock_3a.fbx",
  pebble1: "/models/assetquest-pond/meshes/Pebble_1a_Moss.fbx",
  pebble2: "/models/assetquest-pond/meshes/Pebble_2a_Moss.fbx",
  lilyLeaf1: "/models/assetquest-pond/meshes/Water_Lily_Leaf_1.fbx",
  lilyLeaf2: "/models/assetquest-pond/meshes/Water_Lily_Leaf_2.fbx",
  lilyLeaf3: "/models/assetquest-pond/meshes/Water_Lily_Leaf_3.fbx",
  lilyBlossom: "/models/assetquest-pond/meshes/Water_Lily_Blossom_1.fbx",
  catTail1: "/models/assetquest-pond/meshes/CatTail_1.fbx",
  catTail2: "/models/assetquest-pond/meshes/CatTail_2.fbx",
  mint: "/models/assetquest-pond/meshes/Water_Mint_1.fbx",
} as const;

const PROP_MAP = "/models/assetquest-pond/textures/Pond_Props_BaseColor.png";
const PLANT_MAP = "/models/assetquest-pond/textures/Pond_Plants_Atlas.png";

const ROCK_URLS = {
  map: "/textures/rock-023/Rock023_1K-JPG_Color.jpg",
  normalMap: "/textures/rock-023/Rock023_1K-JPG_NormalGL.jpg",
  roughnessMap: "/textures/rock-023/Rock023_1K-JPG_Roughness.jpg",
};

function rewritePondTextureUrl(url: string): string {
  const normalized = url.replace(/\\/g, "/").toLowerCase();
  if (normalized.includes("pond_plants_atlas")) return PLANT_MAP;
  if (normalized.includes("basecolor")) return PROP_MAP;
  return url;
}

function configureFbxLoader(loader: FBXLoader): void {
  loader.manager.setURLModifier(rewritePondTextureUrl);
}

function usePondFbx(url: string): THREE.Group {
  return useLoader(FBXLoader, url, configureFbxLoader);
}

function disposeObjectMaterials(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) material.dispose();
  });
}

function applyMaterial(
  root: THREE.Object3D,
  material: THREE.Material,
): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.material = material;
    object.castShadow = true;
    object.receiveShadow = true;
  });
}

function normalizeToWidth(root: THREE.Object3D, targetWidth: number): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.z);
  if (span < 1e-5) return;
  root.scale.multiplyScalar(targetWidth / span);
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
}

function clonePrepared(
  source: THREE.Group,
  baseMaterial: THREE.Material,
  targetWidth: number,
): THREE.Group {
  const clone = source.clone(true);
  applyMaterial(clone, baseMaterial.clone());
  normalizeToWidth(clone, targetWidth);
  return clone;
}

export type GardenPondAssets = {
  basin: THREE.Group;
  rocks: THREE.Group[];
  pebbles: THREE.Group[];
  lilyLeaves: THREE.Group[];
  lilyBlossom: THREE.Group;
  catTails: THREE.Group[];
  mint: THREE.Group;
};

export function useGardenPondAssets(): GardenPondAssets {
  const basinSrc = usePondFbx(POND_ASSET_URLS.basin);
  const rock1Src = usePondFbx(POND_ASSET_URLS.rock1);
  const rock2Src = usePondFbx(POND_ASSET_URLS.rock2);
  const rock3Src = usePondFbx(POND_ASSET_URLS.rock3);
  const pebble1Src = usePondFbx(POND_ASSET_URLS.pebble1);
  const pebble2Src = usePondFbx(POND_ASSET_URLS.pebble2);
  const lily1Src = usePondFbx(POND_ASSET_URLS.lilyLeaf1);
  const lily2Src = usePondFbx(POND_ASSET_URLS.lilyLeaf2);
  const lily3Src = usePondFbx(POND_ASSET_URLS.lilyLeaf3);
  const blossomSrc = usePondFbx(POND_ASSET_URLS.lilyBlossom);
  const cat1Src = usePondFbx(POND_ASSET_URLS.catTail1);
  const cat2Src = usePondFbx(POND_ASSET_URLS.catTail2);
  const mintSrc = usePondFbx(POND_ASSET_URLS.mint);

  const { propMap, plantMap } = useTexture({
    propMap: PROP_MAP,
    plantMap: PLANT_MAP,
  });
  const rockMaps = useTexture(ROCK_URLS);

  useLayoutEffect(() => {
    // 套件 UV 按 DCC 习惯，关闭 flipY
    propMap.colorSpace = THREE.SRGBColorSpace;
    propMap.flipY = false;
    propMap.needsUpdate = true;
    plantMap.colorSpace = THREE.SRGBColorSpace;
    plantMap.flipY = false;
    plantMap.needsUpdate = true;

    for (const [key, texture] of Object.entries(rockMaps)) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1.4, 1.4);
      texture.colorSpace =
        key === "map" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.needsUpdate = true;
    }
  }, [plantMap, propMap, rockMaps]);

  const basinMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: propMap,
        roughness: 0.94,
        metalness: 0.03,
        envMapIntensity: 0.18,
      }),
    [propMap],
  );

  const rockMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: rockMaps.map,
        normalMap: rockMaps.normalMap,
        roughnessMap: rockMaps.roughnessMap,
        normalScale: new THREE.Vector2(0.9, 0.9),
        roughness: 1,
        metalness: 0.04,
        envMapIntensity: 0.2,
        color: "#c8c2b8",
      }),
    [rockMaps],
  );

  const plantMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: plantMap,
        roughness: 0.86,
        metalness: 0,
        envMapIntensity: 0.22,
        alphaTest: 0.4,
        side: THREE.DoubleSide,
        depthWrite: true,
      }),
    [plantMap],
  );

  const assets = useMemo(() => {
    return {
      basin: clonePrepared(basinSrc, basinMaterial, 5.4),
      rocks: [
        clonePrepared(rock1Src, rockMaterial, 1.05),
        clonePrepared(rock2Src, rockMaterial, 0.85),
        clonePrepared(rock3Src, rockMaterial, 1.2),
      ],
      pebbles: [
        clonePrepared(pebble1Src, rockMaterial, 0.48),
        clonePrepared(pebble2Src, rockMaterial, 0.42),
      ],
      lilyLeaves: [
        clonePrepared(lily1Src, plantMaterial, 0.95),
        clonePrepared(lily2Src, plantMaterial, 0.8),
        clonePrepared(lily3Src, plantMaterial, 0.88),
      ],
      lilyBlossom: clonePrepared(blossomSrc, plantMaterial, 0.5),
      catTails: [
        clonePrepared(cat1Src, plantMaterial, 0.85),
        clonePrepared(cat2Src, plantMaterial, 0.75),
      ],
      mint: clonePrepared(mintSrc, plantMaterial, 0.6),
    };
  }, [
    basinMaterial,
    basinSrc,
    blossomSrc,
    cat1Src,
    cat2Src,
    lily1Src,
    lily2Src,
    lily3Src,
    mintSrc,
    pebble1Src,
    pebble2Src,
    plantMaterial,
    rock1Src,
    rock2Src,
    rock3Src,
    rockMaterial,
  ]);

  useEffect(() => {
    return () => {
      disposeObjectMaterials(assets.basin);
      for (const rock of assets.rocks) disposeObjectMaterials(rock);
      for (const pebble of assets.pebbles) disposeObjectMaterials(pebble);
      for (const leaf of assets.lilyLeaves) disposeObjectMaterials(leaf);
      disposeObjectMaterials(assets.lilyBlossom);
      for (const cat of assets.catTails) disposeObjectMaterials(cat);
      disposeObjectMaterials(assets.mint);
    };
  }, [assets]);

  useEffect(() => {
    return () => {
      basinMaterial.dispose();
      rockMaterial.dispose();
      plantMaterial.dispose();
    };
  }, [basinMaterial, plantMaterial, rockMaterial]);

  return assets;
}

for (const url of Object.values(POND_ASSET_URLS)) {
  useLoader.preload(FBXLoader, url, configureFbxLoader);
}
