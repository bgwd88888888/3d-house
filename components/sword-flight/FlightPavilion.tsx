import { useEffect, useMemo } from "react";
import { DoubleSide } from "three";
import { FLIGHT_PAVILION as pavilion, pavilionRoofHeight } from "@/lib/flightIslandShape";
import { createPavilionRoofGeometry } from "@/lib/flightLandscapeGeometry";
import { useRoofTextures } from "@/hooks/useRoofTextures";
import { useWoodTextures } from "@/hooks/useWoodTextures";
import { usePathTextures } from "@/hooks/usePathTextures";

export function FlightPavilion() {
  const tiles = useRoofTextures();
  const wood = useWoodTextures();
  const { primary: stone } = usePathTextures();
  const roof = useMemo(() => createPavilionRoofGeometry(), []);
  useEffect(() => () => roof.dispose(), [roof]);
  return (
    <group position={[pavilion.x, 0, pavilion.z]}>
      <mesh position={[0, pavilion.floor - 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[pavilion.halfWidth * 2 - 0.3, 1.3, pavilion.halfWidth * 2 - 0.3]} />
        <meshStandardMaterial {...stone} color="#858b82" roughness={0.95} normalScale={[0.45, 0.45]} />
      </mesh>
      <mesh position={[0, pavilion.floor, 0]} castShadow receiveShadow>
        <boxGeometry args={[pavilion.halfWidth * 2, 0.44, pavilion.halfWidth * 2]} />
        <meshStandardMaterial {...stone} color="#9b9e95" roughness={0.95} normalScale={[0.45, 0.45]} />
      </mesh>
      {[0, 1, 2].map((step) => (
        <mesh key={step} position={[0, pavilion.floor - 0.35 - step * 0.25, 4 + step * 0.45]} castShadow receiveShadow>
          <boxGeometry args={[3, 0.28, 0.7]} />
          <meshStandardMaterial {...stone} color="#a4a69d" roughness={0.95} normalScale={[0.45, 0.45]} />
        </mesh>
      ))}
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
        <group key={`${x}:${z}`} position={[x * pavilion.postOffset, pavilion.floor, z * pavilion.postOffset]}>
          <mesh position={[0, pavilion.postHeight / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[pavilion.postRadius, pavilion.postRadius, pavilion.postHeight, 12]} />
            <meshStandardMaterial {...wood} color="#b1a087" roughness={0.85} normalScale={[0.4, 0.4]} />
          </mesh>
          <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.28, 0.32, 0.4, 12]} />
            <meshStandardMaterial {...stone} color="#94988e" roughness={0.95} normalScale={[0.45, 0.45]} />
          </mesh>
        </group>
      )))}
      {[0, Math.PI / 2].flatMap((angle) => [-1, 1].map((side) => (
        <group key={`${angle}:${side}`} rotation={[0, angle, 0]}>
          <mesh position={[0, pavilion.roofBase - 0.25, side * pavilion.postOffset]} castShadow receiveShadow>
            <boxGeometry args={[6.1, 0.35, 0.26]} />
            <meshStandardMaterial {...wood} color="#b1a087" roughness={0.85} normalScale={[0.4, 0.4]} />
          </mesh>
        </group>
      )))}
      <mesh geometry={roof} castShadow receiveShadow>
        <meshStandardMaterial {...tiles} color="#a8b7b4" roughness={0.85} normalScale={[0.65, 0.65]} side={DoubleSide} />
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
