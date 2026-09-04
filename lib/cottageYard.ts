/**
 * 西式小院围合范围：矮篱包住房子、水池、皮卡与两棵外树。
 * 默认机位在东南侧，+Z / +X 篱笆会落在前景。
 */
export const COTTAGE_YARD = {
  minX: -12.4,
  maxX: 18.6,
  minZ: -8.6,
  maxZ: 15.2,
  gateX: 2.25,
  gateHalf: 1.3,
  fenceHeight: 1.08,
} as const;

/** 篱内可行走软边界，比木篱内收约 1m */
export const COTTAGE_YARD_BOUNDS = {
  minX: -11.3,
  maxX: 17.4,
  minZ: -7.4,
  maxZ: 14.05,
} as const;

export function buildCottageYardObstacles(): Array<{
  kind: "box";
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}> {
  const { minX, maxX, minZ, maxZ, gateX, gateHalf } = COTTAGE_YARD;
  const t = 0.22;
  return [
    {
      kind: "box",
      minX,
      maxX: gateX - gateHalf,
      minZ: maxZ - t,
      maxZ: maxZ + t,
    },
    {
      kind: "box",
      minX: gateX + gateHalf,
      maxX,
      minZ: maxZ - t,
      maxZ: maxZ + t,
    },
    {
      kind: "box",
      minX,
      maxX,
      minZ: minZ - t,
      maxZ: minZ + t,
    },
    {
      kind: "box",
      minX: minX - t,
      maxX: minX + t,
      minZ,
      maxZ,
    },
    {
      kind: "box",
      minX: maxX - t,
      maxX: maxX + t,
      minZ,
      maxZ,
    },
  ];
}
