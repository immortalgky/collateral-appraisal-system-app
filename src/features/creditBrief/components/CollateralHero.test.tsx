import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { HERO_HOST_CLASS, HeroBox, HeroTitle } from './CollateralHero';

describe('the hero shell', () => {
  it('is one box and one hero around whatever fills it, marked busy only while loading', () => {
    const { container, rerender } = render(
      <HeroBox style={{}} busy>
        <i />
      </HeroBox>,
    );
    expect(container.querySelector('.cs3d-box > .cs3d-hero > i')).not.toBeNull();
    expect(container.querySelector('.cs3d-box')).toHaveAttribute('aria-busy', 'true');
    rerender(
      <HeroBox style={{}}>
        <i />
      </HeroBox>,
    );
    expect(container.querySelector('.cs3d-box')).not.toHaveAttribute('aria-busy');
    expect(HERO_HOST_CLASS).toMatch(/^cs3d /);
  });

  it('titles with a chip, the title and a subtitle only when there is one', () => {
    const { container, rerender } = render(
      <HeroTitle chip="Collateral" hero={{ title: 'Land', subtitle: 'Bangkok' }} />,
    );
    expect(container.querySelector('.cs3d-chip')?.textContent).toBe('Collateral');
    expect(container.querySelector('.cs3d-title-h')?.textContent).toBe('Land');
    expect(container.querySelector('.cs3d-title p')?.textContent).toBe('Bangkok');
    rerender(<HeroTitle chip="Collateral" hero={{ title: 'Land', subtitle: '' }} />);
    expect(container.querySelector('.cs3d-title p')).toBeNull();
  });
});
