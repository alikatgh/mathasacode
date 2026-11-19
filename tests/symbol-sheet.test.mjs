import test from 'node:test';
import assert from 'node:assert/strict';
import { symbolGroups } from '../site/symbol-catalog.mjs';
import { filterSymbolGroups, initializeSymbolSheet } from '../site/symbol-sheet.mjs';
import { renderSymbolSheet } from '../scripts/symbol-sheet.mjs';
import { createReaderController } from '../site/reader.mjs';
import { symbolSheetStateKey, symbolSheetQueryLimit } from '../site/symbol-sheet-state.mjs';

const allEntries = groups => groups.flatMap(group => group.entries);
const fixtureGroups = [
  { id: 'arithmetic', title: 'Arithmetic', entries: [
    { id: 'sum', symbol: '∑', name: 'Sum', explanation: 'Add all the values.', code: '[2, 3].reduce((a, b) => a + b, 0); // 5', lesson: '/#summation', keywords: ['total', 'sigma'] },
    { id: 'root', symbol: '√', name: 'Square root', explanation: 'The positive number that squares to a value.', code: 'Math.sqrt(9); // 3', lesson: '/#square-root' },
  ] },
  { id: 'probability', title: 'Probability', entries: [
    { id: 'chance', symbol: 'P(A)', name: 'Chance', explanation: 'How likely an event is.', code: '1 / 6; // one face of a die', lesson: '/#probability', keywords: ['odds', 'DIE'] },
  ] },
];

test('the complete catalog renders exactly once in one continuous article', () => {
  const html = renderSymbolSheet();
  const entries = allEntries(symbolGroups);
  assert.ok(entries.length > 0);
  assert.equal((html.match(/<article\b/g) || []).length, 1);
  assert.equal((html.match(/<\/article>/g) || []).length, 1);
  assert.doesNotMatch(html, /<h1\b/);
  assert.equal((html.match(/data-symbol-entry=/g) || []).length, entries.length);
  const rowIds = [...html.matchAll(/id="(symbol-[^"]+)" data-symbol-entry=/g)].map(match => match[1]);
  assert.equal(new Set(rowIds).size, entries.length);
  assert.deepEqual(new Set(rowIds), new Set(entries.map(entry => `symbol-${entry.id}`)));
  for (const group of symbolGroups) {
    assert.ok(html.includes(`href="#symbols-${group.id}"`), `${group.id} has a jump link`);
    assert.ok(html.includes(`id="symbols-${group.id}" data-symbol-group=`), `${group.id} has a destination`);
  }
  assert.match(html, /data-symbol-tools hidden/);
  assert.match(html, /<label[^>]+for="symbol-sheet-search"/);
  assert.match(html, /data-symbol-count role="status" aria-live="polite"/);
});

test('every notation is typeset at build time with accessible MathML and its original search value', () => {
  const html = renderSymbolSheet();
  const entries = allEntries(symbolGroups);
  const fragments = entries.reduce((count, entry) => count + entry.latex.length, 0);
  const notation = [...html.matchAll(/<div class="symbol-sheet__notation">([\s\S]*?)<\/div>/g)].map(match=>match[1]).join('');
  assert.equal((notation.match(/class="katex"/g) || []).length, fragments);
  assert.equal((notation.match(/class="katex-mathml"/g) || []).length, fragments);
  assert.equal((html.match(/data-symbol-plain=/g) || []).length, entries.length);
  assert.match(html, /<msqrt>/);
  assert.match(html, /<mfrac>/);
  assert.doesNotMatch(html, /katex-error/);
});

test('search matches Unicode and words across name, meaning, code, keywords and category', () => {
  assert.equal(allEntries(filterSymbolGroups('   ', fixtureGroups)).length, 3);
  assert.deepEqual(allEntries(filterSymbolGroups('∑', fixtureGroups)).map(entry => entry.id), ['sum']);
  assert.deepEqual(allEntries(filterSymbolGroups('ARITHMETIC total', fixtureGroups)).map(entry => entry.id), ['sum']);
  assert.deepEqual(allEntries(filterSymbolGroups('Math.SQRT positive', fixtureGroups)).map(entry => entry.id), ['root']);
  assert.deepEqual(allEntries(filterSymbolGroups('probability die', fixtureGroups)).map(entry => entry.id), ['chance']);
  assert.deepEqual(filterSymbolGroups('no such symbol', fixtureGroups), []);
  assert.equal(fixtureGroups[0].entries.length, 2, 'filtering does not mutate the catalog');
  const unicode = [{ id: 'unicode', title: 'Unicode', entries: [
    { id: 'unicode', symbol: 'ℝ', name: 'Café', explanation: '', code: '' },
  ] }];
  assert.equal(allEntries(filterSymbolGroups('CAFE\u0301', unicode)).length, 1, 'canonically equivalent accents match');
  assert.equal(allEntries(filterSymbolGroups('ℝ', unicode)).length, 1);
  assert.equal(allEntries(filterSymbolGroups('R', unicode)).length, 0, 'mathematical glyphs retain their identity');
});

