import Link from "next/link";
import { FpsOverlay } from "@/components/FpsOverlay";
import type { SwordFlightControls } from "@/hooks/useSwordFlight";
import { FLIGHT_KEYS, FLIGHT_WALK_KEYS } from "@/lib/swordFlightSpec";
import { FlightMap } from "./FlightMap";

function formatTime(seconds: number | null) {
  if (seconds === null) return "—";
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
}

type Props = Pick<SwordFlightControls, "snapshot" | "navigation" | "ready" | "active" | "toggle" | "reset">;

export function FlightHud({ snapshot, navigation, ready, active, toggle, reset }: Props) {
  const walking = snapshot.mode === "walking";
  const angle = navigation.bearing * 180 / Math.PI;

  return (
    <div className="pointer-events-none absolute inset-0 text-[#26434b]">
      <header className="absolute left-8 right-8 top-7 flex items-start justify-between">
        <div>
          <Link href="/" className="pointer-events-auto text-xs text-[#45646c] hover:text-[#173f49]">← 返回庭院</Link>
          <p className="mt-7 text-[10px] tracking-[0.38em] text-[#53737b]">ABOVE THE CLOUDS</p>
          <h1 className="mt-2 text-3xl font-light tracking-[0.3em]">御剑 · 云游</h1>
          <p className="mt-3 text-xs tracking-[0.15em] text-[#52727a]">御剑看山河，收剑入人间。</p>
        </div>
        <div className="flex items-center gap-3">
          <FpsOverlay className="rounded-full border border-white/50 bg-white/40 px-3 py-2 text-xs tabular-nums text-[#345762]" />
          <button type="button" disabled={!ready} onClick={(event) => { toggle(); event.currentTarget.blur(); }} className="pointer-events-auto rounded-full border border-white/60 bg-white/55 px-4 py-2 text-xs hover:bg-white/80 disabled:opacity-50">
            {active ? "暂停 · P" : "启程 · P"}
          </button>
          <button type="button" onClick={(event) => { reset(); event.currentTarget.blur(); }} className="pointer-events-auto rounded-full border border-white/60 bg-white/40 px-4 py-2 text-xs hover:bg-white/80">回渡口 · R</button>
        </div>
      </header>

      <div className="absolute left-1/2 top-8 -translate-x-1/2 rounded-2xl border border-white/50 bg-white/45 px-6 py-3 text-center">
        <p className="text-[10px] tracking-[0.2em] text-[#54727b]">{walking ? "收剑漫步" : "御剑云游"} · {navigation.direction} {Math.round(navigation.heading)}°</p>
        <div className="mt-2 flex items-center justify-center gap-3 text-sm">
          {!walking ? <span className="inline-block text-xl text-[#9a743b]" style={{ transform: `rotate(${angle}deg)` }}>↑</span> : null}
          <span>{walking ? navigation.location : navigation.nearest.name}</span>
          {!walking ? <span className="tabular-nums text-[#617d83]">{Math.round(navigation.distance)} m</span> : null}
        </div>
        <p className="mt-1 text-[10px] text-[#617d83]">{walking ? "走出边缘自动御剑 · 空格起飞" : navigation.landing ? `E 收剑落地 · ${navigation.landing.name}` : navigation.nearest.description}</p>
      </div>

      {!active ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[360px] rounded-3xl border border-white/70 bg-[#f4f7f1]/90 px-9 py-8 text-center shadow-xl shadow-[#325762]/10">
            <p className="text-[10px] tracking-[0.3em] text-[#7f928d]">A LITTLE ESCAPE</p>
            <h2 className="mt-4 text-2xl font-light tracking-[0.15em]">{snapshot.elapsed > 0 ? "在云间歇一会儿" : "借一缕风，去远方"}</h2>
            <p className="mt-4 text-xs leading-6 text-[#6c8386]">随心穿行十座云岛，发现松林、遗迹与飞瀑。<br />飞行用 A / D 转向，W / S 抬头俯冲。<br />靠近平台按 X 减速、C 下降、E 落地。<br />落地后 W / S 漫步，走出边缘继续御剑。</p>
            <button type="button" disabled={!ready} onClick={(event) => { toggle(); event.currentTarget.blur(); }} className="pointer-events-auto mt-6 w-full rounded-full bg-[#315f65] px-6 py-3 text-sm tracking-widest text-[#f7f4e9] hover:bg-[#244e55] disabled:opacity-50">
              {!ready ? "云海准备中…" : snapshot.elapsed > 0 ? "继续云游" : "御剑启程"}
            </button>
            <p className="mt-3 text-[10px] text-[#82948f]">桌面键盘操作 · 按 P 也可启程</p>
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-28 left-8 flex gap-8">
        {[
          { label: "速度", value: String(Math.round(snapshot.speed * 3.6)), unit: "km/h" },
          { label: "高度", value: String(Math.round(snapshot.position[1])), unit: "m" },
          { label: "漫游时间", value: formatTime(snapshot.elapsed), unit: "" },
          { label: "行程", value: (snapshot.distance / 1000).toFixed(1), unit: "km" },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-[10px] tracking-widest text-[#66838b]">{item.label}</p>
            <p className="mt-1 text-2xl font-light tabular-nums">{item.value}<span className="ml-1 text-[10px] text-[#66838b]">{item.unit}</span></p>
          </div>
        ))}
      </div>
      <div className="absolute bottom-28 right-8">
        <FlightMap position={snapshot.position} yaw={snapshot.yaw} visited={snapshot.visited} />
      </div>
      <footer className="absolute bottom-0 left-0 right-0 border-t border-white/40 bg-[#eef4f1]/70 px-8 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex gap-5">
            {(walking ? FLIGHT_WALK_KEYS : FLIGHT_KEYS).map((control) => (
              <div key={control.key} className="text-[10px]">
                <kbd className="font-sans font-medium text-[#355960]">{control.key}</kbd>
                <p className="mt-1 text-[#738b90]">{control.label}</p>
              </div>
            ))}
          </div>
          <p className="max-w-64 text-right text-[11px] leading-5 text-[#6b8589]" role="status">{snapshot.notice}</p>
        </div>
      </footer>
    </div>
  );
}
