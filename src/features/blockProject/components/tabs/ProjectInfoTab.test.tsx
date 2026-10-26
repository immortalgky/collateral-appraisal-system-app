import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import { useAddressStore } from '@/shared/store';
import { mockThaiAddresses } from '@/shared/data/thaiAddresses';
import { AppraisalProvider } from '@/features/appraisal/context/AppraisalContext';
import type { ProjectType } from '../../types';
import { CondoShellContext } from '../condo/CondoShellContext';
import ProjectInfoTab from './ProjectInfoTab';

const state = vi.hoisted(() => ({
  project: undefined as unknown,
  mutate: vi.fn(),
}));

vi.mock('../../api/project', () => ({
  useGetProject: () => ({ data: state.project, isLoading: false }),
  useSaveProject: () => ({ mutate: state.mutate, isPending: false }),
}));
// The header around the form reads these through the rollup; this test is about the form's type.
vi.mock('../condo/useCondoRollup', () => ({
  useCondoRollup: () => ({
    units: 0,
    sold: 0,
    models: 0,
    pendingModels: 0,
    towers: 0,
    titles: 0,
    landSqWa: 0,
    priced: 0,
    appraisedTotal: null,
    forceSaleTotal: null,
  }),
}));
// The real form is the subject of its own concerns; here it only has to show which type it got and
// let the test pick a different one, as the type dropdown does.
vi.mock('../../forms/ProjectInfoForm', () => ({
  default: ({
    projectType,
    onProjectTypeChange,
  }: {
    projectType: string;
    onProjectTypeChange: (t: string) => void;
  }) => (
    <div data-testid="info-form" data-type={projectType}>
      <button type="button" onClick={() => onProjectTypeChange('U')}>
        pick-condo
      </button>
    </div>
  ),
}));
vi.mock('../ChangeProjectTypeDialog', () => ({
  default: ({ currentProjectType }: { currentProjectType: string }) => (
    <div data-testid="change-type-dialog" data-current={currentProjectType} />
  ),
}));

const counts = { models: 0, towers: 0, units: 0, hasLand: false, hasPricing: false };

const renderTab = (projectType: ProjectType) =>
  render(
    <AppraisalProvider
      value={{
        appraisal: { appraisalId: 'a1', requestId: 'r1' },
        isLoading: false,
        isError: false,
        error: null,
      }}
    >
      <CondoShellContext.Provider
        value={{
          projectType,
          tabs: [],
          activeTab: 'project-info',
          onTabChange: () => {},
          focus: false,
          onFocusChange: () => {},
        }}
      >
        <ProjectInfoTab projectType={projectType} hasExistingProject childCounts={counts} />
      </CondoShellContext.Provider>
    </AppraisalProvider>,
  );

describe('ProjectInfoTab with a Land (L) project', () => {
  beforeEach(() => {
    state.mutate.mockClear();
    state.project = { id: 'p1', appraisalId: 'a1', projectType: 'L', projectName: 'Plots' };
  });

  it('hands the form the stored type and saves the project as L, with its loaded data', async () => {
    const { user } = renderTab('L');
    expect(screen.getByTestId('info-form')).toHaveAttribute('data-type', 'L');

    await user.click(screen.getByRole('button', { name: 'Save Draft' }));

    expect(state.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        appraisalId: 'a1',
        isDraft: true,
        data: expect.objectContaining({ projectType: 'L', projectName: 'Plots' }),
      }),
      expect.anything(),
    );
  });

  it('opens the change-type dialog with the stored type as the current one', async () => {
    const { user } = renderTab('L');
    await user.click(screen.getByRole('button', { name: 'pick-condo' }));
    await user.click(screen.getByRole('button', { name: 'Save Draft' }));

    expect(screen.getByTestId('change-type-dialog')).toHaveAttribute('data-current', 'L');
    expect(state.mutate).not.toHaveBeenCalled();
  });
});

describe('ProjectInfoTab location names', () => {
  it('fills district and province from the sub-district code, as the selector does in edit mode', async () => {
    const address = mockThaiAddresses[0];
    useAddressStore.setState({ titleAddresses: [], dopaAddresses: [address] });
    state.mutate.mockClear();
    state.project = {
      id: 'p1',
      appraisalId: 'a1',
      projectType: 'L',
      projectName: 'Plots',
      subDistrict: address.subDistrictCode,
    };
    // The selector is not mounted on a read page, so the tab's own reset has to supply the names.
    const { user } = renderTab('L');
    await user.click(screen.getByRole('button', { name: 'Save Draft' }));

    expect(state.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          districtName: address.districtName,
          provinceName: address.provinceName,
        }),
      }),
      expect.anything(),
    );
  });
});