test('all authored content is escaped and lesson routes cannot become executable URLs', () => {
  const hostile = `"><img src=x onerror='alert(1)'>&`;
  const html = renderSymbolSheet([{ id: hostile, title: hostile, entries: [{
    id: hostile, symbol: hostile, name: hostile, explanation: hostile,
    code: '<script>alert("example")</script>', lesson: 'javascript:alert(1)', keywords: [hostile],
  }] }]);
  assert.doesNotMatch(html, /<img\b|<script\b|href="javascript:/i);
  assert.match(html, /&lt;img src=x onerror=&#39;alert\(1\)&#39;&gt;&amp;/);
  assert.match(html, /&lt;script&gt;alert\(&quot;example&quot;\)&lt;\/script&gt;/);
  assert.match(html, /href="#symbol-cheatsheet">Full lesson/);
  const routes = renderSymbolSheet([{ ...fixtureGroups[0], entries: [
    { ...fixtureGroups[0].entries[0], lesson: '/?a=1&b=2#sum' },
    { ...fixtureGroups[0].entries[1], lesson: 'https://example.test/lesson?q="value"' },
  ] }]);
  assert.match(routes, /href="\/\?a=1&amp;b=2#sum"/);
  assert.doesNotMatch(routes, /href="[^"\n]*"value"/);
});

// A small DOM fixture exercises filtering and event ownership without a browser dependency.
class Element extends EventTarget {
  constructor(selector, { id = '', text = '', dataset = {}, attributes = {} } = {}) {
    super();
    Object.assign(this, { selector, id, ownText: text, dataset, attributes, children: [], hidden: false, value: '', focusCalls: 0, focusOptions: [] });
  }
  append(...children) { for (const child of children) { child.parentElement = this; this.children.push(child); } }
  matches(selector) { return selector.split(',').some(part => part.trim() === this.selector); }
  querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
  contains(target) { return target === this || this.children.some(child => child.contains(target)); }
  get textContent() { return this.ownText + this.children.map(child => child.textContent).join(' '); }
  set textContent(value) { this.ownText = value; this.children = []; }
  getAttribute(name) { return this.attributes[name] ?? null; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  hasAttribute(name) { return Object.hasOwn(this.attributes, name); }
  get target() { return this.attributes.target || ''; }
  get href() { return this.attributes.href || ''; }
  focus(options) { this.focusCalls++; this.focusOptions.push(options); }
}

function enhancementFixture(hash = '#symbol-cheatsheet') {
  const doc = new EventTarget();
  const browser = new EventTarget();
  browser.location = new URL(`https://example.test/cheatsheet.html${hash}`);
  doc.defaultView = browser;
  const sheet = new Element('[data-symbol-sheet]');
  sheet.ownerDocument = doc;
  const main = new Element('main');
  main.append(sheet);
  const tools = new Element('[data-symbol-tools]');
  tools.hidden = true;
  const input = new Element('[data-symbol-search]');
  const clear = new Element('[data-symbol-clear]');
  const reset = new Element('[data-symbol-reset]');
  const count = new Element('[data-symbol-count]');
  const empty = new Element('[data-symbol-empty]');
  tools.append(input, clear, count);
  empty.append(reset);
  sheet.append(tools, empty);
  const rows = new Map();
  const groups = new Map();
  const destinations = new Map();
  for (const group of fixtureGroups) {
    const element = new Element('[data-symbol-group]', { id: `symbols-${group.id}` });
    groups.set(group.id, element);
    destinations.set(element.id, element);
    element.append(new Element('[data-symbol-group-title]', { text: group.title }));
    for (const entry of group.entries) {
      const row = new Element('[data-symbol-entry]', { id: `symbol-${entry.id}`, dataset: { symbolKeywords: (entry.keywords || []).join(' ') } });
      rows.set(entry.id, row);
      destinations.set(row.id, row);
      for (const [field, value] of [['value', entry.symbol], ['name', entry.name], ['explanation', entry.explanation], ['code', entry.code]]) {
        row.append(new Element(`[data-symbol-${field}]`, { text: value }));
      }
      element.append(row);
    }
    sheet.append(element);
  }
  doc.getElementById = id => destinations.get(id);
  const query = value => { input.value = value; input.dispatchEvent(new Event('input')); };
  return { main, doc, browser, sheet, input, clear, reset, count, tools, empty, rows, groups, destinations, query };
}

function clickLink(doc, href) {
  const link = new Element('a[href]', { attributes: { href } });
  const event = new Event('click', { cancelable: true });
  Object.defineProperties(event, { target: { value: link }, button: { value: 0 } });
  doc.dispatchEvent(event);
  return event;
}

test('enhancement hides empty groups, reports actual visible rows, and recovers from no matches', () => {
  const fixture = enhancementFixture();
  const { main, sheet, tools, query, count, empty, clear, reset, input, groups, rows } = fixture;
  const cleanup = initializeSymbolSheet(main);
  assert.equal(initializeSymbolSheet(main), cleanup, 'initialization is idempotent');
  assert.equal(tools.hidden, false);
  assert.equal(sheet.dataset.symbolEnhanced, 'true');
  assert.equal(count.textContent, '3 symbols across 2 groups');
  query('∑');
  assert.equal(rows.get('sum').hidden, false);
  assert.equal(rows.get('root').hidden, true);
  assert.equal(groups.get('probability').hidden, true);
  assert.equal(count.textContent, '1 of 3 symbols · 1 group');
  assert.equal(clear.hidden, false);
  query('no such symbol');
  assert.equal(empty.hidden, false);
  assert.equal(count.textContent, '0 of 3 symbols · 0 groups');
  reset.dispatchEvent(new Event('click'));
  assert.equal(input.value, '');
  assert.equal(input.focusCalls, 1);
  assert.equal(empty.hidden, true);
  assert.ok([...rows.values(), ...groups.values()].every(element => !element.hidden));
  query('sqrt');
  clear.dispatchEvent(new Event('click'));
  assert.equal(count.textContent, '3 symbols across 2 groups');
  query('chance');
  cleanup();
  assert.equal(tools.hidden, true);
  assert.equal(sheet.dataset.symbolEnhanced, undefined);
  assert.ok([...rows.values(), ...groups.values()].every(element => !element.hidden));
  query('no such symbol');
  assert.ok([...rows.values()].every(element => !element.hidden), 'cleanup removes the input listener');
});

test('search uses the original notation instead of duplicated KaTeX presentation and annotations', () => {
  const { main, query, rows, count } = enhancementFixture();
  const notation = rows.get('root').querySelector('[data-symbol-value]');
  notation.dataset.symbolPlain = '√';
  notation.textContent = 'typeset expression with a TeX annotation';
  const cleanup = initializeSymbolSheet(main);
  query('√');
  assert.equal(rows.get('root').hidden, false);
  assert.equal(rows.get('sum').hidden, true);
  assert.equal(count.textContent, '1 of 3 symbols · 1 group');
  cleanup();
});

test('detailed view and individual disclosures preserve the active search and report mixed state', () => {
  const {main, sheet, tools, rows, query, input} = enhancementFixture();
  const compact = new Element('[data-symbol-view]',{dataset:{symbolView:'compact'}});
  const detailed = new Element('[data-symbol-view]',{dataset:{symbolView:'detailed'}});
  tools.append(compact,detailed);
  const disclosures = [...rows.values()].map(row => {
    const detail = new Element('[data-symbol-detail]',{text:'A bag of marbles makes chance easier to understand.'});
    detail.open = false;
    row.append(detail);
    return detail;
  });
  const cleanup = initializeSymbolSheet(main);
  query('∑');
  detailed.dispatchEvent(new Event('click'));
  assert.ok(disclosures.every(detail=>detail.open));
  assert.equal(input.value,'∑');
  assert.equal(detailed.getAttribute('aria-pressed'),'true');
  assert.equal(compact.getAttribute('aria-pressed'),'false');
  disclosures[0].open=false;
  disclosures[0].dispatchEvent(new Event('toggle'));
  assert.equal(detailed.getAttribute('aria-pressed'),'false');
  assert.equal(compact.getAttribute('aria-pressed'),'false');
  compact.dispatchEvent(new Event('click'));
  assert.ok(disclosures.every(detail=>!detail.open));
  assert.equal(compact.getAttribute('aria-pressed'),'true');
  query('marbles');
  assert.ok([...rows.values()].every(row=>!row.hidden),'long explanations are searchable');
  cleanup();
  detailed.dispatchEvent(new Event('click'));
  assert.ok(disclosures.every(detail=>!detail.open),'cleanup removes view handlers');
  assert.equal(sheet.dataset.symbolEnhanced,undefined);
});

test('direct detail links open their disclosure before reader navigation, even without a search', () => {
  const {main, doc, browser, rows, destinations, query, input} = enhancementFixture('#detail-root');
  const detail = new Element('[data-symbol-detail]',{id:'detail-root'});
  detail.open = false;
  rows.get('root').append(detail);
  destinations.set(detail.id,detail);
  const cleanup = initializeSymbolSheet(main);
  assert.equal(detail.open,true,'initial deep link is expanded');
  detail.open = false;
  clickLink(doc,'#detail-root');
  assert.equal(detail.open,true,'click reveals without an active filter');
  detail.open = false;
  query('chance');
  browser.dispatchEvent(new Event('popstate'));
  assert.equal(detail.open,true);
  assert.equal(rows.get('root').hidden,false);
  assert.equal(input.value,'');
  cleanup();
});

test('history repairs an off-screen detail after layout changes without moving a visible destination', () => {
  const {main, browser, rows, destinations} = enhancementFixture('#detail-root');
  const viewport = new Element('.reader-viewport');
  Object.assign(viewport,{scrollTop:900,clientTop:0,getBoundingClientRect:()=>({top:40,bottom:440})});
  viewport.append(main);
  const detail = new Element('[data-symbol-detail]',{id:'detail-root'});
  Object.assign(detail,{open:true,getBoundingClientRect:()=>({top:2140-viewport.scrollTop,bottom:2540-viewport.scrollTop})});
  rows.get('root').append(detail);
  destinations.set(detail.id,detail);
  let queued;
  browser.requestAnimationFrame = callback => {queued=callback;return 1;};
  browser.cancelAnimationFrame = () => {queued=undefined;};
  const cleanup = initializeSymbolSheet(main);
  browser.dispatchEvent(new Event('popstate'));
  // The reader has restored900, but opening an earlier explanation moved the
  // target to2100 in document coordinates. Repair only after that restore.
  queued();
  assert.equal(viewport.scrollTop,2100);
  viewport.scrollTop=2200;
  browser.dispatchEvent(new Event('hashchange'));
  queued();
  assert.equal(viewport.scrollTop,2200,'a visible reading position stays put');
  browser.dispatchEvent(new Event('popstate'));
  cleanup();
  assert.equal(queued,undefined,'cleanup cancels pending history work');
});

test('history detail repair survives the actual reader and the shell final layout restore', () => {
  const { main, doc, browser, sheet, rows, destinations } = enhancementFixture('#detail-root');
  main.ownerDocument = doc;
  main.id = 'guide-content';
  const viewport = new Element('.reader-viewport');
  Object.assign(viewport, { scrollTop: 0, clientTop: 0, getBoundingClientRect: () => ({ top: 40, bottom: 440 }) });
  viewport.append(main);
  const earlier = new Element('[data-symbol-detail]', { id: 'detail-sum' });
  earlier.open = false;
  rows.get('sum').append(earlier);
  destinations.set(earlier.id, earlier);
  const target = new Element('[data-symbol-detail]', { id: 'detail-root' });
  target.open = false;
  const focusTarget = target.focus.bind(target);
  target.focus = options => { focusTarget(options); viewport.dispatchEvent(new Event('focusin')); };
  rows.get('root').append(target);
  destinations.set(target.id, target);
  target.getBoundingClientRect = () => {
    const top = 40 + 200 + (earlier.open ? 1800 : 0) - viewport.scrollTop;
    return { top, bottom: top + 300 };
  };
  rows.get('chance').getBoundingClientRect = () => ({ top: 4040 - viewport.scrollTop });
  browser.CustomEvent = class extends Event {
    constructor(type, { detail } = {}) { super(type); this.detail = detail; }
  };
  browser.history = { state: null, scrollRestoration: 'auto' };
  for (const method of ['replaceState', 'pushState']) browser.history[method] = (state, _, href) => {
    browser.history.state = state;
    browser.location = new URL(href, browser.location.href);
  };
  let frameId = 0;
  const frames = new Map();
  browser.requestAnimationFrame = callback => { const id = ++frameId; frames.set(id, callback); return id; };
  browser.cancelAnimationFrame = id => frames.delete(id);
  const drainFrames = () => {
    let drained = 0;
    while (frames.size) {
      assert.ok(++drained <= 4, 'restoration must remain bounded');
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback();
    }
  };
  const cleanup = initializeSymbolSheet(main);
  const topics = [{ id: 'symbol-cheatsheet', element: { hidden: true }, pages: [{ id: 'reader-symbol-cheatsheet-1', element: sheet }] }];
  const anchors = new Map([...destinations.keys()].map(id => [id, { topicIndex: 0, pageIndex: 0 }]));
  const controller = createReaderController({ main, topics, anchors });
  controller.attachViewport(viewport);
  controller.restoreViewport();
  assert.equal(viewport.scrollTop, 200);
  const targetHistoryState = browser.history.state;
  const unsubscribe = controller.subscribe(() => browser.requestAnimationFrame(() => {
    controller.restoreViewport();
    doc.dispatchEvent(new Event('reader:layout'));
  }));
  controller.navigate('#symbol-chance');
  drainFrames();
  earlier.open = true;
  earlier.dispatchEvent(new Event('toggle'));
  browser.history.state = targetHistoryState;
  browser.location.hash = '#detail-root';
  browser.dispatchEvent(new Event('popstate'));
  assert.equal(viewport.scrollTop, 200, 'the reader first restores its obsolete absolute position');
  assert.equal(frames.size, 2, 'the enhancer fallback precedes the shell final restore');
  drainFrames();
  const rect = target.getBoundingClientRect();
  const bounds = viewport.getBoundingClientRect();
  assert.ok(rect.bottom > bounds.top && rect.top < bounds.bottom, 'the destination remains visible after every frame drains');
  assert.equal(viewport.scrollTop, 2000);
  viewport.scrollTop = 2150;
  doc.dispatchEvent(new Event('reader:layout'));
  assert.equal(viewport.scrollTop, 2150, 'consumed history repair cannot move a later reading position');
  unsubscribe();
  cleanup();
});

test('anchor capture and browser history reveal destinations before the reader handles them', () => {
  const { main, doc, browser, input, query, rows, groups } = enhancementFixture('#symbol-root');
  const cleanup = initializeSymbolSheet(main);
  query('chance');
  const link = new Element('a[href]', { attributes: { href: '#symbols-arithmetic' } });
  const sidebar = new Element('aside');
  sidebar.append(link);
  let readerSawVisible = false;
  doc.addEventListener('click', () => { readerSawVisible = !groups.get('arithmetic').hidden && !rows.get('root').hidden; });
  const event = new Event('click', { cancelable: true });
  Object.defineProperty(event, 'target', { value: link });
  doc.dispatchEvent(event);
  assert.equal(readerSawVisible, true);
  assert.equal(input.value, '');
  assert.equal(input.focusCalls, 0, 'route reveal does not move focus to search');
  for (const type of ['hashchange', 'popstate']) {
    query('chance');
    browser.location.hash = '#symbol-root';
    browser.dispatchEvent(new Event(type));
    assert.equal(input.value, '');
    assert.equal(rows.get('root').hidden, false);
  }
  query('chance');
  browser.location.hash = '#unrelated';
  browser.dispatchEvent(new Event('hashchange'));
  assert.equal(input.value, 'chance', 'unrelated navigation preserves the current search');
  cleanup();
  query('chance');
  browser.location.hash = '#symbol-root';
  browser.dispatchEvent(new Event('popstate'));
  assert.equal(input.value, 'chance', 'cleanup removes history listeners');
});

test('same-anchor jumps after filtering restore only the reading pane with the actual reader controller', () => {
  for (const [currentHash, clickedHash, targetId] of [
    ['#symbol-root', '#symbol-root', 'symbol-root'],
    ['#symbols-arithmetic', '#symbols-arithmetic', 'symbols-arithmetic'],
    ['#symbol-%72oot', '#symbol-root', 'symbol-root'],
  ]) {
    const { main, doc, browser, sheet, input, query, rows, destinations } = enhancementFixture(currentHash);
    const viewport = new Element('.reader-viewport');
    Object.assign(viewport, { scrollTop: 0, clientTop: 2, getBoundingClientRect: () => ({ top: 40 }) });
    viewport.append(main);
    main.ownerDocument = doc;
    main.id = 'guide-content';
    browser.scrollTo = browser.scrollBy = () => assert.fail('only the reading viewport may scroll');
    browser.CustomEvent = class extends Event {
      constructor(type, { detail }) { super(type); this.detail = detail; }
    };
    const historyWrites = [];
    browser.history = { state: null, scrollRestoration: 'auto' };
    for (const method of ['replaceState', 'pushState']) {
      browser.history[method] = (state, _, href) => {
        historyWrites.push(method);
        browser.history.state = state;
        browser.location = new URL(href, browser.location.href);
      };
    }
    let offset = 300;
    for (const target of destinations.values()) {
      target.contentTop = offset;
      offset += 180;
      target.getBoundingClientRect = () => ({
        top: 42 + (rows.get('sum').hidden ? 20 : target.contentTop) - viewport.scrollTop,
      });
      target.scrollIntoView = () => assert.fail('native ancestor scrolling must not run');
    }
    const cleanup = initializeSymbolSheet(main);
    const captureStates = [];
    doc.addEventListener('click', event => captureStates.push(event.defaultPrevented));
    const anchors = new Map([...destinations.keys()].map(id => [id, { topicIndex: 0, pageIndex: 0 }]));
    const topics = [{ id: 'symbol-cheatsheet', element: { hidden: true }, pages: [{ id: 'reader-symbol-cheatsheet-1', element: sheet }] }];
    const controller = createReaderController({ main, topics, anchors });
    controller.attachViewport(viewport);
    controller.restoreViewport();
    const target = destinations.get(targetId);
    assert.equal(viewport.scrollTop, target.contentTop);

    query('chance');
    viewport.scrollTop = 95;
    assert.equal(target.hidden, true, 'the active destination is filtered out');
    const restored = clickLink(doc, clickedHash);
    assert.equal(restored.defaultPrevented, true);
    assert.equal(captureStates.at(-1), true, 'enhancer handles the restored same route before the reader');
    assert.equal(input.value, '');
    assert.equal(target.hidden, false);
    assert.equal(viewport.scrollTop, target.contentTop, 'position uses geometry after the filter clears');
    assert.equal(target.tabIndex, -1);
    assert.deepEqual(target.focusOptions, [{ preventScroll: true }]);
    assert.equal(historyWrites.filter(method => method === 'pushState').length, 0);

    viewport.scrollTop = 137;
    clickLink(doc, clickedHash);
    assert.equal(captureStates.at(-1), false, 'ordinary repeat clicks remain owned by the reader');
    assert.equal(viewport.scrollTop, 137);
    assert.equal(target.focusCalls, 1, 'an unfiltered repeat leaves focus alone');

    query('chance');
    clickLink(doc, '#symbol-chance');
    assert.equal(captureStates.at(-1), false, 'a different route remains owned by the reader');
    assert.equal(input.value, '');
    assert.equal(viewport.scrollTop, rows.get('chance').contentTop);
    assert.equal(browser.location.hash, '#symbol-chance');
    cleanup();
  }
});

test('same-anchor reveal without a reader viewport leaves the native click available', () => {
  const { main, doc, input, query, rows } = enhancementFixture('#symbol-root');
  const cleanup = initializeSymbolSheet(main);
  query('chance');
  const event = clickLink(doc, '#symbol-root');
  assert.equal(input.value, '');
  assert.equal(rows.get('root').hidden, false);
  assert.equal(event.defaultPrevented, false);
  assert.equal(rows.get('root').focusCalls, 0);
  cleanup();
});

function savedReadingFixture({ saved, hash = '' } = {}) {
  const fixture = enhancementFixture(hash);
  const ids = { sum: 'summation', root: 'square-root', chance: 'event-probability' };
  const disclosures = new Map();
  for (const [name, row] of fixture.rows) {
    fixture.destinations.delete(row.id);
    row.dataset.symbolEntry = ids[name];
    row.id = `symbol-${ids[name]}`;
    fixture.destinations.set(row.id, row);
    const detail = new Element('[data-symbol-detail]', { id: `detail-${ids[name]}` });
    detail.open = false;
    row.append(detail);
    disclosures.set(name, detail);
    fixture.destinations.set(detail.id, detail);
  }
  const compact = new Element('[data-symbol-view]', { dataset: { symbolView: 'compact' } });
  const detailed = new Element('[data-symbol-view]', { dataset: { symbolView: 'detailed' } });
  const forget = new Element('[data-symbol-forget]');
  fixture.tools.append(compact, detailed, forget);
  const values = new Map([['unrelated', 'keep']]);
  if (saved !== undefined) values.set(symbolSheetStateKey, typeof saved === 'string' ? saved : JSON.stringify(saved));
  const writes = [];
  fixture.browser.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { writes.push([key, value]); values.set(key, value); },
    removeItem: key => values.delete(key),
  };
  let nextId = 0;
  const frames = new Map();
  const timers = new Map();
  fixture.browser.requestAnimationFrame = callback => { const id = ++nextId; frames.set(id, callback); return id; };
  fixture.browser.cancelAnimationFrame = id => frames.delete(id);
  fixture.browser.setTimeout = callback => { const id = ++nextId; timers.set(id, callback); return id; };
  fixture.browser.clearTimeout = id => timers.delete(id);
  const flush = callbacks => { const pending = [...callbacks.values()]; callbacks.clear(); for (const callback of pending) callback(); };
  const viewport = new Element('.reader-viewport');
  Object.assign(viewport, { scrollTop: 0, clientTop: 2, getBoundingClientRect: () => ({ top: 40, bottom: 440 }) });
  for (const [target, contentTop] of [
    [fixture.groups.get('arithmetic'), 0], [fixture.rows.get('sum'), 100],
    [fixture.rows.get('root'), 500], [fixture.groups.get('probability'), 900], [fixture.rows.get('chance'), 1000],
  ]) target.getBoundingClientRect = () => ({ top: 42 + contentTop - viewport.scrollTop });
  return {
    ...fixture, compact, detailed, forget, disclosures, values, writes, viewport, frames, timers,
    attach: () => viewport.append(fixture.main), flushFrames: () => flush(frames), flushTimers: () => flush(timers),
    stored: () => JSON.parse(values.get(symbolSheetStateKey)),
  };
}

const savedReading = overrides => ({ version: 1, query: '', view: 'mixed', openDetails: ['summation'], ...overrides });

function observeStartup(fixture) {
  const observers = [];
  fixture.browser.ResizeObserver = class {
    constructor(callback) { this.callback = callback; this.targets = new Set(); this.active = true; observers.push(this); }
    observe(target) { this.targets.add(target); }
    disconnect() { this.active = false; this.targets.clear(); }
  };
  return {
    observers,
    resize: () => { for (const observer of observers) if (observer.active) observer.callback([]); },
    active: () => observers.some(observer => observer.active),
  };
}

test('saved location follows late editor, explorer and formula layouts after the actual reader restore', () => {
  const fixture = savedReadingFixture({ saved: savedReading({
    view: 'detailed', position: { anchor: 'symbol-square-root', offset: 35 },
  }) });
  const tracking = observeStartup(fixture);
  fixture.main.ownerDocument = fixture.doc;
  fixture.main.id = 'guide-content';
  fixture.browser.CustomEvent = class extends Event {
    constructor(type, { detail } = {}) { super(type); this.detail = detail; }
  };
  fixture.browser.history = { state: null, scrollRestoration: 'auto' };
  fixture.browser.history.replaceState = (state, _, href) => {
    fixture.browser.history.state = state;
    fixture.browser.location = new URL(href, fixture.browser.location.href);
  };
  let lateHeight = 0;
  fixture.rows.get('root').getBoundingClientRect = () => ({ top: 542 + lateHeight - fixture.viewport.scrollTop });
  const cleanup = initializeSymbolSheet(fixture.main);
  const controller = createReaderController({ main: fixture.main, topics: [{
    id: 'symbol-cheatsheet', element: { hidden: true }, pages: [{ id: 'reader-symbol-cheatsheet-1', element: fixture.sheet }],
  }] });
  fixture.attach();
  controller.attachViewport(fixture.viewport);
  fixture.browser.requestAnimationFrame(() => {
    controller.restoreViewport();
    fixture.doc.dispatchEvent(new Event('reader:layout'));
  });
  fixture.flushFrames();
  fixture.flushFrames();
  assert.equal(fixture.viewport.scrollTop, 535);
  fixture.viewport.dispatchEvent(new Event('scroll'));
  for (const height of [7000, 9500, 10100]) {
    lateHeight = height; // React editors, responsive explorers, then lazy KaTeX.
    tracking.resize();
    tracking.resize();
    assert.ok(fixture.frames.size <= 1, 'layout signals share one pending frame');
    fixture.flushFrames();
    assert.equal(fixture.viewport.scrollTop, 535 + height, 'the same anchor and offset survive each late layout');
    assert.deepEqual(fixture.stored().position, { anchor: 'symbol-square-root', offset: 35 }, 'partial layout never overwrites saved context');
  }
  assert.equal(tracking.active(), true);
  assert.equal(fixture.timers.size, 1, 'startup tracking has one hard deadline');
  fixture.flushTimers();
  assert.equal(tracking.active(), false, 'the deadline disconnects tracking');
  lateHeight += 500;
  tracking.resize();
  fixture.doc.dispatchEvent(new Event('reader:layout'));
  fixture.flushFrames();
  assert.equal(fixture.viewport.scrollTop, 10635, 'later reflow cannot relock the reading position');
  cleanup();
});

test('startup restoration yields to pointer, touch, wheel and keyboard intent without reacting to its own scroll', () => {
  for (const type of ['pointerdown', 'touchstart', 'wheel', 'keydown']) {
    const fixture = savedReadingFixture({ saved: savedReading({ position: { anchor: 'symbol-square-root', offset: 35 } }) });
    const tracking = observeStartup(fixture);
    let lateHeight = 0;
    fixture.rows.get('root').getBoundingClientRect = () => ({ top: 542 + lateHeight - fixture.viewport.scrollTop });
    fixture.attach();
    const cleanup = initializeSymbolSheet(fixture.main);
    fixture.flushFrames();
    assert.equal(fixture.viewport.scrollTop, 535);
    fixture.viewport.dispatchEvent(new Event('scroll'));
    assert.equal(tracking.active(), true, 'a programmatic scroll keeps startup tracking alive');
    assert.equal(fixture.writes.length, 0);
    tracking.resize();
    assert.equal(fixture.frames.size, 1);
    fixture.viewport.dispatchEvent(new Event(type));
    assert.equal(tracking.active(), false, `${type} disconnects the observer`);
    assert.equal(fixture.frames.size, 0, `${type} cancels a pending correction`);
    assert.equal(fixture.timers.size, 0, `${type} cancels the startup deadline`);
    fixture.viewport.scrollTop = 620;
    fixture.viewport.dispatchEvent(new Event('scroll'));
    fixture.flushTimers();
    assert.deepEqual(fixture.stored().position, { anchor: 'symbol-square-root', offset: 120 });
    lateHeight = 1000;
    tracking.resize();
    fixture.doc.dispatchEvent(new Event('reader:layout'));
    fixture.flushFrames();
    assert.equal(fixture.viewport.scrollTop, 620, 'subsequent reflow respects the reader’s new position');
    cleanup();
  }
});

test('keyboard focus entering the reader from outside cancels startup pinning before the deadline', () => {
  const fixture = savedReadingFixture({ saved: savedReading({ position: { anchor: 'symbol-square-root', offset: 35 } }) });
  const tracking = observeStartup(fixture);
  fixture.attach();
  const cleanup = initializeSymbolSheet(fixture.main);
  fixture.flushFrames();
  assert.equal(fixture.viewport.scrollTop, 535);
  const tab = new Event('keydown');
  Object.defineProperty(tab, 'key', { value: 'Tab' });
  fixture.doc.dispatchEvent(tab); // Focus begins in the shell sidebar/header.
  assert.equal(tracking.active(), true, 'an unrelated shell key does not cancel restoration');
  fixture.viewport.scrollTop = 1600; // The browser brings the newly focused reader control into view.
  fixture.viewport.dispatchEvent(new Event('focusin'));
  assert.equal(tracking.active(), false, 'entering reader focus yields to keyboard navigation');
  assert.equal(fixture.timers.size, 0, 'the startup deadline cannot later move away from focus');
  tracking.resize();
  fixture.doc.dispatchEvent(new Event('reader:layout'));
  fixture.flushFrames();
  fixture.flushTimers();
  assert.equal(fixture.viewport.scrollTop, 1600);
  cleanup();
});

test('cleanup disconnects startup observation and cancels both its deadline and queued correction', () => {
  const fixture = savedReadingFixture({ saved: savedReading({ position: { anchor: 'symbol-square-root', offset: 35 } }) });
  const tracking = observeStartup(fixture);
  fixture.attach();
  const cleanup = initializeSymbolSheet(fixture.main);
  assert.equal(tracking.active(), true);
  assert.equal(fixture.frames.size, 1);
  assert.equal(fixture.timers.size, 1);
  const savedBefore = fixture.values.get(symbolSheetStateKey);
  cleanup();
  assert.equal(tracking.active(), false);
  assert.equal(fixture.frames.size, 0);
  assert.equal(fixture.timers.size, 0);
  assert.equal(fixture.values.get(symbolSheetStateKey), savedBefore, 'cleanup preserves the saved anchor before startup finishes');
  tracking.resize();
  fixture.doc.dispatchEvent(new Event('reader:layout'));
  fixture.flushFrames();
  fixture.flushTimers();
  assert.equal(fixture.viewport.scrollTop, 0);
});

test('reload restores both whole-page compact and detailed choices', () => {
  for (const view of ['compact', 'detailed']) {
    const fixture = savedReadingFixture({ saved: savedReading({ view, query: 'root' }) });
    const cleanup = initializeSymbolSheet(fixture.main);
    assert.equal(fixture.input.value, 'root');
    assert.ok([...fixture.disclosures.values()].every(detail => detail.open === (view === 'detailed')));
    assert.equal(fixture[view].getAttribute('aria-pressed'), 'true');
    cleanup();
  }
});

test('reload restores the search and exact mixed disclosure set, then saves real changes', () => {
  const fixture = savedReadingFixture({ saved: savedReading({ query: 'chance' }) });
  const { main, input, rows, disclosures, compact, detailed, query, stored, writes } = fixture;
  const cleanup = initializeSymbolSheet(main);
  assert.equal(input.value, 'chance');
  assert.equal(rows.get('chance').hidden, false);
  assert.equal(rows.get('sum').hidden, true);
  assert.equal(disclosures.get('sum').open, true, 'hidden explanations retain their open state');
  assert.equal(disclosures.get('root').open, false);
  assert.equal(compact.getAttribute('aria-pressed'), 'false');
  assert.equal(detailed.getAttribute('aria-pressed'), 'false');
  assert.equal(writes.length, 0, 'restoration does not rewrite unchanged state');
  detailed.dispatchEvent(new Event('click'));
  assert.equal(stored().view, 'detailed');
  assert.equal(stored().query, 'chance');
  assert.deepEqual(stored().openDetails, ['summation', 'square-root', 'event-probability']);
  const afterDetailed = writes.length;
  for (const disclosure of disclosures.values()) disclosure.dispatchEvent(new Event('toggle'));
  assert.equal(writes.length, afterDetailed, 'the browser toggle events do not repeat the same write');
  disclosures.get('root').open = false;
  disclosures.get('root').dispatchEvent(new Event('toggle'));
  assert.equal(stored().view, 'mixed');
  assert.deepEqual(stored().openDetails, ['summation', 'event-probability']);
  compact.dispatchEvent(new Event('click'));
  assert.equal(stored().view, 'compact');
  assert.deepEqual(stored().openDetails, []);
  query('x'.repeat(symbolSheetQueryLimit + 30));
  assert.equal(input.value.length, symbolSheetQueryLimit);
  assert.equal(stored().query.length, symbolSheetQueryLimit);
  cleanup();
  const reloaded = savedReadingFixture({ saved: fixture.values.get(symbolSheetStateKey) });
  const stop = initializeSymbolSheet(reloaded.main);
  assert.equal(reloaded.input.value.length, symbolSheetQueryLimit);
  assert.equal(reloaded.compact.getAttribute('aria-pressed'), 'true');
  stop();
});

test('corrupt and unavailable storage never prevent search, detail changes or cleanup', () => {
  for (const storage of [
    { getItem: () => '{bad JSON', setItem() {}, removeItem() {} },
    { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('blocked'); } },
  ]) {
    const fixture = savedReadingFixture();
    fixture.browser.localStorage = storage;
    const cleanup = initializeSymbolSheet(fixture.main);
    fixture.query('chance');
    fixture.detailed.dispatchEvent(new Event('click'));
    assert.equal(fixture.input.value, 'chance');
    assert.equal(fixture.rows.get('chance').hidden, false);
    assert.ok([...fixture.disclosures.values()].every(detail => detail.open));
    assert.doesNotThrow(() => fixture.forget.dispatchEvent(new Event('click')));
    assert.doesNotThrow(cleanup);
  }
  const fixture = savedReadingFixture();
  Object.defineProperty(fixture.browser, 'localStorage', { get() { throw new Error('disabled'); } });
  const cleanup = initializeSymbolSheet(fixture.main);
  fixture.query('∑');
  assert.equal(fixture.rows.get('sum').hidden, false);
  cleanup();
});

