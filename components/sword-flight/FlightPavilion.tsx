import { useEffect, useMemo } from "react";
import { DoubleSide } from "three";
import { FLIGHT_PAVILION as pavilion, pavilionRoofHeight } from "@/lib/flightIslandShape";
import { createPavilionRoofGeometry } from "@/lib/flightLandscapeGeometry";

export function FlightPavilion() {
  const roof = useMemo(() => createPavilionRoofGeometry(), []);
  useEffect(() => () => roof.dispose(), [roof]);
  return (
    <group position={[pavilion.x, 0, pavilion.z]}>
      <mesh position={[0, pavilion.floor, 0]}>
        <boxGeometry args={[pavilion.halfWidth * 2, 0.44, pavilion.halfWidth * 2]} />
        <meshStandardMaterial color="#c2bba2" roughness={0.9} />
      </mesh>
      {[0, 1, 2].map((step) => (
        <mesh key={step} position={[0, pavilion.floor - 0.35 - step * 0.25, 4 + step * 0.45]}>
          <boxGeometry args={[3, 0.28, 0.7]} />
          <meshStandardMaterial color="#b1b19c" />
        </mesh>
      ))}
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
        <group key={`${x}:${z}`} position={[x * pavilion.postOffset, pavilion.floor, z * pavilion.postOffset]}>
          <mesh position={[0, pavilion.postHeight / 2, 0]}>
            <cylinderGeometry args={[pavilion.postRadius, pavilion.postRadius, pavilion.postHeight, 12]} />
            <meshStandardMaterial color="#654c3d" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.28, 0.32, 0.4, 12]} />
            <meshStandardMaterial color="#b6ae94" />
          </mesh>
        </group>
      )))}
      {[0, Math.PI / 2].flatMap((angle) => [-1, 1].map((side) => (
        <group key={`${angle}:${side}`} rotation={[0, angle, 0]}>
          <mesh position={[0, pavilion.roofBase - 0.25, side * pavilion.postOffset]}>
            <boxGeometry args={[6.1, 0.35, 0.26]} />
            <meshStandardMaterial color="#755a42" />
          </mesh>
        </group>
      )))}
      <mesh geometry={roof}>
        <meshStandardMaterial vertexColors roughness={0.75} side={DoubleSide} />
      </mesh>
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
        <mesh key={`${x}:${z}`} position={[x * 4.9, pavilionRoofHeight(4.9, 4.9) + 0.13, z * 4.9]}>
          <sphereGeometry args={[0.14, 10, 8]} />
          <meshStandardMaterial color="#b89d66" metalness={0.35} roughness={0.45} />
        </mesh>
      )))}
      <mesh position={[0, pavilionRoofHeight(0, 0) + 0.25, 0]}>
        <sphereGeometry args={[0.22, 12, 8]} />
        <meshStandardMaterial color="#b89d66" metalness={0.35} roughness={0.45} />
      </mesh>
    </group>
  );
}
