import type { CrewMember, PixelData } from '../types';

// Utility: convert pixel data array to CSS box-shadow string
export function pixelsToBoxShadow(pixels: PixelData, scale: number): string {
  return pixels
    .map(([x, y, color]) => `${x * scale}px ${y * scale}px 0 0 ${color}`)
    .join(', ');
}

// Color palettes per character
const COLORS = {
  luffy: {
    hat: '#FFD700', hatBand: '#CC0000', hair: '#1a1a1a', skin: '#FFCC99',
    skinDark: '#E6B07A', vest: '#CC0000', pants: '#3344AA', sandal: '#C19A6B',
  },
  zoro: {
    hair: '#2D8B46', skin: '#FFCC99', skinDark: '#E6B07A',
    haramaki: '#3A7A3A', pants: '#1a1a1a', boot: '#333333', sword: '#C0C0C0',
  },
  nami: {
    hair: '#FF8C00', skin: '#FFCC99', skinDark: '#E6B07A',
    top: '#4488DD', skirt: '#4488DD', shoe: '#884422',
  },
  sanji: {
    hair: '#FFD700', skin: '#FFCC99', skinDark: '#E6B07A',
    suit: '#1a1a1a', shirt: '#4488FF', shoe: '#1a1a1a', cig: '#FFFFFF',
  },
  robin: {
    hair: '#1a1a1a', skin: '#FFCC99', skinDark: '#E6B07A',
    top: '#6B3FA0', skirt: '#6B3FA0', boot: '#333333',
  },
  franky: {
    hair: '#00CED1', skin: '#FFCC99', skinDark: '#E6B07A',
    body: '#5588BB', speedo: '#1a1a1a', star: '#FFD700', metal: '#888888',
  },
  chopper: {
    hat: '#FF69B4', hatX: '#FFFFFF', fur: '#8B6914', furLight: '#C19A6B',
    skin: '#FFCC99', nose: '#4488FF', pants: '#CC6633',
  },
  usopp: {
    hair: '#1a1a1a', skin: '#C19A6B', skinDark: '#A0784A',
    overalls: '#8B6914', bandana: '#FFD700', nose: '#C19A6B', sling: '#884422',
  },
  brook: {
    bone: '#F5F5DC', boneShade: '#D4D4A0', hat: '#1a1a1a',
    afro: '#1a1a1a', suit: '#1a1a1a', bow: '#6B3FA0',
  },
} as const;

// ─── LUFFY ──────────────────────────────────────────
const C = COLORS.luffy;
const luffyIdle1: PixelData = [
  // Straw hat
  [5,0,C.hat],[6,0,C.hat],[7,0,C.hat],[8,0,C.hat],[9,0,C.hat],
  [4,1,C.hat],[5,1,C.hat],[6,1,C.hat],[7,1,C.hatBand],[8,1,C.hat],[9,1,C.hat],[10,1,C.hat],
  // Hair
  [5,2,C.hair],[6,2,C.hair],[7,2,C.hair],[8,2,C.hair],[9,2,C.hair],
  // Face
  [5,3,C.skin],[6,3,C.skin],[7,3,C.skin],[8,3,C.skin],[9,3,C.skin],
  [5,4,C.skin],[6,4,'#1a1a1a'],[7,4,C.skin],[8,4,'#1a1a1a'],[9,4,C.skin],
  [5,5,C.skin],[6,5,C.skin],[7,5,C.skinDark],[8,5,C.skin],[9,5,C.skin],
  [6,6,C.skin],[7,6,'#CC0000'],[8,6,C.skin], // smile
  // Body (red vest)
  [5,7,C.vest],[6,7,C.skin],[7,7,C.vest],[8,7,C.skin],[9,7,C.vest],
  [5,8,C.vest],[6,8,C.vest],[7,8,C.vest],[8,8,C.vest],[9,8,C.vest],
  [4,9,C.skin],[5,9,C.vest],[6,9,C.vest],[7,9,C.vest],[8,9,C.vest],[9,9,C.vest],[10,9,C.skin],
  // Pants
  [5,10,C.pants],[6,10,C.pants],[7,10,C.pants],[8,10,C.pants],[9,10,C.pants],
  [5,11,C.pants],[6,11,C.pants],[7,11,C.pants],[8,11,C.pants],[9,11,C.pants],
  // Legs
  [5,12,C.skin],[6,12,C.skin],[8,12,C.skin],[9,12,C.skin],
  [5,13,C.sandal],[6,13,C.sandal],[8,13,C.sandal],[9,13,C.sandal],
];

