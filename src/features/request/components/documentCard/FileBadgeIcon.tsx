import clsx from 'clsx';
import { fileKind } from '../../utils/documentList';

/** The small PDF / IMG tile that stands for a file. */
const FileBadgeIcon = ({
  fileName,
  size = 'sm',
}: {
  fileName: string | null | undefined;
  size?: 'sm' | 'lg';
}) => {
  const kind = fileKind(fileName);
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'grid shrink-0 place-items-center font-bold text-white',
        size === 'sm'
          ? 'h-[1.3rem] min-w-[1.3rem] rounded-[3px] px-[2px] text-[0.7143rem] leading-none'
          : 'h-14 w-11 rounded-md text-[11px]',
        kind === 'img' ? 'bg-blue-600' : kind === 'pdf' ? 'bg-red-600' : 'bg-gray-500',
      )}
    >
      {kind === 'img' ? 'IMG' : kind === 'pdf' ? 'PDF' : 'FILE'}
    </span>
  );
};

export default FileBadgeIcon;
