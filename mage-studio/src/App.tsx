/* =====================================================================
   App.tsx — the review scene for the mage: screenshot-friendly camera,
   facet-readable three-point lighting, dark neutral background, a faceted
   base disc, OrbitControls to inspect, and a Silhouette Mode toggle.
   ===================================================================== */
import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { MageCharacter } from './MageCharacter';
import { createBaseGeometry } from './geometry';

const baseGeo = createBaseGeometry();

function Scene({ silhouette }: { silhouette: boolean }) {
  return (
    <>
      <color attach="background" args={[silhouette ? '#9a9da2' : '#191b1f']} />
      {/* three-point-ish flat lighting that makes facets read */}
      <ambientLight intensity={silhouette ? 0.0 : 0.5} />
      <directionalLight position={[4, 7, 5]} intensity={silhouette ? 0 : 1.6} color="#fff0d8" />
      <directionalLight position={[-5, 3, 2]} intensity={silhouette ? 0 : 0.5} color="#9fb6d8" />
      <directionalLight position={[0, 3, -6]} intensity={silhouette ? 0 : 0.5} color="#ffe0b0" />

      <group position={[0, 0, 0]}>
        <MageCharacter silhouette={silhouette} />
        {!silhouette && (
          <mesh geometry={baseGeo} position={[0, -0.02, 0]}>
            <meshStandardMaterial color="#2a2c30" flatShading roughness={1} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>

      <OrbitControls target={[0, 1.15, 0]} enableDamping />
    </>
  );
}

export default function App() {
  const [silhouette, setSilhouette] = useState(false);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#191b1f' }}>
      <Canvas
        camera={{ position: [2.0, 1.5, 4.4], fov: 40 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <Scene silhouette={silhouette} />
      </Canvas>

      <label style={{
        position: 'fixed', left: 16, top: 14, display: 'flex', gap: 8, alignItems: 'center',
        color: '#d8cba8', font: '14px Trebuchet MS, system-ui, sans-serif', userSelect: 'none', cursor: 'pointer',
      }}>
        <input type="checkbox" checked={silhouette} onChange={(e) => setSilhouette(e.target.checked)} />
        Silhouette Mode
      </label>
      <div style={{
        position: 'fixed', right: 16, top: 14, color: '#8a8d92',
        font: '12px Trebuchet MS, system-ui, sans-serif',
      }}>
        Eldermoor · mage forge · drag to orbit
      </div>
    </div>
  );
}