test('a direct detail hash overrides incompatible saved filters and saved location', () => {
  const hash = '#detail-square-root-code';
  const fixture = savedReadingFixture({ hash, saved: savedReading({
    query: 'chance', position: { anchor: 'symbol-summation', offset: 70 },
  }) });
  const child = new Element('h4', { id: 'detail-square-root-code' });
  fixture.disclosures.get('root').append(child);
  fixture.destinations.set(child.id, child);
  const cleanup = initializeSymbolSheet(fixture.main);
  assert.equal(fixture.input.value, '');
  assert.equal(fixture.disclosures.get('root').open, true);
  assert.equal(fixture.disclosures.get('sum').open, true, 'other saved disclosures remain open');
  assert.equal(fixture.rows.get('root').hidden, false);
  fixture.attach();
  fixture.doc.dispatchEvent(new Event('reader:layout'));
  fixture.flushFrames();
  assert.equal(fixture.viewport.scrollTop, 0, 'the enhancer leaves the direct route position to the reader');
  assert.equal(fixture.browser.location.hash, hash);
  for (const type of ['popstate', 'hashchange']) {
    fixture.query('∑');
    fixture.disclosures.get('chance').open = false;
    fixture.browser.location.hash = '#detail-event-probability';
    fixture.browser.dispatchEvent(new Event(type));
    assert.equal(fixture.input.value, '');
    assert.equal(fixture.disclosures.get('chance').open, true);
    assert.equal(fixture.browser.location.hash, '#detail-event-probability');
  }
  cleanup();
});

