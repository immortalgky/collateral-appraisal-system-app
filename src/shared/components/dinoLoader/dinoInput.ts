/**
 * Keyboard rules for the dino's input, shared by DinoLoader and the document-viewer loading tab
 * (loadingTab.ts), so both hand Space to a focused control the same way.
 */

/** Everything that uses Space or ArrowUp itself while it has focus. */
const CONTROLS = [
  'button',
  'a',
  'input',
  'textarea',
  'select',
  'summary',
  '[contenteditable]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="menuitem"]',
  // Composite widgets keep focus on the container and use Space and the arrows themselves.
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="listbox"]',
  '[role="menu"]',
  '[role="menubar"]',
  '[role="combobox"]',
  '[role="textbox"]',
  '[role="searchbox"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="tree"]',
  '[role="treeitem"]',
  '[role="grid"]',
  '[role="treegrid"]',
  'video[controls]',
  'audio[controls]',
].join(', ');

/**
 * True when a keystroke belongs to whatever has focus rather than to the game: typing, or
 * pressing a focused button with Space. Once the game arms it takes Space and ArrowUp for jumps,
 * and without this a keyboard user tabbed onto a button could not press it — the dino jumped
 * instead.
 *
 * `closest` rather than the target's own tag, so focus on something inside a control (a label
 * span in a button) still counts. Duck-typed rather than `instanceof`, so an element from another
 * window — the document-viewer loading tab builds its page in the window it opened — still works.
 */
export function keyBelongsToFocus(target: EventTarget | null): boolean {
  const el = target as Partial<Element> | null;
  return typeof el?.closest === 'function' && el.closest(CONTROLS) !== null;
}
