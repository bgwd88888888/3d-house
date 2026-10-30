import { memo, useEffect, useMemo, type RefObject } from "react";
import type { FlightIsland } from "@/lib/swordFlightSpec";
import { FLIGHT_ISLAND_LAYOUTS } from "@/lib/flightIslandLayout";
import { createIslandGeometry } from "@/lib/flightLandscapeGeometry";
import { useFlightTextures } from "@/hooks/useFlightTextures";
import { FlightPavilion } from "./FlightPavilion";
import { FlightStonework } from "./FlightStonework";
import { FlightIslandVegetation } from "./FlightIslandVegetation";
import { FlightWaterfall } from "./FlightWaterfall";

export const FloatingIsland = memo(function FloatingIsland({ island, running }: { island: FlightIsland; running: RefObject<boolean> }) {
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
      <FlightStonework blocks={FLIGHT_ISLAND_LAYOUTS[island.id].blocks} />
      {island.landmark === "pavilion" ? <FlightPavilion /> : null}
      {island.landmark === "garden" ? (
        <mesh position={[0, 2.94, -5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[9.4, 7.4]} />
          <meshStandardMaterial color="#608e85" roughness={0.18} metalness={0.35} transparent opacity={0.72} />
        </mesh>
      ) : null}
      <FlightIslandVegetation islandId={island.id} />
      {island.waterfall ? <FlightWaterfall island={island} running={running} /> : null}
    </group>
  );
});
