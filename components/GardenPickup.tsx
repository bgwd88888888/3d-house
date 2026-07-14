"use client";

/**
 * 门口皮卡：Kenney Car Kit truck.glb（绿皮卡，贴图已内嵌）。
 * 停在房子右侧空地，比例对齐庭院人物，不再挡门。
 */
import {
  GARDEN_VEHICLE_MODELS,
  useGardenVehicleModel,
} from "@/hooks/useGardenVehicleModel";

/** Kenney 车模约长 1.7、高 0.6；缩放到与人物接近的真实皮卡感 */
const PICKUP_SCALE = 2.15;

export function GardenPickup() {
  const pickup = useGardenVehicleModel(GARDEN_VEHICLE_MODELS.pickup);

  return (
    <group
      // 房子右墙约 x=5.8；停到右侧草坪，略靠前
      position={[14.2, -0.02, 4.2]}
      // 车头朝前（+Z），沿侧墙停放
      rotation={[0, 0, 0]}
      scale={PICKUP_SCALE}
    >
      <primitive object={pickup} />
    </group>
  );
}
