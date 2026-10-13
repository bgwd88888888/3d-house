"use client";

import { Html } from "@react-three/drei";
import { useDoorNavigation } from "@/hooks/useDoorNavigation";
import { useWoodTextures } from "@/hooks/useWoodTextures";
import { ROOM } from "@/lib/roomSpec";

const { width, height } = ROOM.door;
const WOOD_PARTS: {
  size: [number, number, number];
  position: [number, number, number];
}[] = [
  { size: [width - 0.04, height - 0.03, 0.08], position: [0, height * 0.5, 0] },
  { size: [0.1, height + 0.1, 0.13], position: [-(width + 0.1) * 0.5, (height + 0.1) * 0.5, 0.035] },
  { size: [0.1, height + 0.1, 0.13], position: [(width + 0.1) * 0.5, (height + 0.1) * 0.5, 0.035] },
  { size: [width + 0.2, 0.1, 0.13], position: [0, height + 0.05, 0.035] },
  { size: [width + 0.28, 0.045, 0.16], position: [0, height + 0.12, 0.04] },
  { size: [width - 0.26, 0.78, 0.028], position: [0, 1.76, 0.052] },
  { size: [width - 0.26, 0.76, 0.028], position: [0, 0.61, 0.052] },
];

/** 面向室内的木门，门框和门板共用房间木纹。 */
export function RoomDoor() {
  const { hovered, events } = useDoorNavigation("/");
  const woodTextures = useWoodTextures();

  return (
    <group
      position={[ROOM.door.x, 0, ROOM.innerDepth * 0.5]}
      rotation={[0, Math.PI, 0]}
      {...events}
    >
      {WOOD_PARTS.map(({ size, position }, index) => (
        <mesh key={index} position={position}>
          <boxGeometry args={size} />
          <meshStandardMaterial
            {...woodTextures}
            color={hovered ? "#a47a50" : "#7d5e48"}
            roughness={0.55}
            metalness={0.05}
          />
        </mesh>
      ))}
      <mesh position={[-width * 0.33, 1.13, 0.065]}>
        <boxGeometry args={[0.06, 0.22, 0.025]} />
        <meshStandardMaterial color="#d4b36a" roughness={0.22} metalness={0.86} />
      </mesh>
      <mesh position={[-width * 0.33 + 0.045, 1.16, 0.11]} rotation={[0, 0, Math.PI * 0.5]}>
        <cylinderGeometry args={[0.018, 0.018, 0.14, 12]} />
        <meshStandardMaterial color="#d4b36a" roughness={0.22} metalness={0.86} />
      </mesh>
      <Html position={[0, height + 0.34, 0.1]} center occlude style={{ pointerEvents: "none" }}>
        <span className="whitespace-nowrap rounded-full bg-[#241910]/80 px-3 py-1.5 text-xs text-[#f0e0c4]">
          西式小屋 ↗
        </span>
      </Html>
    </group>
  );
}
