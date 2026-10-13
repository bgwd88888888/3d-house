"use client";

/**
 * 室内厅堂：象牙灰泥、抛光地板、铜吊灯、皮革沙发。
 */
import { useTexture } from "@react-three/drei";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { RoomSofa } from "@/components/RoomSofa";
import { RoomTables } from "@/components/RoomTables";
import { RoomDoor } from "@/components/RoomDoor";
import { useWallTextures } from "@/hooks/useWallTextures";
import { useWoodTextures } from "@/hooks/useWoodTextures";
import { useRoomGeometry } from "@/hooks/useRoomGeometry";
import { applyWoodEnrichment } from "@/lib/materialWeathering";
import { ROOM } from "@/lib/roomSpec";

const TV_SCREEN_URL = "/textures/room/tv-cat-mouse.png";

const WOOD_NORMAL = new THREE.Vector2(0.95, 0.95);
const WALL_NORMAL = new THREE.Vector2(0.55, 0.55);
const FLOOR_NORMAL = new THREE.Vector2(0.85, 0.85);

export function RoomScene() {
  const layers = useRoomGeometry();
  const wallTextures = useWallTextures();
  const woodTextures = useWoodTextures();
  const tvScreenMap = useTexture(TV_SCREEN_URL);

  useLayoutEffect(() => {
    tvScreenMap.colorSpace = THREE.SRGBColorSpace;
    tvScreenMap.wrapS = THREE.ClampToEdgeWrapping;
    tvScreenMap.wrapT = THREE.ClampToEdgeWrapping;
    tvScreenMap.anisotropy = 8;
    tvScreenMap.needsUpdate = true;
  }, [tvScreenMap]);

  return (
    <group>
      {layers.plaster ? (
        <mesh geometry={layers.plaster}>
          <meshStandardMaterial
            {...wallTextures}
            color="#efe6d6"
            roughness={0.96}
            metalness={0.01}
            normalScale={WALL_NORMAL}
            envMapIntensity={0.08}
          />
        </mesh>
      ) : null}
      {layers.floor ? (
        <mesh geometry={layers.floor}>
          <meshStandardMaterial
            {...woodTextures}
            color="#b08960"
            roughness={0.72}
            metalness={0.02}
            normalScale={FLOOR_NORMAL}
            envMapIntensity={0}
          />
        </mesh>
      ) : null}
      {layers.woodwork ? (
        <mesh geometry={layers.woodwork}>
          <meshStandardMaterial
            {...woodTextures}
            color="#7d5e48"
            roughness={0.55}
            metalness={0.05}
            normalScale={WOOD_NORMAL}
            envMapIntensity={0.12}
            onBeforeCompile={applyWoodEnrichment}
            customProgramCacheKey={() => "room-wood-salon-v1"}
          />
        </mesh>
      ) : null}
      {layers.glass ? (
        <mesh geometry={layers.glass}>
          <meshStandardMaterial
            color="#9eb4c2"
            roughness={0.08}
            metalness={0.12}
            transparent
            opacity={0.2}
            envMapIntensity={0.5}
            depthWrite={false}
          />
        </mesh>
      ) : null}
      {layers.curtains ? (
        <mesh geometry={layers.curtains}>
          <meshStandardMaterial
            vertexColors
            roughness={0.58}
            side={THREE.DoubleSide}
            envMapIntensity={0.18}
          />
        </mesh>
      ) : null}
      {layers.brass ? (
        <mesh geometry={layers.brass}>
          <meshStandardMaterial
            color="#d4b36a"
            roughness={0.22}
            metalness={0.86}
            envMapIntensity={0.55}
          />
        </mesh>
      ) : null}
      {layers.lampDiffuser ? (
        <mesh geometry={layers.lampDiffuser}>
          <meshStandardMaterial
            color="#f0e0c4"
            emissive="#ffd4a0"
            emissiveIntensity={1.05}
            roughness={0.48}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}
      <RoomSofa />
      <RoomTables />
      <RoomDoor />
      {layers.rug ? (
        <mesh geometry={layers.rug}>
          <meshStandardMaterial
            vertexColors
            roughness={0.94}
            envMapIntensity={0.06}
          />
        </mesh>
      ) : null}
      {layers.hearth ? (
        <mesh geometry={layers.hearth}>
          <meshStandardMaterial color="#1c1410" roughness={0.92} metalness={0} />
        </mesh>
      ) : null}
      {layers.device ? (
        <mesh geometry={layers.device}>
          <meshStandardMaterial
            color="#16181c"
            roughness={0.32}
            metalness={0.38}
            envMapIntensity={0.28}
          />
        </mesh>
      ) : null}
      {layers.fire ? (
        <mesh geometry={layers.fire}>
          <meshStandardMaterial
            color="#ff9a4a"
            emissive="#ff7a28"
            emissiveIntensity={1.4}
            roughness={0.6}
          />
        </mesh>
      ) : null}
      {layers.clay ? (
        <mesh geometry={layers.clay}>
          <meshStandardMaterial vertexColors roughness={0.9} metalness={0} />
        </mesh>
      ) : null}
      {layers.screen ? (
        <mesh geometry={layers.screen}>
          <meshBasicMaterial map={tvScreenMap} toneMapped={false} />
        </mesh>
      ) : null}

      <pointLight
        position={ROOM.chandelier}
        color="#ffd2a8"
        intensity={16}
        distance={12}
        decay={2}
      />
      <pointLight
        position={[0, 0.55, -ROOM.innerDepth * 0.5 + 0.28]}
        color="#ff7a3a"
        intensity={5.5}
        distance={5.5}
        decay={2}
      />
      <pointLight
        position={[
          0,
          ROOM.console.height + ROOM.tv.standH + ROOM.tv.height * 0.48,
          ROOM.console.z - 0.42,
        ]}
        color="#8bb4d4"
        intensity={2.4}
        distance={4.2}
        decay={2}
      />
      {ROOM.sconces.map((pos) => (
        <pointLight
          key={`${pos[0]}-${pos[2]}`}
          position={[pos[0], pos[1], pos[2] + 0.18]}
          color="#ffc090"
          intensity={3.2}
          distance={4.2}
          decay={2}
        />
      ))}
    </group>
  );
}
