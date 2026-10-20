import { useEffect, useMemo, type RefObject } from "react";
import { createFlightRobeGeometry, createFlightSleeveGeometry } from "@/lib/flightRiderGeometry";
import { useFlightClothMaterial } from "@/hooks/useFlightClothMaterial";
import { FlightRibbons } from "./FlightRibbons";

export function FlightGarment({ running }: { running: RefObject<boolean> }) {
  const material = useFlightClothMaterial(running);
  const robe = useMemo(() => createFlightRobeGeometry(), []);
  const sleeves = useMemo(() => [-1, 1].map(createFlightSleeveGeometry), []);
  useEffect(() => () => { robe.dispose(); sleeves.forEach((geometry) => geometry.dispose()); }, [robe, sleeves]);
  return (
    <group>
      <mesh geometry={robe} material={material} />
      {sleeves.map((geometry, index) => <mesh key={index} geometry={geometry} material={material} />)}
      <mesh position={[0, 1.41, 0]} scale={[1, 1, 0.72]}>
        <cylinderGeometry args={[0.235, 0.24, 0.075, 32]} />
        <meshStandardMaterial color="#555b53" roughness={0.8} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.09, 1.84, -0.16]} rotation={[0.18, 0, side * -0.44]}>
            <boxGeometry args={[0.035, 0.32, 0.015]} />
            <meshStandardMaterial color="#c6c4b5" roughness={1} />
          </mesh>
          <mesh position={[side * 0.475, 1.29, -0.015]} rotation={[0.12, 0, side * 0.17]} scale={[1, 1, 0.85]}>
            <cylinderGeometry args={[0.118, 0.116, 0.045, 24]} />
            <meshStandardMaterial color="#a6ada2" roughness={1} />
          </mesh>
        </group>
      ))}
      <FlightRibbons running={running} />
    </group>
  );
}
