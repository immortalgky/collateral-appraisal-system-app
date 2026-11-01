import { useState, useEffect } from 'react';
import { classNames } from '@shared/utils/classNames';
import { getInitials, hashString } from '@shared/utils/stringUtils';

interface AvatarProps {
  src?: string | null;
  /** A user record can lack a name: initials fall back to "?". */
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  /** One grey tone instead of the colour picked from the name. */
  neutral?: boolean;
}

const sizeMap = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]' },
  sm: { container: 'w-7 h-7', text: 'text-xs' },
  md: { container: 'size-9', text: 'text-sm' },
  lg: { container: 'w-10 h-10', text: 'text-sm' },
} as const;

const colorPalette = [
  { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-300' },
  { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-100 dark:bg-rose-500/20', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-cyan-100 dark:bg-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-300' },
  { bg: 'bg-indigo-100 dark:bg-indigo-500/20', text: 'text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-teal-100 dark:bg-teal-500/20', text: 'text-teal-700 dark:text-teal-300' },
  { bg: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-300' },
  { bg: 'bg-slate-100 dark:bg-slate-500/20', text: 'text-slate-700 dark:text-slate-300' },
] as const;

/** The one grey tone of `neutral` (the slate entry of the palette). */
const NEUTRAL = {
  bg: 'bg-slate-100 dark:bg-slate-500/20',
  text: 'text-slate-700 dark:text-slate-300',
};

export default function Avatar({ src, name, size = 'md', className, neutral }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const { container, text } = sizeMap[size];
  const color = neutral ? NEUTRAL : colorPalette[hashString(name ?? '') % colorPalette.length];

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name ?? ''}
        onError={() => setImgError(true)}
        className={classNames(container, 'rounded-full object-cover shrink-0', className ?? '')}
      />
    );
  }

  return (
    <div
      className={classNames(
        container,
        'rounded-full flex items-center justify-center shrink-0',
        color.bg,
        className ?? '',
      )}
    >
      <span className={classNames(text, 'font-medium', color.text)}>{getInitials(name ?? '')}</span>
    </div>
  );
}
