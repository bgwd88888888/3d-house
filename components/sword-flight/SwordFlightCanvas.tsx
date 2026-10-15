"use client";

import { memo, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
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
    </>
  );
}

export const SwordFlightCanvas = memo(function SwordFlightCanvas(props: Props) {
  return (
    <Canvas dpr={1} camera={{ fov: 58, near: 0.2, far: 650 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <FlightScene {...props} />
    </Canvas>
  );
});
