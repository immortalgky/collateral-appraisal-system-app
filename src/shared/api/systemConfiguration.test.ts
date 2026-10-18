import { describe, expect, it } from 'vitest';
import { configToBool, type SystemConfigurationDto } from './systemConfiguration';

const entry = (value: string, isActive = true): SystemConfigurationDto => ({
  key: 'k',
  value,
  valueType: 'bool',
  isActive,
});

describe('configToBool', () => {
  it.each([
    {
      name: 'loading gives the default',
      data: entry('false'),
      loading: true,
      def: true,
      want: true,
    },
    { name: 'undefined gives the default', data: undefined, loading: false, def: true, want: true },
    { name: 'null (404) gives the default', data: null, loading: false, def: false, want: false },
    {
      name: 'inactive gives the default',
      data: entry('false', false),
      loading: false,
      def: true,
      want: true,
    },
    { name: "'true' is true", data: entry('true'), loading: false, def: false, want: true },
    {
      name: "' TRUE ' is true (trimmed, case-insensitive)",
      data: entry(' TRUE '),
      loading: false,
      def: false,
      want: true,
    },
    { name: "'false' is false", data: entry('false'), loading: false, def: true, want: false },
    { name: "'False' is false", data: entry('False'), loading: false, def: true, want: false },
  ])('$name', ({ data, loading, def, want }) => {
    expect(configToBool(data, loading, def)).toBe(want);
  });
});
