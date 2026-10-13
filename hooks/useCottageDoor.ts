"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useDoorNavigation } from "@/hooks/useDoorNavigation";
import { DEFAULT_HOUSE_SPEC, type BuildStage } from "@/lib/geoBuildings";

/** 从合并后的房屋网格命中点识别门扇、门框及把手。 */
function isCottageDoorHit(event: ThreeEvent<MouseEvent>): boolean {
  const point = event.eventObject.worldToLocal(event.point.clone());
  const { door, depth } = DEFAULT_HOUSE_SPEC;
  const frontZ = depth * 0.5;
  return (
    Math.abs(point.x - door.offsetX) <= door.width * 0.5 + 0.22 &&
    point.y >= 0 &&
    point.y <= door.height + 0.26 &&
    point.z > frontZ &&
    point.z <= frontZ + Math.max(door.depth, 0.22) + 0.3
  );
}

export function useCottageDoor(stage: BuildStage) {
  return useDoorNavigation("/room", (event) =>
    stage !== "base" && stage !== "roof" && isCottageDoorHit(event),
  );
}
