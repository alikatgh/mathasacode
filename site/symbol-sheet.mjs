import { symbolGroups } from './symbol-catalog.mjs';
import {
  readSymbolSheetState, writeSymbolSheetState, forgetSymbolSheetState, symbolSheetQueryLimit,
} from './symbol-sheet-state.mjs';

// NFC keeps mathematical glyphs distinct: ℝ is a symbol, rather than the letter R.
const normalizeSearch = value => String(value ?? '').normalize('NFC').toLocaleLowerCase();
const searchTerms = value => normalizeSearch(value).trim().split(/\s+/u).filter(Boolean);
const keywordsText = keywords => Array.isArray(keywords) ? keywords.join(' ') : String(keywords ?? '');
const entrySearchText = (group, entry) => normalizeSearch([
  group.title, entry.symbol, entry.name, entry.explanation, entry.code, keywordsText(entry.keywords), entry.detailText || '',
].join('\n'));
const matchesTerms = (text, terms) => terms.every(term => text.includes(term));
const decodeHash = hash => {
  const id = String(hash || '').replace(/^#/, '');
  try { return decodeURIComponent(id); } catch { return id; }
};

/** Search words may match different fields; every word must occur in the entry's context. */
export function filterSymbolGroups(query = '', groups = symbolGroups) {
  const terms = searchTerms(query);
  return groups.map(group => ({
    ...group,
    entries: group.entries.filter(entry => matchesTerms(entrySearchText(group, entry), terms)),
  })).filter(group => group.entries.length);
}

const instances = new WeakMap();

/** Enhance the static reference without changing its content or requiring a framework. */
export function initializeSymbolSheet(main) {
  const sheet = main?.querySelector('[data-symbol-sheet]');
  if (!sheet) return;
  if (instances.has(sheet)) return instances.get(sheet);
  const doc = sheet.ownerDocument;
  const browser = doc.defaultView;
  const tools = sheet.querySelector('[data-symbol-tools]');
  const input = sheet.querySelector('[data-symbol-search]');
  const clear = sheet.querySelector('[data-symbol-clear]');
  const reset = sheet.querySelector('[data-symbol-reset]');
  const forget = sheet.querySelector('[data-symbol-forget]');
  const count = sheet.querySelector('[data-symbol-count]');
  const empty = sheet.querySelector('[data-symbol-empty]');
  const details = [...sheet.querySelectorAll('[data-symbol-detail]')];
  const viewButtons = [...sheet.querySelectorAll('[data-symbol-view]')];
  if (!tools || !input || !clear || !reset || !count || !empty) return;

  const groups = [...sheet.querySelectorAll('[data-symbol-group]')].map(element => {
    const title = element.querySelector('[data-symbol-group-title]')?.textContent || '';
    return {
      element,
      rows: [...element.querySelectorAll('[data-symbol-entry]')].map(row => ({
        element: row,
        text: entrySearchText({ title }, {
          symbol: row.querySelector('[data-symbol-value]')?.dataset.symbolPlain || row.querySelector('[data-symbol-value]')?.textContent,
          name: row.querySelector('[data-symbol-name]')?.textContent,
          explanation: row.querySelector('[data-symbol-explanation]')?.textContent,
          code: row.querySelector('[data-symbol-code]')?.textContent,
          keywords: row.dataset.symbolKeywords,
          detailText: row.querySelector('[data-symbol-detail]')?.textContent,
        }),
      })),
    };
  });
  const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
  const saved = readSymbolSheetState(browser);
  const initialHash = browser.location.hash;
  const detailIds = new Map(details.map(detail => [detail,
    detail.closest('[data-symbol-entry]')?.dataset.symbolEntry
      || detail.closest('[data-symbol-entry]')?.id.replace(/^symbol-/, ''),
  ]));
  const anchors = groups.flatMap(group => [group.element, ...group.rows.map(row => row.element)]);
  let remember = () => {};
  let disposed = false;

  const update = () => {
    input.value = input.value.slice(0, symbolSheetQueryLimit);
    const terms = searchTerms(input.value);
    let visible = 0;
    let visibleGroups = 0;
    for (const group of groups) {
      let groupCount = 0;
      for (const row of group.rows) {
        const match = matchesTerms(row.text, terms);
        row.element.hidden = !match;
        if (match) groupCount++;
      }
      group.element.hidden = groupCount === 0;
      if (groupCount) visibleGroups++;
      visible += groupCount;
    }
    clear.hidden = !input.value;
    empty.hidden = visible !== 0;
    count.textContent = terms.length
      ? `${visible} of ${total} symbols · ${visibleGroups} ${visibleGroups === 1 ? 'group' : 'groups'}`
      : `${total} symbols across ${visibleGroups} ${visibleGroups === 1 ? 'group' : 'groups'}`;
  };
  const clearSearch = ({ focus = false, save = true } = {}) => {
    cancelSavedPosition();
    cancelHistoryRepair();
    input.value = '';
    update();
    if (save) remember();
    if (focus) input.focus();
  };
  const resetSearch = () => clearSearch({ focus: true });
  const updateView = () => {
    const open = details.filter(detail => detail.open).length;
    for (const button of viewButtons) {
      const selected = button.dataset.symbolView === 'detailed' ? open === details.length && open > 0 : open === 0;
      button.setAttribute('aria-pressed', String(selected));
    }
  };
  const setView = event => {
    cancelSavedPosition();
    cancelHistoryRepair();
    const expanded = event.currentTarget.dataset.symbolView === 'detailed';
    for (const detail of details) detail.open = expanded;
    updateView();
    remember();
  };
  const revealDestination = hash => {
    const target = doc.getElementById(decodeHash(hash));
    if (!target || !sheet.contains(target) || !target.closest('[data-symbol-entry], [data-symbol-group]')) return;
    let changed = false;
    if (input.value) { clearSearch({ save: false }); changed = true; }
    const detail = target.closest('[data-symbol-detail]');
    if (detail && !detail.open) { detail.open = true; changed = true; updateView(); }
    if (changed) { remember(); return target; }
  };
  const handleNavigation = event => {
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target?.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || link.target && link.target !== '_self') return;
    let destination;
    try { destination = new URL(link.getAttribute('href'), browser.location.href); } catch { return; }
    const current = browser.location;
    if (destination.origin === current.origin && destination.pathname === current.pathname && destination.search === current.search) {
      cancelSavedPosition();
      cancelHistoryRepair();
      const target = revealDestination(destination.hash);
      // Clearing a filter changes layout. The reader intentionally ignores a
      // repeated route, so restore this target within its own viewport here.
      if (!target || event.button !== 0 || decodeHash(destination.hash) !== decodeHash(current.hash)) return;
      const viewport = main.closest?.('.reader-viewport');
      if (!viewport?.getBoundingClientRect || !target.getBoundingClientRect) return;
      const top = viewport.scrollTop + target.getBoundingClientRect().top - viewport.getBoundingClientRect().top - (viewport.clientTop || 0);
      if (!Number.isFinite(top)) return;
      event.preventDefault();
      viewport.scrollTop = Math.max(0, top);
      if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
  };
  let historyFrame;
  let historyDestination;
  const cancelHistoryRepair = () => {
    if (historyFrame !== undefined) browser.cancelAnimationFrame?.(historyFrame);
    historyFrame = undefined;
    historyDestination = undefined;
  };
  const repairHistoryDestination = ({ complete = false } = {}) => {
    const destination = historyDestination;
    if (!destination) return;
    if (disposed || browser.location.hash !== destination.hash) { cancelHistoryRepair(); return; }
    const viewport = main.closest?.('.reader-viewport');
    if (!viewport?.getBoundingClientRect || !destination.detail.getBoundingClientRect) return;
    const bounds = viewport.getBoundingClientRect();
    const rect = destination.detail.getBoundingClientRect();
    if (!(rect.bottom > bounds.top && rect.top < bounds.bottom)) {
      const top = viewport.scrollTop + rect.top - bounds.top - (viewport.clientTop || 0);
      if (Number.isFinite(top)) viewport.scrollTop = Math.max(0, top);
    }
    // Only the shell's layout signal follows its final restore. The standalone
    // RAF is useful without a shell, but must retain this intent until then.
    if (complete) cancelHistoryRepair();
  };
  const handleHistory = () => {
    cancelSavedPosition();
    cancelHistoryRepair();
    const hash = browser.location.hash;
    const target = revealDestination(hash) || doc.getElementById(decodeHash(hash));
    const detail = target?.closest('[data-symbol-detail]');
    if (!detail) return;
    const destination = { hash, detail };
    historyDestination = destination;
    if (!browser.requestAnimationFrame) return;
    historyFrame = browser.requestAnimationFrame(() => {
      if (historyDestination !== destination) return;
      historyFrame = undefined;
      repairHistoryDestination();
    });
  };
  const capture = { capture: true };

  let viewport;
  let scrollTimer;
  let restoreFrame;
  let restoreObserver;
  let restoreDeadline;
  let pendingPosition = !initialHash ? saved?.position : undefined;
  let lastPosition = saved?.position;
  let forgotten = false;
  let lastSerialized;
  const cancelSavedPosition = () => {
    pendingPosition = undefined;
    if (restoreFrame !== undefined) browser.cancelAnimationFrame?.(restoreFrame);
    restoreFrame = undefined;
    restoreObserver?.disconnect();
    restoreObserver = undefined;
    if (restoreDeadline !== undefined) browser.clearTimeout?.(restoreDeadline);
    restoreDeadline = undefined;
  };
  const readingPosition = () => {
    if (!viewport?.getBoundingClientRect) return lastPosition;
    const top = viewport.getBoundingClientRect().top + (viewport.clientTop || 0);
    if (!Number.isFinite(top)) return lastPosition;
    let anchor;
    let anchorTop;
    for (const candidate of anchors) {
      if (candidate.hidden || candidate.closest('[data-symbol-group]')?.hidden || !candidate.getBoundingClientRect) continue;
      const candidateTop = candidate.getBoundingClientRect().top;
      if (!Number.isFinite(candidateTop)) continue;
      if (candidateTop <= top || !anchor) { anchor = candidate; anchorTop = candidateTop; }
      if (candidateTop > top) break;
    }
    return anchor ? { anchor: anchor.id, offset: Math.max(-20000, Math.min(20000, top - anchorTop)) } : lastPosition;
  };
  const currentState = () => {
    const openDetails = details.filter(detail => detail.open).map(detail => detailIds.get(detail)).filter(Boolean);
    const view = !openDetails.length ? 'compact' : openDetails.length === details.length ? 'detailed' : 'mixed';
    return { version: 1, query: input.value, view, openDetails, ...(lastPosition ? { position: lastPosition } : {}) };
  };
  remember = () => {
    if (disposed) return;
    if (!pendingPosition) lastPosition = readingPosition();
    const state = currentState();
    const serialized = JSON.stringify(state);
    if (serialized === lastSerialized) return;
    lastSerialized = serialized;
    forgotten = false;
    writeSymbolSheetState(browser, state);
  };
  const clearScrollTimer = () => {
    if (scrollTimer !== undefined) browser.clearTimeout?.(scrollTimer);
    scrollTimer = undefined;
  };
  const handleScroll = () => {
    if (pendingPosition || !browser.setTimeout) return;
    clearScrollTimer();
    scrollTimer = browser.setTimeout(() => { scrollTimer = undefined; remember(); }, 200);
  };
  const readingIntentEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown', 'focusin'];
  const handleReadingIntent = event => {
    cancelSavedPosition();
    // The reader itself focuses a history destination before the shell's final
    // layout. That focus must retain the separate history repair intent.
    if (event.type !== 'focusin') cancelHistoryRepair();
  };
  const bindViewport = () => {
    const next = main.closest?.('.reader-viewport');
    if (next === viewport) return;
    viewport?.removeEventListener('scroll', handleScroll);
    for (const type of readingIntentEvents) viewport?.removeEventListener(type, handleReadingIntent, capture);
    viewport = next;
    viewport?.addEventListener('scroll', handleScroll, { passive: true });
    for (const type of readingIntentEvents) viewport?.addEventListener(type, handleReadingIntent, { capture: true, passive: true });
  };
  const applySavedPosition = () => {
    if (disposed || !pendingPosition || browser.location.hash !== initialHash) { cancelSavedPosition(); return; }
    const target = anchors.find(anchor => anchor.id === pendingPosition.anchor);
    if (!target?.getBoundingClientRect || target.hidden || target.closest('[data-symbol-group]')?.hidden) {
      cancelSavedPosition();
      return;
    }
    const top = viewport.scrollTop + target.getBoundingClientRect().top
      - viewport.getBoundingClientRect().top - (viewport.clientTop || 0) + pendingPosition.offset;
    if (Number.isFinite(top)) viewport.scrollTop = Math.max(0, top);
  };
  const restoreSavedPosition = () => {
    bindViewport();
    if (!pendingPosition || !viewport?.getBoundingClientRect || !browser.requestAnimationFrame) return;
    // Portals, chart measurement and lazy formula fonts can settle after the
    // shell's first layout. Follow size changes briefly, never polling or
    // extending the deadline, and yield as soon as the reader interacts.
    if (!restoreObserver && browser.ResizeObserver && browser.setTimeout && browser.clearTimeout) {
      try {
        restoreObserver = new browser.ResizeObserver(restoreSavedPosition);
        restoreObserver.observe(sheet);
        for (const group of groups) restoreObserver.observe(group.element);
        restoreDeadline = browser.setTimeout(() => { applySavedPosition(); cancelSavedPosition(); }, 10000);
      } catch {
        restoreObserver?.disconnect();
        restoreObserver = undefined;
      }
    }
    if (restoreFrame !== undefined) return;
    restoreFrame = browser.requestAnimationFrame(() => {
      restoreFrame = undefined;
      applySavedPosition();
      if (!restoreObserver) pendingPosition = undefined;
    });
  };
  const handleReaderChange = () => {
    if (browser.location.hash !== initialHash) cancelSavedPosition();
    if (historyDestination && browser.location.hash !== historyDestination.hash) cancelHistoryRepair();
    restoreSavedPosition();
  };
  const handleReaderLayout = () => { restoreSavedPosition(); repairHistoryDestination({ complete: true }); };
  const handleInput = () => { cancelSavedPosition(); cancelHistoryRepair(); update(); remember(); };
  const handleToggle = () => { updateView(); remember(); };
  const handlePageHide = () => { clearScrollTimer(); if (!forgotten) remember(); };
  const handleForget = () => {
    cancelSavedPosition();
    clearScrollTimer();
    forgetSymbolSheetState(browser);
    lastPosition = readingPosition();
    lastSerialized = JSON.stringify(currentState());
    forgotten = true;
  };

  input.setAttribute('maxlength', String(symbolSheetQueryLimit));
  if (saved) {
    input.value = saved.query;
    const opened = new Set(saved.openDetails);
    for (const detail of details) detail.open = saved.view === 'detailed'
      || saved.view === 'mixed' && opened.has(detailIds.get(detail));
  }
  input.addEventListener('input', handleInput);
  clear.addEventListener('click', resetSearch);
  reset.addEventListener('click', resetSearch);
  for (const button of viewButtons) button.addEventListener('click', setView);
  for (const detail of details) detail.addEventListener('toggle', handleToggle);
  forget?.addEventListener('click', handleForget);
  // The reader handles routes later in the event; reveal the destination first.
  doc.addEventListener('click', handleNavigation, capture);
  browser.addEventListener('hashchange', handleHistory, capture);
  browser.addEventListener('popstate', handleHistory, capture);
  browser.addEventListener('pagehide', handlePageHide);
  doc.addEventListener('reader:change', handleReaderChange);
  doc.addEventListener('reader:layout', handleReaderLayout);
  update();
  updateView();
  revealDestination(browser.location.hash);
  lastSerialized = JSON.stringify(currentState());
  restoreSavedPosition();
  tools.hidden = false;
  sheet.dataset.symbolEnhanced = 'true';

  const cleanup = () => {
    if (disposed) return;
    handlePageHide();
    disposed = true;
    cancelSavedPosition();
    cancelHistoryRepair();
    viewport?.removeEventListener('scroll', handleScroll);
    for (const type of readingIntentEvents) viewport?.removeEventListener(type, handleReadingIntent, capture);
    input.removeEventListener('input', handleInput);
    clear.removeEventListener('click', resetSearch);
    reset.removeEventListener('click', resetSearch);
    for (const button of viewButtons) button.removeEventListener('click', setView);
    for (const detail of details) detail.removeEventListener('toggle', handleToggle);
    forget?.removeEventListener('click', handleForget);
    doc.removeEventListener('click', handleNavigation, capture);
    browser.removeEventListener('hashchange', handleHistory, capture);
    browser.removeEventListener('popstate', handleHistory, capture);
    browser.removeEventListener('pagehide', handlePageHide);
    doc.removeEventListener('reader:change', handleReaderChange);
    doc.removeEventListener('reader:layout', handleReaderLayout);
    clearSearch({ save: false });
    tools.hidden = true;
    delete sheet.dataset.symbolEnhanced;
    instances.delete(sheet);
  };
  instances.set(sheet, cleanup);
  return cleanup;
}
