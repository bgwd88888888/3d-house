import { useEffect, useMemo, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { createFlightWaterfallMaterial } from "@/lib/flightWaterMaterial";

export function useFlightWaterfallMaterial(running: RefObject<boolean>) {
  const { material, advance } = useMemo(() => {
    const material = createFlightWaterfallMaterial();
    return { material, advance: (delta: number) => { material.uniforms.time.value += Math.min(delta, 0.05); } };
  }, []);
  useFrame((_, delta) => { if (running.current) advance(delta); });
  useEffect(() => () => material.dispose(), [material]);
  return material;
}
