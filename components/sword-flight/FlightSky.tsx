import { Environment, useEnvironment } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { createFlightSkyMaterial } from "@/lib/flightSkyMaterial";

const SKY_URL = "/textures/sword-flight/sky.hdr";

export function FlightSky() {
  const sky = useEnvironment({ files: SKY_URL });
  const material = useMemo(() => createFlightSkyMaterial(sky), [sky]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <>
      <Environment map={sky} environmentIntensity={0.55} />
      <mesh material={material} frustumCulled={false} renderOrder={-1000}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
    </>
  );
}

useEnvironment.preload({ files: SKY_URL });
