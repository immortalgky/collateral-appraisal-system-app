import { describe, it, expect } from 'vitest';
import {
  ARM_AFTER_MS,
  FIXED_STEP_MS,
  MAX_STEPS_PER_CALL,
  PIXEL_SCALE,
  RESTART_LOCKOUT_MS,
  bestSoFar,
  createGame,
  makeConfig,
  makeDims,
  mulberry32,
  stepGame,
} from './dinoGame';
import type { GameState, JumpIntent } from './dinoGame';

const cfg = makeConfig(PIXEL_SCALE);
const dims = makeDims(PIXEL_SCALE);
const WIDTH = 600;

/** Deterministic game. The two rng streams are seeded apart so they cannot alias. */
const mk = (seed = 1) =>
  createGame({
    width: WIDTH,
    scale: PIXEL_SCALE,
    rng: mulberry32(seed),
    sceneryRng: mulberry32(seed + 900),
  });

/**
 * Step in realistic frames. One giant call would be swallowed by the catch-up clamp, which is
 * exactly what that clamp is for.
 */
const run = (g: GameState, ms: number, stepMs = 1000 / 60, intentAtFrame = -1) => {
  const frames = Math.round(ms / stepMs);
  for (let i = 0; i < frames; i++) {
    const intent: JumpIntent = i === intentAtFrame ? 'jump' : null;
    stepGame(g, stepMs, intent);
  }
  return g;
};

/** Everything that must be identical between two runs of the same length. */
const fingerprint = (g: GameState) =>
  [
    g.elapsedMs.toFixed(3),
    g.dinoY.toFixed(3),
    g.obstacles.map(o => `${o.kind}@${o.x.toFixed(3)}`).join(','),
  ].join('|');

describe('dinoGame geometry', () => {
  const apex = cfg.JUMP_VY ** 2 / (2 * -cfg.GRAVITY);

  it('keeps the dino inside the canvas at the top of a jump', () => {
    expect(cfg.GROUND_Y - dims.dino.h - apex).toBeGreaterThanOrEqual(0);
  });

  it('keeps the ground line inside the canvas', () => {
    expect(cfg.CANVAS_H).toBeGreaterThan(cfg.GROUND_Y);
  });

  it('jumps high enough to clear the tallest obstacle', () => {
    expect(apex).toBeGreaterThan(dims.obsL.h);
  });
});

describe('dinoGame phases', () => {
  it('stays ambient until the arm delay and flips right after', () => {
    const g = run(mk(), ARM_AFTER_MS - 20);
    expect(g.phase).toBe('ambient');
    run(g, 40);
    expect(g.phase).toBe('armed');
  });

  it('ignores a jump intent while ambient', () => {
    // Compared frame by frame against a twin that never presses anything. The ambient dino hops
    // by itself, so "is it back on the ground a second later" proves nothing: a jump that had
    // been accepted would have landed by then too.
    const pressed = mk();
    const control = mk();
    for (let i = 0; i < 90; i++) {
      stepGame(pressed, 1000 / 60, i === 10 ? 'jump' : null);
      stepGame(control, 1000 / 60, null);
      expect(pressed.dinoVy).toBe(control.dinoVy);
      expect(pressed.dinoY).toBe(control.dinoY);
    }
    expect(pressed.phase).toBe('ambient');
  });

  it('starts playing on the first jump once armed, and leaves the ground', () => {
    const g = run(mk(), ARM_AFTER_MS + 100);
    expect(g.phase).toBe('armed');
    stepGame(g, 1000 / 60, 'jump');
    expect(g.phase).toBe('playing');
    run(g, 60);
    expect(g.dinoY).toBeGreaterThan(0);
  });

  it('keeps a jump pressed on a frame too short to advance a tick', () => {
    const g = run(mk(), ARM_AFTER_MS + 100);
    expect(g.phase).toBe('armed');

    // A 120 Hz frame can be marginally shorter than one fixed step, so this call advances
    // nothing at all. The press must survive it rather than being swallowed.
    g.carryMs = 0;
    stepGame(g, FIXED_STEP_MS - 1, 'jump');
    expect(g.phase).toBe('armed');

    stepGame(g, FIXED_STEP_MS - 1, null);
    expect(g.phase).toBe('playing');
    expect(g.dinoVy).toBeGreaterThan(0);
  });

  it('lands back on the ground exactly, with no residual velocity', () => {
    const g = run(mk(), ARM_AFTER_MS + 100);
    stepGame(g, 1000 / 60, 'jump');
    g.obstacles = []; // isolate gravity from collision
    run(g, 2000);
    expect(g.phase).toBe('playing');
    expect(g.dinoY).toBe(0);
    expect(g.dinoVy).toBe(0);
  });
});

