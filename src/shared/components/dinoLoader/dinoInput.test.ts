import { describe, it, expect } from 'vitest';
import { Window as HappyWindow } from 'happy-dom';
import { keyBelongsToFocus } from './dinoInput';

const element = (html: string) => {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
};

describe('keyBelongsToFocus', () => {
  it('leaves Space to the controls that use it', () => {
    const controls = [
      '<button>Cancel</button>',
      '<a href="#">Help</a>',
      '<input>',
      '<textarea></textarea>',
      '<select></select>',
      '<summary>More</summary>',
      '<div contenteditable="true"></div>',
      '<div role="button">Go</div>',
      '<div role="checkbox"></div>',
      '<div role="listbox"></div>',
      '<div role="menu"></div>',
      '<div role="slider"></div>',
      '<div role="combobox"></div>',
      '<video controls></video>',
    ];
    for (const html of controls) expect(keyBelongsToFocus(element(html))).toBe(true);
  });

  it('counts focus on something inside a control', () => {
    const label = element('<button><span>Cancel</span></button>').querySelector('span');
    expect(keyBelongsToFocus(label)).toBe(true);

    // A tree grid keeps focus on its cells, never on the grid itself.
    const cell = element(
      '<div role="treegrid"><div role="row"><div role="gridcell">1</div></div></div>',
    ).querySelector('[role="gridcell"]');
    expect(keyBelongsToFocus(cell)).toBe(true);
  });

  it('gives Space to the game everywhere else', () => {
    expect(keyBelongsToFocus(document.body)).toBe(false);
    expect(keyBelongsToFocus(element('<div>plain</div>'))).toBe(false);
    expect(keyBelongsToFocus(element('<canvas></canvas>'))).toBe(false);
    expect(keyBelongsToFocus(element('<video></video>'))).toBe(false); // no controls to operate
    expect(keyBelongsToFocus(null)).toBe(false);
  });

  it('recognises a button that lives in another window', () => {
    // The loading tab builds its page in the window it opened, not in this one.
    const other = new HappyWindow();
    const button = other.document.createElement('button');
    expect(keyBelongsToFocus(button as unknown as EventTarget)).toBe(true);
  });
});
