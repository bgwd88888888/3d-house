"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  buildCityGeometryFromGeoJSON,
  estimateSceneBounds,
  type GeoJSONFeatureCollection,
} from "@/lib/geoBuildings";

const GEOJSON_URL = "/data/buildings.geojson";

function FitCamera({ sphere }: { sphere: THREE.Sphere | null }) {
  const { camera, controls } = useThree();
  const done = useRef(false);

  useEffect(() => {
    if (!sphere || done.current) return;
    const orbit = controls as { target?: THREE.Vector3; update?: () => void } | null;
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    orbit?.target?.copy(sphere.center);

    const offset = new THREE.Vector3(1, 0.55, 1).normalize();
    const dist =
      sphere.radius / Math.sin(((camera.fov * Math.PI) / 180) / 2);
    camera.position.copy(sphere.center.clone().add(offset.multiplyScalar(dist * 1.15)));
    camera.near = Math.max(dist / 800, 0.1);
    camera.far = Math.max(dist * 40, 2000);
    camera.updateProjectionMatrix();
    orbit?.update?.();
    done.current = true;
  }, [sphere, camera, controls]);

  return null;
}

export function CityScene() {
  const [data, setData] = useState<GeoJSONFeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(GEOJSON_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: GeoJSONFeatureCollection) => {
        if (!cancelled) setData(json);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { geometry, bounds } = useMemo(() => {
    if (!data) return { geometry: null as THREE.BufferGeometry | null, bounds: null as THREE.Sphere | null };
    const geom = buildCityGeometryFromGeoJSON(data);
    const sphere = estimateSceneBounds(data);
    return { geometry: geom, bounds: sphere };
  }, [data]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  if (error) {
    return (
      <Html center>
        <p className="max-w-xs rounded bg-red-950/90 px-3 py-2 text-sm text-red-100">
          无法加载 GeoJSON：{error}
        </p>
      </Html>
    );
  }

  if (!data || !geometry) {
    return (
      <Html center>
        <p className="rounded bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200">
          正在加载城市数据…
        </p>
      </Html>
    );
  }

  return (
    <>
      <FitCamera sphere={bounds} />
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.55}
          metalness={0.12}
          flatShading
        />
      </mesh>
    </>
  );
}
