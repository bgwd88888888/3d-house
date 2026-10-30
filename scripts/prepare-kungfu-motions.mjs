// Convert the character-specific Mixamo clips; source names are recorded in the asset README.
// Usage: node scripts/prepare-kungfu-motions.mjs SOURCE_DIRECTORY
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { AnimationClip, AnimationUtils } from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceDirectory = process.argv[2];
if (!sourceDirectory) throw new Error("Pass the directory containing the source FBX files");
const sources = {
  highKick: "Mma_Kick_2", fastRoundhouse: "Mma_Kick_4", cross: "Cross_Punch",
  elbow: "Elbow_Punch", snapKick: "Kicking_8", sideKick: "Side_Kick", backKick: "Kicking_2",
  quickJab: "Punching_3", leadHook: "Punching_4", ninjaIdle: "Ninja_Idle_2",
  capoeiraIdle: "Capoeira", doubleKick: "Kicking_3",
  capoeiraSweep: "Capoeira_2",
};
const clips = [];
for (const [name, source] of Object.entries(sources)) {
  const bytes = await fs.readFile(path.join(sourceDirectory, `${source}.fbx`));
  const model = new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
  let clip = model.animations[0];
  if (!clip) throw new Error(`Missing animation: ${source}`);
  if (name === "capoeiraSweep") clip = AnimationUtils.subclip(clip, name, 120, 210, 30);
  clip.name = name;
  for (const track of clip.tracks) {
    track.name = track.name.replace(/^mixamorig\d*:?/, "");
    if (track.name === "Hips.position") {
      for (let index = 0; index < track.values.length; index += 3) {
        track.values[index] = 0;
        track.values[index + 1] *= 0.01;
        track.values[index + 2] = 0;
      }
    }
  }
  const data = AnimationClip.toJSON(clip);
  const digest = createHash("sha256").update(`kungfu:${name}`).digest("hex").slice(0, 32);
  data.uuid = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20)}`;
  clips.push(data);
}
const output = JSON.stringify({ sourceHipHeight: 0.997919, clips }, (_, value) => typeof value === "number" ? Math.round(value * 1e6) / 1e6 : value);
await fs.writeFile(path.join(root, "public/models/kungfu/extra-motions.json"), output);
console.log(`Prepared ${clips.length} clips: ${Buffer.byteLength(output)} bytes`);
