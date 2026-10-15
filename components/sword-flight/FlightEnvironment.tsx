import { FLIGHT_ISLANDS } from "@/lib/swordFlightSpec";
import { FloatingIsland } from "./FloatingIsland";
import { FlightClouds } from "./FlightClouds";
import { FlightMountains } from "./FlightMountains";
import { FlightSky } from "./FlightSky";

export function FlightEnvironment() {
  return (
    <>
      <color attach="background" args={["#c8dbdf"]} />
      <fog attach="fog" args={["#c8dbdf", 155, 510]} />
      <hemisphereLight args={["#e5f0f5", "#435d60", 1.5]} />
      <directionalLight position={[-90, 140, -120]} color="#ffe5ba" intensity={2.1} />
      <FlightSky />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -36, 0]}>
        <planeGeometry args={[1800, 1800]} />
        <meshBasicMaterial color="#b9d0d6" />
      </mesh>
      <FlightClouds />
      {FLIGHT_ISLANDS.map((island) => <FloatingIsland key={island.name} island={island} />)}
      <FlightMountains />
    </>
  );
}
