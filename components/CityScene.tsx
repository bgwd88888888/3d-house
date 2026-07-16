"use client";

/**
 * 建筑层入口：按场景切换西式小院 / 四进合院。
 */
import { Suspense } from "react";
import type { BuildStage } from "@/lib/geoBuildings";
import type { SceneKind } from "@/lib/sceneKinds";
import { CottageScene } from "./CottageScene";
import { CourtyardCompound } from "./CourtyardCompound";

type CitySceneProps = {
  stage: BuildStage;
  scene: SceneKind;
};

export function CityScene({ stage, scene }: CitySceneProps) {
  return (
    <Suspense fallback={null}>
      {scene === "cottage" ? (
        <CottageScene key="cottage" stage={stage} />
      ) : (
        <CourtyardCompound key="courtyard" />
      )}
    </Suspense>
  );
}
