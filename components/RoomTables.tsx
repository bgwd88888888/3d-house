"use client";

/**
 * 厅堂桌几：Poly Haven 哥特茶几与维多利亚式边桌。
 */
import { RoomFruitBowl } from "@/components/RoomFruitBowl";
import { useRoomTableModels } from "@/hooks/useRoomTableModels";
import { ROOM } from "@/lib/roomSpec";

export function RoomTables() {
  const { coffeeTable, consoleTable } = useRoomTableModels();

  return (
    <>
      <primitive
        object={coffeeTable}
        position={[0, 0, ROOM.coffee.z]}
        scale={ROOM.coffee.modelScale}
      />
      <primitive
        object={consoleTable}
        position={[0, 0, ROOM.console.z]}
        scale={ROOM.console.modelScale}
      />
      <RoomFruitBowl />
    </>
  );
}
