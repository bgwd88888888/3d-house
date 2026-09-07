/** 东南侧池塘；岸线和石块共用同一轮廓，水面位置与尺寸保持现有配置。 */
export const GARDEN_POND = {
  x: 11.2,
  z: 10.4,
  waterRx: 1.7,
  waterRz: 1.4,
  bankPad: 0.7,
} as const;

export const POND_WATER_POSITION: [number, number, number] = [0.05, -0.008, -0.05];
export const POND_WATER_TILT = 0.02;

/** 平面绕 X / Y 旋转后，水面高度沿 X 方向变化；岸石沿同一水线落位。 */
export function getPondWaterHeight(x: number): number {
  return POND_WATER_POSITION[1] - Math.tan(POND_WATER_TILT) * (x - POND_WATER_POSITION[0]);
}

export function getPondBankProfile(angle: number) {
  const { waterRx, waterRz, bankPad } = GARDEN_POND;
  const inlet = 0.94 + Math.sin(angle * 3 + 0.4) * 0.035 + Math.sin(angle * 7 - 0.8) * 0.015;
  const stonePad = bankPad * (0.21 + (Math.sin(angle * 4 + 1.2) + 1) * 0.075);
  const soilPad = stonePad + bankPad * (0.22 + (Math.sin(angle * 3 - 0.5) + 1) * 0.14);
  return {
    inner: [waterRx * inlet, waterRz * inlet] as const,
    stone: [waterRx + stonePad, waterRz + stonePad] as const,
    soil: [waterRx + soilPad, waterRz + soilPad] as const,
  };
}

/** t 从贴水内缘走向泥岸外缘，确保石块跟随不规则岸线。 */
export function getPondBankPoint(angle: number, t: number): [number, number] {
  const { inner, soil } = getPondBankProfile(angle);
  return [
    POND_WATER_POSITION[0] + Math.cos(angle) * (inner[0] + (soil[0] - inner[0]) * t) * Math.cos(POND_WATER_TILT),
    POND_WATER_POSITION[2] + Math.sin(angle) * (inner[1] + (soil[1] - inner[1]) * t),
  ];
}
