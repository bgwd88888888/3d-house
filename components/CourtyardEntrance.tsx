"use client";

/**
 * 合院南门点景：门外左右石狮 + 朱红大门。
 * 石狮面朝南门外，落在门墩外侧以免埋进白墙。
 */
import { useGLTF, useTexture } from "@react-three/drei";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { COMPOUND_HALF_Z, GATE_PIER_OUTER_X } from "@/lib/geoCompound";

const COMPLETE_LION_URL = "/models/stone-lion/guardian-lions-pair.glb";

const FOUNDATION_H = 0.35;

useGLTF.preload(COMPLETE_LION_URL);

/** 无 UV 网格：按位置做简易盒投影，否则贴图会整面采样成黑块 */
function ensureBoxUVs(geometry: THREE.BufferGeometry) {
  const pos = geometry.getAttribute("position");
  if (!pos) return;
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  if (!bbox) return;
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const sx = Math.max(size.x, 1e-4);
  const sy = Math.max(size.y, 1e-4);
  const sz = Math.max(size.z, 1e-4);

  const uvs = new Float32Array(pos.count * 2);
  const normal = geometry.getAttribute("normal");
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    let nx = 0;
    let ny = 1;
    let nz = 0;
    if (normal) {
      nx = Math.abs(normal.getX(i));
      ny = Math.abs(normal.getY(i));
      nz = Math.abs(normal.getZ(i));
    }
    let u = 0;
    let v = 0;
    if (nx >= ny && nx >= nz) {
      u = (y - bbox.min.y) / sy;
      v = (z - bbox.min.z) / sz;
    } else if (nz >= nx && nz >= ny) {
      u = (x - bbox.min.x) / sx;
      v = (y - bbox.min.y) / sy;
    } else {
      u = (x - bbox.min.x) / sx;
      v = (z - bbox.min.z) / sz;
    }
    uvs[i * 2] = u * 2.4;
    uvs[i * 2 + 1] = v * 2.4;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
}

function StoneLionModel({
  url,
  position,
  rotationY,
  scale = 1.15,
}: {
  url: string;
  position: [number, number, number];
  rotationY: number;
  scale?: number | [number, number, number];
}) {
  const { scene } = useGLTF(url);
  const rock = useTexture({
    map: "/textures/rock-023/Rock023_1K-JPG_Color.jpg",
    normalMap: "/textures/rock-023/Rock023_1K-JPG_NormalGL.jpg",
    roughnessMap: "/textures/rock-023/Rock023_1K-JPG_Roughness.jpg",
  });

  const model = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    for (const [key, texture] of Object.entries(rock)) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      texture.colorSpace =
        key === "map" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.needsUpdate = true;
    }

    model.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const geometry = obj.geometry;
      geometry.computeVertexNormals();
      ensureBoxUVs(geometry);

      obj.castShadow = true;
      obj.receiveShadow = true;
      const prev = obj.material;
      obj.material = new THREE.MeshStandardMaterial({
        map: rock.map,
        normalMap: rock.normalMap,
        roughnessMap: rock.roughnessMap,
        color: "#e6e1d6",
        roughness: 0.86,
        metalness: 0.02,
        normalScale: new THREE.Vector2(0.9, 0.9),
        envMapIntensity: 0.35,
        side: THREE.DoubleSide,
      });
      if (prev && !Array.isArray(prev) && prev !== obj.material) {
        prev.dispose?.();
      }
    });
  }, [model, rock]);

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <primitive object={model} />
    </group>
  );
}

function VermilionDoors() {
  const southZ = COMPOUND_HALF_Z - 0.12;
  const doorH = 4.2;
  const leafW = 2.55;
  const y = FOUNDATION_H + doorH * 0.5;

  return (
    <group>
      {([-1, 1] as const).map((sx) => (
        <group key={sx}>
          <mesh
            position={[sx * (leafW * 0.52), y, southZ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[leafW, doorH, 0.16]} />
            <meshStandardMaterial
              color="#8b1e1e"
              roughness={0.72}
              metalness={0.06}
              envMapIntensity={0.28}
            />
          </mesh>
          {Array.from({ length: 5 }, (_, row) =>
            Array.from({ length: 3 }, (_, col) => (
              <mesh
                key={`${row}-${col}`}
                position={[
                  sx * (0.55 + col * 0.55),
                  FOUNDATION_H + 1.1 + row * 0.65,
                  southZ + 0.1,
                ]}
                castShadow
              >
                <boxGeometry args={[0.13, 0.13, 0.07]} />
                <meshStandardMaterial
                  color="#c4a35a"
                  roughness={0.45}
                  metalness={0.35}
                  envMapIntensity={0.4}
                />
              </mesh>
            )),
          )}
        </group>
      ))}
    </group>
  );
}

export function CourtyardEntrance() {
  const leftX = -(GATE_PIER_OUTER_X + 0.85);
  const rightX = GATE_PIER_OUTER_X + 0.85;
  const lionZ = COMPOUND_HALF_Z + 4.4;
  const lionY = 0.02;

  return (
    <group>
      {/* 前后两部分已组合成一只完整石狮，再复制到门口两侧。 */}
      <StoneLionModel
        url={COMPLETE_LION_URL}
        position={[leftX, lionY, lionZ]}
        rotationY={0}
        scale={1.45}
      />
      <StoneLionModel
        url={COMPLETE_LION_URL}
        position={[rightX, lionY, lionZ]}
        rotationY={0}
        scale={1.45}
      />
      <VermilionDoors />
    </group>
  );
}
