import { BufferGeometry, CatmullRomCurve3, ExtrudeGeometry, Float32BufferAttribute, LatheGeometry, Shape, Vector2, Vector3 } from "three";

export function createFlightRobeGeometry() {
  const profile = new CatmullRomCurve3([
    new Vector3(0.42, 0.35), new Vector3(0.4, 0.5), new Vector3(0.34, 0.85),
    new Vector3(0.27, 1.16), new Vector3(0.22, 1.4), new Vector3(0.26, 1.67),
    new Vector3(0.31, 1.84), new Vector3(0.25, 1.93), new Vector3(0.1, 1.99),
  ]);
  const geometry = new LatheGeometry(profile.getPoints(40).map((point) => new Vector2(point.x, point.y)), 48);
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const angle = Math.atan2(z, x);
    const skirt = Math.max(0, 1.4 - y);
    const fold = 1 + Math.sin(angle * 13 + y * 1.7) * 0.065 * skirt
      + Math.sin(angle * 25 - y * 3) * 0.018 * skirt;
    position.setXYZ(index, x * fold, y + Math.cos(angle * 5) * 0.025 * skirt, z * fold * 0.68 + skirt * skirt * 0.25);
    uv.setXY(index, uv.getX(index) * 2, y * 2);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function createFlightSleeveGeometry(side: number) {
  const curve = new CatmullRomCurve3([
    new Vector3(side * 0.16, 1.83, 0),
    new Vector3(side * 0.31, 1.76, 0),
    new Vector3(side * 0.41, 1.54, 0.025),
    new Vector3(side * 0.48, 1.28, -0.02),
  ]);
  const frames = curve.computeFrenetFrames(20, false);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring <= 20; ring += 1) {
    const t = ring / 20;
    const center = curve.getPointAt(t);
    const radius = 0.112 + Math.sin(t * Math.PI) * 0.03 + (1 - t) * 0.015;
    for (let sector = 0; sector <= 24; sector += 1) {
      const angle = sector / 24 * Math.PI * 2;
      const fold = 1 + Math.sin(angle * 7 + t * 4) * 0.065;
      const vertex = center.clone()
        .addScaledVector(frames.normals[ring], Math.cos(angle) * radius * fold)
        .addScaledVector(frames.binormals[ring], Math.sin(angle) * radius * fold * 0.85);
      positions.push(vertex.x, vertex.y, vertex.z);
      uvs.push(sector / 24, t * 1.5);
      if (ring < 20 && sector < 24) {
        const a = ring * 25 + sector;
        indices.push(a, a + 1, a + 25, a + 1, a + 26, a + 25);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createFlightHairGeometry() {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring <= 16; ring += 1) {
    for (let sector = 0; sector <= 32; sector += 1) {
      const angle = sector / 32 * Math.PI * 2;
      const back = (Math.cos(angle) + 1) / 2;
      const theta = ring / 16 * (1.15 + back * 1.25);
      const strand = 1 + Math.sin(angle * 18 + theta * 2) * 0.012;
      positions.push(Math.sin(angle) * Math.sin(theta) * 0.123 * strand, 2.18 + Math.cos(theta) * 0.16, 0.015 + Math.cos(angle) * Math.sin(theta) * 0.125 * strand);
      if (ring < 16 && sector < 32) {
        const a = ring * 33 + sector;
        indices.push(a, a + 33, a + 1, a + 1, a + 33, a + 34);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createFlightSwordGeometry() {
  const blade = new Shape();
  blade.moveTo(-0.18, 0);
  blade.lineTo(-0.24, 0.45);
  blade.lineTo(-0.16, 4.6);
  blade.lineTo(0, 5.35);
  blade.lineTo(0.16, 4.6);
  blade.lineTo(0.24, 0.45);
  blade.lineTo(0.18, 0);
  blade.closePath();
  const geometry = new ExtrudeGeometry(blade, { depth: 0.045, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.035, bevelThickness: 0.025 });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
