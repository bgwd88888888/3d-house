import { useEffect, useMemo } from "react";
import type { FLIGHT_ISLANDS } from "@/lib/swordFlightSpec";
import { islandTopHeight } from "@/lib/flightIslandShape";
import { createIslandGeometry } from "@/lib/flightLandscapeGeometry";
import { useFlightTextures } from "@/hooks/useFlightTextures";
import { FlightPavilion } from "./FlightPavilion";
import { FlightPine } from "./FlightPine";
import { FlightRock } from "./FlightRock";

export function FloatingIsland({ island }: { island: (typeof FLIGHT_ISLANDS)[number] }) {
  const { position, radius, height } = island;
  const cliff = useFlightTextures("cliff");
  const ground = useFlightTextures("ground");
  const geometries = useMemo(() => ({ top: createIslandGeometry(radius, height, true), rock: createIslandGeometry(radius, height, false) }), [radius, height]);
  useEffect(() => () => { geometries.top.dispose(); geometries.rock.dispose(); }, [geometries]);
  return (
    <group position={[...position]}>
      <mesh geometry={geometries.rock} receiveShadow>
        <meshStandardMaterial {...cliff} vertexColors roughness={0.95} normalScale={[0.8, 0.8]} />
      </mesh>
      <mesh geometry={geometries.top} receiveShadow>
        <meshStandardMaterial {...ground} vertexColors roughness={1} normalScale={[0.65, 0.65]} />
      </mesh>
      <FlightPavilion />
      {[0, 1, 2, 3].map((index) => {
        const x = radius * (index === 3 ? -0.58 : 0.52);
        const z = (index - 1) * 4.1;
        return (
          <group key={index} position={[x, islandTopHeight(x, z, radius), z]}>
            <FlightPine scale={0.8 + index % 3 * 0.2} />
          </group>
        );
      })}
      {Array.from({ length: 7 }, (_, index) => {
        const angle = index * 2.4;
        const x = Math.cos(angle) * radius * 0.82;
        const z = Math.sin(angle) * radius * 0.82;
        return (
          <group key={index} position={[x, islandTopHeight(x, z, radius) - 0.12, z]} scale={0.8 + index % 3 * 0.15} rotation={[0, angle, 0]}>
            <FlightRock />
          </group>
        );
      })}
    </group>
  );
}
