import { useEffect, useMemo, type RefObject } from "react";
import { createFlightRobeGeometry, createFlightSwordGeometry } from "@/lib/flightRiderGeometry";
import { FlightRibbons } from "./FlightRibbons";

export function SwordRider({ running }: { running: RefObject<boolean> }) {
  const robe = useMemo(() => createFlightRobeGeometry(), []);
  const blade = useMemo(() => createFlightSwordGeometry(), []);
  useEffect(() => () => { robe.dispose(); blade.dispose(); }, [robe, blade]);
  return (
    <group>
      <mesh geometry={blade} position={[0, 0, 1.25]}>
        <meshStandardMaterial color="#d9eef0" emissive="#7cc8d7" emissiveIntensity={0.22} metalness={0.65} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.075, -1.05]}>
        <boxGeometry args={[0.035, 0.008, 4.4]} />
        <meshBasicMaterial color="#f2e1ae" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.25, 0.04, 1.3]} rotation={[0, side * -0.25, Math.PI / 2]}>
          <capsuleGeometry args={[0.075, 0.48, 4, 10]} />
          <meshStandardMaterial color="#ba9a57" metalness={0.55} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 0, 1.85]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.085, 0.1, 0.85, 16]} />
        <meshStandardMaterial color="#294954" roughness={0.7} />
      </mesh>
      {[0, 1, 2, 3, 4].map((index) => (
        <mesh key={index} position={[0, 0, 1.5 + index * 0.17]}>
          <torusGeometry args={[0.095, 0.015, 5, 12]} />
          <meshStandardMaterial color="#bda366" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0, 2.35]} scale={[0.8, 0.6, 1]}>
        <sphereGeometry args={[0.17, 12, 8]} />
        <meshStandardMaterial color="#c3a764" metalness={0.5} roughness={0.4} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.17, 0, side * 0.22]}>
          <mesh position={[0, 0.35, 0]}>
            <capsuleGeometry args={[0.1, 0.35, 4, 12]} />
            <meshStandardMaterial color="#354e55" />
          </mesh>
          <mesh position={[0, 0.12, -0.09]} scale={[0.85, 0.6, 1.6]}>
            <sphereGeometry args={[0.16, 12, 8]} />
            <meshStandardMaterial color="#24383d" roughness={0.75} />
          </mesh>
        </group>
      ))}
      <mesh geometry={robe}>
        <meshStandardMaterial color="#356b73" roughness={0.82} metalness={0.05} />
      </mesh>
      <mesh position={[0, 1.41, 0]} scale={[1, 1, 0.78]}>
        <cylinderGeometry args={[0.24, 0.25, 0.12, 32]} />
        <meshStandardMaterial color="#bda976" roughness={0.7} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.1, 1.82, -0.2]} rotation={[0, 0, side * -0.4]}>
            <boxGeometry args={[0.065, 0.36, 0.035]} />
            <meshStandardMaterial color="#d9dac7" />
          </mesh>
          <group position={[side * 0.36, 1.72, 0]} rotation={[0.12, 0, side * 0.32]}>
            <mesh position={[0, -0.22, 0]}>
              <cylinderGeometry args={[0.15, 0.2, 0.64, 20]} />
              <meshStandardMaterial color="#356b73" roughness={0.82} />
            </mesh>
            <mesh position={[0, -0.52, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.06, 20]} />
              <meshStandardMaterial color="#b5bca5" />
            </mesh>
            <mesh position={[0, -0.61, -0.02]} scale={[0.75, 1.2, 0.8]}>
              <sphereGeometry args={[0.09, 12, 8]} />
              <meshStandardMaterial color="#d5b799" />
            </mesh>
          </group>
        </group>
      ))}
      <mesh position={[0, 2.03, 0]}>
        <cylinderGeometry args={[0.085, 0.1, 0.18, 12]} />
        <meshStandardMaterial color="#d5b799" />
      </mesh>
      <mesh position={[0, 2.22, -0.025]} scale={[0.88, 1.15, 0.93]}>
        <sphereGeometry args={[0.19, 20, 16]} />
        <meshStandardMaterial color="#d5b799" roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.3, 0.025]} scale={[0.95, 0.85, 1]}>
        <sphereGeometry args={[0.2, 20, 16]} />
        <meshStandardMaterial color="#243238" roughness={0.65} />
      </mesh>
      <mesh position={[0, 2.49, 0.025]} scale={[1, 1.2, 1]}>
        <sphereGeometry args={[0.085, 12, 10]} />
        <meshStandardMaterial color="#243238" />
      </mesh>
      <mesh position={[0, 2.47, 0.025]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.33, 8]} />
        <meshStandardMaterial color="#cfb77f" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.98, 0.14]} rotation={[-0.2, 0, 0]}>
        <capsuleGeometry args={[0.075, 0.38, 4, 12]} />
        <meshStandardMaterial color="#243238" roughness={0.75} />
      </mesh>
      <FlightRibbons running={running} />
    </group>
  );
}
