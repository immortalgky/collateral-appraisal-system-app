import { describe, expect, it } from 'vitest';
import { hasConstructionData } from '../components/construction/constructionGrid';
import { mapConstructionInspectionResponseToForm } from './mappers';

// The server now fills the Summary* columns in both modes (the computed summary of the inspection).
const computed = {
  summaryPreviousProgressPct: 40,
  summaryPreviousValue: 400_000,
  summaryCurrentProgressPct: 72.69,
  summaryCurrentValue: 726_900,
};

describe('mapConstructionInspectionResponseToForm: Summary* columns', () => {
  it('loads them in summary mode', () => {
    const form = mapConstructionInspectionResponseToForm({
      isFullDetail: false,
      summaryDetail: 'Roof done',
      ...computed,
    });
    expect(form.constructionEnterDetail).toBe(false);
    expect(form.constructionSummary).toMatchObject({
      summaryDetail: 'Roof done',
      ...computed,
    });
  });

  it('leaves them out in detail mode, so the form looks as a detail inspection always did', () => {
    const form = mapConstructionInspectionResponseToForm({
      isFullDetail: true,
      workDetails: [],
      ...computed,
    });
    expect(form.constructionSummary).toMatchObject({
      summaryPreviousProgressPct: 0,
      summaryPreviousValue: 0,
      summaryCurrentProgressPct: 0,
      summaryCurrentValue: 0,
    });
  });

  it('treats a missing isFullDetail as detail mode, like constructionEnterDetail does', () => {
    const form = mapConstructionInspectionResponseToForm({ ...computed });
    expect(form.constructionEnterDetail).toBe(true);
    expect(form.constructionSummary.summaryCurrentProgressPct).toBe(0);
  });

  it('keeps the current percentage defaulting to the previous one in summary mode', () => {
    const form = mapConstructionInspectionResponseToForm({
      isFullDetail: false,
      summaryPreviousProgressPct: 30,
    });
    expect(form.constructionSummary.summaryCurrentProgressPct).toBe(30);
  });

  it('does not make a detail inspection look like it holds summary data (the method switch stays free)', () => {
    const detail = mapConstructionInspectionResponseToForm({
      isFullDetail: true,
      workDetails: [],
      ...computed,
    });
    expect(hasConstructionData(detail)).toBe(false);

    const summary = mapConstructionInspectionResponseToForm({ isFullDetail: false, ...computed });
    expect(hasConstructionData(summary)).toBe(true);
  });

  it('maps no inspection at all to an empty summary', () => {
    const form = mapConstructionInspectionResponseToForm(null);
    expect(form.constructionEnterDetail).toBe(true);
    expect(hasConstructionData(form)).toBe(false);
  });
});