test('saved location waits for the mounted reader layout and uses one bounded frame', () => {
  const fixture = savedReadingFixture({ saved: savedReading({ position: { anchor: 'symbol-square-root', offset: 35 } }) });
  const cleanup = initializeSymbolSheet(fixture.main);
  assert.equal(fixture.frames.size, 0, 'initialization does not poll for a missing viewport');
  fixture.doc.dispatchEvent(new Event('reader:change'));
  assert.equal(fixture.frames.size, 0);
  fixture.attach();
  fixture.doc.dispatchEvent(new Event('reader:layout'));
  fixture.doc.dispatchEvent(new Event('reader:layout'));
  assert.equal(fixture.frames.size, 1);
  fixture.viewport.scrollTop = 0; // The reader has completed its own initial restore.
  fixture.flushFrames();
  assert.equal(fixture.viewport.scrollTop, 535);
  fixture.viewport.scrollTop = 620;
  fixture.doc.dispatchEvent(new Event('reader:layout'));
  assert.equal(fixture.frames.size, 0, 'later layout changes do not restore an old position');
  assert.equal(fixture.viewport.scrollTop, 620);
  cleanup();
});

test('scroll saving is debounced, pagehide flushes it, and cleanup removes all pending work', () => {
  const fixture = savedReadingFixture();
  const cleanup = initializeSymbolSheet(fixture.main);
  fixture.attach();
  fixture.doc.dispatchEvent(new Event('reader:layout'));
  fixture.viewport.scrollTop = 300;
  for (let index = 0; index < 5; index++) fixture.viewport.dispatchEvent(new Event('scroll'));
  assert.equal(fixture.timers.size, 1);
  assert.equal(fixture.writes.length, 0);
  fixture.flushTimers();
  assert.deepEqual(fixture.stored().position, { anchor: 'symbol-summation', offset: 200 });
  assert.equal(fixture.writes.length, 1);
  fixture.viewport.dispatchEvent(new Event('scroll'));
  fixture.flushTimers();
  assert.equal(fixture.writes.length, 1, 'an unchanged location is not written again');
  fixture.viewport.scrollTop = 550;
  fixture.viewport.dispatchEvent(new Event('scroll'));
  fixture.browser.dispatchEvent(new Event('pagehide'));
  assert.equal(fixture.timers.size, 0);
  assert.deepEqual(fixture.stored().position, { anchor: 'symbol-square-root', offset: 50 });
  fixture.viewport.dispatchEvent(new Event('scroll'));
  cleanup();
  assert.equal(fixture.timers.size, 0);
  const writes = fixture.writes.length;
  fixture.query('changed after cleanup');
  fixture.viewport.dispatchEvent(new Event('scroll'));
  fixture.browser.dispatchEvent(new Event('pagehide'));
  fixture.doc.dispatchEvent(new Event('reader:layout'));
  assert.equal(fixture.timers.size, 0);
  assert.equal(fixture.frames.size, 0);
  assert.equal(fixture.writes.length, writes);
});

