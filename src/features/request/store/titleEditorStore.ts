import { create } from 'zustand';

/**
 * Whether the title editor (the drawer on the request page) is open.
 *
 * Typing in it changes the open title on every key. The title list stands still meanwhile, and so
 * should anything else on the page that renders from the titles but is covered by the editor — the
 * document card's per-title sections, for one. Each such place can freeze itself while this is true
 * and catch up when it closes (see `useTitleEditorOpen`).
 */
export const useTitleEditorStore = create<{ open: boolean; setOpen: (open: boolean) => void }>(
  set => ({ open: false, setOpen: open => set({ open }) }),
);

export const useTitleEditorOpen = () => useTitleEditorStore(state => state.open);
