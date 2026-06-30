/* =====================================================================
   App — full-screen R3F canvas: dark stage, three-point-ish lighting,
   the 12-character sheet, orbit controls, plus a Regenerate button and
   an animation selector overlaid in the DOM.
   ===================================================================== */
import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { CharacterSheet } from './components/CharacterSheet';
import { OrbitCamera } from './components/OrbitCamera';
import type { AnimationState } from './characters/characterTypes';

type AnimChoice = AnimationState | 'auto';
const ANIMS: AnimChoice[] = ['auto', 'idle', 'walk', 'attack', 'cast'];

export default function App() {
  const [seed, setSeed] = useState(1);
  const [anim, setAnim] = useState<AnimChoice>('auto');

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#2b2620' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 7, 13.5], fov: 38 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}
      >
        <color attach="background" args={['#2b2620']} />
        <fog attach="fog" args={['#2b2620', 18, 38]} />

        {/* lighting: warm key, cool fill, soft ambient */}
        <hemisphereLight args={['#cdbfa0', '#1a1712', 0.65]} />
        <ambientLight intensity={0.25} />
        <directionalLight
          position={[6, 11, 6]}
          intensity={1.15}
          color="#ffe6c0"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
        />
        <directionalLight position={[-8, 5, -4]} intensity={0.35} color="#9fb6d8" />

        {/* ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color="#23201a" roughness={1} metalness={0} />
        </mesh>

        <CharacterSheet seed={seed} animation={anim} />
        <OrbitCamera />
      </Canvas>

      {/* UI overlay */}
      <div style={panelStyle}>
        <strong style={{ color: '#d8b25a', letterSpacing: 0.5 }}>⚒ Eldermoor — Character Studio</strong>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={btnStyle} onClick={() => setSeed((s) => s + 1)}>↻ Regenerate</button>
          <label style={{ color: '#a99c80', fontSize: 13 }}>
            Animation:&nbsp;
            <select
              value={anim}
              onChange={(e) => setAnim(e.target.value as AnimChoice)}
              style={selStyle}
            >
              {ANIMS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <span style={{ color: '#6f6552', fontSize: 12 }}>seed {seed}</span>
        </div>
        <div style={{ color: '#6f6552', fontSize: 11, marginTop: 6 }}>drag to orbit · scroll to zoom</div>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: 'absolute', top: 14, left: 14, padding: '12px 14px',
  background: 'rgba(20,17,12,0.82)', border: '1px solid #3a2f1f', borderRadius: 10,
  font: '400 13px -apple-system,Segoe UI,Roboto,sans-serif',
};
const btnStyle: React.CSSProperties = {
  background: '#2c2418', color: '#efe7d4', border: '1px solid #3a2f1f',
  borderRadius: 8, padding: '7px 12px', fontSize: 13, cursor: 'pointer',
};
const selStyle: React.CSSProperties = {
  background: '#2c2418', color: '#efe7d4', border: '1px solid #3a2f1f',
  borderRadius: 6, padding: '5px 8px', fontSize: 13,
};
