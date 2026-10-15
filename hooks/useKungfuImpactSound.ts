"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KungfuImpactKind } from "@/lib/kungfuSparring";

/** 只在出招手势里启用音频；声音不可用时不影响陪练。 */
export function useKungfuImpactSound() {
  const contextRef = useRef<AudioContext | null>(null);
  const noiseRef = useRef<AudioBuffer | null>(null);
  const enabledRef = useRef(true);
  const [enabled, setEnabled] = useState(true);

  const unlock = useCallback(() => {
    if (!enabledRef.current || typeof window.AudioContext === "undefined") return;
    try {
      const context = contextRef.current ?? new AudioContext();
      contextRef.current = context;
      if (!noiseRef.current) {
        const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.16), context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
        noiseRef.current = buffer;
      }
      if (context.state === "suspended") void context.resume().catch(() => {});
    } catch {
      // 某些设备不提供音频输出，仍可正常进行无声陪练。
    }
  }, []);

  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    setEnabled(enabledRef.current);
    if (enabledRef.current) unlock();
  }, [unlock]);

  const play = useCallback((kind: KungfuImpactKind) => {
    const context = contextRef.current;
    if (!enabledRef.current || !context || context.state !== "running" || !noiseRef.current) return;
    const time = context.currentTime;
    const duration = kind === "hit" ? 0.14 : 0.085;
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    noise.buffer = noiseRef.current;
    filter.type = "lowpass";
    filter.frequency.value = kind === "hit" ? 1100 : 2400;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(kind === "hit" ? 0.22 : 0.13, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    noise.connect(filter).connect(gain).connect(context.destination);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
    noise.start(time);
    noise.stop(time + duration);

    const thump = context.createOscillator();
    const bass = context.createGain();
    thump.frequency.setValueAtTime(kind === "hit" ? 120 : 190, time);
    thump.frequency.exponentialRampToValueAtTime(48, time + duration);
    bass.gain.setValueAtTime(kind === "hit" ? 0.14 : 0.06, time);
    bass.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    thump.connect(bass).connect(context.destination);
    thump.onended = () => { thump.disconnect(); bass.disconnect(); };
    thump.start(time);
    thump.stop(time + duration);
  }, []);

  useEffect(() => () => {
    const context = contextRef.current;
    contextRef.current = null;
    noiseRef.current = null;
    if (context && context.state !== "closed") void context.close().catch(() => {});
  }, []);

  return { enabled, toggle, unlock, play };
}
