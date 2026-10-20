import { useEffect, useMemo, type RefObject } from "react";
import { createFlightHairGeometry } from "@/lib/flightRiderGeometry";
import { useFlightModel } from "@/hooks/useFlightModel";
import { FlightGarment } from "./FlightGarment";
import { FlightSword } from "./FlightSword";

export function SwordRider({ running }: { running: RefObject<boolean> }) {
  const anatomy = useFlightModel("rider");
  const hair = useMemo(() => createFlightHairGeometry(), []);
  useEffect(() => () => hair.dispose(), [hair]);
  return (
    <group>
      <FlightSword />
      <primitive object={anatomy} dispose={null} />
      <FlightGarment running={running} />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.14, 0, side * 0.2]}>
          <mesh position={[0, 0.31, 0]}>
            <capsuleGeometry args={[0.075, 0.35, 4, 12]} />
            <meshStandardMaterial color="#303b36" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.12, -0.07]} scale={[0.8, 0.6, 1.6]}>
            <sphereGeometry args={[0.13, 16, 10]} />
            <meshStandardMaterial color="#272e2b" roughness={0.8} />
          </mesh>
        </group>
      ))}
      <mesh geometry={hair}>
        <meshStandardMaterial color="#252826" roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.34, 0.04]} scale={[1, 0.8, 1.2]}>
        <sphereGeometry args={[0.065, 16, 12]} />
        <meshStandardMaterial color="#252826" roughness={0.65} />
      </mesh>
      <mesh position={[0, 2.34, 0.04]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.22, 8]} />
        <meshStandardMaterial color="#9b957b" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.04, 0.125]} rotation={[-0.25, 0, 0]}>
        <capsuleGeometry args={[0.038, 0.27, 4, 12]} />
        <meshStandardMaterial color="#252826" roughness={0.75} />
      </mesh>
    </group>
  );
}
