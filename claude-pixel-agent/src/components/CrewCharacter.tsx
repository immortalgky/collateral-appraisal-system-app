import { useEffect, useRef, useState } from 'react';
import type { Animation, CrewMember } from '../types';
import { CREW_SPRITES, getAnimationSpriteKey, pixelsToBoxShadow } from '../data/crewSprites';
import { STATION_POSITIONS } from '../data/stationLayout';
import type { Station } from '../types';
import { SpeechBubble } from './SpeechBubble';

type Props = {
  crewMember: CrewMember;
  animation: Animation;
  station: Station;
  speechText: string | null;
  role: 'main' | 'subagent' | 'teammate';
  isVisible: boolean;
};

const SCALE = 3;
const ANIMATION_SPEEDS: Partial<Record<Animation, number>> = {
  idle: 800,
  walking: 250,
  typing: 200,
  reading: 600,
  running: 200,
  thinking: 700,
  searching: 500,
  eating: 600,
  celebrating: 300,
  sleeping: 1200,
};

export function CrewCharacter({ crewMember, animation, station, speechText, role, isVisible }: Props) {
  const [frameIndex, setFrameIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const spriteKey = getAnimationSpriteKey(animation);
  const frames = CREW_SPRITES[crewMember][spriteKey];
  const speed = ANIMATION_SPEEDS[animation] ?? 500;

  useEffect(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, speed);
    return () => clearInterval(intervalRef.current);
  }, [frames.length, speed]);

  const currentFrame = frames[frameIndex % frames.length]!;
  const boxShadow = pixelsToBoxShadow(currentFrame, SCALE);
  const position = STATION_POSITIONS[station];

  // Animation-specific visual modifiers
  const isAsleep = animation === 'sleeping';
  const extraTransform = isAsleep ? 'rotate(90deg)' : '';

  return (
    <div
      className="crew-character"
      style={{
        position: 'absolute',
        left: `${position.x}%`,
        top: `${position.y}%`,
        transition: 'left 0.8s steps(8), top 0.8s steps(8)',
        opacity: isVisible ? 1 : 0,
        transform: `translate(-50%, -100%) ${extraTransform}`,
        zIndex: role === 'main' ? 10 : 5,
      }}
    >
      {/* Speech bubble */}
      {speechText && (
        <SpeechBubble text={speechText} crewMember={crewMember} />
      )}

      {/* Character pixel art */}
      <div
        style={{
          width: `${SCALE}px`,
          height: `${SCALE}px`,
          boxShadow,
          overflow: 'visible',
        }}
        className={`pixel-character ${animation === 'idle' || animation === 'eating' ? 'pixel-breathe' : ''}`}
      />

      {/* Name tag */}
      <div
        className="text-center mt-1"
        style={{
          fontSize: '9px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#FFFFFF',
          textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
          whiteSpace: 'nowrap',
          position: 'relative',
          left: '20px',
        }}
      >
        {crewMember.toUpperCase()}
        {role === 'subagent' && <span className="text-yellow-300"> *</span>}
      </div>

      {/* Activity indicator */}
      {animation !== 'idle' && animation !== 'sleeping' && (
        <div
          className="activity-indicator"
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-12px',
            fontSize: '12px',
          }}
        >
          {animation === 'reading' && '📖'}
          {animation === 'typing' && '⌨️'}
          {animation === 'running' && '💨'}
          {animation === 'thinking' && '💭'}
          {animation === 'searching' && '🔍'}
          {animation === 'eating' && '🍖'}
          {animation === 'celebrating' && '🎉'}
        </div>
      )}

      {/* Sleeping ZZZ */}
      {isAsleep && (
        <div className="zzz-animation" style={{ position: 'absolute', top: '-20px', right: '-5px' }}>
          <span style={{ fontSize: '10px', opacity: 0.8 }}>💤</span>
        </div>
      )}
    </div>
  );
}
