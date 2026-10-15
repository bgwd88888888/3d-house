import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Mesh } from "three";

const vertexShader = `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const fragmentShader = `
varying vec3 vDirection;
void main() {
  vec3 direction = normalize(vDirection);
  float elevation = smoothstep(-0.08, 0.8, direction.y);
  vec3 color = mix(vec3(0.69, 0.79, 0.81), vec3(0.26, 0.48, 0.62), elevation);
  vec3 sun = normalize(vec3(-0.52, 0.35, -0.78));
  float alignment = max(0.0, dot(direction, sun));
  color += vec3(0.24, 0.16, 0.07) * pow(alignment, 18.0);
  color += vec3(0.4, 0.28, 0.12) * pow(alignment, 150.0);
  color = mix(color, vec3(1.0, 0.91, 0.7), smoothstep(0.9990, 0.9993, alignment));
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function FlightSky() {
  const sky = useRef<Mesh>(null);
  useFrame(({ camera }) => { sky.current?.position.copy(camera.position); });
  return (
    <mesh ref={sky}>
      <sphereGeometry args={[590, 32, 16]} />
      <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} side={BackSide} depthWrite={false} />
    </mesh>
  );
}
