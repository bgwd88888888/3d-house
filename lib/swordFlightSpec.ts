export type FlightPoint = readonly [number, number, number];

export interface FlightIsland {
  id: string;
  name: string;
  description: string;
  position: FlightPoint;
  radius: number;
  height: number;
  landmark: "pavilion" | "ruins" | "garden" | "shrine";
  trees: number;
  waterfall?: boolean;
}

export const FLIGHT_START: FlightPoint = [0, 14, 62];
export const FLIGHT_SPEED = 18;
export const FLIGHT_BOOST_SPEED = 48;
export const FLIGHT_BRAKE_SPEED = 3;
export const FLIGHT_WALK_SPEED = 2.1;
export const FLIGHT_RUN_SPEED = 3.8;
export const FLIGHT_FOOT_CLEARANCE = 0.16;

export const FLIGHT_ISLANDS: readonly FlightIsland[] = [
  { id: "wind", name: "听风台", description: "临风小亭 · 云海渡口", position: [0, 4, 0], radius: 30, height: 38, landmark: "pavilion", trees: 4 },
  { id: "pines", name: "松隐屿", description: "古松成林 · 石径通幽", position: [-145, 18, -130], radius: 40, height: 52, landmark: "pavilion", trees: 10 },
  { id: "falls", name: "落星瀑", description: "悬泉入云 · 观瀑石台", position: [165, 32, -180], radius: 43, height: 78, landmark: "garden", trees: 5, waterfall: true },
  { id: "moon", name: "悬月峰", description: "孤峰石碑 · 登高望远", position: [360, 68, -350], radius: 30, height: 100, landmark: "shrine", trees: 3 },
  { id: "ruins", name: "太虚遗境", description: "残阙古门 · 云中古迹", position: [-360, 38, -360], radius: 40, height: 68, landmark: "ruins", trees: 4 },
  { id: "lotus", name: "照水庭", description: "浅池照影 · 静坐观云", position: [-240, 5, 170], radius: 44, height: 45, landmark: "garden", trees: 6 },
  { id: "sword", name: "藏剑台", description: "古剑石碑 · 峭壁苍松", position: [225, 22, 145], radius: 36, height: 64, landmark: "shrine", trees: 5 },
  { id: "stars", name: "摘星阁", description: "群峰之上 · 长风万里", position: [40, 70, -560], radius: 35, height: 105, landmark: "pavilion", trees: 4 },
  { id: "harbor", name: "归云洲", description: "飞瀑双流 · 云海长岸", position: [460, 12, 70], radius: 48, height: 58, landmark: "ruins", trees: 8, waterfall: true },
  { id: "west", name: "夕照崖", description: "西山余晖 · 无人小亭", position: [-470, 14, 20], radius: 28, height: 48, landmark: "pavilion", trees: 3 },
];

export const FLIGHT_KEYS = [
  { key: "W / S", label: "抬头 / 俯冲" },
  { key: "A / D", label: "左右转向" },
  { key: "Space / C", label: "上升 / 下降" },
  { key: "X / E", label: "减速 / 落地" },
  { key: "Shift", label: "加速" },
  { key: "P / Esc", label: "暂停" },
  { key: "R", label: "返回渡口" },
];

export const FLIGHT_WALK_KEYS = [
  { key: "W / S", label: "前进 / 后退" },
  { key: "A / D", label: "左右转身" },
  { key: "Space", label: "御剑起飞" },
  { key: "Shift", label: "快步" },
  { key: "P / Esc", label: "暂停" },
  { key: "R", label: "返回渡口" },
];