test('new navigation and cleanup cancel a pending saved location', () => {
  for (const cancel of ['history', 'cleanup', 'input']) {
    const fixture = savedReadingFixture({ saved: savedReading({ position: { anchor: 'symbol-square-root', offset: 35 } }) });
    const cleanup = initializeSymbolSheet(fixture.main);
    fixture.attach();
    fixture.doc.dispatchEvent(new Event('reader:layout'));
    assert.equal(fixture.frames.size, 1);
    if (cancel === 'history') {
      fixture.browser.location.hash = '#symbol-summation';
      fixture.browser.dispatchEvent(new Event('popstate'));
    } else if (cancel === 'input') fixture.query('chance');
    else cleanup();
    assert.equal(fixture.frames.size, 0);
    fixture.flushFrames();
    assert.equal(fixture.viewport.scrollTop, 0);
    if (cancel !== 'cleanup') cleanup();
  }
});

test('retained history repair ignores a stale hash and is removed by cleanup', () => {
  const fixture = savedReadingFixture({ hash: '#detail-square-root' });
  fixture.attach();
  const detail = fixture.disclosures.get('root');
  detail.getBoundingClientRect = () => ({ top: 2042 - fixture.viewport.scrollTop, bottom: 2342 - fixture.viewport.scrollTop });
  const cleanup = initializeSymbolSheet(fixture.main);
  fixture.browser.dispatchEvent(new Event('popstate'));
  fixture.browser.dispatchEvent(new Event('hashchange'));
  assert.equal(fixture.frames.size, 1, 'paired history events retain one target and one frame');
  fixture.flushFrames();
  assert.equal(fixture.viewport.scrollTop, 2000);
  fixture.viewport.scrollTop = 200;
  fixture.browser.location.hash = '#symbol-summation';
  fixture.doc.dispatchEvent(new Event('reader:layout'));
  assert.equal(fixture.viewport.scrollTop, 200, 'an intervening route cancels the old target');
  fixture.browser.location.hash = '#detail-square-root';
  fixture.browser.dispatchEvent(new Event('popstate'));
  fixture.flushFrames();
  assert.equal(fixture.viewport.scrollTop, 2000);
  fixture.viewport.scrollTop = 200;
  cleanup();
  fixture.doc.dispatchEvent(new Event('reader:layout'));
  assert.equal(fixture.viewport.scrollTop, 200, 'cleanup removes intent retained after the fallback frame');
  assert.equal(fixture.frames.size, 0);
});

test('forget removes only saved reference state without immediately recreating it', () => {
  const fixture = savedReadingFixture({ saved: savedReading({ query: 'chance' }) });
  const cleanup = initializeSymbolSheet(fixture.main);
  fixture.forget.dispatchEvent(new Event('click'));
  assert.equal(fixture.values.has(symbolSheetStateKey), false);
  assert.equal(fixture.values.get('unrelated'), 'keep');
  assert.equal(fixture.input.value, 'chance', 'forgetting keeps the current reading view');
  fixture.browser.dispatchEvent(new Event('pagehide'));
  assert.equal(fixture.values.has(symbolSheetStateKey), false);
  fixture.query('∑');
  assert.equal(fixture.stored().query, '∑', 'later reading changes can be saved again');
  fixture.forget.dispatchEvent(new Event('click'));
  cleanup();
  assert.equal(fixture.values.has(symbolSheetStateKey), false);
});
