/* =====================================================================
   OrbitCamera — orbit controls aimed slightly down at the sheet, like a
   character viewer. Wraps drei's OrbitControls and makes it the default.
   ===================================================================== */
import { OrbitControls } from '@react-three/drei';

export function OrbitCamera({ target = [0, 1.2, 0] as [number, number, number] }) {
  return (
    <OrbitControls
      makeDefault
      target={target}
      enablePan
      minDistance={4}
      maxDistance={40}
      maxPolarAngle={Math.PI * 0.52}
      enableDamping
      dampingFactor={0.08}
    />
  );
}

export default OrbitCamera;
