"use client";

/**
 * 西式小院树木：水池外侧一棵，房子对侧墙边一棵。
 */
import { GARDEN_TREE_MODELS } from "@/hooks/useGardenTreeModel";
import { GardenTree, type GardenTreeProps } from "./GardenTree";

type GardenTreePlacement = GardenTreeProps & {
  id: string;
};

const GARDEN_TREES: readonly GardenTreePlacement[] = [
  {
    id: "pond-side",
    modelUrl: GARDEN_TREE_MODELS.pineOne,
    position: [16.6, -0.03, 10.5],
    scale: 0.95,
    rotation: 1.8,
  },
  {
    id: "house-west",
    modelUrl: GARDEN_TREE_MODELS.pineTwo,
    position: [-8.8, -0.03, 3.5],
    scale: 0.95,
    rotation: 0.4,
  },
];

export function CottageGardenTrees() {
  return (
    <group>
      {GARDEN_TREES.map(({ id, ...tree }) => (
        <GardenTree key={id} {...tree} />
      ))}
    </group>
  );
}
