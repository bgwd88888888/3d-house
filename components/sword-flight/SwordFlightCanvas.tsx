"use client";

import { memo, Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { BakeShadows } from "@react-three/drei";
import type { FlightRuntime } from "@/hooks/useSwordFlightFrame";
import { FlightEnvironment } from "./FlightEnvironment";
import { FlightGates } from "./FlightGates";
import { FlightPlayer } from "./FlightPlayer";

type Props = FlightRuntime & { onReady: () => void };

function FlightScene({ onReady, ...runtime }: Props) {
  useEffect(() => { onReady(); }, [onReady]);
  return (
    <>
      <FlightEnvironment />
      <FlightGates flight={runtime.flight} />
      <FlightPlayer {...runtime} />
      <BakeShadows />
    </>
  );
}

export const SwordFlightCanvas = memo(function SwordFlightCanvas(props: Props) {
  return (
    <Canvas shadows="soft" dpr={1} camera={{ fov: 58, near: 0.2, far: 1100 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <Suspense fallback={null}>
        <FlightScene {...props} />
      </Suspense>
    </Canvas>
  );
});
