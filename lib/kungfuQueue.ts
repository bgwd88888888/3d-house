import type { KungfuAction, KungfuCommand } from "@/lib/kungfuSpec";

export type KungfuQueueState = {
  command: KungfuCommand;
  pending: readonly KungfuAction[];
};

type QueueEvent =
  | { type: "enqueue"; actions: readonly KungfuAction[] }
  | { type: "complete"; sequence: number }
  | { type: "reset" };

export const INITIAL_KUNGFU_QUEUE: KungfuQueueState = {
  command: { motion: "idle", sequence: 0 },
  pending: [],
};

/** 每个指令有独立序号，重置后到达的旧完成事件不能消耗新队列。 */
export function kungfuQueueReducer(state: KungfuQueueState, event: QueueEvent): KungfuQueueState {
  if (event.type === "reset") {
    return { command: { motion: "idle", sequence: state.command.sequence + 1 }, pending: [] };
  }
  if (event.type === "enqueue") {
    if (!event.actions.length) return state;
    const pending = [...state.pending, ...event.actions];
    if (state.command.motion !== "idle") return { ...state, pending };
    const [motion, ...remaining] = pending;
    return { command: { motion, sequence: state.command.sequence + 1 }, pending: remaining };
  }
  if (event.sequence !== state.command.sequence || state.command.motion === "idle") return state;
  const [motion = "idle", ...pending] = state.pending;
  return { command: { motion, sequence: state.command.sequence + 1 }, pending };
}
