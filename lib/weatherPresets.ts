/**
 * 简易天气预设：晴 / 阴 / 黄昏。
 * 晴天目标：草原般饱和蓝天 + 白积云。
 */
export const WEATHER_KINDS = ["sunny", "cloudy", "dusk"] as const;

export type WeatherKind = (typeof WEATHER_KINDS)[number];

export const WEATHER_LABELS: Record<WeatherKind, string> = {
  sunny: "晴",
  cloudy: "阴",
  dusk: "黄昏",
};

export type WeatherPreset = {
  background: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  exposure: number;
  sunPosition: [number, number, number];
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  hemiIntensity: number;
  hemiSky: string;
  hemiGround: string;
  sunIntensity: number;
  sunColor: string;
  fillIntensity: number;
  fillColor: string;
  faceFillIntensity: number;
  faceFillColor: string;
  envIntensity: number;
  cloudOpacity: number;
  cloudColor: string;
  /** 云层环形转速系数（约 1~2，越大转越快） */
  cloudSpeed: number;
};

export const WEATHER_PRESETS: Record<WeatherKind, WeatherPreset> = {
  sunny: {
    // 白天：通透浅天蓝底 + 灰白雾，与地平线雾化过渡衔接
    background: "#9bd0f0",
    fogColor: "#dde6e2",
    fogNear: 160,
    fogFar: 350,
    exposure: 1.08,
    // 灯光意图：正午偏侧日光——抬高方位角侧移（X 更大、Z 收窄），
    // 高度角约 47°，让墙面产生清晰明暗两面，而非顶光/正面光
    sunPosition: [72, 78, 22],
    turbidity: 0.6,
    rayleigh: 3.4,
    mieCoefficient: 0.0015,
    mieDirectionalG: 0.7,
    // 灯光意图：降低环境/半球光权重，给主光让出对比空间，避免整体被"洗白"
    hemiIntensity: 0.5,
    hemiSky: "#a8d0ee",
    hemiGround: "#9ab078",
    // 灯光意图：主光调亮，拉开与环境光的强度比（约 3:1），阴影更可读
    sunIntensity: 2.3,
    sunColor: "#fff6e2",
    // 灯光意图：背侧补光调弱，避免暗面被填平
    fillIntensity: 0.2,
    fillColor: "#9ec4e0",
    // 灯光意图：正面补光大幅调弱，仅防止亮面纯黑，不再压过主光的塑形
    faceFillIntensity: 0.16,
    faceFillColor: "#eef6ff",
    envIntensity: 0.4,
    cloudOpacity: 0.95,
    cloudColor: "#f9fbfd",
    cloudSpeed: 1.4,
  },
  cloudy: {
    background: "#a8b4c0",
    fogColor: "#667068",
    fogNear: 80,
    fogFar: 360,
    exposure: 0.95,
    sunPosition: [40, 55, 30],
    turbidity: 8.5,
    rayleigh: 0.55,
    mieCoefficient: 0.008,
    mieDirectionalG: 0.7,
    hemiIntensity: 0.82,
    hemiSky: "#b8c4d0",
    hemiGround: "#6e7668",
    sunIntensity: 0.72,
    sunColor: "#e8ecf0",
    fillIntensity: 0.62,
    fillColor: "#9aabbc",
    faceFillIntensity: 0.52,
    faceFillColor: "#c5d0dc",
    envIntensity: 0.52,
    cloudOpacity: 0.88,
    cloudColor: "#b0bbc8",
    cloudSpeed: 2.1,
  },
  dusk: {
    background: "#c4a890",
    fogColor: "#8a6e52",
    fogNear: 70,
    fogFar: 360,
    exposure: 1.05,
    sunPosition: [85, 18, 35],
    turbidity: 6.2,
    rayleigh: 1.35,
    mieCoefficient: 0.01,
    mieDirectionalG: 0.88,
    hemiIntensity: 0.58,
    hemiSky: "#d8b8a0",
    hemiGround: "#5a4a3a",
    sunIntensity: 1.25,
    sunColor: "#ffb070",
    fillIntensity: 0.36,
    fillColor: "#6a7a9a",
    faceFillIntensity: 0.36,
    faceFillColor: "#ffd0b0",
    envIntensity: 0.45,
    cloudOpacity: 0.9,
    cloudColor: "#e09a72",
    cloudSpeed: 1.0,
  },
};

export const DEFAULT_WEATHER: WeatherKind = "sunny";
