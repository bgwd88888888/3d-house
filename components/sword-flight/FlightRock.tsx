import { useFlightModel } from "@/hooks/useFlightModel";

export function FlightRock() {
  const model = useFlightModel("rock");
  return <primitive object={model} dispose={null} />;
}
