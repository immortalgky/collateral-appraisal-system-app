import { beforeEach, describe, expect, it } from 'vitest';
import { useLocaleStore, useParameterStore } from '@/shared/store';
import { paramLabel } from './useSceneEnv';

const other = () => 'Other';
const put = (rows: { code: string; description: string }[]) =>
  useParameterStore.setState({
    parameters: { 'roof.th.en': rows } as never,
  });

beforeEach(() => {
  useLocaleStore.setState({ country: 'TH', language: 'en' } as never);
  put([{ code: '04', description: 'Metal Sheet' }]);
});

describe('paramLabel', () => {
  it('uses the parameter row description', () => {
    expect(paramLabel('Roof', '04', other)).toBe('Metal Sheet');
  });
  it('reads a missing 99 as Other, never a bare 99', () => {
    expect(paramLabel('Roof', '99', other)).toBe('Other');
    put([]);
    expect(paramLabel('Roof', '99', other)).toBe('Other');
  });
  it('keeps a recorded 99 row description', () => {
    put([{ code: '99', description: 'อื่นๆ' }]);
    expect(paramLabel('Roof', '99', other)).toBe('อื่นๆ');
  });
  it('treats an empty description as missing', () => {
    put([
      { code: '04', description: '' },
      { code: '99', description: '' },
    ]);
    expect(paramLabel('Roof', '04', other)).toBe('04');
    expect(paramLabel('Roof', '99', other)).toBe('Other');
  });
  it('shows any other unknown code as itself and an empty code as a dash', () => {
    expect(paramLabel('Roof', '42', other)).toBe('42');
    expect(paramLabel('Roof', null, other)).toBe('—');
  });
});
