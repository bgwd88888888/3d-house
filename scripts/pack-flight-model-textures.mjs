// Repack embedded model images as WebP without changing mesh buffers or UVs.
// Usage: node scripts/pack-flight-model-textures.mjs model.glb [...]
import fs from "node:fs/promises";
import sharp from "sharp";

for (const file of process.argv.slice(2)) {
  const input = await fs.readFile(file);
  const jsonLength = input.readUInt32LE(12);
  const model = JSON.parse(input.subarray(20, 20 + jsonLength).toString());
  const binary = input.subarray(28 + jsonLength);
  const replacements = new Map();
  for (const image of model.images ?? []) {
    const view = model.bufferViews[image.bufferView];
    const bytes = binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    replacements.set(image.bufferView, await sharp(bytes).webp({ quality: /nor/i.test(image.name) ? 95 : 88, alphaQuality: 100 }).toBuffer());
    image.mimeType = "image/webp";
  }
  for (const texture of model.textures ?? []) {
    if (texture.source === undefined) continue;
    texture.extensions = { ...texture.extensions, EXT_texture_webp: { source: texture.source } };
    delete texture.source;
  }
  model.extensionsUsed = [...new Set([...(model.extensionsUsed ?? []), "EXT_texture_webp"])];
  model.extensionsRequired = [...new Set([...(model.extensionsRequired ?? []), "EXT_texture_webp"])];
  const chunks = [];
  let offset = 0;
  for (const [index, view] of model.bufferViews.entries()) {
    const bytes = replacements.get(index) ?? binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    view.byteOffset = offset;
    view.byteLength = bytes.length;
    chunks.push(bytes);
    const padding = (4 - bytes.length % 4) % 4;
    chunks.push(Buffer.alloc(padding));
    offset += bytes.length + padding;
  }
  model.buffers = [{ byteLength: offset }];
  const data = Buffer.concat(chunks);
  const json = Buffer.from(JSON.stringify(model));
  const jsonPadded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + jsonPadded.length + data.length, 8);
  header.writeUInt32LE(jsonPadded.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(data.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  const output = Buffer.concat([header, jsonPadded, binHeader, data]);
  await fs.writeFile(file, output);
  console.log(`${file}: ${input.length} -> ${output.length} bytes`);
}
