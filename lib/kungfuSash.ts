import * as THREE from "three";
import type { KungfuCollisionWorld } from "./kungfuCollisionWorld";

const BALL_NODE = 16;
const NODE_COUNT = 21;

/** A flexible centerline keeps the ribbon light and the decorative ball round. */
export function createKungfuSash(character: THREE.Object3D, collision: KungfuCollisionWorld) {
  const source = character.getObjectByName("Classic_Costume1_5");
  const anchorBone = character.getObjectByName("MaiSash");
  const hips = character.getObjectByName("Hips");
  if (!source || !anchorBone || !hips) return null;
  const parts: THREE.SkinnedMesh[] = [];
  source.traverse((object) => { if (object instanceof THREE.SkinnedMesh) parts.push(object); });
  if (parts.length !== 3) return null;
  character.updateWorldMatrix(true, true);
  const inverse = new THREE.Matrix4().copy(character.matrixWorld).invert();
  const restAnchor = anchorBone.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse);
  const ballCenter = new THREE.Box3().setFromBufferAttribute(parts[1].geometry.getAttribute("position") as THREE.BufferAttribute).getCenter(new THREE.Vector3());
  const axis = ballCenter.clone().sub(restAnchor).normalize();
  const ballLength = ballCenter.distanceTo(restAnchor);
  const point = new THREE.Vector3();
  let length = ballLength;
  for (const part of parts) {
    const positions = part.geometry.getAttribute("position");
    for (let index = 0; index < positions.count; index++) {
      length = Math.max(length, point.fromBufferAttribute(positions, index).sub(restAnchor).dot(axis));
    }
  }
  const distances = Array.from({ length: NODE_COUNT }, (_, index) => index <= BALL_NODE
    ? ballLength * index / BALL_NODE
    : ballLength + (length - ballLength) * (index - BALL_NODE) / (NODE_COUNT - 1 - BALL_NODE));
  const nodes = distances.map(() => new THREE.Vector3());
  const previous = distances.map(() => new THREE.Vector3());
  const radii = distances.map((distance, index) => index === BALL_NODE ? 0.09 : distance > ballLength - 0.09 && distance < ballLength + 0.07 ? 0.065 : 0.04);
  const weights = distances.map((_, index) => index === 0 ? 0 : index === BALL_NODE ? 0.4 : 1);
  const meshes = parts.map((part) => {
    const mesh = new THREE.Mesh(part.geometry.clone(), part.material);
    mesh.name = `MaiSashCloth_${part.name}`;
    mesh.castShadow = part.castShadow;
    mesh.receiveShadow = part.receiveShadow;
    mesh.frustumCulled = false;
    character.add(mesh);
    return mesh;
  });
  const wasVisible = source.visible;
  source.visible = false;
  const restSide = new THREE.Vector3(1, 0, 0).projectOnPlane(axis).normalize();
  const restBasis = new THREE.Matrix4().makeBasis(restSide, new THREE.Vector3().crossVectors(axis, restSide), axis).invert();
  const basis = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const hipRotation = new THREE.Quaternion();
  const side = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const center = new THREE.Vector3();
  const anchor = new THREE.Vector3();
  const movement = new THREE.Vector3();
  const correction = new THREE.Vector3();
  const contact = new THREE.Vector3();
  const rest = new THREE.Vector3();
  const skinned = new THREE.Vector3();
  const feet = ["LeftToeBase", "RightToeBase"].map((name) => character.getObjectByName(name));
  let previousStep = 1 / 120;
  let initialized = false;
  let floor = 0;

  function project(position: THREE.Vector3, radius: number, precise: boolean) {
    let touched = collision.colliders.project(position, radius);
    if (precise) touched = collision.surface?.project(position, radius + 0.028) || touched;
    if (position.y < floor + radius) { position.y = floor + radius; touched = true; }
    return touched;
  }

  function update(delta: number, resolveSurface: boolean) {
    if (delta <= 0) return;
    inverse.copy(character.matrixWorld).invert();
    anchorBone!.getWorldPosition(anchor).applyMatrix4(inverse);
    floor = Infinity;
    for (const foot of feet) if (foot) floor = Math.min(floor, foot.getWorldPosition(point).applyMatrix4(inverse).y - 0.035);
    if (!Number.isFinite(floor)) floor = 0;
    // Start hanging on the first frame instead of dropping from the source's rigid pose.
    if (!initialized) {
      for (let index = 0; index < NODE_COUNT; index++) {
        nodes[index].copy(anchor).addScaledVector(new THREE.Vector3(0, -1, -0.08).normalize(), distances[index]);
        project(nodes[index], radii[index], resolveSurface);
        previous[index].copy(nodes[index]);
      }
      initialized = true;
    }
    nodes[0].copy(anchor);
    previous[0].copy(anchor);
    for (let index = 1; index < NODE_COUNT; index++) {
      movement.subVectors(nodes[index], previous[index]).multiplyScalar(Math.exp(-4.5 * delta) * delta / previousStep);
      previous[index].copy(nodes[index]);
      nodes[index].add(movement);
      nodes[index].y -= 9.81 * delta * delta;
    }
    previousStep = delta;
    for (let iteration = 0; iteration < 16; iteration++) {
      for (const span of [1, 2]) {
        for (let index = 0; index + span < NODE_COUNT; index++) {
          const next = index + span;
          correction.subVectors(nodes[next], nodes[index]);
          const distance = correction.length();
          if (distance < 1e-8) continue;
          const stiffness = span === 1 ? 1 : 0.08;
          correction.multiplyScalar((distance - (distances[next] - distances[index])) / distance * stiffness / (weights[index] + weights[next]));
          nodes[index].addScaledVector(correction, weights[index]);
          nodes[next].addScaledVector(correction, -weights[next]);
        }
      }
      for (let index = 1; index < NODE_COUNT; index++) project(nodes[index], radii[index], resolveSurface && iteration >= 14);
      // Check segment interiors as well as nodes, so a fast kick cannot bisect the ribbon.
      for (let index = 0; index < NODE_COUNT - 1; index++) {
        center.copy(nodes[index]).lerp(nodes[index + 1], 0.5);
        contact.copy(center);
        if (!project(contact, Math.max(radii[index], radii[index + 1]), resolveSurface && iteration >= 14)) continue;
        correction.subVectors(contact, center).multiplyScalar(2 / (weights[index] + weights[index + 1]));
        nodes[index].addScaledVector(correction, weights[index]);
        nodes[index + 1].addScaledVector(correction, weights[index + 1]);
      }
    }
    for (let index = 1; index < NODE_COUNT; index++) {
      if (project(nodes[index], radii[index], resolveSurface)) previous[index].lerp(nodes[index], 0.3);
    }
  }

  function sample(distance: number) {
    const scaled = distance <= ballLength ? distance / ballLength * BALL_NODE
      : BALL_NODE + (distance - ballLength) / (length - ballLength) * (NODE_COUNT - 1 - BALL_NODE);
    const index = THREE.MathUtils.clamp(Math.floor(scaled), 0, NODE_COUNT - 2);
    const fraction = THREE.MathUtils.clamp(scaled - index, 0, 1);
    center.copy(nodes[index]).lerp(nodes[index + 1], fraction);
    tangent.subVectors(nodes[Math.min(index + 2, NODE_COUNT - 1)], nodes[Math.max(0, index - 1)]).normalize();
    side.copy(restSide).applyQuaternion(hipRotation).projectOnPlane(tangent).normalize();
    if (side.lengthSq() < 1e-6) side.copy(restSide).projectOnPlane(tangent).normalize();
    normal.crossVectors(tangent, side).normalize();
    basis.makeBasis(side, normal, tangent).multiply(restBasis);
    rotation.setFromRotationMatrix(basis);
  }

  function render() {
    hips!.getWorldQuaternion(hipRotation);
    character.getWorldQuaternion(rotation).invert();
    hipRotation.premultiply(rotation);
    parts.forEach((part, partIndex) => {
      const input = part.geometry.getAttribute("position");
      const output = meshes[partIndex].geometry.getAttribute("position");
      part.skeleton.update();
      for (let index = 0; index < input.count; index++) {
        rest.fromBufferAttribute(input, index);
        const distance = point.copy(rest).sub(restAnchor).dot(axis);
        const rigidBall = partIndex === 1 || partIndex === 0 && distance > ballLength - 0.09;
        const along = rigidBall ? ballLength : distance;
        sample(along);
        point.copy(rest).sub(restAnchor).addScaledVector(axis, -along).applyQuaternion(rotation).add(center);
        if (distance < 0.08) {
          part.getVertexPosition(index, skinned).applyMatrix4(part.matrixWorld).applyMatrix4(inverse);
          point.lerp(skinned, 1 - THREE.MathUtils.smoothstep(distance, 0, 0.08));
        }
        if (!rigidBall) {
          // The centerline has thickness, but folded edges and tassel tips need contact too.
          for (let pass = 0; pass < 3; pass++) if (!collision.surface?.project(point)) break;
          point.y = Math.max(point.y, floor + 0.006);
        }
        output.setXYZ(index, point.x, point.y, point.z);
      }
      output.needsUpdate = true;
      meshes[partIndex].geometry.computeVertexNormals();
    });
  }

  function dispose() {
    for (const mesh of meshes) { character.remove(mesh); mesh.geometry.dispose(); }
    source!.visible = wasVisible;
  }

  return { update, render, dispose };
}
