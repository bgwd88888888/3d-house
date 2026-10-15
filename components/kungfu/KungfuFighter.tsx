"use client";

import { Html } from "@react-three/drei";
import type { KungfuFighterState } from "@/hooks/useKungfuFighter";
import { KUNGFU_SPARRING_DISTANCE, KUNGFU_SPARRING_OFFSET } from "@/lib/kungfuSparring";

export type KungfuFighterProps = {
  fighter: KungfuFighterState;
  label: string;
  role?: "solo" | "player" | "opponent";
};

export function KungfuFighter({ fighter, label, role = "player" }: KungfuFighterProps) {
  const { character, positionRef, groundRef } = fighter;
  const opponent = role === "opponent";
  const direction = role === "solo" ? 0 : opponent ? 1 : -1;
  return (
    <group ref={positionRef} position={[direction * KUNGFU_SPARRING_DISTANCE / 2, 0, direction * KUNGFU_SPARRING_OFFSET]} rotation={[0, -direction * Math.PI / 2, 0]}>
      <group ref={groundRef}>
        <primitive object={character} dispose={null} />
      </group>
      {role !== "solo" ? <Html position={[0, 1.95, 0]} center className="pointer-events-none whitespace-nowrap" style={{ pointerEvents: "none" }}>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] ${opponent ? "border-sky-200/20 bg-[#08090b]/80 text-sky-200/80" : "border-amber-200/20 bg-[#08090b]/80 text-amber-200/90"}`}>
          {opponent ? "陪练" : "你"} · {label}
        </span>
      </Html> : null}
    </group>
  );
}
