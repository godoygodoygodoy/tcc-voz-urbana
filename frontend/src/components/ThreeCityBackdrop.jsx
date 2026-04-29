import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';

const towers = [
  { position: [-4.2, -1.1, -2.4], size: [0.8, 3.8, 0.8], color: '#2e1065' },
  { position: [-3.0, -1.4, -1.4], size: [0.9, 4.5, 0.9], color: '#4c1d95' },
  { position: [-1.6, -0.9, -2.8], size: [0.85, 3.2, 0.85], color: '#6d28d9' },
  { position: [-0.2, -1.6, -1.1], size: [1.05, 5.2, 1.05], color: '#7c3aed' },
  { position: [1.1, -1.0, -2.2], size: [0.9, 3.9, 0.9], color: '#8b5cf6' },
  { position: [2.6, -1.3, -1.2], size: [0.85, 4.4, 0.85], color: '#a855f7' },
  { position: [3.9, -0.8, -2.5], size: [0.95, 3.0, 0.95], color: '#c084fc' },
];

const ThreeCityBackdrop = () => {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 2.5, 10], fov: 36 }}
      gl={{ alpha: true, antialias: true }}
    >
      <color attach="background" args={['#04050a']} />
      <fog attach="fog" args={['#04050a', 9, 24]} />

      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 10, 6]} intensity={1.4} color="#ffffff" />
      <pointLight position={[-4, 2, 4]} intensity={1.8} color="#a855f7" />
      <pointLight position={[5, 1, -4]} intensity={1.3} color="#c084fc" />

      <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.28}>
        <group position={[0, 0, 0]}>
          {towers.map((tower) => (
            <mesh key={`${tower.position.join('-')}`} position={tower.position} scale={tower.size} castShadow receiveShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={tower.color} roughness={0.35} metalness={0.25} emissive="#2e1065" emissiveIntensity={0.14} />
            </mesh>
          ))}
        </group>
      </Float>

      <mesh position={[0, -2.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#020617" roughness={1} />
      </mesh>

      <mesh position={[0, -1.7, -4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[28, 28]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.07} />
      </mesh>

      <Stars radius={55} depth={24} count={800} factor={3} saturation={0} fade speed={0.35} />
    </Canvas>
  );
};

export default ThreeCityBackdrop;