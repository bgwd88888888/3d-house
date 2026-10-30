export const FLIGHT_CLOUDS = Array.from({ length: 96 }, (_, index) => {
  const distant = index >= 40;
  const angle = index * 2.39996;
  const radius = distant ? 600 + Math.sqrt((index - 39) / 56) * 950 : 20 + Math.sqrt((index + 1) / 40) * 580;
  return {
    position: [Math.cos(angle) * radius + 40, -20 + Math.sin(index * 4.3) * 4, Math.sin(angle) * radius + 25] as [number, number, number],
    volume: distant ? 260 + index % 5 * 25 : 180 + index % 4 * 18,
    opacity: distant ? 0.85 : 0.95,
  };
});
