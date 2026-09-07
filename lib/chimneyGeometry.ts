import * as THREE from "three";
import type { HouseSpec } from "@/lib/geoBuildings";

/** 中空矩形截面沿高度挤出，烟囱身和各层压顶共用贯通的烟道。 */
function makeChimneySection(
  width: number,
  depth: number,
  openingWidth: number,
  openingDepth: number,
  height: number,
  bottomY: number,
  x: number,
  z: number,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.5, -depth * 0.5);
  shape.lineTo(width * 0.5, -depth * 0.5);
  shape.lineTo(width * 0.5, depth * 0.5);
  shape.lineTo(-width * 0.5, depth * 0.5);
  shape.closePath();
  const opening = new THREE.Path();
  opening.moveTo(-openingWidth * 0.5, -openingDepth * 0.5);
  opening.lineTo(openingWidth * 0.5, -openingDepth * 0.5);
  opening.lineTo(openingWidth * 0.5, openingDepth * 0.5);
  opening.lineTo(-openingWidth * 0.5, openingDepth * 0.5);
  opening.closePath();
  shape.holes.push(opening);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.rotateX(-Math.PI * 0.5);
  geometry.translate(x, bottomY, z);
  return geometry;
}

/** 烟口凹入压顶，避免俯视时透见屋面；默认低机位仍可读出两级压顶。 */
export function makeChimneyParts(
  chimney: HouseSpec["chimney"],
  baseY: number,
  topY: number,
) {
  const { width, depth, x, z } = chimney;
  const openingWidth = width * 0.48;
  const openingDepth = depth * 0.48;
  const section = (w: number, d: number, height: number, bottomY: number) =>
    makeChimneySection(w, d, openingWidth, openingDepth, height, bottomY, x, z);
  const recess = new THREE.BoxGeometry(openingWidth, 0.025, openingDepth);
  recess.translate(x, topY - 0.6, z);

  return {
    walls: [
      section(width, depth, topY - baseY - 0.1, baseY),
      section(width + 0.08, depth + 0.08, 0.1, topY - 0.1),
    ],
    roofs: [
      section(width + 0.22, depth + 0.22, 0.16, topY),
      section(width + 0.12, depth + 0.12, 0.09, topY + 0.16),
    ],
    roofMetalwork: [recess],
  };
}
