import { FLIGHT_FOOT_CLEARANCE, type FlightPoint } from "./swordFlightSpec";
import { isFlightPositionBlocked, traceFlightMotion } from "./swordFlightCollision";
import { flightSurfaceAt } from "./swordFlightSurface";

export function flightLandingAt(position: FlightPoint) {
  const surface = flightSurfaceAt(position);
  if (!surface || position[1] - surface.height > 7) return null;
  const landing: FlightPoint = [position[0], surface.height + FLIGHT_FOOT_CLEARANCE, position[2]];
  if (isFlightPositionBlocked(landing) || traceFlightMotion(position, landing).blocked) return null;
  return { ...surface, position: landing };
}
