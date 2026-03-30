import type { PixelData } from '../types';

// Thousand Sunny ship background rendered as pixel data
// The ship is drawn at a logical scale, rendered via CSS box-shadow

const WOOD = '#C19A6B';
const WOOD_DARK = '#8B6914';
const WOOD_LIGHT = '#D4A76A';
const RAILING = '#DAA520';
const SAIL = '#F5F5DC';
const MAST = '#8B6914';
const WATER = '#2288CC';
const WATER_LIGHT = '#44AADD';
const GRASS = '#4CAF50';
const GRASS_DARK = '#388E3C';
const LION_GOLD = '#FFD700';
const LION_BROWN = '#B8860B';
const FLAG_BLACK = '#1a1a1a';
const FLAG_WHITE = '#F5F5DC';
const WINDOW = '#66BBEE';

// Simplified Thousand Sunny - the iconic ship features:
// Grass deck, lion figurehead, mast with Jolly Roger

// Hull (bottom section)
export const SHIP_HULL: PixelData = (() => {
  const pixels: PixelData = [];

  // Water line
  for (let x = 5; x < 75; x++) {
    pixels.push([x, 55, WOOD]);
    pixels.push([x, 56, WOOD_DARK]);
    pixels.push([x, 57, WOOD_DARK]);
  }

  // Hull curve left
  for (let y = 50; y < 55; y++) {
    pixels.push([5 + (54 - y), y, WOOD]);
    pixels.push([6 + (54 - y), y, WOOD]);
  }

  // Hull curve right
  for (let y = 50; y < 55; y++) {
    pixels.push([74 - (54 - y), y, WOOD]);
    pixels.push([73 - (54 - y), y, WOOD]);
  }

  // Grass deck
  for (let x = 10; x < 70; x++) {
    for (let y = 47; y < 50; y++) {
      pixels.push([x, y, (x + y) % 3 === 0 ? GRASS_DARK : GRASS]);
    }
  }

  // Railing
  for (let x = 8; x < 72; x++) {
    pixels.push([x, 46, RAILING]);
    if (x % 4 === 0) {
      pixels.push([x, 44, RAILING]);
      pixels.push([x, 45, RAILING]);
    }
  }

  return pixels;
})();

// Upper deck / cabin area
export const SHIP_CABIN: PixelData = (() => {
  const pixels: PixelData = [];

  // Kitchen area (left)
  for (let x = 10; x < 22; x++) {
    for (let y = 38; y < 46; y++) {
      if (y === 38) pixels.push([x, y, WOOD_LIGHT]);
      else if (y < 42) pixels.push([x, y, WOOD]);
      else pixels.push([x, y, WOOD_LIGHT]);
    }
  }
  // Kitchen window
  pixels.push([14, 40, WINDOW], [15, 40, WINDOW], [16, 40, WINDOW]);
  pixels.push([14, 41, WINDOW], [15, 41, WINDOW], [16, 41, WINDOW]);

  // Library area (center-left)
  for (let x = 24; x < 36; x++) {
    for (let y = 38; y < 46; y++) {
      if (y === 38) pixels.push([x, y, WOOD_LIGHT]);
      else pixels.push([x, y, WOOD]);
    }
  }
  // Bookshelf hint
  pixels.push([27, 40, '#884422'], [28, 40, '#CC4444'], [29, 40, '#4444CC']);
  pixels.push([27, 41, '#44CC44'], [28, 41, '#884422'], [29, 41, '#CC8844']);
  pixels.push([31, 40, '#884422'], [32, 40, '#4444CC'], [33, 40, '#CC4444']);

  // Workshop area (center-right)
  for (let x = 38; x < 52; x++) {
    for (let y = 38; y < 46; y++) {
      if (y === 38) pixels.push([x, y, WOOD_LIGHT]);
      else pixels.push([x, y, '#888888']); // metallic workshop
    }
  }
  // Gear icon
  pixels.push([44, 41, '#AAAAAA'], [45, 40, '#AAAAAA'], [45, 42, '#AAAAAA']);
  pixels.push([44, 40, '#CCCCCC'], [45, 41, '#CCCCCC'], [46, 41, '#AAAAAA']);

  // Helm area (right)
  for (let x = 54; x < 70; x++) {
    for (let y = 38; y < 46; y++) {
      if (y === 38) pixels.push([x, y, WOOD_LIGHT]);
      else pixels.push([x, y, WOOD]);
    }
  }
  // Ship wheel
  pixels.push([61, 40, WOOD_DARK], [62, 40, RAILING], [63, 40, WOOD_DARK]);
  pixels.push([61, 41, RAILING], [62, 41, WOOD_DARK], [63, 41, RAILING]);
  pixels.push([61, 42, WOOD_DARK], [62, 42, RAILING], [63, 42, WOOD_DARK]);

  return pixels;
})();

