"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect } from "react";
import { useKungfuCommand } from "@/hooks/useKungfuCommand";
import { useKungfuFighter } from "@/hooks/useKungfuFighter";
import type { KungfuCommand } from "@/lib/kungfuSpec";
import type { KungfuStyle } from "@/lib/kungfuStyles";

export type KungfuSoloOptions = {
  modelUrl: string;
  style: KungfuStyle;
  command: KungfuCommand;
  speed: number;
  onReady: () => void;
  onComplete: (sequence: number) => void;
};

export function useKungfuSolo({ modelUrl, style, command, speed, onReady, onComplete }: KungfuSoloOptions) {
  const { scene } = useGLTF(modelUrl);
  const fighter = useKungfuFighter(scene, style);
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
