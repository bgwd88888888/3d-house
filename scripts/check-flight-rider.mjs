import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const require = createRequire(import.meta.url);
const compiled = process.argv[2];
assert.ok(compiled, 'Pass the directory containing compiled flightFairyRig.js and flightRiderPose.js');
const { createFlightFairy } = require(resolve(compiled, 'flightFairyRig.js'));
const { createRiderMotion, advanceRiderMotion, sampleRiderPose } = require(resolve(compiled, 'flightRiderPose.js'));

// Keep the real skeleton, weights and morphs. Skip image decoding in this Node-only check.
function geometryAsset(bytes) {
  const jsonLength = bytes.readUInt32LE(12);
  const asset = JSON.parse(bytes.subarray(20, 20 + jsonLength));
  for (const material of asset.materials) {
    for (const key of Object.keys(material)) if (key.endsWith('Texture')) delete material[key];
    for (const key of Object.keys(material.pbrMetallicRoughness ?? {})) {
      if (key.endsWith('Texture')) delete material.pbrMetallicRoughness[key];
    }
  }
  const encoded = Buffer.from(JSON.stringify(asset));
  const json = Buffer.concat([encoded, Buffer.alloc((4 - encoded.length % 4) % 4, 32)]);
  const binary = bytes.subarray(20 + jsonLength);
  const output = Buffer.alloc(20 + json.length + binary.length);
  output.writeUInt32LE(0x46546c67, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(json.length, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  json.copy(output, 20);
  binary.copy(output, 20 + json.length);
  return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
}

const bytes = readFileSync('public/models/sword-flight/fairy-rider.glb');
const { scene } = await new GLTFLoader().parseAsync(geometryAsset(bytes), '');
const fairy = createFlightFairy(scene);
const meshes = [];
fairy.model.traverse((object) => { if (object.isSkinnedMesh) meshes.push(object); });
const shoes = meshes.filter((mesh) => mesh.material.name.includes('Shoes'));
const point = new Vector3();
function pose(motion) {
  fairy.apply(motion);
  fairy.model.updateMatrixWorld(true);
  meshes.forEach((mesh) => mesh.skeleton.update());
}

await test('one coherent rig owns the body, dress, hands, hair and blink', () => {
  assert.ok(bytes.length < 2 * 1024 * 1024);
  for (const name of ['J_Bip_C_Hips', 'J_Bip_C_Head', 'J_Bip_L_LowerArm', 'J_Bip_R_LowerLeg', 'FairyRibbonL0']) assert.ok(fairy.bones.has(name), name);
  assert.ok(meshes.some((mesh) => mesh.morphTargetDictionary?.Blink !== undefined));
  for (const mesh of meshes) {
    const weights = mesh.geometry.getAttribute('skinWeight');
    for (let i = 0; i < weights.count; i++) assert.ok(Math.abs(weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i) - 1) < 0.003);
  }
});

await test('walking and reverse walking keep planted soles on the ground throughout the gait', () => {
  assert.ok(shoes.length);
  for (const speed of [2.1, 3.8]) for (const direction of [-1, 1]) for (let frame = 0; frame < 120; frame++) {
    pose({ ...createRiderMotion('walking'), time: frame / 60, phase: frame / 120, speed, movement: 1, direction });
    let lowest = Infinity;
    for (const mesh of shoes) for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
      assert.ok(Number.isFinite(point.y));
      lowest = Math.min(lowest, point.y);
    }
    assert.ok(lowest > -0.012 && lowest < 0.025, `sole ${lowest}, speed ${speed}, phase ${frame / 120}, direction ${direction}`);
  }
});

await test('flight, landing, idle and stride poses produce finite skinning and joint rotations', () => {
  for (const mode of ['flying', 'walking']) for (const phase of [0, 0.25, 0.5, 0.75]) {
    pose({ ...createRiderMotion(mode), phase, time: 3.9, speed: 2.1, movement: mode === 'walking' ? 1 : 0, landing: 0.5, bank: 0.4 });
    for (const mesh of meshes) for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      mesh.getVertexPosition(i, point);
      assert.ok(point.toArray().every(Number.isFinite), mesh.name);
    }
    for (const { bone } of fairy.bones.values()) assert.ok(Math.abs(bone.quaternion.length() - 1) < 0.0001);
  }
});

await test('mode changes blend continuously, and a paused clock preserves the complete pose', () => {
  const start = createRiderMotion('flying');
  const state = { mode: 'walking', speed: 2.1, pitch: 0, bank: 0 };
  assert.equal(advanceRiderMotion(start, state, 1, 0), start);
  const next = advanceRiderMotion(start, state, 1, 1 / 60);
  assert.ok(next.flight > 0.8 && next.flight < 1);
  assert.equal(next.landing, 0);
  let settled = next;
  for (let i = 0; i < 120; i++) settled = advanceRiderMotion(settled, state, 1, 1 / 60);
  assert.ok(settled.flight < 0.001);
  assert.ok(settled.movement > 0.99);
  const open = sampleRiderPose({ ...settled, time: 3.5 });
  const closed = sampleRiderPose({ ...settled, time: 3.9 });
  assert.equal(open.blink, 0);
  assert.ok(closed.blink > 0.99);
  assert.deepEqual(sampleRiderPose(advanceRiderMotion(settled, state, 1, 0)), sampleRiderPose(settled));
});

fairy.dispose();
