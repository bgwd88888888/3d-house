/**
 * 室内灯火：放大后的厅堂。地面 y=0，+Z 为窗外，-Z 为壁炉。
 */
export const ROOM = {
  innerWidth: 12.45,
  innerDepth: 10.47,
  innerHeight: 3.32,
  wallThick: 0.32,
  door: {
    x: 4.95,
    width: 1.12,
    height: 2.4,
  },
  window: {
    width: 1.48,
    height: 2.02,
    sillHeight: 0.7,
    frameDepth: 0.16,
    recess: 0.12,
    xs: [-2.9, 2.9] as const,
  },
  chandelier: [0, 2.64, 0.17] as [number, number, number],
  sconces: [
    [-1.22, 1.62, -5.15],
    [1.22, 1.62, -5.15],
  ] as const,
  fireplace: {
    width: 1.78,
    openingW: 0.96,
    openingH: 0.82,
  },
  sofa: {
    x: 5.69,
    z: 0.25,
    rotationY: -Math.PI / 2,
  },
  console: {
    width: 1.54,
    depth: 0.59,
    height: 0.95,
    z: 4.71,
    modelScale: 1,
  },
  tv: {
    width: 1.28,
    height: 0.74,
    depth: 0.038,
    standH: 0.07,
  },
  coffee: {
    width: 1.18,
    depth: 1.18,
    height: 0.46,
    z: 0.31,
    modelScale: 0.82,
  },
} as const;

export const ROOM_VIEWS = [
  {
    id: "salon",
    label: "厅堂",
    eye: [-4.55, 1.82, -3.56] as [number, number, number],
    target: [1.2, 1.16, 1.73] as [number, number, number],
  },
  {
    id: "windows",
    label: "窗景",
    eye: [0.31, 1.54, -1.53] as [number, number, number],
    target: [0, 1.58, 5.05] as [number, number, number],
  },
  {
    id: "hearth",
    label: "壁炉",
    eye: [0.4, 1.52, 3] as [number, number, number],
    target: [0, 1.28, -5.05] as [number, number, number],
  },
  {
    id: "lamp",
    label: "吊灯",
    eye: [2.94, 1.6, 2.66] as [number, number, number],
    target: [0.04, 2.72, 0.11] as [number, number, number],
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
