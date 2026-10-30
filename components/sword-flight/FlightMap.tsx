import { FLIGHT_ISLANDS, type FlightPoint } from "@/lib/swordFlightSpec";

function mapPoint(position: FlightPoint) {
  return { x: 120 + position[0] * 0.2, y: 132 + position[2] * 0.18 };
}

export function FlightMap({ position, yaw, visited }: { position: FlightPoint; yaw: number; visited: readonly string[] }) {
  const player = mapPoint(position);
  const outside = player.x < 8 || player.x > 232 || player.y < 12 || player.y > 178;
  return (
    <div className="w-60 rounded-2xl border border-white/50 bg-[#edf3ee]/75 px-3 py-3 text-[#45646c]">
      <div className="flex items-center justify-between text-[10px] tracking-widest">
        <span>云海舆图</span><span>北 ↑</span>
      </div>
      <svg viewBox="0 0 240 190" className="mt-1 w-full" role="img" aria-label={`群岛地图，已登临 ${visited.length} 处，当前位置 ${Math.round(position[0])}，${Math.round(position[2])}`}>
        <path d="M0 46H240M0 94H240M0 142H240M60 0V190M120 0V190M180 0V190" fill="none" stroke="#89a6a4" strokeOpacity=".15" />
        {FLIGHT_ISLANDS.map((island) => {
          const point = mapPoint(island.position);
          const discovered = visited.includes(island.id);
          return (
            <g key={island.id} transform={`translate(${point.x} ${point.y})`}>
              <ellipse rx={island.radius * 0.16} ry={island.radius * 0.1} fill={discovered ? "#548477" : "#a4b9ad"} fillOpacity=".65" />
              <circle r="1.8" fill={discovered ? "#275c50" : "#839991"} />
              <text y="15" textAnchor="middle" fill="#526d6b" fontSize="8">{island.name}</text>
            </g>
          );
        })}
        <g transform={`translate(${Math.max(8, Math.min(232, player.x))} ${Math.max(12, Math.min(178, player.y))}) rotate(${yaw * 180 / Math.PI})`}>
          <circle r="9" fill="#f8f5e5" fillOpacity=".65" />
          <path d="M0 -7L4 5L0 3L-4 5Z" fill="#af7e38" stroke="#fff6d8" strokeWidth="1" />
        </g>
      </svg>
      <p className="text-[10px] text-[#708984]">{outside ? "已飞出图幅，仍可自由探索 · R 返回渡口" : `已登临 ${visited.length} / ${FLIGHT_ISLANDS.length} 处 · 随心选择方向`}</p>
    </div>
  );
}
