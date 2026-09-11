"use client";

/**
 * 厅堂沙发：Poly Haven sofa_03（约 2.73m 宽），贴 +X 墙朝向室内。
 */
import { ROOM_SOFA_MODEL, useRoomSofaModel } from "@/hooks/useRoomSofaModel";
import { ROOM } from "@/lib/roomSpec";

export function RoomSofa() {
  const sofa = useRoomSofaModel(ROOM_SOFA_MODEL);

  return (
    <group
      position={[ROOM.sofa.x, 0, ROOM.sofa.z]}
      rotation={[0, ROOM.sofa.rotationY, 0]}
    >
      <primitive object={sofa} />
    </group>
  );
}
