"use client";

import { KUNGFU_ACTIONS, KUNGFU_SPEEDS, type KungfuAction, type KungfuMotion } from "@/lib/kungfuSpec";
import { KungfuComboControls } from "./KungfuComboControls";

type KungfuControlsProps = {
  ready: boolean;
  activeMotion: KungfuMotion;
  speed: number;
  pending: readonly KungfuAction[];
  onPlay: (motion: KungfuMotion) => void;
  onCombo: (actions: readonly KungfuAction[]) => void;
  onSpeedChange: (speed: number) => void;
};

export function KungfuControls({ ready, activeMotion, speed, pending, onPlay, onCombo, onSpeedChange }: KungfuControlsProps) {
  return (
    <section className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-5 sm:px-8 sm:pb-7" aria-label="动作控制">
      <div className="rounded-2xl border border-white/10 bg-[#111317]/95 p-3 shadow-2xl sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <p className="text-[10px] font-medium tracking-[0.24em] text-zinc-500">选择招式 <span className="ml-2 hidden tracking-normal sm:inline">按 1—6 快速出招</span></p>
          <button type="button" disabled={!ready} onClick={() => onPlay("idle")} className="text-xs text-zinc-400 transition hover:text-white disabled:opacity-40">
            重置姿态 <span className="ml-1 text-[10px] text-zinc-600">ESC</span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {KUNGFU_ACTIONS.map((action) => {
            const active = activeMotion === action.id;
            return (
              <button
                key={action.id}
                type="button"
                disabled={!ready}
                aria-pressed={active}
                aria-keyshortcuts={action.key}
                title={action.hint}
                onClick={() => onPlay(action.id)}
                className={`group relative rounded-xl border px-3 py-3 text-left transition duration-200 disabled:cursor-wait disabled:opacity-35 sm:py-4 ${active ? "border-amber-300/60 bg-amber-300/10 text-amber-200" : "border-white/[0.07] bg-white/[0.025] text-zinc-200 hover:border-white/25 hover:bg-white/[0.065]"}`}
              >
                <span className="absolute right-2.5 top-2 text-[10px] tabular-nums opacity-30">0{action.key}</span>
                <span className="block text-base font-medium tracking-wider">{action.label}</span>
                <span className="mt-1 block text-[8px] tracking-[0.12em] opacity-45 sm:text-[9px]">{action.english}</span>
              </button>
            );
          })}
        </div>
        <KungfuComboControls ready={ready} activeMotion={activeMotion} pending={pending} onCombo={onCombo} />
        <div className="mt-2 flex items-center justify-between gap-3 px-1">
          <p className="text-[10px] text-zinc-600 sm:text-xs">拖动旋转视角 · 滚轮缩放</p>
          <div className="flex items-center gap-1" role="group" aria-label="播放速度">
            <span className="mr-1 text-[10px] text-zinc-500">速度</span>
            {KUNGFU_SPEEDS.map((value) => (
              <button key={value} type="button" aria-pressed={speed === value} onClick={() => onSpeedChange(value)} className={`rounded-md px-2 py-1 text-[10px] tabular-nums transition ${speed === value ? "bg-white/10 text-zinc-100" : "text-zinc-600 hover:text-zinc-300"}`}>
                {value}×
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
