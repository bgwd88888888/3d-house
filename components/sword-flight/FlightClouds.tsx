import { Cloud, Clouds, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, MeshBasicMaterial, RepeatWrapping, SRGBColorSpace } from "three";
import { FLIGHT_CLOUDS } from "@/lib/flightCloudLayout";

const PUFF_URL = "/textures/sword-flight/cloud-puff.webp";
const SEA_URL = "/textures/sword-flight/cloud-sea.webp";

export function FlightClouds() {
  const floor = useRef<Mesh>(null);
  const texture = useTexture(SEA_URL);
  const sea = useMemo(() => {
    const map = texture.clone();
    map.wrapS = map.wrapT = RepeatWrapping;
    map.repeat.set(32, 32);
    map.colorSpace = SRGBColorSpace;
    map.needsUpdate = true;
    return map;
  }, [texture]);
  useEffect(() => () => sea.dispose(), [sea]);
  useFrame(({ camera }) => {
    if (!floor.current) return;
    // Shift by whole texture repeats so the cloud floor never exposes an edge.
    floor.current.position.x = Math.round(camera.position.x / 1000) * 1000;
    floor.current.position.z = Math.round(camera.position.z / 1000) * 1000;
  });

  return (
    <group>
      <mesh ref={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, -37, 0]}>
        <planeGeometry args={[8000, 8000]} />
        <meshBasicMaterial map={sea} color="#dce3e3" />
      </mesh>
      {/* World-space, depth-sorted billboards avoid the GPU point-size ceiling. */}
      <Clouds texture={PUFF_URL} material={MeshBasicMaterial} limit={FLIGHT_CLOUDS.length} frustumCulled={false}>
        {FLIGHT_CLOUDS.map((cloud, index) => (
          <Cloud key={index} {...cloud} seed={index + 1} segments={1} scale={[1, 0.32, 1]} growth={0} speed={0} fade={50} color="#f0f2ed" />
        ))}
      </Clouds>
    </group>
  );
}

useTexture.preload([PUFF_URL, SEA_URL]);
