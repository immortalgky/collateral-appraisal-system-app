import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { fireEvent, render, screen } from '@/test/test-utils';
import AppendixChooserModal from './AppendixChooserModal';
import GallerySelectionModal from './GallerySelectionModal';
import PhotoSourceModal from './PhotoSourceModal';

describe('the modals of the Report Book flow', () => {
  it('closes the appendix chooser on Escape, and not while it is closed', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <AppendixChooserModal
        isOpen={false}
        onClose={onClose}
        appendices={[{ id: 'a', appendixTypeName: 'Land Map', documentCount: 0 }]}
        onSelect={vi.fn()}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    rerender(
      <AppendixChooserModal
        isOpen
        onClose={onClose}
        appendices={[{ id: 'a', appendixTypeName: 'Land Map', documentCount: 0 }]}
        onSelect={vi.fn()}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the photo source and the gallery on Escape too', () => {
    const closeSource = vi.fn();
    const closeGallery = vi.fn();
    render(
      <>
        <PhotoSourceModal isOpen onClose={closeSource} onUploadFromDevice={vi.fn()} />
        <GallerySelectionModal isOpen onClose={closeGallery} onSelect={vi.fn()} images={[]} />
      </>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closeSource).toHaveBeenCalledTimes(1);
    expect(closeGallery).toHaveBeenCalledTimes(1);
  });

  it('takes its texts from the translations, with the accepted types in the footer note', () => {
    render(
      <PhotoSourceModal
        isOpen
        onClose={vi.fn()}
        onUploadFromDevice={vi.fn()}
        onChooseFromGallery={vi.fn()}
        accept=".jpg,.png,.pdf"
      />,
    );
    expect(screen.getByText('Add Photos')).toBeInTheDocument();
    expect(screen.getByText('Upload from Device')).toBeInTheDocument();
    expect(screen.getByText('Choose from Gallery')).toBeInTheDocument();
    expect(screen.getByText('Supports: JPG, PNG, PDF (Max 50MB per file)')).toBeInTheDocument();
  });

  it('counts the gallery photos with the right plural, and says what to do', () => {
    render(<GallerySelectionModal isOpen onClose={vi.fn()} onSelect={vi.fn()} images={[]} />);
    expect(screen.getByText('Choose From Gallery')).toBeInTheDocument();
    expect(screen.getByText('0 photos available')).toBeInTheDocument();
    expect(screen.getByText('No photos found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add 0 Photos/ })).toBeDisabled();
  });
});
