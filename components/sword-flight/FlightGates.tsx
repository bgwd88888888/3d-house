import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Quaternion, Vector3 } from "three";
import { FLIGHT_GATE_RADIUS, FLIGHT_GATES } from "@/lib/swordFlightSpec";
import { gateNormal, type FlightState } from "@/lib/swordFlightSimulation";
import { createFlightGateMaterial } from "@/lib/flightGateMaterial";

export function FlightGates({ flight }: { flight: RefObject<FlightState> }) {
  const materials = useMemo(() => FLIGHT_GATES.map(() => createFlightGateMaterial()), []);
  const lastGate = useRef(-1);
  const rotations = useMemo(() => FLIGHT_GATES.map((_, index) => (
    new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...gateNormal(index)))
  )), []);
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);

  useFrame(() => {
    if (lastGate.current === flight.current.gate) return;
    lastGate.current = flight.current.gate;
    materials.forEach((material, index) => {
      material.uniforms.active.value = index === flight.current.gate ? 1 : 0;
    });
  });

  return (
    <>
      {FLIGHT_GATES.map((position, index) => (
        <group key={index} position={[...position]} quaternion={rotations[index]}>
          <mesh material={materials[index]}>
            <planeGeometry args={[(FLIGHT_GATE_RADIUS + 0.5) * 2, (FLIGHT_GATE_RADIUS + 0.5) * 2]} />
          </mesh>
        </group>
      ))}
    </>
  );
}
