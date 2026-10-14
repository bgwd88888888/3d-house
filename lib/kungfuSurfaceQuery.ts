import * as THREE from "three";
import type { MeshBVH } from "three-mesh-bvh";

const CELL_SIZE = 0.05;
type SurfaceHit = { point: THREE.Vector3; distance: number; faceIndex: number };

/** Nearby cloth samples share triangle candidates, but each gets an exact closest point. */
export function createKungfuSurfaceQuery(geometry: THREE.BufferGeometry, tree: MeshBVH) {
  const indices = geometry.index!;
  const positions = geometry.getAttribute("position");
  const faces = Array.from({ length: indices.count / 3 }, () => ({ triangle: new THREE.Triangle(), bounds: new THREE.Box3() }));
  const cells = new Map<string, { indices: number[]; distances: Float64Array; center: THREE.Vector3 }>();
  const searchBounds = new THREE.Box3();
  const searchCenter = new THREE.Vector3();
  const closest = new THREE.Vector3();
  const scores = new Float64Array(faces.length);
  let searchRadiusSquared = 0;
  let candidates: number[] = [];
  const callbacks = {
    intersectsBounds: (bounds: THREE.Box3) => bounds.intersectsBox(searchBounds),
    intersectsRange: (offset: number, count: number) => {
      for (let index = offset; index < offset + count; index++) {
        const face = faces[index];
        if (!face.bounds.intersectsBox(searchBounds)) continue;
        face.triangle.closestPointToPoint(searchCenter, closest);
        const distance = closest.distanceToSquared(searchCenter);
        if (distance > searchRadiusSquared) continue;
        scores[index] = distance;
        candidates.push(index);
      }
      return false;
    },
  };

  function update() {
    cells.clear();
    for (let index = 0; index < faces.length; index++) {
      const { triangle, bounds } = faces[index];
      triangle.a.fromBufferAttribute(positions, indices.getX(index * 3));
      triangle.b.fromBufferAttribute(positions, indices.getX(index * 3 + 1));
      triangle.c.fromBufferAttribute(positions, indices.getX(index * 3 + 2));
      bounds.makeEmpty().expandByPoint(triangle.a).expandByPoint(triangle.b).expandByPoint(triangle.c);
    }
  }

  function query(point: THREE.Vector3, hit: SurfaceHit, maxDistance: number) {
    const x = Math.floor(point.x / CELL_SIZE), y = Math.floor(point.y / CELL_SIZE), z = Math.floor(point.z / CELL_SIZE);
    const reach = Math.ceil(maxDistance / CELL_SIZE);
    const key = `${x}:${y}:${z}:${reach}`;
    let nearby = cells.get(key);
    if (!nearby) {
      searchBounds.min.set(x * CELL_SIZE, y * CELL_SIZE, z * CELL_SIZE);
      searchBounds.max.copy(searchBounds.min).addScalar(CELL_SIZE);
      searchBounds.getCenter(searchCenter);
      searchBounds.expandByScalar(reach * CELL_SIZE);
      searchRadiusSquared = (reach * CELL_SIZE + Math.sqrt(3) * CELL_SIZE / 2) ** 2;
      candidates = [];
      tree.shapecast(callbacks);
      candidates.sort((a, b) => scores[a] - scores[b]);
      nearby = { indices: candidates, distances: Float64Array.from(candidates, (index) => Math.sqrt(scores[index])), center: searchCenter.clone() };
      cells.set(key, nearby);
    }
    let distanceSquared = maxDistance * maxDistance;
    let distanceLimit = maxDistance;
    const centerDistance = point.distanceTo(nearby.center);
    let found = false;
    for (let candidate = 0; candidate < nearby.indices.length; candidate++) {
      // Triangle distance is 1-Lipschitz: farther candidates cannot beat this hit.
      if (nearby.distances[candidate] > distanceLimit + centerDistance) break;
      const index = nearby.indices[candidate];
      const { triangle, bounds } = faces[index];
      const dx = Math.max(bounds.min.x - point.x, 0, point.x - bounds.max.x);
      if (dx * dx > distanceSquared) continue;
      const dy = Math.max(bounds.min.y - point.y, 0, point.y - bounds.max.y);
      if (dx * dx + dy * dy > distanceSquared) continue;
      const dz = Math.max(bounds.min.z - point.z, 0, point.z - bounds.max.z);
      if (dx * dx + dy * dy + dz * dz > distanceSquared) continue;
      triangle.closestPointToPoint(point, closest);
      const distance = closest.distanceToSquared(point);
      if (distance >= distanceSquared) continue;
      distanceSquared = distance;
      distanceLimit = Math.sqrt(distance);
      hit.point.copy(closest);
      hit.faceIndex = index;
      found = true;
    }
    hit.distance = distanceLimit;
    return found;
  }

  return { update, query };
}
