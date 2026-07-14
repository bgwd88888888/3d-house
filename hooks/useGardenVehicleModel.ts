"use client";

/**
 * Quaternius 皮卡：保留贴图，车身加清漆、轮子偏橡胶、灯略发光。
 */
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export const GARDEN_VEHICLE_MODELS = {
  pickup: "/models/quaternius-vehicles/pickup.glb",
} as const;

function enhanceVehicleMaterial(
  source: THREE.Material,
  meshName: string,
): THREE.Material {
  const name = `${source.name} ${meshName}`.toLowerCase();

  if (name.includes("headlight")) {
    const mat = new THREE.MeshStandardMaterial({
      color: source instanceof THREE.MeshStandardMaterial ? source.color : "#ffe9a8",
      emissive: new THREE.Color("#fff2c4"),
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.2,
      envMapIntensity: 0.6,
    });
    return mat;
  }

  if (name.includes("brakelight")) {
    return new THREE.MeshStandardMaterial({
      color: "#8a1c1c",
      emissive: new THREE.Color("#5a0808"),
      emissiveIntensity: 0.2,
      roughness: 0.4,
      metalness: 0.15,
      envMapIntensity: 0.4,
    });
  }

  if (!(source instanceof THREE.MeshStandardMaterial)) return source.clone();

  const isWheel = meshName.toLowerCase().includes("wheel");
  if (isWheel) {
    const wheel = source.clone();
    wheel.map = source.map;
    if (wheel.map) {
      wheel.map.colorSpace = THREE.SRGBColorSpace;
      wheel.map.needsUpdate = true;
    }
    wheel.color.multiplyScalar(0.72);
    wheel.metalness = 0.12;
    wheel.roughness = 0.9;
    wheel.envMapIntensity = 0.22;
    return wheel;
  }

  // 车身：清漆感
  const body = new THREE.MeshPhysicalMaterial({
    map: source.map,
    color: source.color.clone().multiplyScalar(0.9),
    metalness: 0.42,
    roughness: 0.32,
    clearcoat: 0.7,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.9,
    side: THREE.FrontSide,
  });
  if (body.map) {
    body.map.colorSpace = THREE.SRGBColorSpace;
    body.map.needsUpdate = true;
  }
  return body;
}

function disposeVehicleMaterials(root: THREE.Group): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) material.dispose();
  });
}

export function useGardenVehicleModel(modelUrl: string): THREE.Group {
  const { scene } = useGLTF(modelUrl);

  const vehicle = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const sources = Array.isArray(object.material)
        ? object.material
        : [object.material];
      object.material =
        sources.length === 1
          ? enhanceVehicleMaterial(sources[0], object.name)
          : sources.map((m) => enhanceVehicleMaterial(m, object.name));
      object.castShadow = true;
      object.receiveShadow = true;
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    return () => disposeVehicleMaterials(vehicle);
  }, [vehicle]);

  return vehicle;
}

useGLTF.preload(GARDEN_VEHICLE_MODELS.pickup);
