import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { retryingLazy } from './retryingLazy';

const Real = () => <div data-testid="real" />;
const Fallback = () => <div data-testid="fallback" />;

const mount = (Component: React.ComponentType) =>
  render(
    <Suspense fallback={null}>
      <Component />
    </Suspense>,
  );

describe('retryingLazy', () => {
  it('shows the fallback when the import fails, then retries on the next mount', async () => {
    let calls = 0;
    const get = retryingLazy<object>(
      () => (++calls === 1 ? Promise.reject(new Error('404')) : Promise.resolve({ default: Real })),
      Fallback,
    );

    const first = mount(get());
    expect(await screen.findByTestId('fallback')).toBeInTheDocument();
    first.unmount();

    mount(get());
    expect(await screen.findByTestId('real')).toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it('reuses one lazy component, and one import, while it works', async () => {
    let calls = 0;
    const get = retryingLazy<object>(() => (calls++, Promise.resolve({ default: Real })), Fallback);
    expect(get()).toBe(get());
    mount(get());
    await screen.findByTestId('real');
    expect(calls).toBe(1);
  });
});
