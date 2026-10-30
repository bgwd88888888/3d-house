import { DoubleSide, ShaderMaterial, UniformsLib, UniformsUtils } from "three";

export function createFlightWaterfallMaterial() {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, side: DoubleSide, fog: true,
    uniforms: { ...UniformsUtils.clone(UniformsLib.fog), time: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      #include <fog_pars_fragment>
      void main() {
        float strands = sin(vUv.x * 91.0 + sin(vUv.y * 12.0 + time * 2.0)) * 0.5 + 0.5;
        float flow = sin(vUv.y * 95.0 + time * 13.0 + vUv.x * 15.0) * 0.5 + 0.5;
        float edge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(0.0, 0.15, 1.0 - vUv.x);
        float mist = smoothstep(0.0, 0.18, vUv.y);
        vec3 color = mix(vec3(0.32, 0.58, 0.61), vec3(0.87, 0.94, 0.9), strands * 0.55 + flow * 0.25);
        gl_FragColor = vec4(color, edge * mist * (0.45 + strands * 0.3));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}
