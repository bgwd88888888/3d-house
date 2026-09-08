/**
 * 西式小院扫描树摆放，供模型、避障与草地磨损共用。
 */
export const COTTAGE_TREES = [
  {
    id: "pond",
    model: "islandTwo",
    position: [14.1, -0.28, 9.3],
    rotation: 2.6,
    scale: 2.05,
    wearInner: 1.05,
    wearOuter: 2.55,
    obstacleRadius: 2.5,
  },
  {
    id: "west",
    model: "islandOne",
    position: [-9.05, -0.03, 3.2],
    rotation: 0.72,
    scale: 1.34,
    wearInner: 0.82,
    wearOuter: 2.08,
    obstacleRadius: 2.3,
  },
] as const;
