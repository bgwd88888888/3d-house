import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from "three";
import { FLIGHT_GATE_RADIUS, FLIGHT_GATES } from "@/lib/swordFlightSpec";
import { gateNormal, type FlightState } from "@/lib/swordFlightSimulation";

const ACTIVE_COLOR = new Color("#ffcc6b");
const IDLE_COLOR = new Color("#c8edf1");

export function FlightGates({ flight }: { flight: RefObject<FlightState> }) {
  const rings = useRef<(Mesh | null)[]>([]);
  const lastGate = useRef(-1);
  const rotations = useMemo(() => FLIGHT_GATES.map((_, index) => (
    new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...gateNormal(index)))
  )), []);

  useFrame(() => {
    if (lastGate.current === flight.current.gate) return;
    lastGate.current = flight.current.gate;
    rings.current.forEach((ring, index) => {
      if (!ring) return;
      const active = index === flight.current.gate;
      const material = ring.material as MeshBasicMaterial;
      material.color.copy(active ? ACTIVE_COLOR : IDLE_COLOR);
      ring.scale.setScalar(active ? 1 : 0.98);
    });
  });

  return (
    <>
      {FLIGHT_GATES.map((position, index) => (
        <group key={index} position={[...position]} quaternion={rotations[index]}>
          <mesh ref={(mesh) => { rings.current[index] = mesh; }}>
            <torusGeometry args={[FLIGHT_GATE_RADIUS, 0.17, 6, 48]} />
            <meshBasicMaterial color="#c8edf1" />
          </mesh>
          {[0, 1, 2, 3].map((mark) => (
            <mesh key={mark} position={[Math.cos(mark * Math.PI / 2) * 7.65, Math.sin(mark * Math.PI / 2) * 7.65, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.42, 0.42, 0.16]} />
              <meshBasicMaterial color="#e1cd9b" />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}