// Mast with Jolly Roger
export const SHIP_MAST: PixelData = (() => {
  const pixels: PixelData = [];

  // Mast pole
  for (let y = 5; y < 46; y++) {
    pixels.push([39, y, MAST]);
    pixels.push([40, y, MAST]);
  }

  // Cross beam
  for (let x = 30; x < 50; x++) {
    pixels.push([x, 12, MAST]);
  }

  // Sail
  for (let x = 31; x < 49; x++) {
    for (let y = 13; y < 30; y++) {
      const distFromCenter = Math.abs(x - 40);
      const maxDist = Math.min(y - 12, 9);
      if (distFromCenter <= maxDist) {
        pixels.push([x, y, SAIL]);
      }
    }
  }

  // Jolly Roger flag (Straw Hat version!)
  for (let x = 42; x < 52; x++) {
    for (let y = 3; y < 11; y++) {
      pixels.push([x, y, FLAG_BLACK]);
    }
  }
  // Skull
  pixels.push([45, 5, FLAG_WHITE], [46, 5, FLAG_WHITE], [47, 5, FLAG_WHITE], [48, 5, FLAG_WHITE]);
  pixels.push([45, 6, FLAG_WHITE], [46, 6, FLAG_BLACK], [47, 6, FLAG_BLACK], [48, 6, FLAG_WHITE]);
  pixels.push([46, 7, FLAG_WHITE], [47, 7, FLAG_WHITE]);
  // Straw hat on skull
  pixels.push([44, 4, '#FFD700'], [45, 4, '#FFD700'], [46, 4, '#FFD700'], [47, 4, '#FFD700'], [48, 4, '#FFD700'], [49, 4, '#FFD700']);
  // Crossbones
  pixels.push([44, 8, FLAG_WHITE], [49, 8, FLAG_WHITE]);
  pixels.push([45, 9, FLAG_WHITE], [48, 9, FLAG_WHITE]);

  return pixels;
})();

// Lion figurehead (simplified)
export const SHIP_LION: PixelData = (() => {
  const pixels: PixelData = [];

  // Lion head at the front of the ship (left side)
  // Mane
  for (let x = 0; x < 8; x++) {
    for (let y = 44; y < 52; y++) {
      const dist = Math.sqrt((x - 4) ** 2 + (y - 47) ** 2);
      if (dist < 4.5) {
        pixels.push([x, y, LION_BROWN]);
      }
    }
  }
  // Face
  pixels.push([3, 46, LION_GOLD], [4, 46, LION_GOLD], [5, 46, LION_GOLD]);
  pixels.push([3, 47, LION_GOLD], [4, 47, LION_GOLD], [5, 47, LION_GOLD]);
  pixels.push([3, 48, LION_GOLD], [4, 48, LION_GOLD], [5, 48, LION_GOLD]);
  // Eyes
  pixels.push([3, 46, '#1a1a1a'], [5, 46, '#1a1a1a']);
  // Nose
  pixels.push([4, 47, '#CC6633']);

  return pixels;
})();

// Crow's nest (lookout)
export const SHIP_CROWS_NEST: PixelData = (() => {
  const pixels: PixelData = [];

  // Platform
  for (let x = 34; x < 46; x++) {
    pixels.push([x, 4, WOOD_DARK]);
    pixels.push([x, 5, WOOD]);
  }
  // Railing
  pixels.push([34, 2, RAILING], [34, 3, RAILING]);
  pixels.push([45, 2, RAILING], [45, 3, RAILING]);
  for (let x = 34; x < 46; x++) {
    pixels.push([x, 2, RAILING]);
  }

  return pixels;
})();

// Ocean waves (animated - returns base frame)
export function generateWaveFrame(frame: number): PixelData {
  const pixels: PixelData = [];
  const offset = frame % 8;

  for (let x = 0; x < 80; x++) {
    const waveY = Math.sin((x + offset) * 0.4) > 0 ? 58 : 59;
    pixels.push([x, waveY, WATER_LIGHT]);
    for (let y = waveY + 1; y < 65; y++) {
      pixels.push([x, y, y > 61 ? '#1166AA' : WATER]);
    }
  }

  return pixels;
}

// Combine all static ship elements
export const SHIP_STATIC: PixelData = [
  ...SHIP_HULL,
  ...SHIP_CABIN,
  ...SHIP_MAST,
  ...SHIP_LION,
  ...SHIP_CROWS_NEST,
];

// Sky background
export function generateSky(): PixelData {
  const pixels: PixelData = [];
  for (let x = 0; x < 80; x++) {
    for (let y = 0; y < 58; y++) {
      if (y < 3) {
        pixels.push([x, y, '#6BB8E0']);
      }
    }
  }
  // Clouds
  const clouds: [number, number][] = [
    [10, 2], [11, 2], [12, 2], [11, 1], [12, 1],
    [55, 3], [56, 3], [57, 3], [58, 3], [56, 2], [57, 2],
  ];
  for (const [cx, cy] of clouds) {
    pixels.push([cx, cy, '#FFFFFF']);
  }
  return pixels;
}

export const SKY_PIXELS = generateSky();
