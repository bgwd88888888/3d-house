"use client";

/**
 * 庭院树木摆放表（Quaternius Common / Pine，带树皮与叶贴图）。
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
    modelUrl: GARDEN_TREE_MODELS.commonOne,
    position: [-16, -0.03, -10],
    scale: 1.05,
    rotation: 0.4,
  },
  {
    id: "west-center",
    modelUrl: GARDEN_TREE_MODELS.pineThree,
    position: [-17, -0.03, 3],
    scale: 0.92,
    rotation: 1.3,
  },
  {
    id: "southwest-small",
    modelUrl: GARDEN_TREE_MODELS.commonTwo,
    position: [-13, -0.03, 12],
    scale: 0.88,
    rotation: 2.1,
  },
  {
    id: "south-center",
    modelUrl: GARDEN_TREE_MODELS.commonThree,
    position: [-5, -0.03, 14],
    scale: 0.82,
    rotation: 0.8,
  },
  {
    id: "southeast-large",
    modelUrl: GARDEN_TREE_MODELS.pineOne,
    // 原 [8,14] 挡门前与皮卡视野；挪到更靠右后的空地
    position: [16.2, -0.03, 12.4],
    scale: 1.08,
    rotation: 1.8,
  },
  {
    id: "east-small",
    modelUrl: GARDEN_TREE_MODELS.commonTwo,
    position: [17, -0.03, 8],
    scale: 0.9,
    rotation: 2.7,
  },
  {
    id: "east-center",
    modelUrl: GARDEN_TREE_MODELS.pineTwo,
    position: [17, -0.03, -4],
    scale: 1.02,
    rotation: 0.2,
  },
  {
    id: "northeast-small",
    modelUrl: GARDEN_TREE_MODELS.commonOne,
    position: [13, -0.03, -13],
    scale: 0.84,
    rotation: 1.1,
  },
  {
    id: "north-center",
    modelUrl: GARDEN_TREE_MODELS.commonThree,
    position: [-7, -0.03, -14],
    scale: 0.95,
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
