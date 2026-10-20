import { useFlightModel } from "@/hooks/useFlightModel";

export function FlightPine({ scale = 1 }: { scale?: number }) {
  const model = useFlightModel("pine");
  return <primitive object={model} scale={scale} dispose={null} />;
}
