import { useRef } from "react";
import { Group } from "three";
import { useSwordFlightFrame, type FlightRuntime } from "@/hooks/useSwordFlightFrame";
import { SwordRider } from "./SwordRider";

export function FlightPlayer(props: FlightRuntime) {
  const rider = useRef<Group>(null);
  const wake = useRef<Group>(null);
  useSwordFlightFrame(props, rider, wake);

  return (
    <group ref={rider}>
      <SwordRider running={props.running} />
      <group ref={wake}>
        {[-0.13, 0.13].map((x) => (
          <mesh key={x} position={[x, -0.03, 4.6]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.025, 5.2, 5]} />
            <meshBasicMaterial color="#d7e6e6" transparent opacity={0.18} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
