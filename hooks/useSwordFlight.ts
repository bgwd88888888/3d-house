"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createFlightState } from "@/lib/swordFlightSimulation";
import { flightNavigation } from "@/lib/swordFlightNavigation";
import { useSwordFlightInput } from "./useSwordFlightInput";

export function useSwordFlight() {
  const flight = useRef(createFlightState());
  const running = useRef(false);
  const readyRef = useRef(false);
  const resetVersion = useRef(0);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [snapshot, setSnapshot] = useState(createFlightState);

  const toggle = useCallback(() => {
    if (!readyRef.current) return;
    running.current = !running.current;
    setActive(running.current);
  }, []);
  const pause = useCallback(() => {
    running.current = false;
    setActive(false);
  }, []);
  const reset = useCallback(() => {
    const { visited, elapsed, distance } = flight.current;
    flight.current = { ...createFlightState(), visited, elapsed, distance, notice: "已返回听风渡口，游历记录会保留。" };
    resetVersion.current += 1;
    setSnapshot(flight.current);
  }, []);
  const onReady = useCallback(() => {
    readyRef.current = true;
    setReady(true);
  }, []);
  const keys = useSwordFlightInput(toggle, pause, reset);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (running.current) setSnapshot(flight.current);
    }, 125);
    return () => window.clearInterval(timer);
  }, []);

  const navigation = flightNavigation(snapshot);
  return { flight, running, resetVersion, keys, ready, active, snapshot, navigation, toggle, reset, onReady };
}

export type SwordFlightControls = ReturnType<typeof useSwordFlight>;
