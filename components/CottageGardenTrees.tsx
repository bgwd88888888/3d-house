"use client";

/**
 * 西式小院大树：Poly Haven 扫描阔叶，替代 Quaternius 卡通松。
 */
import {
  PHOTOGRAM_TREE_MODELS,
  usePhotogramTreeModel,
} from "@/hooks/usePhotogramTreeModel";
import { COTTAGE_TREES } from "@/lib/cottageTreeLayout";

const TREE_MODELS = {
  islandOne: PHOTOGRAM_TREE_MODELS.islandOne,
  islandTwo: PHOTOGRAM_TREE_MODELS.islandTwo,
} as const;

type PhotogramTreeProps = {
  modelUrl: string;
  position: [number, number, number];
  rotation: number;
  scale: number | [number, number, number];
};

function PhotogramTree({
  modelUrl,
  position,
  rotation,
  scale,
}: PhotogramTreeProps) {
  const tree = usePhotogramTreeModel(modelUrl);

  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <primitive object={tree} />
    </group>
  );
}

export function CottageGardenTrees() {
  return (
    <group>
      {COTTAGE_TREES.map((tree) => (
        <PhotogramTree
          key={tree.id}
          modelUrl={TREE_MODELS[tree.model]}
          position={[...tree.position]}
          rotation={tree.rotation}
          scale={tree.scale}
        />
      ))}
    </group>
  );
}
