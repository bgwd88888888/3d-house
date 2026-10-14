import * as THREE from "three";
import { createKungfuCollisionWorld, type KungfuCollisionWorld } from "./kungfuCollisionWorld";

type Particle = {
  position: THREE.Vector3;
  previous: THREE.Vector3;
  rest: THREE.Vector3;
  vertex: number;
  pinned: boolean;
};
type Constraint = { a: number; b: number; length: number; stiffness: number };

/** Weld UV seams for simulation while retaining the original texture coordinates. */
function createClothParticles(geometry: THREE.BufferGeometry) {
  const attribute = geometry.getAttribute("position");
  const particles: Particle[] = [];
  const vertices: number[] = [];
  const welded = new Map<string, number>();
  const top = new THREE.Box3().setFromBufferAttribute(attribute as THREE.BufferAttribute).max.y;
  for (let vertex = 0; vertex < attribute.count; vertex++) {
    const rest = new THREE.Vector3().fromBufferAttribute(attribute, vertex);
    const key = rest.toArray().map((value) => Math.round(value * 100000)).join(",");
    let index = welded.get(key);
    if (index === undefined) {
      index = particles.length;
      welded.set(key, index);
      particles.push({ position: rest.clone(), previous: rest.clone(), rest, vertex, pinned: rest.y > top - 0.055 });
    }
    vertices.push(index);
  }
  return { particles, vertices };
}

function createClothConstraints(geometry: THREE.BufferGeometry, particles: Particle[], vertices: number[]) {
  const constraints: Constraint[] = [];
  const edges = new Map<string, number>();
  const indices = geometry.index;
  if (!indices) return constraints;
  const add = (a: number, b: number, stiffness: number) => {
    if (a !== b) constraints.push({ a, b, length: particles[a].rest.distanceTo(particles[b].rest), stiffness });
  };
  for (let index = 0; index < indices.count; index += 3) {
    const triangle = [0, 1, 2].map((offset) => vertices[indices.getX(index + offset)]);
    for (let edge = 0; edge < 3; edge++) {
      const a = triangle[edge], b = triangle[(edge + 1) % 3], opposite = triangle[(edge + 2) % 3];
      const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
      const other = edges.get(key);
      if (other === undefined) {
        edges.set(key, opposite);
        add(a, b, 1);
      } else add(other, opposite, 0.12);
    }
  }
  return constraints;
}

/** A small position-based cloth solver, simulated in character space (independent of grounding). */
export function createKungfuCloth(character: THREE.Object3D, collision?: KungfuCollisionWorld) {
  const object = character.getObjectByName("Classic_Costume1_6");
  if (!(object instanceof THREE.SkinnedMesh)) return null;
  const source = object;
  const geometry = source.geometry.clone();
  const mesh = new THREE.Mesh(geometry, source.material);
  mesh.name = "MaiFrontCloth";
  mesh.castShadow = source.castShadow;
  mesh.receiveShadow = source.receiveShadow;
  mesh.frustumCulled = false;
  character.add(mesh);
  const wasVisible = source.visible;
  source.visible = false;
  const { particles, vertices } = createClothParticles(geometry);
  const constraints = createClothConstraints(geometry, particles, vertices);
  const contacts: number[][] = constraints.filter(({ stiffness }) => stiffness === 1).map(({ a, b }) => [a, b]);
  if (geometry.index) {
    for (let index = 0; index < geometry.index.count; index += 3) {
      contacts.push([0, 1, 2].map((offset) => vertices[geometry.index!.getX(index + offset)]));
    }
  }
  const world = collision ?? createKungfuCollisionWorld(character);
  const { colliders, surface } = world;
  const inverse = new THREE.Matrix4();
  const sourceTransform = new THREE.Matrix4();
  const movement = new THREE.Vector3();
  const difference = new THREE.Vector3();
  const center = new THREE.Vector3();
  const corrected = new THREE.Vector3();
  let initialized = false;
  let previousStep = 1 / 120;

  function projectContacts(project: (position: THREE.Vector3) => boolean, allowPinned = false) {
    let touched = false;
    for (const contact of contacts) {
      center.set(0, 0, 0);
      let movable = 0;
      for (const index of contact) {
        center.add(particles[index].position);
        if (allowPinned || !particles[index].pinned) movable++;
      }
      if (!movable) continue;
      center.multiplyScalar(1 / contact.length);
      corrected.copy(center);
      if (!project(corrected)) continue;
      touched = true;
      corrected.sub(center).multiplyScalar(contact.length / movable);
      for (const index of contact) {
        if (allowPinned || !particles[index].pinned) particles[index].position.add(corrected);
      }
    }
    return touched;
  }

  function update(delta: number, resolveSurface: boolean) {
    if (delta <= 0) return;
    character.updateWorldMatrix(true, true);
    source.skeleton.update();
    inverse.copy(character.matrixWorld).invert();
    sourceTransform.multiplyMatrices(inverse, source.matrixWorld);
    if (!collision) world.update(resolveSurface);
    for (const particle of particles) {
      if (particle.pinned || !initialized) {
        particle.position.copy(particle.rest);
        if (particle.pinned) particle.position.z += 0.012;
        source.applyBoneTransform(particle.vertex, particle.position).applyMatrix4(sourceTransform);
        if (resolveSurface && particle.pinned) surface?.project(particle.position);
        particle.previous.copy(particle.position);
      } else {
        movement.subVectors(particle.position, particle.previous).multiplyScalar(Math.exp(-6 * delta) * delta / previousStep);
        particle.previous.copy(particle.position);
        particle.position.add(movement);
        particle.position.y -= 9.81 * delta * delta;
      }
    }
    initialized = true;
    previousStep = delta;
    for (let iteration = 0; iteration < 10; iteration++) {
      for (const constraint of constraints) {
        const a = particles[constraint.a], b = particles[constraint.b];
        const movable = Number(!a.pinned) + Number(!b.pinned);
        if (!movable) continue;
        difference.subVectors(b.position, a.position);
        const length = difference.length();
        if (length < 1e-8) continue;
        difference.multiplyScalar((length - constraint.length) / length * constraint.stiffness / movable);
        if (!a.pinned) a.position.add(difference);
        if (!b.pinned) b.position.sub(difference);
      }
      for (const particle of particles) {
        if (!particle.pinned) colliders.project(particle.position);
      }
      // A face can cut through a leg even when all three vertices are outside it.
      if (iteration >= 5) {
        projectContacts(colliders.project);
      }
    }
    // Finish on collision constraints, including overlaps between the two legs.
    for (const particle of particles) {
      if (particle.pinned) continue;
      let touching = false;
      for (let pass = 0; pass < 4; pass++) {
        touching = colliders.project(particle.position) || touching;
      }
      if (touching) particle.previous.lerp(particle.position, 0.35);
    }
    if (resolveSurface && surface) {
      for (let pass = 0; pass < 8; pass++) {
        // The waistband follows its anchor, but its faces also need surface clearance.
        let touched = projectContacts(surface.project, true);
        for (const particle of particles) {
          if (surface.project(particle.position)) {
            particle.previous.lerp(particle.position, 0.35);
            touched = true;
          }
        }
        if (!touched) break;
      }
    }
  }

  function render() {
    const attribute = geometry.getAttribute("position");
    vertices.forEach((particle, index) => {
      const { x, y, z } = particles[particle].position;
      attribute.setXYZ(index, x, y, z);
    });
    attribute.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  function dispose() {
    character.remove(mesh);
    source.visible = wasVisible;
    geometry.dispose();
    if (!collision) world.dispose();
  }

  return { update, render, dispose };
}
