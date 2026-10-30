import { useEffect, useMemo } from "react";
import { createFlightMountainGeometry } from "@/lib/flightMountainGeometry";
import { useFlightTextures } from "@/hooks/useFlightTextures";
import { FLIGHT_MOUNTAINS } from "@/lib/flightMountainShape";

export function FlightMountains() {
  const textures = useFlightTextures("mountain");
  const geometries = useMemo(() => Array.from({ length: 5 }, (_, index) => createFlightMountainGeometry(index + 1)), []);
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);
  return (
    <group>
      {FLIGHT_MOUNTAINS.map(({ x, z, width, height, rotation, shape, distant }, index) => {
        return (
          <mesh key={index} geometry={geometries[shape]} position={[x, -45, z]} rotation={[0, rotation, 0]} scale={[width, height, width * 0.8]}>
            <meshStandardMaterial {...textures} vertexColors color={distant ? "#c0cdd0" : "#e2e4da"} roughness={1} normalScale={[0.85, 0.85]} />
          </mesh>
        );
      })}
    </group>
  );
}
