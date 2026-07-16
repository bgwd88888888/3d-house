"use client";

/**
 * 合院树木：中间院子对称点景 + 院外环林。
 */
import {
  COMPOUND_HALF_X,
  COMPOUND_HALF_Z,
} from "@/lib/geoCompound";
import { GARDEN_TREE_MODELS } from "@/hooks/useGardenTreeModel";
import { GardenTree, type GardenTreeProps } from "./GardenTree";

type GardenTreePlacement = GardenTreeProps & {
  id: string;
};

const INNER_TREES: readonly GardenTreePlacement[] = [
  // 四进（正房前）
  {
    id: "rear-a",
    modelUrl: GARDEN_TREE_MODELS.pineOne,
    position: [-7, -0.03, -20],
    scale: 0.85,
    rotation: 0.6,
  },
  {
    id: "rear-b",
    modelUrl: GARDEN_TREE_MODELS.commonOne,
    position: [6, -0.03, -22],
    scale: 0.8,
    rotation: 1.2,
  },
  {
    id: "rear-c",
    modelUrl: GARDEN_TREE_MODELS.commonTwo,
    position: [-2, -0.03, -16],
    scale: 0.75,
    rotation: 2.0,
  },
  // 三进
  {
    id: "third-west",
    modelUrl: GARDEN_TREE_MODELS.pineTwo,
    position: [-8, -0.03, -5],
    scale: 0.76,
    rotation: 0.3,
  },
  {
    id: "third-east",
    modelUrl: GARDEN_TREE_MODELS.commonThree,
    position: [8, -0.03, -6],
    scale: 0.76,
    rotation: 1.7,
  },
  // 二进
  {
    id: "second-west",
    modelUrl: GARDEN_TREE_MODELS.pineThree,
    position: [-7.5, -0.03, 8.5],
    scale: 0.72,
    rotation: 2.4,
  },
  {
    id: "second-east",
    modelUrl: GARDEN_TREE_MODELS.commonOne,
    position: [7.5, -0.03, 8],
    scale: 0.72,
    rotation: 0.9,
  },
  // 一进（门内）
  {
    id: "first-west",
    modelUrl: GARDEN_TREE_MODELS.commonTwo,
    position: [-7, -0.03, 24],
    scale: 0.68,
    rotation: 1.5,
  },
  {
    id: "first-east",
    modelUrl: GARDEN_TREE_MODELS.commonThree,
    position: [7, -0.03, 23.5],
    scale: 0.68,
    rotation: 2.8,
  },
];

const OUTER_RING: readonly {
  x: number;
  z: number;
  model: keyof typeof GARDEN_TREE_MODELS;
  scale: number;
  rot: number;
}[] = [
  { x: -COMPOUND_HALF_X - 8, z: 26, model: "commonOne", scale: 0.95, rot: 1.1 },
  { x: -COMPOUND_HALF_X - 6, z: 14, model: "pineTwo", scale: 1.08, rot: 2.0 },
  { x: -COMPOUND_HALF_X - 9, z: 4, model: "commonTwo", scale: 0.98, rot: 0.7 },
  { x: -COMPOUND_HALF_X - 7, z: -8, model: "pineThree", scale: 1.05, rot: 1.8 },
  { x: -COMPOUND_HALF_X - 10, z: -20, model: "commonThree", scale: 0.96, rot: 0.4 },
  { x: -COMPOUND_HALF_X - 5, z: -COMPOUND_HALF_Z - 2, model: "pineOne", scale: 1.1, rot: 2.5 },
  { x: -12, z: -COMPOUND_HALF_Z - 6, model: "commonOne", scale: 1.0, rot: 1.3 },
  { x: 0, z: -COMPOUND_HALF_Z - 7, model: "pineTwo", scale: 1.08, rot: 0.9 },
  { x: 12, z: -COMPOUND_HALF_Z - 5, model: "commonTwo", scale: 0.95, rot: 2.2 },
  { x: COMPOUND_HALF_X + 5, z: -COMPOUND_HALF_Z - 3, model: "pineThree", scale: 1.05, rot: 0.5 },
  { x: COMPOUND_HALF_X + 8, z: -18, model: "commonThree", scale: 0.98, rot: 1.6 },
  { x: COMPOUND_HALF_X + 6, z: -6, model: "pineOne", scale: 1.05, rot: 2.7 },
  { x: COMPOUND_HALF_X + 9, z: 6, model: "commonOne", scale: 0.94, rot: 0.3 },
  { x: COMPOUND_HALF_X + 7, z: 16, model: "pineTwo", scale: 1.02, rot: 1.9 },
  { x: COMPOUND_HALF_X + 10, z: 26, model: "commonTwo", scale: 0.96, rot: 0.8 },
];

const GARDEN_TREES: readonly GardenTreePlacement[] = [
  ...INNER_TREES,
  ...OUTER_RING.map((tree, i) => ({
    id: `outer-${i}`,
    modelUrl: GARDEN_TREE_MODELS[tree.model],
    position: [tree.x, -0.03, tree.z] as [number, number, number],
    scale: tree.scale,
    rotation: tree.rot,
  })),
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
