"use client";

/**
 * 庭院桦树摆放表（Quaternius 模型）。
 * 围在草地边缘一圈，避免挡住房子正面观察角度。
 */
import { GARDEN_TREE_MODELS } from "@/hooks/useGardenTreeModel";
import { GardenTree, type GardenTreeProps } from "./GardenTree";

type GardenTreePlacement = GardenTreeProps & {
  id: string;
};

const GARDEN_TREES: readonly GardenTreePlacement[] = [
  {
    id: "northwest-one",
    modelUrl: GARDEN_TREE_MODELS.birchOne,
    position: [-16, -0.03, -10],
    scale: 0.78,
    rotation: 0.4,
  },
  {
    id: "west-center",
    modelUrl: GARDEN_TREE_MODELS.birchThree,
    position: [-17, -0.03, 3],
    scale: 1.08,
    rotation: 1.3,
  },
  {
    id: "southwest-small",
    modelUrl: GARDEN_TREE_MODELS.birchFive,
    position: [-13, -0.03, 12],
    scale: 0.66,
    rotation: 2.1,
  },
  {
    id: "south-center",
    modelUrl: GARDEN_TREE_MODELS.birchOne,
    position: [-5, -0.03, 14],
    scale: 0.88,
    rotation: 0.8,
  },
  {
    id: "southeast-large",
    modelUrl: GARDEN_TREE_MODELS.birchThree,
    position: [8, -0.03, 14],
    scale: 1.16,
    rotation: 1.8,
  },
  {
    id: "east-small",
    modelUrl: GARDEN_TREE_MODELS.birchFive,
    position: [17, -0.03, 8],
    scale: 0.72,
    rotation: 2.7,
  },
  {
    id: "east-center",
    modelUrl: GARDEN_TREE_MODELS.birchOne,
    position: [17, -0.03, -4],
    scale: 0.94,
    rotation: 0.2,
  },
  {
    id: "northeast-small",
    modelUrl: GARDEN_TREE_MODELS.birchFive,
    position: [13, -0.03, -13],
    scale: 0.62,
    rotation: 1.1,
  },
  {
    id: "north-center",
    modelUrl: GARDEN_TREE_MODELS.birchThree,
    position: [-7, -0.03, -14],
    scale: 1.02,
    rotation: 2.4,
  },
];

export function GardenTrees() {
  return (
    <group>
      {GARDEN_TREES.map(({ id, ...tree }) => (
        <GardenTree key={id} {...tree} />
      ))}
    </group>
  );
}
