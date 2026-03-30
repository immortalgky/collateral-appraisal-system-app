import { useEffect, useState } from 'react';
import type { CrewMember } from '../types';

const CREW_COLORS: Record<CrewMember, string> = {
  luffy: '#CC0000',
  zoro: '#2D8B46',
  nami: '#FF8C00',
  sanji: '#DAA520',
  robin: '#6B3FA0',
  franky: '#00CED1',
  chopper: '#FFB6C1',
  usopp: '#8B6914',
  brook: '#555555',
};

type Props = {
  text: string;
  crewMember: CrewMember;
};

export function SpeechBubble({ text, crewMember }: Props) {
  const [visible, setVisible] = useState(false);
  const borderColor = CREW_COLORS[crewMember];

  useEffect(() => {
    // Fade in
    const showTimer = setTimeout(() => setVisible(true), 50);
    // Auto-hide after 4 seconds
    const hideTimer = setTimeout(() => setVisible(false), 4000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [text]);

  return (
    <div
      className="speech-bubble"
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: '8px',
        padding: '4px 8px',
        background: '#FFFFFF',
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        fontSize: '10px',
        fontFamily: '"Press Start 2P", monospace',
        lineHeight: '1.4',
        whiteSpace: 'nowrap',
        maxWidth: '180px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: '#333',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      {text}
      {/* Triangle pointer */}
      <div
        style={{
          position: 'absolute',
          bottom: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `6px solid ${borderColor}`,
        }}
      />
    </div>
  );
}
