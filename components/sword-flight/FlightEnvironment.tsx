import { FLIGHT_ISLANDS } from "@/lib/swordFlightSpec";
import { FloatingIsland } from "./FloatingIsland";
import { FlightClouds } from "./FlightClouds";
import { FlightMountains } from "./FlightMountains";
import { FlightSky } from "./FlightSky";
import { FLIGHT_FOG_COLOR, FLIGHT_FOG_NEAR, FLIGHT_FOG_FAR } from "@/lib/flightAtmosphereSpec";

export function FlightEnvironment() {
  return (
    <>
      <color attach="background" args={[FLIGHT_FOG_COLOR]} />
      <fog attach="fog" args={[FLIGHT_FOG_COLOR, FLIGHT_FOG_NEAR, FLIGHT_FOG_FAR]} />
      <hemisphereLight args={["#e5edf1", "#596563", 0.65]} />
      <directionalLight position={[-90, 140, -120]} color="#fff0d5" intensity={1.7} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-140} shadow-camera-right={140} shadow-camera-top={140} shadow-camera-bottom={-140} shadow-camera-near={20} shadow-camera-far={350} shadow-normalBias={0.08} />
      <FlightSky />
      <FlightClouds />
      {FLIGHT_ISLANDS.map((island) => <FloatingIsland key={island.name} island={island} />)}
      <FlightMountains />
    </>
  );
}