describe('dinoGame collision and scoring', () => {
  const planted = () => ({
    x: cfg.DINO_X + 4,
    w: dims.obsL.w,
    h: dims.obsL.h,
    kind: 'L' as const,
  });

  /** A game that has built up a score and has crashed this very moment. */
  const crashed = () => {
    const g = run(mk(), ARM_AFTER_MS + 100);
    stepGame(g, 1000 / 60, 'jump');
    // Nothing to hit while the score builds, so the crash below is the only one and the restart
    // lockout starts exactly there.
    g.obstacles = [];
    g.nextSpawnPx = Infinity;
    run(g, 1500);
    g.dinoY = 0;
    g.dinoVy = 0;
    g.obstacles = [planted()];
    stepGame(g, 20, null);
    return g;
  };

  it('does not end the game when an obstacle overlaps while armed', () => {
    const g = run(mk(), ARM_AFTER_MS + 100);
    g.dinoY = 0;
    g.dinoVy = 0;
    g.obstacles = [planted()];
    stepGame(g, 20, null);
    expect(g.phase).toBe('armed');
  });

  it('ends the game on overlap while playing, and freezes the score', () => {
    const g = crashed();
    expect(g.phase).toBe('gameOver');

    const atDeath = Math.floor(g.score);
    expect(atDeath).toBeGreaterThan(0);
    expect(g.best).toBe(atDeath);
    run(g, 2000);
    expect(Math.floor(g.score)).toBe(atDeath);
  });

  it('ignores a jump pressed right after crashing', () => {
    const g = crashed();
    const atDeath = Math.floor(g.score);
    stepGame(g, 1000 / 60, 'jump'); // a late press on the obstacle that just ended the game
    expect(g.phase).toBe('gameOver');
    expect(Math.floor(g.score)).toBe(atDeath);
  });

  it('restarts on a jump once the lockout has passed, keeping the best score', () => {
    const g = crashed();
    const best = g.best;
    expect(best).toBeGreaterThan(0);

    run(g, RESTART_LOCKOUT_MS + 50);
    stepGame(g, 1000 / 60, 'jump');
    expect(g.phase).toBe('playing');
    expect(g.obstacles).toHaveLength(0);
    expect(Math.floor(g.score)).toBe(0);
    expect(g.best).toBe(best);
  });
});

describe('dinoGame timing', () => {
  it('is frame-rate independent', () => {
    const at = (stepMs: number, ticks: number) => {
      const g = mk(5);
      for (let i = 0; i < ticks; i++) stepGame(g, stepMs, null);
      return g;
    };
    const sixty = at(1000 / 60, 480);
    const thirty = at(1000 / 30, 240);
    const oneTwenty = at(1000 / 120, 960);
    expect(fingerprint(thirty)).toBe(fingerprint(sixty));
    expect(fingerprint(oneTwenty)).toBe(fingerprint(sixty));
  });

  it('reproduces a run exactly from the same seed', () => {
    expect(fingerprint(run(mk(42), 6000))).toBe(fingerprint(run(mk(42), 6000)));
  });

  it('drops the backlog when a hidden tab returns after minutes', () => {
    const g = mk();
    const before = g.elapsedMs;
    stepGame(g, 100_000, null);
    expect(g.elapsedMs - before).toBeLessThanOrEqual(MAX_STEPS_PER_CALL * FIXED_STEP_MS + 1e-9);
  });
});

describe('dinoGame ambient auto-hop', () => {
  // The ambient dino must never appear to run through an obstacle. This checks the *sprite*,
  // not the forgiving hitbox, across every seed and the whole speed range.
  it('never lets the sprite touch an obstacle before the game is armed', () => {
    let clipped = 0;
    let worst = Infinity;
    for (let seed = 1; seed <= 8; seed++) {
      const g = mk(seed);
      const left = cfg.DINO_X;
      const right = cfg.DINO_X + dims.dino.w;
      for (let i = 0; i < 60 * 30; i++) {
        stepGame(g, 1000 / 60, null);
        for (const o of g.obstacles) {
          if (left < o.x + o.w && right > o.x) {
            const clearance = g.dinoY - o.h;
            if (clearance < worst) worst = clearance;
            if (clearance < 0) clipped++;
          }
        }
      }
    }
    expect(clipped).toBe(0);
    expect(worst).toBeGreaterThanOrEqual(0);
  });
});

