"use client";

import { useKungfuFighter } from "@/hooks/useKungfuFighter";
import type { KungfuCommand } from "@/lib/kungfuSpec";

export type KungfuFighterProps = {
  modelUrl: string;
  command: KungfuCommand;
  speed: number;
  onReady: () => void;
  onComplete: (sequence: number) => void;
};

export function KungfuFighter(props: KungfuFighterProps) {
  const { character, groundRef } = useKungfuFighter(props);
  return (
    <group ref={groundRef}>
      <primitive object={character} dispose={null} />
    </group>
  );
}