const luffyIdle2: PixelData = [
  // Same as idle1 but slightly shifted up (breathing)
  [5,0,C.hat],[6,0,C.hat],[7,0,C.hat],[8,0,C.hat],[9,0,C.hat],
  [4,1,C.hat],[5,1,C.hat],[6,1,C.hat],[7,1,C.hatBand],[8,1,C.hat],[9,1,C.hat],[10,1,C.hat],
  [5,2,C.hair],[6,2,C.hair],[7,2,C.hair],[8,2,C.hair],[9,2,C.hair],
  [5,3,C.skin],[6,3,C.skin],[7,3,C.skin],[8,3,C.skin],[9,3,C.skin],
  [5,4,C.skin],[6,4,'#1a1a1a'],[7,4,C.skin],[8,4,'#1a1a1a'],[9,4,C.skin],
  [5,5,C.skin],[6,5,C.skin],[7,5,C.skin],[8,5,C.skin],[9,5,C.skin],
  [6,6,C.skin],[7,6,C.skin],[8,6,C.skin], // closed mouth
  [5,7,C.vest],[6,7,C.skin],[7,7,C.vest],[8,7,C.skin],[9,7,C.vest],
  [5,8,C.vest],[6,8,C.vest],[7,8,C.vest],[8,8,C.vest],[9,8,C.vest],
  [4,9,C.skin],[5,9,C.vest],[6,9,C.vest],[7,9,C.vest],[8,9,C.vest],[9,9,C.vest],[10,9,C.skin],
  [5,10,C.pants],[6,10,C.pants],[7,10,C.pants],[8,10,C.pants],[9,10,C.pants],
  [5,11,C.pants],[6,11,C.pants],[7,11,C.pants],[8,11,C.pants],[9,11,C.pants],
  [5,12,C.skin],[6,12,C.skin],[8,12,C.skin],[9,12,C.skin],
  [5,13,C.sandal],[6,13,C.sandal],[8,13,C.sandal],[9,13,C.sandal],
];

// Walk frames (arms swing)
const luffyWalk1: PixelData = [
  ...luffyIdle1.slice(0, -8), // body same
  [5,10,C.pants],[6,10,C.pants],[7,10,C.pants],[8,10,C.pants],[9,10,C.pants],
  [5,11,C.pants],[6,11,C.pants],[8,11,C.pants],[9,11,C.pants],
  [4,12,C.skin],[6,12,C.skin],[8,12,C.skin],[10,12,C.skin], // legs apart
  [4,13,C.sandal],[6,13,C.sandal],[8,13,C.sandal],[10,13,C.sandal],
];

const luffyWalk2: PixelData = [
  ...luffyIdle1.slice(0, -8),
  [5,10,C.pants],[6,10,C.pants],[7,10,C.pants],[8,10,C.pants],[9,10,C.pants],
  [6,11,C.pants],[7,11,C.pants],[8,11,C.pants],
  [6,12,C.skin],[7,12,C.skin],[8,12,C.skin],
  [6,13,C.sandal],[7,13,C.sandal],[8,13,C.sandal],
];

