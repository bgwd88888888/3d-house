import type { RefObject } from "react";
import { useFlightRiderMotion } from "@/hooks/useFlightRiderMotion";
import type { FlightState } from "@/lib/swordFlightTypes";
import { FlightSword } from "./FlightSword";

export function SwordRider({ running, flight }: { running: RefObject<boolean>; flight: RefObject<FlightState> }) {
  const { sword, stance, model, scale } = useFlightRiderMotion(flight, running);
  return (
    <group>
      <group ref={sword}><FlightSword /></group>
      <group ref={stance} position={[0, 0.055, 0]}>
        <primitive object={model} scale={scale} dispose={null} />
      </group>
    </group>
  );
}
