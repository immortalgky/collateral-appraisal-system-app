import type { Animation, Station } from '../types';

// Station positions on the ship (x%, y%) relative to the scene container
export const STATION_POSITIONS: Record<Station, { x: number; y: number }> = {
  kitchen:   { x: 10, y: 58 },
  library:   { x: 30, y: 58 },
  workshop:  { x: 55, y: 58 },
  helm:      { x: 82, y: 58 },
  crowsNest: { x: 20, y: 20 },
  deck:      { x: 50, y: 75 },
};

// Tool name → which station the crew member goes to
export function getToolStation(tool: string): Station {
  switch (tool) {
    case 'Read':
    case 'Glob':
      return 'library';
    case 'Write':
    case 'Edit':
      return 'workshop';
    case 'Agent':
      return 'helm';
    case 'Bash':
      return 'deck';
    case 'Grep':
      return 'crowsNest';
    default:
      return 'deck';
  }
}

// Station → what animation to play when at the station
export function getStationAnimation(station: Station): Animation {
  switch (station) {
    case 'library':
      return 'reading';
    case 'workshop':
      return 'typing';
    case 'helm':
      return 'thinking';
    case 'deck':
      return 'idle';
    case 'crowsNest':
      return 'searching';
    case 'kitchen':
      return 'eating';
    default:
      return 'idle';
  }
}
