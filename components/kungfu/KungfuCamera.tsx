"use client";

import { OrbitControls } from "@react-three/drei";
import { KUNGFU_CAMERA_TARGET, useKungfuCamera } from "@/hooks/useKungfuCamera";
import type { KungfuMode } from "@/lib/kungfuSpec";

export function KungfuCamera({ mode }: { mode: KungfuMode }) {
  const distance = useKungfuCamera(mode);
  return (
    <OrbitControls
      makeDefault
      target={KUNGFU_CAMERA_TARGET}
      enablePan={false}
      enableDamping
      minDistance={distance.minDistance}
      maxDistance={distance.maxDistance}
      minPolarAngle={Math.PI * 0.3}
      maxPolarAngle={Math.PI * 0.48}
    />
  );
}
