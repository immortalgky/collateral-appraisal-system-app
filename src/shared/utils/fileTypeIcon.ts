/**
 * Map a filename to a file-type icon (SVG sprite id) + accent color class,
 * so document chips/rows show a recognizable, color-coded icon by extension.
 */
export const fileTypeIcon = (name: string): { name: string; className: string } => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return { name: 'file-pdf', className: 'text-red-500' };
  if (ext === 'doc' || ext === 'docx') return { name: 'file-word', className: 'text-blue-600' };
  if (ext === 'xls' || ext === 'xlsx') return { name: 'file-excel', className: 'text-green-600' };
  if (ext === 'csv') return { name: 'file-csv', className: 'text-green-600' };
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext))
    return { name: 'file-image', className: 'text-purple-500' };
  if (['zip', 'rar', '7z'].includes(ext)) return { name: 'file-zipper', className: 'text-amber-600' };
  if (ext === 'txt') return { name: 'file-lines', className: 'text-gray-500' };
  return { name: 'file', className: 'text-gray-400' };
};
