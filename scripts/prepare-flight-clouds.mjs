// Generate the seamless cloud floor and pack Drei's default cloud sprite.
// Usage: node scripts/prepare-flight-clouds.mjs /path/to/drei-cloud.png
import sharp from "sharp";

function noise(x, y, period) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const hash = (a, b) => {
    const value = Math.sin(((a % period + period) % period) * 127.1 + ((b % period + period) % period) * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const fx = (x - ix) ** 2 * (3 - 2 * (x - ix));
  const fy = (y - iy) ** 2 * (3 - 2 * (y - iy));
  return (hash(ix, iy) * (1 - fx) + hash(ix + 1, iy) * fx) * (1 - fy)
    + (hash(ix, iy + 1) * (1 - fx) + hash(ix + 1, iy + 1) * fx) * fy;
}

function detail(u, v) {
  return noise(u * 8, v * 8, 8) * 0.56 + noise(u * 16, v * 16, 16) * 0.27
    + noise(u * 32, v * 32, 32) * 0.12 + noise(u * 64, v * 64, 64) * 0.05;
}

const size = 512;
const pixels = Buffer.alloc(size * size * 4);
for (let y = 0; y < size; y += 1) {
  for (let x = 0; x < size; x += 1) {
    const u = x / size;
    const v = y / size;
    const grain = detail(u, v);
    const light = detail(u - 0.012, v - 0.018) - grain;
    const shade = 0.82 + grain * 0.12 + light * 0.4;
    const offset = (y * size + x) * 4;
    pixels[offset] = Math.min(255, shade * 255);
    pixels[offset + 1] = Math.min(255, shade * 252 + 3);
    pixels[offset + 2] = Math.min(255, shade * 245 + 10);
    pixels[offset + 3] = 255;
  }
}
await sharp(pixels, { raw: { width: size, height: size, channels: 4 } })
  .webp({ quality: 90 }).toFile("public/textures/sword-flight/cloud-sea.webp");
if (process.argv[2]) {
  await sharp(process.argv[2]).webp({ quality: 92, alphaQuality: 100 })
    .toFile("public/textures/sword-flight/cloud-puff.webp");
}
