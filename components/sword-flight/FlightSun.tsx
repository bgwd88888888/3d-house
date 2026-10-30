import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { DirectionalLight, Object3D, Vector3 } from "three";
import type { FlightState } from "@/lib/swordFlightTypes";

export function FlightSun({ flight }: { flight: RefObject<FlightState> }) {
  const light = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const bakedAt = useMemo(() => new Vector3(Infinity, Infinity, Infinity), []);
  useFrame(() => {
    if (!light.current) return;
    const [x, y, z] = flight.current.position;
    if (Math.hypot(x - bakedAt.x, y - bakedAt.y, z - bakedAt.z) < 12) return;
    target.position.set(x, y, z);
    light.current.position.set(x - 90, y + 140, z - 120);
    // Only re-bake when leaving the previous area; no continuous shadow rendering.
    light.current.shadow.needsUpdate = true;
    bakedAt.set(x, y, z);
  });
  return (
    <>
      <primitive object={target} />
      <directionalLight ref={light} target={target} color="#fff0d5" intensity={1.7} castShadow shadow-autoUpdate={false} shadow-mapSize={[2048, 2048]} shadow-camera-left={-85} shadow-camera-right={85} shadow-camera-top={85} shadow-camera-bottom={-85} shadow-camera-near={20} shadow-camera-far={350} shadow-normalBias={0.06} />
    </>
  );
}
