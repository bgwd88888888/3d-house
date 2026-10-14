import * as THREE from "three";

type Capsule = {
  start: THREE.Vector3; end: THREE.Vector3; radius: number;
  axis: THREE.Vector3; bounds: THREE.Box3; inverseLength: number;
};

/** Rounded leg volumes include a small clearance for the cloth's triangle interiors. */
export function createKungfuClothColliders(character: THREE.Object3D) {
  const segments = [
    ["Hips", "Spine", 0.11, 0.095],
    ["Spine", "Spine1", 0.095, 0.095],
    ["Spine1", "Spine2", 0.095, 0.11],
    ["LeftUpLeg", "LeftLeg", 0.12, 0.078],
    ["RightUpLeg", "RightLeg", 0.12, 0.078],
    ["LeftLeg", "LeftFoot", 0.078, 0.048],
    ["RightLeg", "RightFoot", 0.078, 0.048],
  ] as const;
  const limbs = segments.flatMap(([start, end, upper, lower]) => {
    const from = character.getObjectByName(start);
    const to = character.getObjectByName(end);
    return from && to ? [{ from, to, upper, lower, bounds: new THREE.Box3() }] : [];
  });
  const capsules: Capsule[] = limbs.flatMap(() => Array.from({ length: 4 }, () => ({
    start: new THREE.Vector3(), end: new THREE.Vector3(), radius: 0,
    axis: new THREE.Vector3(), bounds: new THREE.Box3(), inverseLength: 0,
  })));
  const inverse = new THREE.Matrix4();
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const closest = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const hips = character.getObjectByName("Hips");

  function update() {
    inverse.copy(character.matrixWorld).invert();
    if (hips) {
      hips.getWorldQuaternion(rotation);
      forward.set(0, 0, 1).applyQuaternion(rotation).transformDirection(inverse);
    }
    limbs.forEach((limb, limbIndex) => {
      limb.bounds.makeEmpty();
      start.setFromMatrixPosition(limb.from.matrixWorld).applyMatrix4(inverse);
      end.setFromMatrixPosition(limb.to.matrixWorld).applyMatrix4(inverse);
      for (let index = 0; index < 4; index++) {
        const capsule = capsules[limbIndex * 4 + index];
        capsule.start.copy(start).lerp(end, index / 4);
        capsule.end.copy(start).lerp(end, (index + 1) / 4);
        capsule.radius = THREE.MathUtils.lerp(limb.upper, limb.lower, index / 4) + 0.012;
        capsule.axis.subVectors(capsule.end, capsule.start);
        capsule.inverseLength = 1 / Math.max(capsule.axis.lengthSq(), 1e-8);
        capsule.bounds.makeEmpty().expandByPoint(capsule.start).expandByPoint(capsule.end).expandByScalar(capsule.radius);
        limb.bounds.union(capsule.bounds);
      }
    });
  }

  function contains(bounds: THREE.Box3, position: THREE.Vector3, clearance: number) {
    return position.x >= bounds.min.x - clearance && position.x <= bounds.max.x + clearance
      && position.y >= bounds.min.y - clearance && position.y <= bounds.max.y + clearance
      && position.z >= bounds.min.z - clearance && position.z <= bounds.max.z + clearance;
  }

  function project(position: THREE.Vector3, clearance = 0) {
    let touched = false;
    for (let index = 0; index < capsules.length; index++) {
      // Skip all four sections of a limb when the sample is outside its whole volume.
      if (index % 4 === 0 && !contains(limbs[index / 4].bounds, position, clearance)) {
        index += 3;
        continue;
      }
      const capsule = capsules[index];
      if (!contains(capsule.bounds, position, clearance)) continue;
      offset.subVectors(position, capsule.start);
      const fraction = THREE.MathUtils.clamp(offset.dot(capsule.axis) * capsule.inverseLength, 0, 1);
      closest.copy(capsule.start).addScaledVector(capsule.axis, fraction);
      normal.subVectors(position, closest);
      const distance = normal.length();
      const radius = capsule.radius + clearance;
      if (distance >= radius) continue;
      if (distance < 1e-8) normal.copy(forward);
      else normal.multiplyScalar(1 / distance);
      position.copy(closest).addScaledVector(normal, radius);
      touched = true;
    }
    return touched;
  }

  return { update, project };
}
