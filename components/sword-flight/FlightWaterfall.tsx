import type { RefObject } from "react";
import { islandEdge, islandTopHeight } from "@/lib/flightIslandShape";
import { useFlightWaterfallMaterial } from "@/hooks/useFlightWaterfallMaterial";
import type { FlightIsland } from "@/lib/swordFlightSpec";

export function FlightWaterfall({ island, running }: { island: FlightIsland; running: RefObject<boolean> }) {
  const material = useFlightWaterfallMaterial(running);
  return (
    <group>
      {[0.65, 0.84].map((angle, index) => {
        const edge = islandEdge(angle, island.radius);
        const x = Math.cos(angle) * edge;
        const z = Math.sin(angle) * edge;
        const top = islandTopHeight(x, z, island.radius) + 0.15;
        const length = island.position[1] + top + 32;
        return (
          <mesh key={angle} position={[x, top - length / 2, z]} rotation={[0, Math.PI / 2 - angle, 0]} material={material}>
            <planeGeometry args={[index === 0 ? 5.5 : 2.8, length]} />
          </mesh>
        );
      })}
    </group>
  );
}