// Celebrate: arms up, big smile
const luffyCelebrate: PixelData = [
  [5,0,C.hat],[6,0,C.hat],[7,0,C.hat],[8,0,C.hat],[9,0,C.hat],
  [4,1,C.hat],[5,1,C.hat],[6,1,C.hat],[7,1,C.hatBand],[8,1,C.hat],[9,1,C.hat],[10,1,C.hat],
  [5,2,C.hair],[6,2,C.hair],[7,2,C.hair],[8,2,C.hair],[9,2,C.hair],
  [5,3,C.skin],[6,3,C.skin],[7,3,C.skin],[8,3,C.skin],[9,3,C.skin],
  [5,4,C.skin],[6,4,'#1a1a1a'],[7,4,C.skin],[8,4,'#1a1a1a'],[9,4,C.skin],
  [5,5,C.skin],[6,5,C.skin],[7,5,C.skin],[8,5,C.skin],[9,5,C.skin],
  [5,6,C.skin],[6,6,'#CC0000'],[7,6,'#CC0000'],[8,6,'#CC0000'],[9,6,C.skin], // BIG smile
  // Arms up!
  [3,5,C.skin],[4,4,C.skin],[10,5,C.skin],[11,4,C.skin], // raised arms
  [5,7,C.vest],[6,7,C.vest],[7,7,C.vest],[8,7,C.vest],[9,7,C.vest],
  [5,8,C.vest],[6,8,C.vest],[7,8,C.vest],[8,8,C.vest],[9,8,C.vest],
  [5,9,C.vest],[6,9,C.vest],[7,9,C.vest],[8,9,C.vest],[9,9,C.vest],
  [5,10,C.pants],[6,10,C.pants],[7,10,C.pants],[8,10,C.pants],[9,10,C.pants],
  [5,11,C.pants],[6,11,C.pants],[7,11,C.pants],[8,11,C.pants],[9,11,C.pants],
  [5,12,C.skin],[6,12,C.skin],[8,12,C.skin],[9,12,C.skin],
  [5,13,C.sandal],[6,13,C.sandal],[8,13,C.sandal],[9,13,C.sandal],
];

// ─── SIMPLIFIED CREW (recolor base sprite) ─────────────────
// For efficiency, other crew members use a generic humanoid sprite
// with their signature colors applied

function makeCrewSprite(
  hairColor: string,
  topColor: string,
  bottomColor: string,
  skinColor: string,
  skinDarkColor: string,
  shoeColor: string,
  extraPixels: PixelData = []
): PixelData {
  return [
    // Hair/head top
    [5,1,hairColor],[6,1,hairColor],[7,1,hairColor],[8,1,hairColor],[9,1,hairColor],
    [5,2,hairColor],[6,2,hairColor],[7,2,hairColor],[8,2,hairColor],[9,2,hairColor],
    // Face
    [5,3,skinColor],[6,3,skinColor],[7,3,skinColor],[8,3,skinColor],[9,3,skinColor],
    [5,4,skinColor],[6,4,'#1a1a1a'],[7,4,skinColor],[8,4,'#1a1a1a'],[9,4,skinColor],
    [5,5,skinColor],[6,5,skinColor],[7,5,skinDarkColor],[8,5,skinColor],[9,5,skinColor],
    [6,6,skinColor],[7,6,skinColor],[8,6,skinColor],
    // Body
    [5,7,topColor],[6,7,topColor],[7,7,topColor],[8,7,topColor],[9,7,topColor],
    [5,8,topColor],[6,8,topColor],[7,8,topColor],[8,8,topColor],[9,8,topColor],
    [4,9,skinColor],[5,9,topColor],[6,9,topColor],[7,9,topColor],[8,9,topColor],[9,9,topColor],[10,9,skinColor],
    // Pants
    [5,10,bottomColor],[6,10,bottomColor],[7,10,bottomColor],[8,10,bottomColor],[9,10,bottomColor],
    [5,11,bottomColor],[6,11,bottomColor],[7,11,bottomColor],[8,11,bottomColor],[9,11,bottomColor],
    // Legs/shoes
    [5,12,skinColor],[6,12,skinColor],[8,12,skinColor],[9,12,skinColor],
    [5,13,shoeColor],[6,13,shoeColor],[8,13,shoeColor],[9,13,shoeColor],
    ...extraPixels,
  ];
}

