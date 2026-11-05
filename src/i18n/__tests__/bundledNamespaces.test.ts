import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import i18n from '../index';

const localesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'locales');
const namespaces = (lng: string) =>
  readdirSync(join(localesDir, lng))
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, ''));

// Guard against re-introducing a lazy backend: a namespace that is not in the store at
// init suspends the component that first uses it, and a suspend on a task page
// refetches its queries 2-3 times.
describe('bundled namespaces', () => {
  it('has no backend to fetch from', () => {
    expect(i18n.services.backendConnector.backend).toBeFalsy();
  });

  it.each([
    ['th', namespaces('en')],
    ['zh', namespaces('zh')],
  ])('%s has every namespace file it ships in the resource store', (lng, expected) => {
    for (const ns of expected) {
      expect({ ns, inStore: i18n.hasResourceBundle(lng, ns) }).toEqual({ ns, inStore: true });
    }
  });
});
