import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import MoveDocumentModal, { type MoveTargetSection } from './MoveDocumentModal';

const request: MoveTargetSection = {
  entityType: 'request',
  entityIndex: -1,
  label: 'Request level',
  detail: 'Attached to the request, not to any title',
};
const title = (n: number, over: Partial<MoveTargetSection> = {}): MoveTargetSection => ({
  entityType: 'title',
  entityIndex: n,
  label: `Title ${1000 + n} · Land (#${n + 1})`,
  detail: `District ${n} · Owner ${n}`,
  ...over,
});

const renderModal = (targets: MoveTargetSection[], onConfirm = vi.fn()) =>
  render(
    <MoveDocumentModal
      isOpen
      onClose={vi.fn()}
      targets={targets}
      onConfirm={onConfirm}
      confirmText="Use file"
      file={{
        fileName: 'deed.pdf',
        typeLabel: 'D013 · Deed',
        fromLabel: 'From prior appraisal 6910',
      }}
    />,
  );

const confirm = () => screen.getByRole('button', { name: 'Use file' });

describe('MoveDocumentModal', () => {
  it('says which file it is: name, type and where it came from', () => {
    renderModal([request, title(0)]);
    expect(screen.getByText('deed.pdf')).toBeInTheDocument();
    expect(screen.getByText('D013 · Deed')).toBeInTheDocument();
    expect(screen.getByText('From prior appraisal 6910')).toBeInTheDocument();
  });

  it('starts on the only title that is the file’s own, and marks it', () => {
    renderModal([request, title(0), title(1, { matches: true }), title(2)]);
    expect(screen.getByRole('radio', { name: /Title 1001/ })).toBeChecked();
    expect(screen.getByText('Same as the original title')).toBeInTheDocument();
    expect(confirm()).toBeEnabled();
  });

  it('chooses nothing when no title matches, or when several do', () => {
    const { unmount } = renderModal([request, title(0), title(1)]);
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
    expect(confirm()).toBeDisabled();
    unmount();
    renderModal([request, title(0, { matches: true }), title(1, { matches: true })]);
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
    expect(screen.getAllByText('Same as the original title')).toHaveLength(2);
    expect(confirm()).toBeDisabled();
  });

  it('has a search only for a long list, and it filters by number, place and owner', async () => {
    const short = renderModal([request, title(0), title(1)]);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    short.unmount();

    const many = [request, ...Array.from({ length: 8 }, (_, i) => title(i))];
    const { user } = renderModal(many);
    const search = screen.getByRole('searchbox');
    await user.type(search, 'owner 5');
    expect(screen.getAllByRole('radio')).toHaveLength(1);
    expect(screen.getByRole('radio', { name: /Title 1005/ })).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, 'zzz');
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByText('No section matches')).toBeInTheDocument();
  });

  it('confirms with the section that was chosen', async () => {
    const onConfirm = vi.fn();
    const { user } = renderModal([request, title(0), title(1)], onConfirm);
    await user.click(screen.getByRole('radio', { name: /Title 1001/ }));
    await user.click(confirm());
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'title', entityIndex: 1 }),
    );
  });

  describe('when the maker also picks the document type', () => {
    const types = [
      { code: 'D013', label: 'Deed' },
      { code: 'D015', label: 'ID card' },
    ];
    const renderChooser = (onConfirm = vi.fn()) =>
      render(
        <MoveDocumentModal
          isOpen
          onClose={vi.fn()}
          targets={[request, title(0), title(1)]}
          defaultTarget={{ entityType: 'title', entityIndex: 1 }}
          types={types}
          defaultType="D013"
          onConfirm={onConfirm}
          confirmText="Use file"
          file={{ fileName: 'deed.pdf' }}
        />,
      );

    it('starts on the given section and the suggested type', async () => {
      const onConfirm = vi.fn();
      const { user } = renderChooser(onConfirm);
      expect(screen.getByRole('radio', { name: /Title 1001/ })).toBeChecked();
      await user.click(confirm());
      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'title', entityIndex: 1 }),
        'D013',
      );
    });

    it('confirms with another section and another type', async () => {
      const onConfirm = vi.fn();
      const { user } = renderChooser(onConfirm);
      await user.click(screen.getByRole('radio', { name: /Request level/ }));
      await user.click(screen.getByRole('button', { name: /Deed/ }));
      await user.click(screen.getByRole('option', { name: /ID card/ }));
      await user.click(confirm());
      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'request', entityIndex: -1 }),
        'D015',
      );
    });

    it('starts on the request level for a request-level file', () => {
      render(
        <MoveDocumentModal
          isOpen
          onClose={vi.fn()}
          targets={[request, title(0)]}
          defaultTarget={{ entityType: 'request', entityIndex: -1 }}
          types={types}
          defaultType="D015"
          onConfirm={vi.fn()}
          confirmText="Use file"
        />,
      );
      expect(screen.getByRole('radio', { name: /Request level/ })).toBeChecked();
    });
  });
});
