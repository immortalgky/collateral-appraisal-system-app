import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Guard rail: every locale namespace must expose an identical key set across
 * en / th / zh, so the UI never falls back to a raw key or shows a blank label.
 *
 * - `en` is the source of truth.
 * - `th` is production — every namespace MUST have a matching th file.
 * - `zh` may legitimately fall back to English for a few namespaces that have
 *   no zh file yet (registered as en-fallback in `src/i18n/index.ts`); those are
 *   skipped here. When a zh file DOES exist, its keys must match en exactly.
 */

const localesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'locales');

// Namespaces intentionally served from English in zh (no zh JSON file yet).
const ZH_ENGLISH_FALLBACK = new Set([
  'monitoring',
  'historySearch',
  'blockUnitMaintenance',
  'feeAppointmentApproval',
  'feeApprovalConfig',
  'evaluationConfig',
]);

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v !== null && typeof v === 'object' && !Array.isArray(v)
      ? flattenKeys(v as Record<string, unknown>, path)
      : [path];
  });
}

function keySet(lang: string, ns: string): Set<string> {
  const file = join(localesDir, lang, `${ns}.json`);
  return new Set(flattenKeys(JSON.parse(readFileSync(file, 'utf-8'))));
}

const namespaces: string[] = readdirSync(join(localesDir, 'en'))
  .filter((f: string) => f.endsWith('.json'))
  .map((f: string) => f.replace(/\.json$/, ''));

describe('i18n locale parity', () => {
  it.each(namespaces)('th matches en for "%s"', (ns: string) => {
    const en = keySet('en', ns);
    expect(existsSync(join(localesDir, 'th', `${ns}.json`))).toBe(true);
    const th = keySet('th', ns);
    expect({ missingInTh: [...en].filter(k => !th.has(k)), extraInTh: [...th].filter(k => !en.has(k)) }).toEqual({
      missingInTh: [],
      extraInTh: [],
    });
  });

  it.each(namespaces.filter(ns => !ZH_ENGLISH_FALLBACK.has(ns)))('zh matches en for "%s"', ns => {
    const zhPath = join(localesDir, 'zh', `${ns}.json`);
    // A non-fallback namespace must ship a zh file.
    expect(existsSync(zhPath)).toBe(true);
    const en = keySet('en', ns);
    const zh = keySet('zh', ns);
    expect({ missingInZh: [...en].filter(k => !zh.has(k)), extraInZh: [...zh].filter(k => !en.has(k)) }).toEqual({
      missingInZh: [],
      extraInZh: [],
    });
  });
});
