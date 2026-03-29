import { useMemo } from 'react';
import { SHIP_STATIC, SKY_PIXELS } from '../data/shipSprites';
import { pixelsToBoxShadow } from '../data/crewSprites';
import { usePixelAgentStore } from '../store';
import { CrewCharacter } from './CrewCharacter';
import { OceanWaves } from './OceanWaves';

const SHIP_SCALE = 8; // Each logical pixel = 8 CSS pixels

export function ThousandSunny() {
  const agents = usePixelAgentStore((s) => s.agents);

  // Memoize static ship rendering (expensive box-shadow string)
  const shipShadow = useMemo(() => pixelsToBoxShadow(SHIP_STATIC, SHIP_SCALE), []);
  const skyShadow = useMemo(() => pixelsToBoxShadow(SKY_PIXELS, SHIP_SCALE), []);

  const agentList = Array.from(agents.values());

  return (
    <div
      className="thousand-sunny"
      style={{
        position: 'relative',
        width: `${80 * SHIP_SCALE}px`,
        height: `${65 * SHIP_SCALE}px`,
        overflow: 'hidden',
        borderRadius: '12px',
        background: '#87CEEB', // Sky blue
        imageRendering: 'pixelated',
      }}
    >
      {/* Sky */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${SHIP_SCALE}px`,
          height: `${SHIP_SCALE}px`,
          boxShadow: skyShadow,
          pointerEvents: 'none',
        }}
      />

      {/* Ship structure */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${SHIP_SCALE}px`,
          height: `${SHIP_SCALE}px`,
          boxShadow: shipShadow,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Ocean waves */}
      <OceanWaves />

      {/* Station labels */}
      <div className="station-labels" style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
        <StationLabel x={10} y={35} label="Kitchen" emoji="🍳" />
        <StationLabel x={30} y={35} label="Library" emoji="📚" />
        <StationLabel x={55} y={35} label="Workshop" emoji="⚙️" />
        <StationLabel x={82} y={35} label="Helm" emoji="🧭" />
        <StationLabel x={20} y={12} label="Lookout" emoji="🔭" />
        <StationLabel x={50} y={90} label="Deck" emoji="⚓" />
      </div>

      {/* Crew members */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
        {agentList.map((agent) => (
          <CrewCharacter
            key={agent.id}
            crewMember={agent.crewMember}
            animation={agent.animation}
            station={agent.currentStation}
            speechText={agent.speechText}
            role={agent.role}
            isVisible={agent.isVisible}
          />
        ))}
      </div>

      {/* Empty state */}
      {agentList.length === 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            zIndex: 10,
            color: '#FFFFFF',
            textShadow: '2px 2px 0 #000',
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            lineHeight: '1.8',
          }}
        >
          <div>Waiting for crew...</div>
          <div style={{ fontSize: '8px', marginTop: '8px', opacity: 0.8 }}>
            Start a Claude Code session to see your agents!
          </div>
        </div>
      )}
    </div>
  );
}

function StationLabel({ x, y, label, emoji }: { x: number; y: number; label: string; emoji: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translateX(-50%)',
        fontSize: '8px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#FFD700',
        textShadow: '1px 1px 0 #000',
        whiteSpace: 'nowrap',
        textAlign: 'center',
      }}
    >
      <div>{emoji}</div>
      <div>{label}</div>
    </div>
  );
}
