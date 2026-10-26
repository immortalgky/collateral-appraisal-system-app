import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readPalette } from './palette';
import { paletteVars } from './paletteColors';

describe('paletteVars', () => {
  it.each([false, true])('is the scene palette itself (dark: %s)', dark => {
    const vars = paletteVars(dark);
    const p = readPalette(dark);
    expect(vars['--cs3d-hi']).toBe(`#${p.sold.getHexString()}`);
    expect(vars['--cs3d-k-building']).toBe(`#${p.roofTile.getHexString()}`);
    expect(vars['--cs3d-amber']).toBe(`#${p.amber.getHexString()}`);
    expect(vars['--cs3d-sky-b']).toBe(`#${p.bg.getHexString()}`);
  });

  it('is the only place those colours are written: the stylesheet does not define them again', () => {
    const css = readFileSync(`${__dirname}/../../../styles/collateralScene.css`, 'utf8');
    for (const name of Object.keys(paletteVars(false))) {
      expect(css).not.toMatch(new RegExp(`${name}:\\s*[#r]`));
    }
  });

  it('stays free of three.js, which the brief page must not load until a scene is drawn', () => {
    const src = readFileSync(`${__dirname}/paletteColors.ts`, 'utf8');
    expect(src).not.toMatch(/from 'three/);
  });
});
