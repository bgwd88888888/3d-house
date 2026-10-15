import { useEffect, useMemo } from "react";
import { BufferGeometry, DataTexture, Float32BufferAttribute, LinearFilter, RGBAFormat, SRGBColorSpace } from "three";

function createCloudTexture() {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  const lobes = [[-0.36, 0.05, 0.24], [-0.05, 0.2, 0.32], [0.3, 0.05, 0.27], [0.02, -0.14, 0.36], [-0.54, -0.1, 0.18], [0.52, -0.12, 0.19]];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size * 2 - 1;
      const v = y / size * 2 - 1;
      let density = 0;
      for (const [cx, cy, radius] of lobes) {
        density += Math.exp(-((u - cx) ** 2 + (v - cy) ** 2) / (radius * radius) * 2);
      }
      const detail = 0.93 + Math.sin(u * 31 + Math.sin(v * 19)) * Math.cos(v * 27) * 0.07;
      const alpha = Math.min(0.85, density * 0.65) * detail;
      const offset = (y * size + x) * 4;
      const shade = Math.max(0, Math.min(1, (v + 0.5) * 0.65));
      pixels[offset] = 207 + shade * 40;
      pixels[offset + 1] = 222 + shade * 28;
      pixels[offset + 2] = 226 + shade * 23;
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function FlightClouds() {
  const texture = useMemo(() => createCloudTexture(), []);
  const geometry = useMemo(() => {
    const positions: number[] = [];
    for (let index = 0; index < 52; index += 1) {
      const angle = index * 2.39996;
      const radius = 30 + Math.sqrt(index / 52) * 320;
      positions.push(Math.cos(angle) * radius + 40, -17 + Math.sin(index * 7) * 5, Math.sin(angle) * radius + 25);
    }
    return new BufferGeometry().setAttribute("position", new Float32BufferAttribute(positions, 3));
  }, []);
  useEffect(() => () => { texture.dispose(); geometry.dispose(); }, [texture, geometry]);
  return (
    <points geometry={geometry}>
      <pointsMaterial map={texture} size={115} transparent opacity={0.72} depthWrite={false} sizeAttenuation />
    </points>
  );
}
