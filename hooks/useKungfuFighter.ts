"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { prepareKungfuClips } from "@/lib/kungfuAnimation";
import { createKungfuAccessories } from "@/lib/kungfuAccessories";
import { KUNGFU_MOTIONS_URL, type KungfuCommand } from "@/lib/kungfuSpec";

type FighterOptions = {
  modelUrl: string;
  command: KungfuCommand;
  speed: number;
  onReady: () => void;
  onComplete: (sequence: number) => void;
};

/** 独立克隆骨骼和材质，避免影响庭院中复用同一模型的人物。 */
export function useKungfuFighter({ modelUrl, command, speed, onReady, onComplete }: FighterOptions) {
  const { scene } = useGLTF(modelUrl);
  const json = useLoader(THREE.FileLoader, KUNGFU_MOTIONS_URL) as string;
  const groundRef = useRef<THREE.Group>(null);
  const activeRef = useRef<THREE.AnimationAction | null>(null);
  const sequenceRef = useRef(0);
  const accessoriesRef = useRef<ReturnType<typeof createKungfuAccessories>>(null);
  const footPosition = useMemo(() => new THREE.Vector3(), []);
  const character = useMemo(() => {
    const model = clone(scene);
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (object.name === "MaiBodyCollider") object.visible = false;
      object.castShadow = true;
      object.receiveShadow = false;
      object.frustumCulled = false;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const copies = materials.map((source) => {
        const material = source.clone();
        if (material instanceof THREE.MeshStandardMaterial) {
          material.metalness = Math.min(material.metalness, 0.08);
          material.roughness = THREE.MathUtils.clamp(material.roughness, 0.4, 0.9);
          material.envMapIntensity = 0.35;
        }
        return material;
      });
      object.material = Array.isArray(object.material) ? copies : copies[0];
    });
    return model;
  }, [scene]);
  useEffect(() => {
    const accessories = createKungfuAccessories(character);
    accessoriesRef.current = accessories;
    return () => {
      accessoriesRef.current = null;
      accessories?.dispose();
    };
  }, [character]);
  const animation = useMemo(() => {
    const hips = character.getObjectByName("Hips");
    if (!hips) throw new Error("人物模型缺少 Hips 骨骼");
    const clips = prepareKungfuClips(json, hips.position.y);
    const mixer = new THREE.AnimationMixer(character);
    const actions = Object.fromEntries(clips.map((clip) => {
      const action = mixer.clipAction(clip);
      action.setLoop(clip.name === "idle" ? THREE.LoopRepeat : THREE.LoopOnce, clip.name === "idle" ? Infinity : 1);
      action.clampWhenFinished = clip.name !== "idle";
      return [clip.name, action];
    }));
    const feet = ["LeftToeBase", "RightToeBase"].map((name) => character.getObjectByName(name));
    return { mixer, actions, feet };
  }, [character, json]);

  useEffect(() => {
    onReady();
    const { mixer } = animation;
    const onFinished = (event: { action: THREE.AnimationAction }) => {
      if (event.action !== activeRef.current) return;
      // 保持收势，交由队列决定下一招；连招之间不插入待机动画。
      onComplete(sequenceRef.current);
    };
    mixer.addEventListener("finished", onFinished);
    return () => {
      mixer.removeEventListener("finished", onFinished);
      mixer.stopAllAction();
      // StrictMode 会重跑 Effect；保留与 memoized actions 配套的绑定缓存。
      // mixer 仅由当前组件持有，真正卸载后随组件释放。
      activeRef.current = null;
    };
  }, [animation, character, onComplete, onReady]);

  useEffect(() => {
    const next = animation.actions[command.motion];
    if (!next) return;
    sequenceRef.current = command.sequence;
    const previous = activeRef.current;
    if (previous && previous !== next) previous.fadeOut(0.16);
    next.reset().setEffectiveWeight(1);
    if (previous && previous !== next) next.fadeIn(0.16);
    next.play();
    activeRef.current = next;
  }, [animation, command]);

  useEffect(() => () => {
    character.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    });
  }, [character]);

  useFrame((_, delta) => {
    const elapsed = Math.min(delta, 0.05) * speed;
    const steps = accessoriesRef.current ? Math.max(1, Math.ceil(elapsed / (1 / 120))) : 1;
    for (let step = 0; step < steps; step++) {
      animation.mixer.update(elapsed / steps);
      accessoriesRef.current?.update(elapsed / steps, step === steps - 1);
    }
    accessoriesRef.current?.render();
    const ground = groundRef.current;
    if (!ground) return;
    ground.position.y = 0;
    ground.updateWorldMatrix(true, true);
    let contactY = Infinity;
    for (const foot of animation.feet) {
      if (!foot) continue;
      foot.getWorldPosition(footPosition);
      contactY = Math.min(contactY, footPosition.y);
    }
    if (Number.isFinite(contactY)) ground.position.y = 0.035 - contactY;
  });

  return { character, groundRef };
}
