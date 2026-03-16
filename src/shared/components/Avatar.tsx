import { useState, useEffect } from 'react';
import { classNames } from '@shared/utils/classNames';
import { getInitials, hashString } from '@shared/utils/stringUtils';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]' },
  sm: { container: 'w-7 h-7', text: 'text-xs' },
  md: { container: 'size-9', text: 'text-sm' },
  lg: { container: 'w-10 h-10', text: 'text-sm' },
} as const;

const colorPalette = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-slate-100', text: 'text-slate-700' },
] as const;

export default function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const { container, text } = sizeMap[size];
  const color = colorPalette[hashString(name) % colorPalette.length];

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
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
      <span className={classNames(text, 'font-medium', color.text)}>
        {getInitials(name)}
      </span>
    </div>
  );
}
