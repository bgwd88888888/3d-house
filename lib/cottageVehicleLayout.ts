/** 西式小院皮卡摆放坐标，供模型、人物避障和草地磨损共用。 */
export const COTTAGE_PICKUP_POSITION: [number, number, number] = [15.2, -0.02, 1.4];

/** 车头朝 +Z；磨损椭圆略大于车身，轮胎印沿车长方向。 */
export const COTTAGE_PARKING_WEAR = {
  halfWidth: 1.22,
  halfLength: 2.42,
  tireOffset: 0.74,
} as const;
