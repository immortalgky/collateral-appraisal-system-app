import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocation } from 'react-router-dom';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import { AppraisalProvider } from '@/features/appraisal/context/AppraisalContext';
import type { ProjectModel, ProjectType } from '../../../types';
import { ModelPricingButton } from './ModelPricingButton';

const create = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock('../../../api/projectPricingAnalysis', () => ({
  useCreateProjectModelPricingAnalysis: () => ({ mutate: create.mutate, isPending: false }),
}));

const Where = () => <output data-testid="where">{useLocation().pathname}</output>;

const renderButton = (model: Partial<ProjectModel>, projectType?: ProjectType) =>
  render(
    <AppraisalProvider
      value={{
        appraisal: { appraisalId: 'a1', requestId: 'r1' },
        isLoading: false,
        isError: false,
        error: null,
      }}
    >
      <ModelPricingButton
        model={{ id: 'm1', projectId: 'p', ...model } as ProjectModel}
        projectType={projectType}
      />
      <Where />
    </AppraisalProvider>,
  );

describe('ModelPricingButton', () => {
  // Braces: a hook that returns the mock makes vitest call it afterwards as a cleanup
  beforeEach(() => {
    create.mutate.mockReset();
  });

  it('Land and Building: views the existing analysis under the village route', async () => {
    const { user } = renderButton({ pricingAnalysisId: 'an1' }, 'LB');

    await user.click(screen.getByRole('button', { name: /view pricing/i }));

    expect(screen.getByTestId('where')).toHaveTextContent(
      '/appraisals/a1/block-village/model/m1/pricing-analysis/an1',
    );
    expect(create.mutate).not.toHaveBeenCalled();
  });

  it('Land and Building: creates the analysis, then opens it under the village route', async () => {
    create.mutate.mockImplementation((_vars, options) => options.onSuccess({ id: 'new1' }));
    const { user } = renderButton({}, 'LB');

    await user.click(screen.getByRole('button', { name: /run pricing/i }));

    expect(create.mutate).toHaveBeenCalledWith(
      { appraisalId: 'a1', modelId: 'm1' },
      expect.anything(),
    );
    expect(screen.getByTestId('where')).toHaveTextContent(
      '/appraisals/a1/block-village/model/m1/pricing-analysis/new1',
    );
  });

  it('Condo keeps the condo route', async () => {
    const { user } = renderButton({ pricingAnalysisId: 'an1' });

    await user.click(screen.getByRole('button', { name: /view pricing/i }));

    expect(screen.getByTestId('where')).toHaveTextContent(
      '/appraisals/a1/block-condo/model/m1/pricing-analysis/an1',
    );
  });
});
