import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import CarryForwardSummary, { CarryForwardLoadError } from './CarryForwardSummary';
import type { CarryForwardDocument } from '@/features/appraisal/api/priorAppraisal';

// The request namespace loads in English here (the utils pull in the form schema, which loads i18n).
const file = (over: Partial<CarryForwardDocument>): CarryForwardDocument => ({
  documentId: 'd1',
  documentType: 'D015',
  suggestedType: 'D015',
  level: 'Request',
  titleId: null,
  collateralType: null,
  titleNumber: null,
  fileName: 'id-card.png',
  filePath: null,
  prefix: null,
  set: 1,
  notes: null,
  uploadedBy: null,
  uploadedByName: null,
  uploadedAt: '2026-08-24T08:06:00',
  defaultUse: true,
  ...over,
});

describe('CarryForwardSummary', () => {
  it('lists the unused files only after the toggle and restores one with "use"', async () => {
    const onRestore = vi.fn();
    const unused = file({ documentId: 'd2', fileName: 'house-reg.pdf', defaultUse: false });
    const { user } = render(
      <CarryForwardSummary
        number="69000002"
        usedCount={3}
        unused={[unused]}
        onRestore={onRestore}
        onView={vi.fn()}
        getDocTypeName={code => code}
      />,
    );

    expect(screen.getByText('69000002')).toBeInTheDocument();
    expect(screen.queryByText(/house-reg\.pdf/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show unused files' }));
    expect(screen.getByText(/house-reg\.pdf/)).toBeInTheDocument();
    expect(screen.getByText('Document type default: not used')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Use' }));
    expect(onRestore).toHaveBeenCalledWith(unused);
  });

  it('lets a title file be restored whether or not its title can be found', async () => {
    const onRestore = vi.fn();
    const entry = file({ level: 'Title', collateralType: '01', titleNumber: '12345' });
    const { user } = render(
      <CarryForwardSummary
        number="69000002"
        usedCount={0}
        unused={[entry]}
        onRestore={onRestore}
        onView={vi.fn()}
        getDocTypeName={code => code}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Show unused files' }));
    await user.click(screen.getByRole('button', { name: 'Use' }));
    expect(onRestore).toHaveBeenCalledWith(entry);
  });

  describe('viewing an unused file', () => {
    const show = async (entry: CarryForwardDocument, onView = vi.fn()) => {
      const view = render(
        <CarryForwardSummary
          number="69000002"
          usedCount={0}
          unused={[entry]}
          onRestore={vi.fn()}
          onView={onView}
          getDocTypeName={code => code}
        />,
      );
      await view.user.click(screen.getByRole('button', { name: 'Show unused files' }));
      return view;
    };

    it('opens the file without placing it', async () => {
      const onView = vi.fn();
      const entry = file({ documentId: 'd2', fileName: 'house-reg.pdf', defaultUse: false });
      const { user } = await show(entry, onView);
      await user.click(screen.getByRole('button', { name: /View\/Download house-reg\.pdf/ }));
      expect(onView).toHaveBeenCalledWith(entry);
    });

    it('is disabled, with the reason, when the file is withheld', async () => {
      // A withheld file has no document to open (the endpoint hook filters these out; the guard is the last line)
      await show(file({ documentId: '' as string, fileName: 'house-reg.pdf' }));
      expect(screen.getByRole('button', { name: /View\/Download house-reg\.pdf/ })).toBeDisabled();
      expect(screen.getByTitle('This file cannot be viewed yet')).toBeInTheDocument();
    });
  });

  describe('which title a file came from', () => {
    const open = async (...unused: CarryForwardDocument[]) => {
      const view = render(
        <CarryForwardSummary
          number="69000002"
          usedCount={0}
          unused={unused}
          onRestore={vi.fn()}
          onView={vi.fn()}
          getDocTypeName={code => code}
        />,
      );
      await view.user.click(screen.getByRole('button', { name: 'Show unused files' }));
    };

    it('names the title a title-level file belongs to, by its number', async () => {
      await open(
        file({ level: 'Title', collateralType: '01', titleNumber: '12345', fileName: 'a.pdf' }),
        file({
          documentId: 'd9',
          level: 'Title',
          collateralType: '08',
          titleNumber: '1234,1235',
          fileName: 'b.pdf',
        }),
      );
      expect(screen.getByText(/Title deed 12345/)).toBeInTheDocument();
      expect(screen.getByText(/Condo unit 1234,1235/)).toBeInTheDocument();
    });

    it('shows the file-type badge, not a generic icon', async () => {
      await open(
        file({ documentId: 'p', fileName: 'deed.pdf' }),
        file({ documentId: 'i', fileName: 'photo.png' }),
        file({ documentId: 'x', fileName: 'notes.xyz' }),
      );
      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByText('IMG')).toBeInTheDocument();
      expect(screen.getByText('FILE')).toBeInTheDocument();
    });

    it('says so when the title had no number', async () => {
      await open(file({ level: 'Title', collateralType: '01', titleNumber: '  ' }));
      expect(screen.getByText(/Title \(no number\)/)).toBeInTheDocument();
    });

    it('leaves a request-level file as it is', async () => {
      await open(file({ level: 'Request', fileName: 'id-card.png' }));
      expect(screen.queryByText(/Title deed|Condo unit|Title \(no number\)/)).toBeNull();
    });
  });

  it('shows no toggle when everything is in use', () => {
    render(
      <CarryForwardSummary
        number="69000002"
        usedCount={2}
        unused={[]}
        onRestore={vi.fn()}
        onView={vi.fn()}
        getDocTypeName={code => code}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('CarryForwardLoadError', () => {
  it('offers a retry, and holds it while a load is running', async () => {
    const onRetry = vi.fn();
    const { user, rerender } = render(<CarryForwardLoadError retrying={false} onRetry={onRetry} />);
    await user.click(
      screen.getByRole('button', { name: "Retry loading the previous appraisal's documents" }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(<CarryForwardLoadError retrying onRetry={onRetry} />);
    expect(
      screen.getByRole('button', { name: "Retry loading the previous appraisal's documents" }),
    ).toBeDisabled();
  });
});
