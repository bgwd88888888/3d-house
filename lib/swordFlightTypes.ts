import type { FlightPoint } from "./swordFlightSpec";

export interface FlightInput {
  turn: number;
  pitch: number;
  lift: number;
  boost: boolean;
  brake: boolean;
  land: boolean;
}

export interface FlightState {
  position: FlightPoint;
  yaw: number;
  pitch: number;
  bank: number;
  speed: number;
  mode: "flying" | "walking";
  location: string | null;
  visited: readonly string[];
  elapsed: number;
  distance: number;
  notice: string;
}
