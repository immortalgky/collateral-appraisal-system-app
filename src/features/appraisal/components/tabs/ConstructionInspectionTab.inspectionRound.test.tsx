import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import { AppraisalProvider } from '../../context/AppraisalContext';
import { ConstructionInspectionTab } from './ConstructionInspectionTab';

vi.mock('../../hooks/useEnrichedPropertyGroups', () => ({
  useEnrichedPropertyGroups: () => ({ groups: [] }),
}));
vi.mock('../../hooks/usePropertyBasePath', () => ({ usePropertyBasePath: () => 'properties' }));
vi.mock('../../api/constructionWorkGroups', () => ({
  useConstructionWorkGroups: () => ({ data: [], isLoading: false, isError: false }),
}));
vi.mock('@shared/api/axiosInstance', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: { constructionInspection: { isFullDetail: true, workDetails: [] } },
    }),
  },
}));

function Host({ readOnly }: { readOnly?: boolean }) {
  const form = useForm({
    defaultValues: {
      buildingCostValue: 1_000_000,
      depreciationDetails: [],
      constructionEnterDetail: false,
      constructionSubItems: [],
      constructionSummary: {},
      constructionRemark: '',
    },
  });
  return (
    <AppraisalProvider
      value={{
        appraisal: { appraisalId: 'a1', requestId: 'r1', inspectionNumber: 3 },
        isLoading: false,
        isError: false,
        error: null,
      }}
    >
      <FormProvider {...form}>
        <ConstructionInspectionTab condo={false} propertyId="p1" readOnly={readOnly} />
      </FormProvider>
    </AppraisalProvider>
  );
}

describe('ConstructionInspectionTab: the round edit button', () => {
  it('sits beside the round badge when the tab is editable', () => {
    render(<Host />);
    expect(screen.getByText('Inspection #3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit round' })).toBeInTheDocument();
  });

  it('is hidden when the tab is read-only, while the badge still shows', () => {
    render(<Host readOnly />);
    expect(screen.getByText('Inspection #3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit round' })).not.toBeInTheDocument();
  });
});
