"use client";

import { useKungfuSolo, type KungfuSoloOptions } from "@/hooks/useKungfuSolo";
import { KungfuFighter } from "./KungfuFighter";

export function KungfuSolo({ playerLabel, ...options }: KungfuSoloOptions & { playerLabel: string }) {
  const fighter = useKungfuSolo(options);
  return <KungfuFighter fighter={fighter} label={playerLabel} role="solo" />;
}
