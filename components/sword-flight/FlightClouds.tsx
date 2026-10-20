import { Cloud, Clouds, useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { MeshBasicMaterial, RepeatWrapping, SRGBColorSpace } from "three";
import { FLIGHT_CLOUDS } from "@/lib/flightCloudLayout";

const PUFF_URL = "/textures/sword-flight/cloud-puff.webp";
const SEA_URL = "/textures/sword-flight/cloud-sea.webp";

export function FlightClouds() {
  const texture = useTexture(SEA_URL);
  const sea = useMemo(() => {
    const map = texture.clone();
    map.wrapS = map.wrapT = RepeatWrapping;
    map.repeat.set(10, 10);
    map.colorSpace = SRGBColorSpace;
    map.needsUpdate = true;
    return map;
  }, [texture]);
  useEffect(() => () => sea.dispose(), [sea]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[40, -37, 25]}>
        <planeGeometry args={[2400, 2400]} />
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
