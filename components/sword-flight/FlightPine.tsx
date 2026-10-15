export function FlightPine({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0.15, 2.2, 0]} rotation={[0, 0, -0.1]}>
        <cylinderGeometry args={[0.12, 0.26, 4.4, 10]} />
        <meshStandardMaterial color="#675f4c" roughness={1} />
      </mesh>
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = index * 2.4;
        const reach = 1.5 - index * 0.18;
        return (
          <group key={index} position={[Math.cos(angle) * reach, 2.7 + index * 0.52, Math.sin(angle) * reach]}>
            <mesh scale={[1.7 - index * 0.16, 0.48, 1.3 - index * 0.1]}>
              <sphereGeometry args={[1.15, 14, 10]} />
              <meshStandardMaterial color={index % 2 ? "#416b59" : "#527963"} roughness={1} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
