/**
 * 室内灯火：放大后的厅堂。地面 y=0，+Z 为窗外，-Z 为壁炉。
 */
export const ROOM = {
  innerWidth: 8.8,
  innerDepth: 7.4,
  innerHeight: 3.32,
  wallThick: 0.32,
  window: {
    width: 1.48,
    height: 2.02,
    sillHeight: 0.7,
    frameDepth: 0.16,
    recess: 0.12,
    xs: [-2.05, 2.05] as const,
  },
  chandelier: [0, 2.64, 0.12] as [number, number, number],
  sconces: [
    [-1.22, 1.62, -3.62],
    [1.22, 1.62, -3.62],
  ] as const,
  fireplace: {
    width: 1.78,
    openingW: 0.96,
    openingH: 0.82,
  },
  sofa: {
    x: 3.86,
    z: 0.18,
    rotationY: -Math.PI / 2,
  },
  console: {
    width: 3.55,
    depth: 0.46,
    height: 0.8,
    z: 3.18,
  },
  tv: {
    width: 1.28,
    height: 0.74,
    depth: 0.038,
    standH: 0.07,
  },
  coffee: {
    width: 1.28,
    depth: 0.68,
    height: 0.42,
    z: 0.22,
  },
} as const;

export const ROOM_VIEWS = [
  {
    id: "salon",
    label: "厅堂",
    eye: [-3.22, 1.82, -2.52] as [number, number, number],
    target: [0.85, 1.16, 1.22] as [number, number, number],
  },
  {
    id: "windows",
    label: "窗景",
    eye: [0.22, 1.54, -1.08] as [number, number, number],
    target: [0, 1.58, 3.52] as [number, number, number],
  },
  {
    id: "hearth",
    label: "壁炉",
    eye: [0.28, 1.52, 2.12] as [number, number, number],
    target: [0, 1.28, -3.42] as [number, number, number],
  },
  {
    id: "lamp",
    label: "吊灯",
    eye: [2.08, 1.6, 1.88] as [number, number, number],
    target: [0.04, 2.72, 0.08] as [number, number, number],
  },
] as const;

export type RoomViewId = (typeof ROOM_VIEWS)[number]["id"];

export const DEFAULT_ROOM_VIEW: RoomViewId = "salon";

export const ROOM_VIEW_LABELS: Record<RoomViewId, string> = {
  salon: "厅堂",
  windows: "窗景",
  hearth: "壁炉",
  lamp: "吊灯",
};
