import { useEffect, useMemo } from "react";
import { createDistantMountainGeometry } from "@/lib/flightLandscapeGeometry";

export function FlightMountains() {
  const geometries = useMemo(() => Array.from({ length: 3 }, (_, index) => createDistantMountainGeometry(index * 2.1)), []);
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);
  return (
    <group>
      {Array.from({ length: 15 }, (_, index) => {
        const angle = index / 15 * Math.PI * 2;
        const radius = 330 + Math.sin(index * 4) * 30;
        return (
          <mesh key={index} geometry={geometries[index % 3]} position={[Math.cos(angle) * radius + 40, -35, Math.sin(angle) * radius + 25]} scale={[38 + index % 4 * 10, 75 + index % 3 * 35, 35 + index % 3 * 12]}>
            <meshStandardMaterial vertexColors roughness={1} />
          </mesh>
        );
      })}
    </group>
  );
}
