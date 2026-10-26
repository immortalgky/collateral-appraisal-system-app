/**
 * The plain neutral square tool button (white, gray border and icon) for the controls beside a
 * table — group by, columns, density. `active` is the subtle "something is set" state; a Headless
 * UI trigger also gets one while its panel is open (`data-open`). Exported so those buttons are
 * one style, not three copies that drift. The light classes are kept (a test pins them); the
 * `dark:` ones put it on the palette in dark mode.
 */
export const neutralToolButtonClass = (active: boolean) =>
  `relative flex h-full min-h-9 w-9 items-center justify-center rounded-lg border outline-none transition-all data-open:border-gray-300 data-open:bg-gray-100 dark:data-open:border-(--palette-line-strong) dark:data-open:bg-(--palette-surface-3) ${
    active
      ? 'border-gray-300 bg-gray-100 text-gray-700 dark:border-(--palette-line-strong) dark:bg-(--palette-surface-3) dark:text-(--palette-ink)'
      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-(--palette-line) dark:bg-(--palette-surface) dark:text-(--palette-ink-2) dark:hover:border-(--palette-line-strong) dark:hover:text-(--palette-ink)'
  }`;
