import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Two PMA pages handed useUnsavedChangesWarning the key count of react-hook-form's `isDirty` — a
 * boolean, so always zero, and the guard never fired. TypeScript cannot see it: the expression is a
 * boolean and Object.keys accepts one. The pattern had already been copied to a second page, so
 * this checks every source file rather than the two that had it.
 */

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name: string) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('useUnsavedChangesWarning callers', () => {
  it('never treat the isDirty boolean as an object', () => {
    const files = sourceFiles(srcDir);
    // Resolved from this file rather than process.cwd(), and asserted, so a walk that found
    // nothing cannot pass for the wrong reason.
    expect(files.length).toBeGreaterThan(100);

    // However it is reached — isDirty, formState.isDirty, methods.formState.isDirty — its keys,
    // values and entries are always empty.
    const booleanAsObject = /Object\.(keys|values|entries)\(\s*[\w.]*\bisDirty\b/;
    const offenders = files.filter(f => booleanAsObject.test(readFileSync(f, 'utf8')));

    expect(offenders).toEqual([]);
  });
});
