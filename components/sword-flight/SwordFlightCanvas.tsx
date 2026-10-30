"use client";

import { memo, Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import type { FlightRuntime } from "@/hooks/useSwordFlightFrame";
import { FlightEnvironment } from "./FlightEnvironment";
import { FlightPlayer } from "./FlightPlayer";

type Props = FlightRuntime & { onReady: () => void };

function FlightScene({ onReady, ...runtime }: Props) {
  useEffect(() => { onReady(); }, [onReady]);
  return (
    <>
      <FlightEnvironment flight={runtime.flight} running={runtime.running} />
      <FlightPlayer {...runtime} />
    </>
  );
}

export const SwordFlightCanvas = memo(function SwordFlightCanvas(props: Props) {
  return (
    <Canvas shadows="soft" dpr={1} camera={{ fov: 58, near: 0.2, far: 2500 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <Suspense fallback={null}>
        <FlightScene {...props} />
      </Suspense>
    </Canvas>
  );
});
