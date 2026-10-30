import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, InstancedMesh, Object3D } from "three";

const FLOCKS = [[-40, 30, -50], [140, 65, -180], [-260, 40, 140]];
const BIRD_COUNT = 18;

export function FlightBirds({ running }: { running: RefObject<boolean> }) {
  const birds = useRef<InstancedMesh>(null);
  const time = useRef(0);
  const transform = useMemo(() => new Object3D(), []);
  const geometry = useMemo(() => new BufferGeometry().setAttribute("position", new Float32BufferAttribute([
    0, 0, -0.4, -0.85, 0.1, 0.1, 0, 0, 0.3,
    0, 0, -0.4, 0, 0, 0.3, 0.85, 0.1, 0.1,
  ], 3)), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, delta) => {
    if (!birds.current) return;
    if (running.current) time.current += Math.min(delta, 0.05);
    const positions = geometry.getAttribute("position");
    positions.setY(1, Math.sin(time.current * 5) * 0.42);
    positions.setY(5, Math.sin(time.current * 5) * 0.42);
    positions.needsUpdate = true;
    for (let index = 0; index < BIRD_COUNT; index += 1) {
      const flock = FLOCKS[Math.floor(index / 6)];
      const angle = time.current * 0.09 + index * 0.24;
      const radius = 26 + index % 3 * 4;
      transform.position.set(flock[0] + Math.cos(angle) * radius, flock[1] + Math.sin(angle * 2 + index) * 3 + index % 4, flock[2] + Math.sin(angle) * radius);
      transform.rotation.set(0, -angle, -0.12);
      transform.updateMatrix();
      birds.current.setMatrixAt(index, transform.matrix);
    }
    birds.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={birds} args={[geometry, undefined, BIRD_COUNT]} frustumCulled={false}>
      <meshBasicMaterial color="#405253" side={DoubleSide} />
    </instancedMesh>
  );
}
