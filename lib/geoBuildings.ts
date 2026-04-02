import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const EARTH_RADIUS = 6371000;
const DEFAULT_HEIGHT_M = 12;
const DEFAULT_LEVEL_HEIGHT_M = 3;

type LonLat = [number, number];

export type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
};

type GeoJSONFeature = {
  type: "Feature";
  properties: Record<string, unknown> | null;
  geometry: GeoJSONPolygon | GeoJSONMultiPolygon;
};

type GeoJSONPolygon = {
  type: "Polygon";
  coordinates: LonLat[][];
};

type GeoJSONMultiPolygon = {
  type: "MultiPolygon";
  coordinates: LonLat[][][];
};

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Local tangent plane: X east, Z north. Shape 2D uses (x, z) before extrusion rotation. */
export function projectToXZ(
  lon: number,
  lat: number,
  centerLon: number,
  centerLat: number,
): { x: number; z: number } {
  const cosLat = Math.cos(toRad(centerLat));
  const x = toRad(lon - centerLon) * EARTH_RADIUS * cosLat;
  const z = toRad(lat - centerLat) * EARTH_RADIUS;
  return { x, z };
}

export function getBuildingHeight(properties: Record<string, unknown> | null): number {
  if (!properties) return DEFAULT_HEIGHT_M;

  const raw = properties.height ?? properties["height"];
  if (typeof raw === "number" && raw > 0) return raw;
  if (typeof raw === "string") {
    const n = parseFloat(raw);
    if (!Number.isNaN(n) && n > 0) return n;
  }

  const levels = properties["building:levels"] ?? properties["building_levels"];
  if (typeof levels === "number" && levels > 0) return levels * DEFAULT_LEVEL_HEIGHT_M;
  if (typeof levels === "string") {
    const n = parseFloat(levels);
    if (!Number.isNaN(n) && n > 0) return n * DEFAULT_LEVEL_HEIGHT_M;
  }

  return DEFAULT_HEIGHT_M;
}

function ringToShapePoints(
  ring: LonLat[],
  centerLon: number,
  centerLat: number,
): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const n = ring.length;
  const lastIdx =
    n > 1 && ring[0][0] === ring[n - 1][0] && ring[0][1] === ring[n - 1][1] ? n - 1 : n;
  for (let i = 0; i < lastIdx; i++) {
    const { x, z } = projectToXZ(ring[i][0], ring[i][1], centerLon, centerLat);
    pts.push(new THREE.Vector2(x, z));
  }
  return pts;
}

function buildShapeFromRings(
  rings: LonLat[][],
  centerLon: number,
  centerLat: number,
): THREE.Shape | null {
  if (rings.length === 0) return null;
  const outerPts = ringToShapePoints(rings[0], centerLon, centerLat);
  if (outerPts.length < 3) return null;

  const shape = new THREE.Shape();
  shape.moveTo(outerPts[0].x, outerPts[0].y);
  for (let i = 1; i < outerPts.length; i++) {
    shape.lineTo(outerPts[i].x, outerPts[i].y);
  }

  for (let r = 1; r < rings.length; r++) {
    const holePts = ringToShapePoints(rings[r], centerLon, centerLat);
    if (holePts.length < 3) continue;
    const hole = new THREE.Path();
    hole.moveTo(holePts[0].x, holePts[0].y);
    for (let i = 1; i < holePts.length; i++) {
      hole.lineTo(holePts[i].x, holePts[i].y);
    }
    shape.holes.push(hole);
  }

  return shape;
}

