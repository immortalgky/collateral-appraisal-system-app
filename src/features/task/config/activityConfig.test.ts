import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ACTIVITY_IDS, getActivityConfig } from './activityConfig';

// A name the sprite does not have renders as an empty tile, with no error anywhere.
const sprite = readFileSync(join(process.cwd(), 'public/icons/solid.svg'), 'utf-8');

describe('activityConfig icons', () => {
  it.each(ACTIVITY_IDS)('%s has an icon in the solid sprite', id => {
    const icon = getActivityConfig(id)!.icon;
    expect(sprite).toContain(`id="${icon}"`);
  });
});