describe('dinoGame at double scale', () => {
  // Every distance is in sprite pixels multiplied by the scale, so scale 2 must play exactly
  // like the default, only twice the size.
  it('never clips an obstacle during the ambient auto-hop at scale 2', () => {
    const cfg2 = makeConfig(2);
    const dims2 = makeDims(2);
    let clipped = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const g = createGame({
        width: WIDTH,
        scale: 2,
        rng: mulberry32(seed),
        sceneryRng: mulberry32(seed + 900),
      });
      const left = cfg2.DINO_X;
      const right = cfg2.DINO_X + dims2.dino.w;
      for (let i = 0; i < 60 * 30; i++) {
        stepGame(g, 1000 / 60, null);
        for (const o of g.obstacles) {
          if (left < o.x + o.w && right > o.x && g.dinoY - o.h < 0) clipped++;
        }
      }
    }
    expect(clipped).toBe(0);
  });

  it('keeps the dino inside a double-scale canvas at the top of a jump', () => {
    const cfg2 = makeConfig(2);
    const apex = cfg2.JUMP_VY ** 2 / (2 * -cfg2.GRAVITY);
    expect(cfg2.GROUND_Y - makeDims(2).dino.h - apex).toBeGreaterThanOrEqual(0);
  });
});

describe('dinoGame scenery', () => {
  const rightEdge = (g: GameState) => {
    const last = g.skyline[g.skyline.length - 1];
    return last.x + dims.city[last.kind].w;
  };

  it('is seeded full and keeps covering the canvas', () => {
    const g = mk(3);
    expect(g.skyline.length).toBeGreaterThan(0);
    expect(rightEdge(g)).toBeGreaterThanOrEqual(WIDTH);

    run(g, 120_000);
    expect(rightEdge(g)).toBeGreaterThanOrEqual(WIDTH);
    expect(g.skyline.length).toBeLessThan(200); // culled, not accumulating
  });

  it('keeps every building above the ground line', () => {
    const g = mk(3);
    const tallest = Math.max(...g.skyline.map(b => dims.city[b.kind].h));
    expect(cfg.GROUND_Y - tallest).toBeGreaterThanOrEqual(0);
  });

  it('keeps the setbacks within the intended range', () => {
    const g = mk(3);
    let maxGap = 0;
    for (let i = 1; i < g.skyline.length; i++) {
      const prev = g.skyline[i - 1];
      maxGap = Math.max(maxGap, g.skyline[i].x - (prev.x + dims.city[prev.kind].w));
    }
    expect(maxGap).toBeGreaterThan(0);
    expect(maxGap).toBeLessThanOrEqual(24 * PIXEL_SCALE);
  });

  it('draws from the scenery rng, so background art cannot shift the obstacles', () => {
    const common = { width: WIDTH, scale: PIXEL_SCALE };
    const a = createGame({ ...common, rng: mulberry32(7), sceneryRng: mulberry32(1) });
    const b = createGame({ ...common, rng: mulberry32(7), sceneryRng: mulberry32(99) });
    run(a, 20_000);
    run(b, 20_000);

    const obstacles = (g: GameState) => g.obstacles.map(o => `${o.kind}@${o.x.toFixed(3)}`).join();
    expect(obstacles(b)).toBe(obstacles(a));

    const kinds = (g: GameState) => g.skyline.map(x => x.kind).join();
    expect(kinds(b)).not.toBe(kinds(a));
  });

  it('spawns clouds without drawing from the gameplay rng', () => {
    // The test above cannot catch this: both games share one gameplay seed, so clouds drawing
    // from it would still produce identical obstacles. Count the draws instead. A cloud spawns
    // well before the first obstacle, so until then the gameplay stream must be untouched.
    let draws = 0;
    const gameplay = mulberry32(7);
    const g = createGame({
      width: WIDTH,
      scale: PIXEL_SCALE,
      rng: () => {
        draws += 1;
        return gameplay();
      },
      sceneryRng: mulberry32(1),
    });
    const startClouds = g.clouds.length;
    for (let i = 0; i < 60 * 10 && g.clouds.length === startClouds; i++) {
      stepGame(g, 1000 / 60, null);
    }
    expect(g.clouds.length).toBeGreaterThan(startClouds); // a cloud did spawn
    expect(g.obstacles).toHaveLength(0); // ...before any obstacle
    expect(draws).toBe(0);
  });
});

describe('dinoGame best score', () => {
  it('counts the run in progress, which usually ends by the loading finishing', () => {
    const g = run(mk(), ARM_AFTER_MS + 100);
    stepGame(g, 1000 / 60, 'jump');
    g.obstacles = [];
    g.nextSpawnPx = Infinity; // nothing to crash into
    run(g, 1500);
    expect(g.phase).toBe('playing');
    expect(g.best).toBe(0); // best only moves on a crash
    expect(bestSoFar(g)).toBe(Math.floor(g.score));
    expect(bestSoFar(g)).toBeGreaterThan(0);
  });

  it('is just the best when no run is in progress', () => {
    const g = mk();
    g.best = 42;
    expect(bestSoFar(g)).toBe(42);
  });
});
