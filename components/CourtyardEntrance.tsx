"use client";

/**
 * 合院南门点景：门外左右石狮 + 朱红大门 +「张府」匾额门头。
 * 石狮面朝南门外，落在门墩外侧以免埋进白墙。
 */
import { useGLTF, useTexture } from "@react-three/drei";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import {
  COMPOUND_HALF_Z,
  GATE_FACE_Z,
  GATE_OPENING_W,
  GATE_PIER_OUTER_X,
} from "@/lib/geoCompound";

const COMPLETE_LION_URL = "/models/stone-lion/guardian-lions-pair.glb";

const FOUNDATION_H = 0.35;
const WALL_H = 4.0;
const GATE_H = WALL_H + 3.2;

useGLTF.preload(COMPLETE_LION_URL);

function createZhangFuPlaqueTexture() {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  // 黑漆底
  ctx.fillStyle = "#0b0b0b";
  ctx.fillRect(0, 0, w, h);

  // 金边双线
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 28;
  ctx.strokeRect(36, 36, w - 72, h - 72);
  ctx.lineWidth = 10;
  ctx.strokeRect(72, 72, w - 144, h - 144);

  ctx.fillStyle = "#f0d56a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font =
    'bold 300px "Songti SC", "STSong", "SimSun", "Noto Serif CJK SC", serif';
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  // 二字略分开，更像匾额
  ctx.fillText("张", w * 0.32, h * 0.52);
  ctx.fillText("府", w * 0.68, h * 0.52);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

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
  // 门扇与门框：同一中心 Z、同一厚度 → 同一立面
  const depth = 0.22;
  const z = GATE_FACE_Z;
  const doorH = 4.55;
  const leafW = 2.42;
  const y = FOUNDATION_H + doorH * 0.5;
  const postH = GATE_H * 0.92;
  const postY = FOUNDATION_H + postH * 0.5;
  const postX = GATE_OPENING_W * 0.4;
  const lintelY = FOUNDATION_H + doorH + 0.12;
  const plaqueRailY = FOUNDATION_H + GATE_H - 2.05;
  const panelH = Math.max(plaqueRailY - lintelY - 0.04, 0.3);
  const panelY = lintelY + panelH * 0.5 + 0.02;

  return (
    <group>
      {([-1, 1] as const).map((sx) => (
        <mesh
          key={`post-${sx}`}
          position={[sx * postX, postY, z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.34, postH, depth]} />
          <meshStandardMaterial
            color="#4a3423"
            roughness={0.78}
            metalness={0.05}
            envMapIntensity={0.22}
          />
        </mesh>
      ))}
      <mesh position={[0, lintelY, z]} castShadow receiveShadow>
        <boxGeometry args={[GATE_OPENING_W * 0.82, 0.24, depth]} />
        <meshStandardMaterial
          color="#4a3423"
          roughness={0.78}
          metalness={0.05}
          envMapIntensity={0.22}
        />
      </mesh>
      <mesh position={[0, panelY, z]} castShadow receiveShadow>
        <boxGeometry args={[GATE_OPENING_W * 0.82, panelH, depth]} />
        <meshStandardMaterial
          color="#5a4030"
          roughness={0.8}
          metalness={0.04}
          envMapIntensity={0.2}
        />
      </mesh>
      {([-1, 1] as const).map((sx) => (
        <group key={sx}>
          <mesh
            position={[sx * (leafW * 0.505), y, z]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[leafW, doorH, depth]} />
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
                  sx * (0.55 + col * 0.5),
                  FOUNDATION_H + 1.15 + row * 0.65,
                  z + depth * 0.5 + 0.02,
                ]}
                castShadow
              >
                <boxGeometry args={[0.12, 0.12, 0.06]} />
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

function RedLantern({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.18, 8]} />
        <meshStandardMaterial color="#5c3a22" roughness={0.7} metalness={0.08} />
      </mesh>
      <mesh position={[0, -0.38, 0]} castShadow>
        <sphereGeometry args={[0.32, 14, 12]} />
        <meshStandardMaterial
          color="#c62828"
          emissive="#8b1515"
          emissiveIntensity={0.4}
          roughness={0.55}
          metalness={0.05}
          envMapIntensity={0.35}
        />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <torusGeometry args={[0.22, 0.035, 8, 20]} />
        <meshStandardMaterial
          color="#d4af37"
          roughness={0.4}
          metalness={0.55}
          envMapIntensity={0.5}
        />
      </mesh>
      <mesh position={[0, -0.72, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.015, 0.28, 6]} />
        <meshStandardMaterial color="#b71c1c" roughness={0.7} metalness={0.05} />
      </mesh>
    </group>
  );
}

function GateHeadPlaque() {
  const map = useMemo(() => createZhangFuPlaqueTexture(), []);
  const plaqueY = FOUNDATION_H + GATE_H - 1.55;
  // 与门框同立面略前贴面
  const plaqueZ = GATE_FACE_Z + 0.12;
  const plaqueW = GATE_OPENING_W * 0.72;
  const plaqueH = 1.05;
  const frameT = 0.1;

  useLayoutEffect(() => () => map.dispose(), [map]);

  return (
    <group>
      {/* 匾后挡板，避免透天 */}
      <mesh position={[0, plaqueY, plaqueZ - 0.08]} receiveShadow>
        <boxGeometry args={[plaqueW + 0.55, plaqueH + 0.55, 0.1]} />
        <meshStandardMaterial color="#f3eee4" roughness={0.9} metalness={0.02} />
      </mesh>
      {/* 黑漆匾身 */}
      <mesh position={[0, plaqueY, plaqueZ]} castShadow receiveShadow>
        <boxGeometry args={[plaqueW, plaqueH, 0.1]} />
        <meshStandardMaterial color="#0b0b0b" roughness={0.65} metalness={0.08} />
      </mesh>
      {/* 「张府」正面字（Basic 材质避免光照洗白） */}
      <mesh position={[0, plaqueY, plaqueZ + 0.056]}>
        <planeGeometry args={[plaqueW * 0.94, plaqueH * 0.88]} />
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>
      {/* 金边：四条边框，勿用整块金盒挡住字面 */}
      {(
        [
          [0, plaqueH * 0.5 + frameT * 0.5, plaqueW + frameT * 2, frameT],
          [0, -(plaqueH * 0.5 + frameT * 0.5), plaqueW + frameT * 2, frameT],
          [-(plaqueW * 0.5 + frameT * 0.5), 0, frameT, plaqueH],
          [plaqueW * 0.5 + frameT * 0.5, 0, frameT, plaqueH],
        ] as const
      ).map(([x, y, w, h], i) => (
        <mesh
          key={i}
          position={[x, plaqueY + y, plaqueZ + 0.02]}
          castShadow
        >
          <boxGeometry args={[w, h, 0.12]} />
          <meshStandardMaterial
            color="#c9a227"
            roughness={0.4}
            metalness={0.55}
            envMapIntensity={0.55}
          />
        </mesh>
      ))}
      <RedLantern
        position={[-(plaqueW * 0.68), plaqueY + 0.35, plaqueZ + 0.2]}
      />
      <RedLantern
        position={[plaqueW * 0.68, plaqueY + 0.35, plaqueZ + 0.2]}
      />
    </group>
  );
}

export function CourtyardEntrance() {
  const leftX = -(GATE_PIER_OUTER_X + 0.85);
  const rightX = GATE_PIER_OUTER_X + 0.85;
  const lionZ = COMPOUND_HALF_Z + 4.8;
  const lionY = 0.02;

  return (
    <group>
      <StoneLionModel
        url={COMPLETE_LION_URL}
        position={[leftX, lionY, lionZ]}
        rotationY={0}
        scale={1.55}
      />
      <StoneLionModel
        url={COMPLETE_LION_URL}
        position={[rightX, lionY, lionZ]}
        rotationY={0}
        scale={1.55}
      />
      <VermilionDoors />
      <GateHeadPlaque />
    </group>
  );
}
