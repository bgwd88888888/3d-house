import { useEffect, useMemo } from "react";
import { createFlightSwordGeometry } from "@/lib/flightRiderGeometry";

export function FlightSword() {
  const blade = useMemo(() => createFlightSwordGeometry(), []);
  useEffect(() => () => blade.dispose(), [blade]);
  return (
    <group>
      <mesh geometry={blade} position={[0, 0, 1.25]}>
        <meshStandardMaterial color="#c1d0d2" metalness={0.8} roughness={0.27} />
      </mesh>
      <mesh position={[0, 0.075, -1.05]}>
        <boxGeometry args={[0.015, 0.008, 4.4]} />
        <meshStandardMaterial color="#b7cbd0" emissive="#6e9fa6" emissiveIntensity={0.2} metalness={0.65} roughness={0.3} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.21, 0.02, 1.3]} rotation={[0, side * -0.28, Math.PI / 2]}>
          <capsuleGeometry args={[0.045, 0.36, 4, 10]} />
          <meshStandardMaterial color="#867853" metalness={0.65} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0, 1.75]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.075, 0.7, 16]} />
        <meshStandardMaterial color="#39483e" roughness={0.85} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <mesh key={index} position={[0, 0, 1.44 + index * 0.12]}>
          <torusGeometry args={[0.073, 0.009, 5, 12]} />
          <meshStandardMaterial color="#8b866a" metalness={0.3} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0, 2.15]} scale={[0.8, 0.5, 1]}>
        <sphereGeometry args={[0.12, 12, 8]} />
        <meshStandardMaterial color="#867853" metalness={0.65} roughness={0.4} />
      </mesh>
    </group>
  );
}
