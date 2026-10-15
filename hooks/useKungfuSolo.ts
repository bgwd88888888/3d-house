"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { useKungfuCommand } from "@/hooks/useKungfuCommand";
import { useKungfuFighter } from "@/hooks/useKungfuFighter";
import { KUNGFU_MOTIONS_URL, type KungfuCommand } from "@/lib/kungfuSpec";

export type KungfuSoloOptions = {
  modelUrl: string;
  command: KungfuCommand;
  speed: number;
  onReady: () => void;
  onComplete: (sequence: number) => void;
};

export function useKungfuSolo({ modelUrl, command, speed, onReady, onComplete }: KungfuSoloOptions) {
  const { scene } = useGLTF(modelUrl);
  const json = useLoader(THREE.FileLoader, KUNGFU_MOTIONS_URL) as string;
  const fighter = useKungfuFighter(scene, json);
  const finishCommand = useKungfuCommand(fighter, command, onComplete);

  useEffect(() => {
    onReady();
  }, [onReady]);

  useFrame((_, delta) => {
    fighter.update(Math.min(delta, 0.05) * speed);
    finishCommand();
  });

  return fighter;
}
