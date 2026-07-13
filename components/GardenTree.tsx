"use client";

import { useGardenTreeModel } from "@/hooks/useGardenTreeModel";

const TREE_MODEL_SCALE = 0.72;

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