function applyVertexColors(geometry: THREE.BufferGeometry, color: THREE.Color): void {
  const pos = geometry.getAttribute("position");
  if (!pos) return;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

function heightToColor(height: number, minH: number, maxH: number): THREE.Color {
  const t = maxH > minH ? (height - minH) / (maxH - minH) : 0;
  const c = new THREE.Color();
  c.setHSL(0.58 - t * 0.42, 0.65, 0.48);
  return c;
}

function computeCollectionCenter(geojson: GeoJSONFeatureCollection): { lon: number; lat: number } {
  let sumLon = 0;
  let sumLat = 0;
  let count = 0;

  const addRing = (ring: LonLat[]) => {
    const n = ring.length;
    const lastIdx =
      n > 1 && ring[0][0] === ring[n - 1][0] && ring[0][1] === ring[n - 1][1] ? n - 1 : n;
    for (let i = 0; i < lastIdx; i++) {
      sumLon += ring[i][0];
      sumLat += ring[i][1];
      count += 1;
    }
  };

  for (const f of geojson.features) {
    const g = f.geometry;
    if (g.type === "Polygon") {
      const outer = g.coordinates[0];
      if (outer) addRing(outer);
    } else if (g.type === "MultiPolygon") {
      for (const polygon of g.coordinates) {
        const outer = polygon[0];
        if (outer) addRing(outer);
      }
    }
  }

  if (count === 0) return { lon: 0, lat: 0 };
  return { lon: sumLon / count, lat: sumLat / count };
}

function extrudeBuildingGeometry(
  shape: THREE.Shape,
  height: number,
  color: THREE.Color,
): THREE.BufferGeometry | null {
  if (height <= 0) return null;
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geom.rotateX(-Math.PI / 2);
  geom.computeVertexNormals();
  applyVertexColors(geom, color);
  return geom;
}

/**
 * Build a single merged BufferGeometry (vertex colors) from a GeoJSON FeatureCollection.
 */
export function buildCityGeometryFromGeoJSON(
  geojson: GeoJSONFeatureCollection,
): THREE.BufferGeometry | null {
  if (!geojson.features?.length) return null;

  const center = computeCollectionCenter(geojson);
  const heights = geojson.features.map((f) => getBuildingHeight(f.properties));
  const minH = Math.min(...heights);
  const maxH = Math.max(...heights);

  const parts: THREE.BufferGeometry[] = [];

  for (let i = 0; i < geojson.features.length; i++) {
    const f = geojson.features[i];
    const height = heights[i];
    const color = heightToColor(height, minH, maxH);
    const g = f.geometry;

    if (g.type === "Polygon") {
      const shape = buildShapeFromRings(g.coordinates, center.lon, center.lat);
      if (shape) {
        const ex = extrudeBuildingGeometry(shape, height, color);
        if (ex) parts.push(ex);
      }
    } else if (g.type === "MultiPolygon") {
      for (const polygon of g.coordinates) {
        const shape = buildShapeFromRings(polygon, center.lon, center.lat);
        if (shape) {
          const ex = extrudeBuildingGeometry(shape, height, color);
          if (ex) parts.push(ex);
        }
      }
    }
  }

  if (parts.length === 0) return null;
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  merged.computeBoundingSphere();
  return merged;
}

export function estimateSceneBounds(geojson: GeoJSONFeatureCollection): THREE.Sphere | null {
  const center = computeCollectionCenter(geojson);
  let maxDist = 1;
  const visit = (lon: number, lat: number) => {
    const { x, z } = projectToXZ(lon, lat, center.lon, center.lat);
    const d = Math.hypot(x, z);
    if (d > maxDist) maxDist = d;
  };
  for (const f of geojson.features) {
    const g = f.geometry;
    const visitRing = (ring: LonLat[]) => {
      for (const c of ring) visit(c[0], c[1]);
    };
    if (g.type === "Polygon") {
      for (const ring of g.coordinates) visitRing(ring);
    } else if (g.type === "MultiPolygon") {
      for (const poly of g.coordinates) {
        for (const ring of poly) visitRing(ring);
      }
    }
  }
  const maxH = Math.max(...collectHeights(geojson), 1);
  const c = new THREE.Vector3(0, maxH * 0.35, 0);
  return new THREE.Sphere(c, Math.max(maxDist * 1.4, maxH * 2, 80));
}

function collectHeights(geojson: GeoJSONFeatureCollection): number[] {
  return geojson.features.map((f) => getBuildingHeight(f.properties));
}
