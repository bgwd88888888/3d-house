import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, PlaneGeometry } from "three";

export function FlightRibbons({ running }: { running: RefObject<boolean> }) {
  const time = useRef(0);
  const geometry = useMemo(() => {
    const ribbon = new PlaneGeometry(0.045, 1.5, 1, 16);
    ribbon.rotateX(Math.PI / 2);
    ribbon.translate(0, 0, 0.9);
    return ribbon;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, delta) => {
    if (running.current) time.current += Math.min(delta, 0.05);
    const position = geometry.getAttribute("position");
    for (let index = 0; index < position.count; index += 1) {
      const z = position.getZ(index);
      position.setY(index, Math.sin(z * 4 - time.current * 7) * z * 0.06 - z * 0.15);
    }
    position.needsUpdate = true;
  });
  return (
    <group position={[0, 1.4, 0.21]}>
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={geometry} position={[side * 0.14, 0, 0]} rotation={[0, side * 0.12, 0]} frustumCulled={false}>
          <meshStandardMaterial color="#6f8077" roughness={1} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
