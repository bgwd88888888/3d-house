export type FlightPoint = readonly [number, number, number];

export const FLIGHT_START: FlightPoint = [0, 26, 78];
export const FLIGHT_SPEED = 18;
export const FLIGHT_BOOST_SPEED = 36;
export const FLIGHT_GATE_RADIUS = 7;

export const FLIGHT_GATES: readonly FlightPoint[] = [
  [0, 26, 25],
  [30, 30, -35],
  [95, 34, -50],
  [145, 30, 5],
  [115, 26, 75],
  [45, 30, 110],
  [-30, 28, 85],
  [-48, 26, 55],
];

export const FLIGHT_ISLANDS = [
  { position: [36, 3, 20] as FlightPoint, radius: 18, height: 26, name: "听风台" },
  { position: [100, 10, 14] as FlightPoint, radius: 16, height: 32, name: "悬月峰" },
  { position: [40, 4, 66] as FlightPoint, radius: 21, height: 30, name: "归云山" },
];

export const FLIGHT_KEYS = [
  { key: "W / S", label: "抬头 / 俯冲" },
  { key: "A / D", label: "左右转向" },
  { key: "Space / C", label: "上升 / 下降" },
  { key: "Shift", label: "加速" },
  { key: "P / Esc", label: "暂停" },
  { key: "R", label: "重新出发" },
];
