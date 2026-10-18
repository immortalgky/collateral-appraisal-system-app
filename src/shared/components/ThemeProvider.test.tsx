import { describe, it, expect, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { useUIStore } from '@shared/store';
import ThemeProvider from './ThemeProvider';
import { isFormLayout } from './formLayoutConstants';

const html = document.documentElement;

describe('form layout preference', () => {
  afterEach(() => {
    act(() => useUIStore.setState({ formLayout: 'grid' }));
  });

  it('accepts the two layouts and nothing else', () => {
    for (const value of ['grid', 'classic']) expect(isFormLayout(value)).toBe(true);
    for (const value of ['compact', 'Grid', '', null, undefined, 1])
      expect(isFormLayout(value)).toBe(false);
  });

  it('writes the layout on <html>', () => {
    act(() => useUIStore.setState({ formLayout: 'grid' }));
    render(<ThemeProvider />);
    expect(html.getAttribute('data-form-layout')).toBe('grid');

    act(() => useUIStore.setState({ formLayout: 'classic' }));
    expect(html.getAttribute('data-form-layout')).toBe('classic');

    act(() => useUIStore.setState({ formLayout: 'grid' }));
    expect(html.getAttribute('data-form-layout')).toBe('grid');
  });
});
