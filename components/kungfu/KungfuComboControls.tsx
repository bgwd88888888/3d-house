"use client";

import { KUNGFU_ACTIONS, KUNGFU_COMBOS, type KungfuAction, type KungfuMotion } from "@/lib/kungfuSpec";

const ACTION_LABELS = Object.fromEntries(KUNGFU_ACTIONS.map((action) => [action.id, action.label])) as Record<KungfuAction, string>;

type KungfuComboControlsProps = {
  ready: boolean;
  activeMotion: KungfuMotion;
  pending: readonly KungfuAction[];
  onCombo: (actions: readonly KungfuAction[]) => void;
};

export function KungfuComboControls({ ready, activeMotion, pending, onCombo }: KungfuComboControlsProps) {
  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-white/[0.07] pt-2 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] tracking-widest text-zinc-500">一键连招</span>
        {KUNGFU_COMBOS.map((combo) => (
          <button
            key={combo.label}
            type="button"
            disabled={!ready}
            onClick={() => onCombo(combo.actions)}
            title={combo.actions.map((action) => ACTION_LABELS[action]).join(" → ")}
            className="rounded-lg border border-amber-200/15 bg-amber-200/5 px-3 py-1.5 text-xs text-amber-100/80 transition hover:border-amber-200/40 hover:bg-amber-200/10 disabled:cursor-wait disabled:opacity-35"
          >
            {combo.label}
          </button>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 text-[10px]">
        <span className="shrink-0 text-zinc-500" role="status" aria-live="polite">待出招 {pending.length}</span>
        <div className="flex h-8 min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap py-1" aria-label="连招顺序">
          {activeMotion !== "idle" ? (
            <span className="shrink-0 rounded bg-amber-200/10 px-2 py-1 text-amber-200">当前 · {ACTION_LABELS[activeMotion]}</span>
          ) : null}
          {pending.map((action, index) => (
            <span key={`${index}-${action}`} className="flex shrink-0 items-center gap-2 text-zinc-400">
              <span aria-hidden="true" className="text-zinc-600">→</span>
              <span className="rounded bg-white/5 px-2 py-1">{ACTION_LABELS[action]}</span>
            </span>
          ))}
          {!pending.length ? <span className="text-zinc-600">连续点击招式，按顺序衔接</span> : null}
        </div>
      </div>
    </div>
  );
}
