import { describe, expect, it } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import { AppraisalProvider } from '../../context/AppraisalContext';
import ReportPreviewTab from './ReportPreviewTab';

const renderPreview = (allowGenerate?: boolean) =>
  render(
    <AppraisalProvider
      value={{
        appraisal: { appraisalId: 'A-none', requestId: 'R-none' },
        isLoading: false,
        isError: false,
        error: null,
      }}
    >
      <ReportPreviewTab allowGenerate={allowGenerate} />
    </AppraisalProvider>,
  );

describe('ReportPreviewTab', () => {
  it('invites a preview to be generated, with the button', () => {
    renderPreview();
    expect(screen.getByText(/Generate a preview of the appraisal book/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate preview' })).toBeInTheDocument();
  });

  it('says there is no preview yet, without a button, where it may only show the book', () => {
    renderPreview(false);
    expect(screen.getByText('No book preview yet')).toBeInTheDocument();
    expect(screen.queryByText(/Generate a preview of the appraisal book/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate preview' })).not.toBeInTheDocument();
  });
});
