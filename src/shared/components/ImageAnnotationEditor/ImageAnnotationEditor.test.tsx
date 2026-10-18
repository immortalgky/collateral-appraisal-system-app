import { describe, expect, it, vi } from 'vitest';
import { render } from '@/test/test-utils';
import ImageAnnotationEditor from './ImageAnnotationEditor';

vi.mock('fabric', () => ({
  IText: class {},
  FabricText: class {},
  Group: class {},
  Line: class {},
  ActiveSelection: class {},
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));
vi.mock('./Toolbar', () => ({ default: () => null }));
vi.mock('./ToolPanel', () => ({ default: () => null }));
// The canvas reports that the image could not be opened as soon as it mounts
vi.mock('./FabricCanvas', async () => {
  const { useEffect } = await import('react');
  function FailingCanvas({ onLoadError }: { onLoadError: () => void }) {
    useEffect(() => onLoadError(), [onLoadError]);
    return null;
  }
  return { default: FailingCanvas };
});

const props = {
  isOpen: true,
  imageFile: new File([], 'a.png'),
  fileName: 'a.png',
  onSave: vi.fn(),
};

describe('ImageAnnotationEditor load error', () => {
  it('drops just that file from the queue, without attaching it, when it can be discarded', () => {
    const onClose = vi.fn();
    const onSkip = vi.fn();
    const onDiscard = vi.fn();
    render(
      <ImageAnnotationEditor {...props} onClose={onClose} onSkip={onSkip} onDiscard={onDiscard} />,
    );
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes when there is no queue to move on in', () => {
    const onClose = vi.fn();
    render(<ImageAnnotationEditor {...props} onClose={onClose} />);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
