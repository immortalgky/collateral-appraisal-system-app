import clsx from 'clsx';
import { useState } from 'react';

// Discover all sticker assets
const stickerModules = import.meta.glob('/src/assets/stickers/**/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

interface StickerCategory {
  name: string;
  path: string;
  stickers: { name: string; url: string }[];
}

function buildCategories(): StickerCategory[] {
  const categoryMap = new Map<string, { name: string; url: string }[]>();

  for (const [path, url] of Object.entries(stickerModules)) {
    // path like /src/assets/stickers/markers/pin-red.svg
    const parts = path.split('/');
    const category = parts[parts.length - 2]; // e.g. "markers"
    const fileName = parts[parts.length - 1].replace('.svg', '');

    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push({ name: fileName, url });
  }

  return Array.from(categoryMap.entries()).map(([name, stickers]) => ({
    name,
    path: name,
    stickers,
  }));
}

const categories = buildCategories();

interface StickerPickerProps {
  selectedSticker: string | null;
  onSelect: (stickerUrl: string) => void;
}

export default function StickerPicker({ selectedSticker, onSelect }: StickerPickerProps) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.name ?? '');

  if (categories.length === 0) {
    return <p className="text-xs text-gray-400">No stickers available</p>;
  }

  const activeCat = categories.find(c => c.name === activeCategory) ?? categories[0];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-gray-400 font-medium">Stickers</span>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1">
        {categories.map(cat => (
          <button
            key={cat.name}
            type="button"
            onClick={() => setActiveCategory(cat.name)}
            className={clsx(
              'px-2 py-1 text-xs rounded capitalize transition-colors',
              activeCategory === cat.name
                ? 'bg-primary text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Sticker grid */}
      <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
        {activeCat.stickers.map(sticker => (
          <button
            key={sticker.url}
            type="button"
            onClick={() => onSelect(sticker.url)}
            className={clsx(
              'w-10 h-10 p-1 rounded-lg flex items-center justify-center transition-all hover:scale-110',
              selectedSticker === sticker.url
                ? 'bg-primary/20 ring-2 ring-primary'
                : 'bg-gray-700 hover:bg-gray-600',
            )}
            title={sticker.name}
          >
            <img src={sticker.url} alt={sticker.name} className="w-full h-full object-contain" />
          </button>
        ))}
      </div>
    </div>
  );
}
