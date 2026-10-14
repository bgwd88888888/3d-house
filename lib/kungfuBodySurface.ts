import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { createKungfuSurfaceQuery } from "./kungfuSurfaceQuery";

const CLOTH_CLEARANCE = 0.028;

/** Refit the character's posed skin so extreme poses cannot escape the coarse colliders. */
export function createKungfuBodySurface(character: THREE.Object3D) {
  const object = character.getObjectByName("MaiBodyCollider");
  if (!(object instanceof THREE.SkinnedMesh)) return null;
  const body = object;
  const geometry = body.geometry.clone();
  const positions = geometry.getAttribute("position");
  const tree = new MeshBVH(geometry);
  const queries = createKungfuSurfaceQuery(geometry, tree);
  const triangle = new THREE.Triangle();
  const normal = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const point = new THREE.Vector3();
  const inverse = new THREE.Matrix4();
  const transform = new THREE.Matrix4();
  const hit = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 };
  const ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0.739, 0.331, 0.586).normalize());

  function update() {
    body.skeleton.update();
    inverse.copy(character.matrixWorld).invert();
    transform.multiplyMatrices(inverse, body.matrixWorld);
    for (let index = 0; index < positions.count; index++) {
      body.getVertexPosition(index, point).applyMatrix4(transform);
      positions.setXYZ(index, point.x, point.y, point.z);
    }
    tree.refit();
    queries.update();
  }

  function project(position: THREE.Vector3, clearance = CLOTH_CLEARANCE) {
    if (!queries.query(position, hit, Math.max(0.08, clearance + 0.04))) return false;
    const indices = geometry.index!;
    triangle.a.fromBufferAttribute(positions, indices.getX(hit.faceIndex * 3));
    triangle.b.fromBufferAttribute(positions, indices.getX(hit.faceIndex * 3 + 1));
    triangle.c.fromBufferAttribute(positions, indices.getX(hit.faceIndex * 3 + 2));
    triangle.getNormal(normal);
    let inside = offset.subVectors(position, hit.point).dot(normal) < 0;
    if (inside) {
      ray.origin.copy(position);
      const hits = tree.raycast(ray, THREE.DoubleSide).map((value) => value.distance).sort((a, b) => a - b);
      inside = hits.filter((value, index) => !index || value - hits[index - 1] > 1e-5).length % 2 === 1;
    }
    if (!inside && hit.distance >= clearance - 1e-5) return false;
    // Near an edge, use the separation direction to avoid sliding along the surface.
    if (!inside && hit.distance > 1e-8) normal.copy(offset).normalize();
    position.copy(hit.point).addScaledVector(normal, clearance);
    return true;
  }

  return { update, project, dispose: () => geometry.dispose() };
}
