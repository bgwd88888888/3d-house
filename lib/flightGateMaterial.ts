import { Color, DoubleSide, ShaderMaterial, UniformsLib, UniformsUtils } from "three";
import { FLIGHT_GATE_RADIUS } from "./swordFlightSpec";

export function createFlightGateMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    fog: true,
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      active: { value: 0 },
      radius: { value: FLIGHT_GATE_RADIUS },
      activeColor: { value: new Color("#e9d5a3") },
      idleColor: { value: new Color("#c5d5d5") },
    },
    vertexShader: `
      varying vec2 vGate;
      #include <fog_pars_vertex>
      void main() {
        vGate = position.xy;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform float active;
      uniform float radius;
      uniform vec3 activeColor;
      uniform vec3 idleColor;
      varying vec2 vGate;
      #include <fog_pars_fragment>
      void main() {
        float distanceToRing = abs(length(vGate) - radius);
        float width = max(fwidth(distanceToRing), 0.022);
        float core = 1.0 - smoothstep(0.012, 0.012 + width, distanceToRing);
        float halo = exp(-distanceToRing * distanceToRing / 0.014);
        float alpha = (core * 0.72 + halo * 0.18) * mix(0.3, 1.0, active);
        if (alpha < 0.005) discard;
        gl_FragColor = vec4(mix(idleColor, activeColor, active), alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}
