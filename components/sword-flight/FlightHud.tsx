import Link from "next/link";
import { FpsOverlay } from "@/components/FpsOverlay";
import type { SwordFlightControls } from "@/hooks/useSwordFlight";
import { FLIGHT_GATES, FLIGHT_KEYS } from "@/lib/swordFlightSpec";
import { flightTarget } from "@/lib/swordFlightSimulation";

function formatTime(seconds: number | null) {
  if (seconds === null) return "—";
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
}

type Props = Pick<SwordFlightControls, "snapshot" | "ready" | "active" | "toggle" | "reset">;

export function FlightHud({ snapshot, ready, active, toggle, reset }: Props) {
  const target = flightTarget(snapshot);
  const angle = target.bearing * 180 / Math.PI;
  const direction = Math.abs(angle) < 12 ? "就在前方" : angle > 0 ? "向右转" : "向左转";

  return (
    <div className="pointer-events-none absolute inset-0 text-[#26434b]">
      <header className="absolute left-8 right-8 top-7 flex items-start justify-between">
        <div>
          <Link href="/" className="pointer-events-auto text-xs text-[#45646c] hover:text-[#173f49]">← 返回庭院</Link>
          <p className="mt-7 text-[10px] tracking-[0.38em] text-[#53737b]">ABOVE THE CLOUDS</p>
          <h1 className="mt-2 text-3xl font-light tracking-[0.3em]">御剑 · 云游</h1>
          <p className="mt-3 text-xs tracking-[0.15em] text-[#52727a]">听风而行，自在天地。</p>
        </div>
        <div className="flex items-center gap-3">
          <FpsOverlay className="rounded-full border border-white/50 bg-white/40 px-3 py-2 text-xs tabular-nums text-[#345762]" />
          <button type="button" disabled={!ready} onClick={(event) => { toggle(); event.currentTarget.blur(); }} className="pointer-events-auto rounded-full border border-white/60 bg-white/55 px-4 py-2 text-xs hover:bg-white/80 disabled:opacity-50">
            {active ? "暂停 · P" : "启程 · P"}
          </button>
          <button type="button" onClick={(event) => { reset(); event.currentTarget.blur(); }} className="pointer-events-auto rounded-full border border-white/60 bg-white/40 px-4 py-2 text-xs hover:bg-white/80">重来 · R</button>
        </div>
      </header>

      <div className="absolute left-1/2 top-8 -translate-x-1/2 rounded-2xl border border-white/50 bg-white/45 px-6 py-3 text-center">
        <p className="text-[10px] tracking-[0.2em] text-[#54727b]">下一道光环 · {snapshot.gate + 1} / {FLIGHT_GATES.length}</p>
        <div className="mt-2 flex items-center justify-center gap-3 text-sm">
          <span className="inline-block text-xl text-[#9a743b]" style={{ transform: `rotate(${angle}deg)` }}>↑</span>
          <span>{direction}</span>
          <span className="tabular-nums text-[#617d83]">{Math.round(target.distance)} m</span>
        </div>
        <p className="mt-1 text-[10px] text-[#617d83]">{Math.abs(target.height) < 3 ? "高度合适" : target.height > 0 ? `再升高 ${Math.round(target.height)} m` : `再降低 ${Math.round(-target.height)} m`}</p>
      </div>

      {!active ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[360px] rounded-3xl border border-white/70 bg-[#f4f7f1]/90 px-9 py-8 text-center shadow-xl shadow-[#325762]/10">
            <p className="text-[10px] tracking-[0.3em] text-[#7f928d]">A LITTLE ESCAPE</p>
            <h2 className="mt-4 text-2xl font-light tracking-[0.15em]">{snapshot.elapsed > 0 ? "在云间歇一会儿" : "借一缕风，去远方"}</h2>
            <p className="mt-4 text-xs leading-6 text-[#6c8386]">剑会自动向前飞。用 A / D 转向，<br />W / S 抬头俯冲，追随金色光环。<br />按住 Shift，体验乘风加速。</p>
            <button type="button" disabled={!ready} onClick={(event) => { toggle(); event.currentTarget.blur(); }} className="pointer-events-auto mt-6 w-full rounded-full bg-[#315f65] px-6 py-3 text-sm tracking-widest text-[#f7f4e9] hover:bg-[#244e55] disabled:opacity-50">
              {!ready ? "云海准备中…" : snapshot.elapsed > 0 ? "继续飞行" : "御剑启程"}
            </button>
            <p className="mt-3 text-[10px] text-[#82948f]">桌面键盘操作 · 按 P 也可启程</p>
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-28 left-8 flex gap-8">
        {[
          { label: "速度", value: String(Math.round(snapshot.speed * 3.6)), unit: "km/h" },
          { label: "高度", value: String(Math.round(snapshot.position[1])), unit: "m" },
          { label: "本圈用时", value: formatTime(snapshot.elapsed), unit: "" },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-[10px] tracking-widest text-[#66838b]">{item.label}</p>
            <p className="mt-1 text-2xl font-light tabular-nums">{item.value}<span className="ml-1 text-[10px] text-[#66838b]">{item.unit}</span></p>
          </div>
        ))}
      </div>
      <div className="absolute bottom-28 right-8 text-right text-xs text-[#54727b]">
        <p>完成 {snapshot.laps} 圈 · 最快 {formatTime(snapshot.bestLap)}</p>
        <p className="mt-2 text-[10px]">上一圈 {formatTime(snapshot.lastLap)}</p>
      </div>
      <footer className="absolute bottom-0 left-0 right-0 border-t border-white/40 bg-[#eef4f1]/70 px-8 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex gap-5">
            {FLIGHT_KEYS.map((control) => (
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