function makeCrewCelebrate(
  hairColor: string,
  topColor: string,
  bottomColor: string,
  skinColor: string,
  skinDarkColor: string,
  shoeColor: string,
  extraPixels: PixelData = []
): PixelData {
  return [
    [5,1,hairColor],[6,1,hairColor],[7,1,hairColor],[8,1,hairColor],[9,1,hairColor],
    [5,2,hairColor],[6,2,hairColor],[7,2,hairColor],[8,2,hairColor],[9,2,hairColor],
    [5,3,skinColor],[6,3,skinColor],[7,3,skinColor],[8,3,skinColor],[9,3,skinColor],
    [5,4,skinColor],[6,4,'#1a1a1a'],[7,4,skinColor],[8,4,'#1a1a1a'],[9,4,skinColor],
    [5,5,skinColor],[6,5,skinColor],[7,5,skinColor],[8,5,skinColor],[9,5,skinColor],
    [5,6,skinColor],[6,6,skinDarkColor],[7,6,skinDarkColor],[8,6,skinDarkColor],[9,6,skinColor],
    [3,5,skinColor],[4,4,skinColor],[10,5,skinColor],[11,4,skinColor], // arms up
    [5,7,topColor],[6,7,topColor],[7,7,topColor],[8,7,topColor],[9,7,topColor],
    [5,8,topColor],[6,8,topColor],[7,8,topColor],[8,8,topColor],[9,8,topColor],
    [5,9,topColor],[6,9,topColor],[7,9,topColor],[8,9,topColor],[9,9,topColor],
    [5,10,bottomColor],[6,10,bottomColor],[7,10,bottomColor],[8,10,bottomColor],[9,10,bottomColor],
    [5,11,bottomColor],[6,11,bottomColor],[7,11,bottomColor],[8,11,bottomColor],[9,11,bottomColor],
    [5,12,skinColor],[6,12,skinColor],[8,12,skinColor],[9,12,skinColor],
    [5,13,shoeColor],[6,13,shoeColor],[8,13,shoeColor],[9,13,shoeColor],
    ...extraPixels,
  ];
}

function makeCrewWalk(base: PixelData): PixelData {
  // Remove last 4 rows and add walking legs
  const body = base.filter(([, y]) => y < 10);
  return [
    ...body,
    [5,10,base.find(([,y]) => y === 10)?.[2] ?? '#333'],[6,10,base.find(([,y]) => y === 10)?.[2] ?? '#333'],
    [8,10,base.find(([,y]) => y === 10)?.[2] ?? '#333'],[9,10,base.find(([,y]) => y === 10)?.[2] ?? '#333'],
    [4,11,base.find(([,y]) => y === 10)?.[2] ?? '#333'],[6,11,base.find(([,y]) => y === 10)?.[2] ?? '#333'],
    [8,11,base.find(([,y]) => y === 10)?.[2] ?? '#333'],[10,11,base.find(([,y]) => y === 10)?.[2] ?? '#333'],
    [4,12,base.find(([,y]) => y === 12)?.[2] ?? '#FFCC99'],[10,12,base.find(([,y]) => y === 12)?.[2] ?? '#FFCC99'],
    [4,13,base.find(([,y]) => y === 13)?.[2] ?? '#333'],[10,13,base.find(([,y]) => y === 13)?.[2] ?? '#333'],
  ];
}

// Create sprites for each crew member
const Z = COLORS.zoro;
const zoroBase = makeCrewSprite(Z.hair, Z.haramaki, Z.pants, Z.skin, Z.skinDark, Z.boot, [
  [3,7,Z.sword],[3,8,Z.sword],[3,9,Z.sword], // sword on side
]);
const zoroCelebrate = makeCrewCelebrate(Z.hair, Z.haramaki, Z.pants, Z.skin, Z.skinDark, Z.boot);

const N = COLORS.nami;
const namiBase = makeCrewSprite(N.hair, N.top, N.skirt, N.skin, N.skinDark, N.shoe);
const namiCelebrate = makeCrewCelebrate(N.hair, N.top, N.skirt, N.skin, N.skinDark, N.shoe);

