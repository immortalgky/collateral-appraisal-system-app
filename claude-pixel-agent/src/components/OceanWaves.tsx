import { useEffect, useState } from 'react';
import { generateWaveFrame } from '../data/shipSprites';
import { pixelsToBoxShadow } from '../data/crewSprites';

const WAVE_SCALE = 8; // Match ship scale

export function OceanWaves() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % 16);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const wavePixels = generateWaveFrame(frame);
  const boxShadow = pixelsToBoxShadow(wavePixels, WAVE_SCALE);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: `${WAVE_SCALE}px`,
        height: `${WAVE_SCALE}px`,
        boxShadow,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
