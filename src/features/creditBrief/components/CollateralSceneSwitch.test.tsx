import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import type { BriefAsset, BriefProject } from '../api/appraisalBrief';
import CollateralSceneSwitch from './CollateralSceneSwitch';

const gpu = vi.hoisted(() => ({ available: true, probe: vi.fn() }));
vi.mock('../scene3d/webgl', () => ({
  detectGpu: () => {
    gpu.probe();
    return { available: gpu.available, software: false };
  },
}));
vi.mock('./CollateralScene', () => ({
  default: ({ compact }: { compact?: boolean }) => (
    <div data-testid="css-scene" data-compact={String(!!compact)} />
  ),
}));
vi.mock('./CollateralSummaryStack', () => ({
  default: ({ frame, flat }: { frame?: boolean; flat?: boolean }) => (
    <div data-testid={flat ? 'flat-hero' : frame ? 'hero-fallback' : 'summary-stack'} />
  ),
}));
vi.mock('./CollateralScene3D', () => ({
  default: ({ onUnavailable }: { onUnavailable: () => void }) => (
    <button type="button" data-testid="gl-scene" onClick={onUnavailable} />
  ),
}));

const asset = (propertyType: string) => ({ propertyType }) as BriefAsset;

beforeEach(() => {
  gpu.available = true;
  gpu.probe.mockClear();
});

const village = (plots: number) =>
  ({
    projectType: 'LB',
    towers: [],
    plots: Array.from({ length: plots }, () => ({})),
  }) as unknown as BriefProject;

describe('CollateralSceneSwitch', () => {
  // First: the first 3D mount resolves the lazy import, and "while it loads" is only true once.
  it('shows the hero without its canvas while the 3D chunk loads, then the 3D scene', async () => {
    render(<CollateralSceneSwitch assets={[asset('L')]} project={null} appraisalId="a1" />);
    expect(screen.getByTestId('hero-fallback')).toBeInTheDocument();
    expect(await screen.findByTestId('gl-scene')).toBeInTheDocument();
    expect(screen.queryByTestId('hero-fallback')).not.toBeInTheDocument();
  });

  it('shows the CSS scene where WebGL is unavailable, with the summary cards stacked under it', async () => {
    gpu.available = false;
    render(<CollateralSceneSwitch assets={[asset('L')]} project={null} appraisalId="a1" />);
    expect(screen.getByTestId('css-scene')).toBeInTheDocument();
    expect(screen.queryByTestId('gl-scene')).not.toBeInTheDocument();
    expect(await screen.findByTestId('summary-stack')).toBeInTheDocument();
  });

  it('shows the hero without a model, not the CSS scene, for a condo mixed with land', async () => {
    render(
      <CollateralSceneSwitch assets={[asset('U'), asset('L')]} project={null} appraisalId="a1" />,
    );
    expect(screen.getByTestId('flat-hero')).toBeInTheDocument();
    expect(screen.queryByTestId('css-scene')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gl-scene')).not.toBeInTheDocument();
  });

  it('shows the hero without a model for a project with no towers and no plots', () => {
    render(<CollateralSceneSwitch assets={[]} project={village(0)} appraisalId="a1" />);
    expect(screen.getByTestId('flat-hero')).toBeInTheDocument();
    expect(screen.queryByTestId('css-scene')).not.toBeInTheDocument();
  });

  it('stays on CSS after a failure when the SAME appraisal refetches new arrays', async () => {
    const { rerender } = render(
      <CollateralSceneSwitch assets={[asset('L')]} project={null} appraisalId="a1" />,
    );
    (await screen.findByTestId('gl-scene')).click();
    expect(await screen.findByTestId('css-scene')).toBeInTheDocument();
    rerender(<CollateralSceneSwitch assets={[asset('L')]} project={null} appraisalId="a1" />);
    expect(screen.getByTestId('css-scene')).toBeInTheDocument();
    expect(screen.queryByTestId('gl-scene')).not.toBeInTheDocument();
    rerender(<CollateralSceneSwitch assets={[asset('L')]} project={null} appraisalId="a2" />);
    expect(await screen.findByTestId('gl-scene')).toBeInTheDocument();
  });

  it('keeps a failure through a refetch that hands it new arrays for the same application', async () => {
    const { rerender } = render(
      <CollateralSceneSwitch assets={[asset('L')]} project={null} appraisalId="a1" />,
    );
    (await screen.findByTestId('gl-scene')).click();
    expect(await screen.findByTestId('css-scene')).toBeInTheDocument();
    rerender(<CollateralSceneSwitch assets={[asset('L')]} project={null} appraisalId="a1" />);
    expect(screen.getByTestId('css-scene')).toBeInTheDocument();
    expect(screen.queryByTestId('gl-scene')).not.toBeInTheDocument();
  });

  it('gives a failed appraisal whose data becomes undrawable the hero without a model', async () => {
    const { rerender } = render(
      <CollateralSceneSwitch assets={[asset('L')]} project={null} appraisalId="a1" />,
    );
    (await screen.findByTestId('gl-scene')).click();
    expect(await screen.findByTestId('css-scene')).toHaveAttribute('data-compact', 'false');
    rerender(
      <CollateralSceneSwitch assets={[asset('U'), asset('L')]} project={null} appraisalId="a1" />,
    );
    expect(screen.getByTestId('flat-hero')).toBeInTheDocument();
    expect(screen.queryByTestId('css-scene')).not.toBeInTheDocument();
  });

  it('probes the GPU once for a drawable application even under StrictMode', async () => {
    render(
      <StrictMode>
        <CollateralSceneSwitch assets={[asset('L')]} project={null} appraisalId="a1" />
      </StrictMode>,
    );
    expect(await screen.findByTestId('gl-scene')).toBeInTheDocument();
    expect(gpu.probe).toHaveBeenCalledTimes(1);
  });

  it('does not probe the GPU for an application 3D cannot draw', () => {
    render(
      <StrictMode>
        <CollateralSceneSwitch assets={[asset('U'), asset('L')]} project={null} appraisalId="a1" />
      </StrictMode>,
    );
    expect(gpu.probe).not.toHaveBeenCalled();
  });

  it('falls back to the CSS scene when the 3D scene reports it cannot run', async () => {
    render(<CollateralSceneSwitch assets={[asset('L')]} project={null} appraisalId="a1" />);
    (await screen.findByTestId('gl-scene')).click();
    expect(await screen.findByTestId('css-scene')).toBeInTheDocument();
    expect(screen.queryByTestId('gl-scene')).not.toBeInTheDocument();
  });

  // Last: the first 3D mount resolves the lazy import, and "while it loads" is only true once.
  it('draws a horizontal project that has plots in 3D, and one without plots as the hero without a model', async () => {
    const { unmount } = render(
      <CollateralSceneSwitch assets={[]} project={village(3)} appraisalId="a1" />,
    );
    expect(await screen.findByTestId('gl-scene')).toBeInTheDocument();
    unmount();
    render(<CollateralSceneSwitch assets={[]} project={village(0)} appraisalId="a1" />);
    expect(screen.getByTestId('flat-hero')).toBeInTheDocument();
    expect(screen.queryByTestId('gl-scene')).not.toBeInTheDocument();
  });

  it('draws machines alone in 3D', async () => {
    render(<CollateralSceneSwitch assets={[asset('MAC')]} project={null} appraisalId="a1" />);
    expect(await screen.findByTestId('gl-scene')).toBeInTheDocument();
    expect(screen.queryByTestId('flat-hero')).not.toBeInTheDocument();
  });
});
