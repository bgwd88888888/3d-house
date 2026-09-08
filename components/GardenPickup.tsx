"use client";

/**
 * 门口皮卡：Quaternius Pickup Truck（约 5.2m 长，贴图已内嵌）。
 * 停在房子右侧空地，比例对齐庭院人物。
 */
import {
  GARDEN_VEHICLE_MODELS,
  useGardenVehicleModel,
} from "@/hooks/useGardenVehicleModel";
import { COTTAGE_PICKUP_POSITION } from "@/lib/cottageVehicleLayout";

/** 模型已接近真实皮卡尺度，略缩小以不压过人物 */
const PICKUP_SCALE = 0.92;

export function GardenPickup() {
  const pickup = useGardenVehicleModel(GARDEN_VEHICLE_MODELS.pickup);

  return (
    <group
      // 停在右侧院子的后段，让默认机位下的车头避开池边树干。
      position={COTTAGE_PICKUP_POSITION}
      // 车头朝前（+Z），沿侧墙停放
      rotation={[0, 0, 0]}
      scale={PICKUP_SCALE}
    >
      <primitive object={pickup} />
    </group>
  );
}
