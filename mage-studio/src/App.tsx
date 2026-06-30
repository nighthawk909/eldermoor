/* =====================================================================
   App.tsx — the review scene for the mage: screenshot-friendly camera,
   facet-readable three-point lighting, dark neutral background, a faceted
   base disc, OrbitControls to inspect, and a Silhouette Mode toggle.
   ===================================================================== */
import { useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { MageCharacter } from './MageCharacter';
import { createBaseGeometry } from './geometry';

const baseGeo = createBaseGeometry();

/* ?still -> render on demand (idle page) so screenshot tools can capture; we
   kick a few frames after mount so geometry/lighting settle, then idle. */
const STILL = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('still');

function Kick() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => { invalidate(); if (++n > 6) clearInterval(id); }, 90);
    return () => clearInterval(id);
  }, [invalidate]);
  return null;
}

function Scene({ silhouette }: { silhouette: boolean }) {
  return (
    <>
      <color attach="background" args={[silhouette ? '#9a9da2' : '#1c1f24']} />
      {/* three-point-ish flat lighting, bright enough that facets read */}
      <ambientLight intensity={silhouette ? 0.0 : 0.75} />
      <directionalLight position={[4, 7, 5]} intensity={silhouette ? 0 : 2.4} color="#fff1da" />
      <directionalLight position={[-5, 3, 2]} intensity={silhouette ? 0 : 0.8} color="#a6bce0" />
      <directionalLight position={[0, 4, -6]} intensity={silhouette ? 0 : 0.7} color="#ffe2b4" />

      <group position={[0, 0, 0]}>
        <MageCharacter silhouette={silhouette} />
        {!silhouette && (
          <mesh geometry={baseGeo} position={[0, -0.02, 0]}>
            <meshStandardMaterial color="#2a2c30" flatShading roughness={1} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>

      <OrbitControls target={[0, 1.15, 0]} enableDamping={!STILL} />
      {STILL && <Kick />}
    </>
  );
}

export default function App() {
  const [silhouette, setSilhouette] = useState(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('sil'),
  );
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#191b1f' }}>
      <Canvas
        frameloop={STILL ? 'demand' : 'always'}
        camera={{ position: [0.75, 1.4, 4.3], fov: 42 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
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
