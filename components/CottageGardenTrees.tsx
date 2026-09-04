"use client";

/**
 * 西式小院大树：Poly Haven 扫描阔叶，替代 Quaternius 卡通松。
 */
import {
  PHOTOGRAM_TREE_MODELS,
  usePhotogramTreeModel,
} from "@/hooks/usePhotogramTreeModel";

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
      <PhotogramTree
        modelUrl={PHOTOGRAM_TREE_MODELS.islandTwo}
        position={[14.1, -0.03, 9.3]}
        rotation={2.18}
        scale={2.05}
      />
      <PhotogramTree
        modelUrl={PHOTOGRAM_TREE_MODELS.islandOne}
        position={[-9.05, -0.03, 3.2]}
        rotation={0.72}
        scale={1.34}
      />
    </group>
  );
}
