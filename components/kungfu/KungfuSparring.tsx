"use client";

import { useKungfuSparring, type KungfuSparringOptions } from "@/hooks/useKungfuSparring";
import { KungfuFighter } from "./KungfuFighter";

export type KungfuSparringProps = KungfuSparringOptions & { playerLabel: string; opponentLabel: string };

export function KungfuSparring({ playerLabel, opponentLabel, ...options }: KungfuSparringProps) {
  const { player, opponent } = useKungfuSparring(options);
  return (
    <>
      <KungfuFighter fighter={player} label={playerLabel} />
      <KungfuFighter fighter={opponent} label={opponentLabel} role="opponent" />
    </>
  );
}
