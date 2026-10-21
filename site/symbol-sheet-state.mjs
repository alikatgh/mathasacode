import { symbolGroups } from './symbol-catalog.mjs';

export const symbolSheetStateKey = 'math-as-code:symbol-sheet:v1';
export const symbolSheetQueryLimit = 256;
export const symbolSheetStateLimit = 32768;
const positionLimit = 20000;
const entryIds = new Set(symbolGroups.flatMap(group => group.entries.map(entry => entry.id)));
const anchorIds = new Set([
  ...symbolGroups.map(group => `symbols-${group.id}`),
  ...[...entryIds].map(id => `symbol-${id}`),
]);

/** Persist only bounded, known reference data; storage never owns a route. */
export function validateSymbolSheetState(value) {
  if (!value || value.version !== 1 || typeof value.query !== 'string'
    || value.query.length > symbolSheetQueryLimit
    || !['compact', 'detailed', 'mixed'].includes(value.view)
    || !Array.isArray(value.openDetails) || value.openDetails.length > entryIds.size) return null;
  const openDetails = [...new Set(value.openDetails.filter(id => typeof id === 'string' && entryIds.has(id)))];
  const state = { version: 1, query: value.query, view: value.view, openDetails };
  const position = value.position;
  if (position && anchorIds.has(position.anchor) && Number.isFinite(position.offset)
    && Math.abs(position.offset) <= positionLimit) {
    state.position = { anchor: position.anchor, offset: position.offset };
  }
  return state;
}

export function readSymbolSheetState(browser) {
  try {
    const raw = browser?.localStorage?.getItem(symbolSheetStateKey);
    if (!raw || raw.length > symbolSheetStateLimit) return null;
    return validateSymbolSheetState(JSON.parse(raw));
  } catch { return null; }
}

export function writeSymbolSheetState(browser, value) {
  const state = validateSymbolSheetState(value);
  if (!state) return false;
  try {
    const raw = JSON.stringify(state);
    if (raw.length > symbolSheetStateLimit || !browser?.localStorage?.setItem) return false;
    browser.localStorage.setItem(symbolSheetStateKey, raw);
    return true;
  } catch { return false; }
}

export function forgetSymbolSheetState(browser) {
  try { browser?.localStorage?.removeItem(symbolSheetStateKey); } catch { /* Optional storage. */ }
}
