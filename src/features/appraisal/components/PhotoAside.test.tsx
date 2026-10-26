import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen, within } from '@/test/test-utils';
import type { Photo } from './PhotoGallery';
import { PhotoAside } from './PhotoAside';
import type { PhotoSectionView } from './PropertyPhotoSection';

const photo = (id: string): Photo => ({
  id,
  documentId: null,
  fileName: `${id}.jpg`,
  url: `/${id}.jpg`,
});

const view = (over: Partial<PhotoSectionView> = {}): PhotoSectionView => ({
  photos: [],
  thumbnailId: null,
  readOnly: false,
  onAdd: vi.fn(),
  onPreview: vi.fn(),
  ...over,
});

const card = () => screen.getByRole('complementary', { name: 'Photos' });

describe('PhotoAside', () => {
  it('shows the cover once, the other photos as thumbnails, and a thumbnail opens the viewer', async () => {
    const onPreview = vi.fn();
    const { user } = render(
      <PhotoAside view={view({ photos: [photo('a'), photo('b')], thumbnailId: 'b', onPreview })} />,
    );

    expect(within(card()).getByText('Cover')).toBeInTheDocument();
    // Cover b is the big tile only; the grid holds a, then the dashed "+" tile.
    expect(within(card()).getByRole('button', { name: 'b.jpg' })).toBeInTheDocument();
    expect(within(card()).queryByRole('button', { name: 'Photo 2' })).toBeNull();
    expect(
      within(card())
        .getAllByRole('button')
        .find(b => b.title === 'Add photo'),
    ).toBeDefined();

    await user.click(within(card()).getByRole('button', { name: 'Photo 1' }));
    expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });

  it('puts the first photo on the big tile, without a badge, when no cover is set', () => {
    render(<PhotoAside view={view({ photos: [photo('a'), photo('b'), photo('c')] })} />);
    expect(within(card()).queryByText('Cover')).toBeNull();
    expect(within(card()).getByRole('button', { name: 'a.jpg' })).toBeInTheDocument();
    expect(within(card()).queryByRole('button', { name: 'Photo 1' })).toBeNull();
    expect(within(card()).getByRole('button', { name: 'Photo 2' })).toBeInTheDocument();
    expect(within(card()).getByRole('button', { name: 'Photo 3' })).toBeInTheDocument();
  });

  it('shows the cover and only the add tile for one photo', async () => {
    const onAdd = vi.fn();
    const { user, rerender } = render(<PhotoAside view={view({ photos: [photo('a')], onAdd })} />);
    expect(within(card()).getByRole('button', { name: 'a.jpg' })).toBeInTheDocument();
    expect(within(card()).queryByRole('button', { name: /^Photo \d/ })).toBeNull();
    const tiles = within(card()).getAllByRole('button', { name: 'Add photo' });
    expect(tiles).toHaveLength(1);
    await user.click(tiles[0]);
    expect(onAdd).toHaveBeenCalledTimes(1);

    rerender(<PhotoAside view={view({ photos: [photo('a')], readOnly: true })} />);
    expect(screen.queryByRole('button', { name: 'Add photo' })).toBeNull();
  });

  it('has no add tile when read-only, whatever the photo count', () => {
    render(<PhotoAside view={view({ photos: [photo('a'), photo('b')], readOnly: true })} />);
    expect(screen.queryByRole('button', { name: 'Add photo' })).toBeNull();
    // The first photo is on the big tile, so the grid still shows the second.
    expect(screen.getByRole('button', { name: 'Photo 2' })).toBeInTheDocument();
  });

  it('makes the whole empty box the add button, and a plain box when read-only', async () => {
    const onAdd = vi.fn();
    const { user, rerender } = render(<PhotoAside view={view({ onAdd })} />);
    await user.click(within(card()).getByRole('button', { name: 'Click to add picture' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    // No separate "Add photo" button next to it.
    expect(within(card()).queryByRole('button', { name: 'Add photo' })).toBeNull();

    rerender(<PhotoAside view={view({ readOnly: true })} />);
    expect(screen.getByText('No photos yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Click to add picture' })).toBeNull();
  });

  it('caps the thumbnails at seven and carries the rest as +N on the last one', async () => {
    const onPreview = vi.fn();
    // Nine photos: a is the cover, b..i the eight others. Seven show; the last, h, stands for h and i.
    const photos = 'abcdefghi'.split('').map(photo);
    const { user } = render(<PhotoAside view={view({ photos, onPreview })} />);

    expect(within(card()).getAllByRole('button', { name: /^Photo \d/ })).toHaveLength(7);
    expect(within(card()).queryByRole('button', { name: 'Photo 9' })).toBeNull();
    expect(within(card()).getByText('+2')).toBeInTheDocument();
    await user.click(within(card()).getByRole('button', { name: 'Photo 8' }));
    expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ id: 'h' }));
    // The add tile is still the last slot after the overflow.
    expect(within(card()).getByRole('button', { name: 'Add photo' })).toBeInTheDocument();
  });

  it('shows no +N when the others exactly fill the thumbnail slots, and still the add tile', () => {
    // Eight photos: the cover and seven others, which all fit.
    render(<PhotoAside view={view({ photos: 'abcdefgh'.split('').map(photo) })} />);
    expect(within(card()).getAllByRole('button', { name: /^Photo \d/ })).toHaveLength(7);
    expect(within(card()).queryByText(/^\+\d/)).toBeNull();
    expect(within(card()).getByRole('button', { name: 'Add photo' })).toBeInTheDocument();
  });
});
