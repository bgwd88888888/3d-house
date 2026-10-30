import { useLayoutEffect, useRef } from "react";
import { InstancedMesh, Object3D } from "three";
import { usePathTextures } from "@/hooks/usePathTextures";
import type { FlightStoneBlock } from "@/lib/flightIslandLayout";

export function FlightStonework({ blocks }: { blocks: readonly FlightStoneBlock[] }) {
  const mesh = useRef<InstancedMesh>(null);
  const { primary: stone } = usePathTextures();
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const transform = new Object3D();
    blocks.forEach((block, index) => {
      transform.position.set(...block.position);
      transform.scale.set(...block.size);
      transform.updateMatrix();
      mesh.current!.setMatrixAt(index, transform.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [blocks]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, blocks.length]} castShadow receiveShadow>
      <boxGeometry />
      <meshStandardMaterial {...stone} color="#a4aaa0" roughness={0.92} normalScale={[0.5, 0.5]} />
    </instancedMesh>
  );
}
