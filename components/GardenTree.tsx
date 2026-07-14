"use client";

import { useGardenTreeModel } from "@/hooks/useGardenTreeModel";

/** Quaternius Common/Pine 约 7–10m 高，略缩小以贴合庭院 */
const TREE_MODEL_SCALE = 0.95;

export type GardenTreeProps = {
  modelUrl: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
};

export function GardenTree({
  modelUrl,
  position,
  rotation,
  scale,
}: GardenTreeProps) {
  const tree = useGardenTreeModel(modelUrl);

  return (
    <group
      position={position}
      rotation={[0, rotation, 0]}
      scale={TREE_MODEL_SCALE * scale}
    >
      <primitive object={tree} />
    </group>
  );
}
