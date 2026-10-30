import { FLIGHT_ISLANDS } from "@/lib/swordFlightSpec";
import { FloatingIsland } from "./FloatingIsland";
import { FlightClouds } from "./FlightClouds";
import { FlightMountains } from "./FlightMountains";
import { FlightSky } from "./FlightSky";
import { FLIGHT_FOG_COLOR, FLIGHT_FOG_NEAR, FLIGHT_FOG_FAR } from "@/lib/flightAtmosphereSpec";
import type { FlightRuntime } from "@/hooks/useSwordFlightFrame";
import { FlightSun } from "./FlightSun";
import { FlightBirds } from "./FlightBirds";

export function FlightEnvironment({ flight, running }: Pick<FlightRuntime, "flight" | "running">) {
  return (
    <>
      <color attach="background" args={[FLIGHT_FOG_COLOR]} />
      <fog attach="fog" args={[FLIGHT_FOG_COLOR, FLIGHT_FOG_NEAR, FLIGHT_FOG_FAR]} />
      <hemisphereLight args={["#e5edf1", "#596563", 0.65]} />
      <FlightSun flight={flight} />
      <FlightSky />
      <FlightClouds />
      {FLIGHT_ISLANDS.map((island) => <FloatingIsland key={island.id} island={island} running={running} />)}
      <FlightMountains />
      <FlightBirds running={running} />
    </>
  );
}
