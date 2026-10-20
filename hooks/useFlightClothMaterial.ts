import { useEffect, useMemo, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, MeshStandardMaterial, Vector2, type Texture } from "three";
import { useFlightTextures } from "./useFlightTextures";

function createCloth(map: Texture, normalMap: Texture, roughnessMap: Texture) {
  const wind = { value: 0 };
  const material = new MeshStandardMaterial({
    map, normalMap, roughnessMap, color: "#9ba8a0", roughness: 0.95,
    normalScale: new Vector2(0.18, 0.18), side: DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.flightWind = wind;
    shader.vertexShader = `uniform float flightWind;\n${shader.vertexShader}`.replace("#include <begin_vertex>", `
      #include <begin_vertex>
      float hem = pow(max(0.0, 1.35 - position.y), 2.0);
      transformed.x += sin(position.y * 7.0 - flightWind * 4.0) * hem * 0.025;
      transformed.z += sin(position.x * 8.0 - flightWind * 5.0) * hem * 0.045;
    `);
  };
  return { material, advance: (delta: number) => { wind.value += Math.min(delta, 0.05); } };
}

export function useFlightClothMaterial(running: RefObject<boolean>) {
  const { map, normalMap, roughnessMap } = useFlightTextures("cloth");
  const { material, advance } = useMemo(() => createCloth(map, normalMap, roughnessMap), [map, normalMap, roughnessMap]);
  useFrame((_, delta) => {
    if (running.current) advance(delta);
  });
  useEffect(() => () => material.dispose(), [material]);
  return material;
}
