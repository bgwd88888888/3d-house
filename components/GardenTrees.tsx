"use client";

/**
 * 合院内外树木：后园、侧院与门前点景（Quaternius）。
 */
import { GARDEN_TREE_MODELS } from "@/hooks/useGardenTreeModel";
import { GardenTree, type GardenTreeProps } from "./GardenTree";

type GardenTreePlacement = GardenTreeProps & {
  id: string;
};

const GARDEN_TREES: readonly GardenTreePlacement[] = [
  {
    id: "rear-garden-pine",
    modelUrl: GARDEN_TREE_MODELS.pineOne,
    position: [0, -0.03, -20],
    scale: 1.05,
    rotation: 0.6,
  },
  {
    id: "rear-west",
    modelUrl: GARDEN_TREE_MODELS.commonOne,
    position: [-20, -0.03, -18],
    scale: 0.95,
    rotation: 1.2,
  },
  {
    id: "rear-east",
    modelUrl: GARDEN_TREE_MODELS.commonTwo,
    position: [19, -0.03, -17],
    scale: 0.92,
    rotation: 2.0,
  },
  {
    id: "fourth-west",
    modelUrl: GARDEN_TREE_MODELS.pineTwo,
    position: [-12, -0.03, -8],
    scale: 0.88,
    rotation: 0.3,
  },
  {
    id: "fourth-east",
    modelUrl: GARDEN_TREE_MODELS.commonThree,
    position: [14, -0.03, -8],
    scale: 0.9,
    rotation: 1.7,
  },
  {
    id: "third-west",
    modelUrl: GARDEN_TREE_MODELS.pineThree,
    position: [-18, -0.03, 8],
    scale: 0.85,
    rotation: 2.4,
  },
  {
    id: "second-east",
    modelUrl: GARDEN_TREE_MODELS.commonOne,
    position: [18, -0.03, 12],
    scale: 0.86,
    rotation: 0.9,
  },
  {
    id: "gate-west",
    modelUrl: GARDEN_TREE_MODELS.commonTwo,
    position: [-15, -0.03, 22],
    scale: 0.8,
    rotation: 1.5,
  },
  {
    id: "gate-east",
    modelUrl: GARDEN_TREE_MODELS.commonThree,
    position: [15, -0.03, 22],
    scale: 0.82,
    rotation: 2.8,
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
