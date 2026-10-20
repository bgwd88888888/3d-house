import { useEffect, useMemo } from "react";
import { createFlightMountainGeometry } from "@/lib/flightMountainGeometry";
import { useFlightTextures } from "@/hooks/useFlightTextures";

export function FlightMountains() {
  const textures = useFlightTextures("mountain");
  const geometries = useMemo(() => Array.from({ length: 5 }, (_, index) => createFlightMountainGeometry(index + 1)), []);
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);
  return (
    <group>
      {Array.from({ length: 28 }, (_, index) => {
        const distant = index >= 16;
        const angle = distant ? (index - 16) / 12 * Math.PI * 2 + 0.2 : index / 16 * Math.PI * 2;
        const radius = (distant ? 720 : 470) + Math.sin(index * 4) * 24;
        const width = distant ? 130 + index % 3 * 15 : 72 + index % 4 * 10;
        const height = distant ? 180 + index % 4 * 22 : 125 + index % 5 * 22;
        return (
          <mesh key={index} geometry={geometries[index % 5]} position={[Math.cos(angle) * radius + 40, -45, Math.sin(angle) * radius + 25]} rotation={[0, index * 1.73, 0]} scale={[width, height, width * 0.8]}>
            <meshStandardMaterial {...textures} vertexColors color={distant ? "#c0cdd0" : "#e2e4da"} roughness={1} normalScale={[0.85, 0.85]} />
          </mesh>
        );
      })}
    </group>
  );
}
