import { Detailed } from "@react-three/drei";
import { FLIGHT_ISLAND_LAYOUTS } from "@/lib/flightIslandLayout";
import { FlightPine } from "./FlightPine";
import { FlightRock } from "./FlightRock";

export function FlightIslandVegetation({ islandId }: { islandId: string }) {
  const { trees, rocks } = FLIGHT_ISLAND_LAYOUTS[islandId];
  return (
    <Detailed distances={[0, 340]} hysteresis={0.1}>
      <group>
        {trees.map((tree, index) => (
          <group key={index} position={[...tree.position]} rotation={[0, index * 1.7, 0]}>
            <FlightPine scale={tree.scale} />
          </group>
        ))}
        {rocks.map((rock, index) => (
          <group key={index} position={[...rock.position]} scale={rock.scale} rotation={[0, rock.angle, 0]}>
            <FlightRock />
          </group>
        ))}
      </group>
      <group />
    </Detailed>
  );
}