const S = COLORS.sanji;
const sanjiBase = makeCrewSprite(S.hair, S.suit, S.suit, S.skin, S.skinDark, S.shoe, [
  [10,4,S.cig], // cigarette
]);
const sanjiCelebrate = makeCrewCelebrate(S.hair, S.suit, S.suit, S.skin, S.skinDark, S.shoe);

const R = COLORS.robin;
const robinBase = makeCrewSprite(R.hair, R.top, R.skirt, R.skin, R.skinDark, R.boot);
const robinCelebrate = makeCrewCelebrate(R.hair, R.top, R.skirt, R.skin, R.skinDark, R.boot);

const F = COLORS.franky;
const frankyBase = makeCrewSprite(F.hair, F.body, F.speedo, F.skin, F.skinDark, F.metal, [
  [7,8,F.star], // star on chest
]);
const frankyCelebrate = makeCrewCelebrate(F.hair, F.body, F.speedo, F.skin, F.skinDark, F.metal);

const CH = COLORS.chopper;
const chopperBase: PixelData = [
  // Hat
  [6,0,CH.hat],[7,0,CH.hat],[8,0,CH.hat],
  [5,1,CH.hat],[6,1,CH.hatX],[7,1,CH.hat],[8,1,CH.hatX],[9,1,CH.hat],
  // Antlers
  [4,0,'#8B6914'],[5,0,'#8B6914'],[9,0,'#8B6914'],[10,0,'#8B6914'],
  // Face
  [6,2,CH.furLight],[7,2,CH.furLight],[8,2,CH.furLight],
  [5,3,CH.fur],[6,3,CH.furLight],[7,3,CH.nose],[8,3,CH.furLight],[9,3,CH.fur],
  [5,4,CH.fur],[6,4,'#1a1a1a'],[7,4,CH.furLight],[8,4,'#1a1a1a'],[9,4,CH.fur],
  [6,5,CH.furLight],[7,5,CH.furLight],[8,5,CH.furLight],
  // Body (small!)
  [6,6,CH.pants],[7,6,CH.pants],[8,6,CH.pants],
  [5,7,CH.fur],[6,7,CH.pants],[7,7,CH.pants],[8,7,CH.pants],[9,7,CH.fur],
  [6,8,CH.pants],[7,8,CH.pants],[8,8,CH.pants],
  // Legs
  [6,9,CH.fur],[7,9,CH.fur],[8,9,CH.fur],
  [6,10,CH.fur],[8,10,CH.fur],
];
const chopperCelebrate: PixelData = [
  ...chopperBase.slice(0, -4),
  [4,7,CH.fur],[10,7,CH.fur], // arms out
  [6,9,CH.fur],[8,9,CH.fur],
  [5,10,CH.fur],[9,10,CH.fur], // legs apart
];

const U = COLORS.usopp;
const usoppBase = makeCrewSprite(U.hair, U.overalls, U.overalls, U.skin, U.skinDark, U.overalls, [
  [10,3,U.nose],[11,3,U.nose], // long nose
  [5,1,U.bandana],[6,1,U.bandana],[7,1,U.bandana],[8,1,U.bandana],[9,1,U.bandana],
]);
const usoppCelebrate = makeCrewCelebrate(U.hair, U.overalls, U.overalls, U.skin, U.skinDark, U.overalls);

