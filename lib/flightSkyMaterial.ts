import { BackSide, Color, ShaderMaterial, type Texture } from "three";
import { FLIGHT_FOG_COLOR } from "./flightAtmosphereSpec";

export function createFlightSkyMaterial(sky: Texture) {
  return new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      sky: { value: sky },
      // The horizon is blended after output encoding to match Three's fog color.
      horizon: { value: new Color(FLIGHT_FOG_COLOR).convertLinearToSRGB() },
    },
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
        gl_Position = clip.xyww;
      }
    `,
    fragmentShader: `
      uniform sampler2D sky;
      uniform vec3 horizon;
      varying vec3 vDirection;
      #include <common>
      void main() {
        vec3 direction = normalize(vDirection);
        gl_FragColor = vec4(texture2D(sky, equirectUv(direction)).rgb * 0.85, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb = mix(horizon, gl_FragColor.rgb, smoothstep(-0.02, 0.24, direction.y));
      }
    `,
  });
}
