"use client";

/**
 * 门口皮卡：Quaternius Pickup Truck（约 5.2m 长，贴图已内嵌）。
 * 停在房子右侧空地，比例对齐庭院人物。
 */
import {
  GARDEN_VEHICLE_MODELS,
  useGardenVehicleModel,
} from "@/hooks/useGardenVehicleModel";

/** 模型已接近真实皮卡尺度，略缩小以不压过人物 */
const PICKUP_SCALE = 0.92;

export function GardenPickup() {
  const pickup = useGardenVehicleModel(GARDEN_VEHICLE_MODELS.pickup);

  return (
    <group
      // 右墙 x≈5.8、屋檐≈6.22；贴墙停在侧院中段，避免探出房角被水池树挡住
      position={[12, -0.02, 3.2]}
      // 车头朝前（+Z），沿侧墙停放
      rotation={[0, 0, 0]}
      scale={PICKUP_SCALE}
    >
      <primitive object={pickup} />
    </group>
  );
}
