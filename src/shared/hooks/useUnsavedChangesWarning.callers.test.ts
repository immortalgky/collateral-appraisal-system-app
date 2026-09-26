import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * useUnsavedChangesWarning takes react-hook-form's `isDirty`, which is already a boolean. Two PMA
 * pages passed `Object.keys(isDirty).length > 0` instead — `Object.keys(true)` is `[]`, so the
 * guard was always off and leaving with unsaved edits never warned. TypeScript cannot see it: the
 * expression is a boolean and `Object.keys` accepts one. The pattern had already been copied to a
 * second page, so this checks every source file rather than the two that had it.
 */

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('useUnsavedChangesWarning callers', () => {
  it('never turn the isDirty boolean into an always-empty key list', () => {
    const files = sourceFiles(join(process.cwd(), 'src'));
    // The walk has to have found the app, or an empty result would pass for the wrong reason.
    expect(files.length).toBeGreaterThan(100);

    const offenders = files.filter(f =>
      /Object\.keys\(\s*isDirty\s*\)/.test(readFileSync(f, 'utf8')),
    );

    expect(offenders).toEqual([]);
  });
});
