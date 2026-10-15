import { describe, it, expect, beforeEach } from 'vitest';
import { loadSavedSearches } from './savedSearches';

const STORAGE_KEY = 'cas-log-viewer-saved-searches';

describe('loadSavedSearches', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns a valid saved search unchanged', () => {
    const valid = { id: '1', label: 'Errors', q: 'level:Error', hours: 24 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([valid]));
    expect(loadSavedSearches()).toEqual([valid]);
  });

  it('drops an entry with an hours value that is not a real preset', () => {
    const bad = { id: '1', label: 'Bad', q: 'x', hours: 13 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([bad]));
    expect(loadSavedSearches()).toEqual([]);
  });

  it('drops an entry missing a required field', () => {
    const bad = { id: '1', q: 'x', hours: 24 }; // no label
    localStorage.setItem(STORAGE_KEY, JSON.stringify([bad]));
    expect(loadSavedSearches()).toEqual([]);
  });

  it('drops an entry with the wrong type for a field', () => {
    const bad = { id: '1', label: 'Bad', q: 'x', hours: '24' }; // hours as a string
    localStorage.setItem(STORAGE_KEY, JSON.stringify([bad]));
    expect(loadSavedSearches()).toEqual([]);
  });

  it('keeps valid entries and drops invalid ones from the same list', () => {
    const valid = { id: '1', label: 'Errors', q: 'level:Error', hours: 24 };
    const bad = { id: '2', label: 'Bad', hours: 24 }; // no q
    localStorage.setItem(STORAGE_KEY, JSON.stringify([valid, bad]));
    expect(loadSavedSearches()).toEqual([valid]);
  });

  it('returns an empty array when the stored value is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'an array' }));
    expect(loadSavedSearches()).toEqual([]);
  });

  it('returns an empty array when nothing is stored', () => {
    expect(loadSavedSearches()).toEqual([]);
  });
});