const B = COLORS.brook;
const brookBase: PixelData = [
  // Top hat
  [6,0,B.hat],[7,0,B.hat],[8,0,B.hat],
  [5,1,B.hat],[6,1,B.hat],[7,1,B.hat],[8,1,B.hat],[9,1,B.hat],
  // Afro
  [5,2,B.afro],[6,2,B.afro],[7,2,B.afro],[8,2,B.afro],[9,2,B.afro],
  // Skull face
  [5,3,B.bone],[6,3,B.bone],[7,3,B.bone],[8,3,B.bone],[9,3,B.bone],
  [5,4,B.bone],[6,4,'#1a1a1a'],[7,4,B.bone],[8,4,'#1a1a1a'],[9,4,B.bone],
  [6,5,B.bone],[7,5,'#1a1a1a'],[8,5,B.bone],
  [6,6,B.bone],[7,6,B.bone],[8,6,B.bone],
  // Suit
  [5,7,B.suit],[6,7,B.suit],[7,7,B.bow],[8,7,B.suit],[9,7,B.suit],
  [5,8,B.suit],[6,8,B.suit],[7,8,B.suit],[8,8,B.suit],[9,8,B.suit],
  [4,9,B.bone],[5,9,B.suit],[6,9,B.suit],[7,9,B.suit],[8,9,B.suit],[9,9,B.suit],[10,9,B.bone],
  [5,10,B.suit],[6,10,B.suit],[7,10,B.suit],[8,10,B.suit],[9,10,B.suit],
  [5,11,B.suit],[6,11,B.suit],[7,11,B.suit],[8,11,B.suit],[9,11,B.suit],
  [5,12,B.bone],[6,12,B.bone],[8,12,B.bone],[9,12,B.bone],
  [5,13,B.suit],[6,13,B.suit],[8,13,B.suit],[9,13,B.suit],
];
const brookCelebrate: PixelData = [
  ...brookBase.filter(([,y]) => y < 7),
  [3,5,B.bone],[4,4,B.bone],[10,5,B.bone],[11,4,B.bone],
  ...brookBase.filter(([,y]) => y >= 7),
];

// ─── EXPORTS ────────────────────────────────────────
type CrewSpriteSet = {
  idle: [PixelData, PixelData];
  walk: [PixelData, PixelData];
  celebrate: [PixelData, PixelData];
};

export const CREW_SPRITES: Record<CrewMember, CrewSpriteSet> = {
  luffy: {
    idle: [luffyIdle1, luffyIdle2],
    walk: [luffyWalk1, luffyWalk2],
    celebrate: [luffyCelebrate, luffyIdle1],
  },
  zoro: {
    idle: [zoroBase, zoroBase],
    walk: [makeCrewWalk(zoroBase), zoroBase],
    celebrate: [zoroCelebrate, zoroBase],
  },
  nami: {
    idle: [namiBase, namiBase],
    walk: [makeCrewWalk(namiBase), namiBase],
    celebrate: [namiCelebrate, namiBase],
  },
  sanji: {
    idle: [sanjiBase, sanjiBase],
    walk: [makeCrewWalk(sanjiBase), sanjiBase],
    celebrate: [sanjiCelebrate, sanjiBase],
  },
  robin: {
    idle: [robinBase, robinBase],
    walk: [makeCrewWalk(robinBase), robinBase],
    celebrate: [robinCelebrate, robinBase],
  },
  franky: {
    idle: [frankyBase, frankyBase],
    walk: [makeCrewWalk(frankyBase), frankyBase],
    celebrate: [frankyCelebrate, frankyBase],
  },
  chopper: {
    idle: [chopperBase, chopperBase],
    walk: [chopperBase, chopperBase], // Chopper is small, just bob
    celebrate: [chopperCelebrate, chopperBase],
  },
  usopp: {
    idle: [usoppBase, usoppBase],
    walk: [makeCrewWalk(usoppBase), usoppBase],
    celebrate: [usoppCelebrate, usoppBase],
  },
  brook: {
    idle: [brookBase, brookBase],
    walk: [makeCrewWalk(brookBase), brookBase],
    celebrate: [brookCelebrate, brookBase],
  },
};

// Map animation state → which sprite set key to use
export function getAnimationSpriteKey(animation: string): keyof CrewSpriteSet {
  switch (animation) {
    case 'walking':
      return 'walk';
    case 'celebrating':
      return 'celebrate';
    default:
      return 'idle'; // idle, reading, typing, running, thinking, searching, eating, sleeping all use idle pose
  }
}
