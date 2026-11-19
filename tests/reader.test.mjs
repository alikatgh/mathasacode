import test from 'node:test';
import assert from 'node:assert/strict';
import { createReaderController, decodeReaderHash, initializeReader, planReadingPages, resolveReaderRoute } from '../site/reader.mjs';

test('legacy anchor sections preserve all content while separating examples and practice', () => {
  const blocks = [
    { kind: 'heading', words: 0 }, { kind: 'prose', words: 120 },
    { kind: 'example', words: 40 }, { kind: 'prose', words: 180 },
    { kind: 'prose', words: 140 }, { kind: 'example', words: 30 },
    { kind: 'practice', words: 0 }, { kind: 'prose', words: 20 }
  ];
  const pages = planReadingPages(blocks);
  assert.deepEqual(pages.flat(), blocks);
  assert.ok(pages.length >= 4);
  for (const page of pages) {
    if (page.some(block => block.kind === 'practice')) assert.equal(page.length, 1);
    const examples = page.filter(block => block.kind === 'example');
    assert.ok(examples.length <= 1);
    if (examples.length) assert.equal(page.at(-1), examples[0]);
    assert.ok(page.reduce((sum, block) => sum + block.words, 0) <= 300);
  }
  assert.deepEqual(planReadingPages([]), []);
  const longParagraph = { kind: 'prose', words: 350 };
  assert.deepEqual(planReadingPages([longParagraph]), [[longParagraph]], 'authored paragraph stays intact');
});

test('deep links identify topics, reading steps, practice and compatibility anchors', () => {
  const topics = [
    { id: 'overview', pages: [{ id: 'reader-overview-1' }] },
    { id: '梯度与梯度下降', pages: [{ id: 'reader-梯度与梯度下降-1' }, { id: 'reader-梯度与梯度下降-2' }] }
  ];
  const anchors = new Map([
    ['practice-gradient-descent', { topicIndex: 1, pageIndex: 1 }],
    ['legacy-alias', { topicIndex: 1, pageIndex: 0 }]
  ]);
  for (const [hash, pageIndex] of [[`#${encodeURIComponent(topics[1].id)}`, 0], [`#${encodeURIComponent(topics[1].pages[1].id)}`, 1], ['#practice-gradient-descent', 1], ['#legacy-alias', 0]]) {
    const route = resolveReaderRoute(hash, topics, anchors);
    assert.equal(route.known, true);
    assert.equal(route.topicIndex, 1);
    assert.equal(route.pageIndex, pageIndex);
  }
  for (const hash of ['', '#unknown', '#%E0%A4%A']) {
    const route = resolveReaderRoute(hash, topics, anchors);
    assert.equal(route.known, false);
    assert.equal(route.topicIndex, 0);
    assert.equal(route.pageIndex, 0);
  }
  assert.equal(decodeReaderHash('#a%20b'), 'a b');
  assert.equal(decodeReaderHash('#%ZZ'), '%ZZ');
});

function controllerFixture(hash = '#overview', initialState = null) {
  const doc = new EventTarget();
  const browser = new EventTarget();
  browser.location = new URL(`https://example.test/${hash}`);
  browser.CustomEvent = class extends Event {
    constructor(type, { detail }) { super(type); this.detail = detail; }
  };
  const historyWrites = [];
  const historyEntries = [{ state: initialState, href: browser.location.href }];
  let historyIndex = 0;
  browser.history = { state: initialState, scrollRestoration: 'auto' };
  for (const method of ['pushState', 'replaceState']) {
    browser.history[method] = (state, _, href) => {
      historyWrites.push({ method, href });
      browser.history.state = state;
      browser.location = new URL(href);
      if (method === 'pushState') {
        historyEntries.splice(historyIndex + 1);
        historyEntries.push({ state, href });
        historyIndex++;
      } else historyEntries[historyIndex] = { state, href };
    };
  }
  for (const [method, delta] of [['back', -1], ['forward', 1]]) {
    browser.history[method] = () => {
      historyIndex += delta;
      assert.ok(historyEntries[historyIndex], 'history traversal must target an existing entry');
      browser.history.state = historyEntries[historyIndex].state;
      browser.location = new URL(historyEntries[historyIndex].href);
      browser.dispatchEvent(new Event('popstate'));
    };
  }
  browser.scrollTo = browser.scrollBy = () => assert.fail('the controller must not scroll the window');
  doc.defaultView = browser;
  let activeViewport;
  const elements = new Map();
  const element = (id, contentTop = 0) => {
    const result = {
      id, hidden: true, contentTop, focusCalls: [],
      hasAttribute: () => false,
      focus(options) { this.focusCalls.push(options); },
      getBoundingClientRect() { return { top: 40 + this.contentTop - (activeViewport?.scrollTop || 0) }; },
    };
    elements.set(id, result);
    return result;
  };
  doc.getElementById = id => elements.get(id);
  const page = (id, contentTop = 0) => ({
    id, practice: id.startsWith('practice-'),
    element: element(id, contentTop),
  });
  const topics = [
    { id: 'overview', element: { hidden: true }, pages: [page('reader-overview-1'), page('practice-overview', 640)] },
    { id: 'algebra', element: { hidden: true }, pages: [page('reader-algebra-1'), page('reader-algebra-2', 780)] },
  ];
  element('legacy-alias', 280);
  element('another-alias', 420);
  const anchors = new Map([
    ['practice-overview', { topicIndex: 0, pageIndex: 1 }],
    ['legacy-alias', { topicIndex: 1, pageIndex: 0 }],
    ['another-alias', { topicIndex: 1, pageIndex: 0 }],
  ]);
  const changes = [];
  doc.addEventListener('reader:change', event => {
    assert.equal(topics.find(topic => topic.id === event.detail.topicId).element.hidden, false);
    changes.push(event.detail);
  });
  const main = { id: 'guide-content', ownerDocument: doc };
  const controller = createReaderController({ main, topics, anchors });
  const viewport = {
    scrollTop: 0, focusCalls: [], hasAttribute: () => false,
    getBoundingClientRect: () => ({ top: 40 }),
    focus(options) { this.focusCalls.push(options); },
  };
  activeViewport = viewport;
  const attach = (pane = viewport) => {
    activeViewport = pane;
    return controller.attachViewport(pane);
  };
  return { controller, doc, browser, topics, elements, changes, historyWrites, viewport, attach };
}

test('selected topics show every section and repeated topic navigation preserves focus and scroll', () => {
  const { controller, topics, changes, historyWrites, viewport, attach } = controllerFixture();
  const initial = controller.getSnapshot();
  assert.deepEqual(initial, { topicIndex: 0, pageIndex: 0 });
  assert.equal(controller.getSnapshot(), initial);
  attach();
  controller.restoreViewport();
  assert.ok(topics[0].pages.every(page => page.element.hidden === false));
  assert.equal(topics[1].element.hidden, true);
  viewport.scrollTop = 240;
  let notifications = 0;
  controller.subscribe(() => notifications++);
  assert.equal(controller.navigate('#overview'), false);
  assert.equal(controller.getSnapshot(), initial);
  assert.equal(viewport.scrollTop, 240);
  assert.equal(topics[0].pages[0].element.focusCalls.length, 0);
  assert.equal(changes.length, 1, 'the initial page was announced only once');
  assert.equal(notifications, 0);
  assert.equal(historyWrites.filter(write => write.method === 'pushState').length, 0, 'an unchanged hash adds no history entry');
});

test('practice and distinct legacy anchors scroll only the viewport without hiding any topic content', () => {
  const { controller, topics, elements, historyWrites, viewport, attach } = controllerFixture();
  attach();
  controller.restoreViewport();
  viewport.scrollTop = 180;
  assert.equal(controller.navigate('#practice-overview'), true);
  assert.deepEqual(controller.getSnapshot(), { topicIndex: 0, pageIndex: 1 });
  assert.equal(viewport.scrollTop, 640, 'practice scrolls to its section within the complete topic');
  assert.ok(topics[0].pages.every(page => page.element.hidden === false));
  assert.deepEqual(topics[0].pages[1].element.focusCalls, [{ preventScroll: true }]);
  assert.equal(historyWrites.filter(write => write.method === 'pushState').length, 1);
  controller.restoreViewport();
  viewport.scrollTop = 700;
  const current = controller.getSnapshot();
  assert.equal(controller.navigate('#practice-overview'), false);
  assert.equal(viewport.scrollTop, 700);
  assert.equal(controller.getSnapshot(), current);
  assert.equal(topics[0].pages[1].element.focusCalls.length, 1);

  controller.navigate('#legacy-alias');
  assert.equal(topics[0].element.hidden, true);
  assert.equal(topics[1].element.hidden, false);
  assert.ok(topics[1].pages.every(page => page.element.hidden === false));
  assert.equal(viewport.scrollTop, 280);
  assert.deepEqual(elements.get('legacy-alias').focusCalls, [{ preventScroll: true }]);
  controller.navigate('#another-alias');
  assert.deepEqual(controller.getSnapshot(), { topicIndex: 1, pageIndex: 0 });
  assert.equal(viewport.scrollTop, 420, 'a different anchor in the same section is independently reachable');
  assert.deepEqual(elements.get('another-alias').focusCalls, [{ preventScroll: true }]);
});

test('reader remembers per-topic scroll on return and deduplicates paired history events', () => {
  const { controller, browser, topics, changes, historyWrites, viewport, attach } = controllerFixture();
  attach();
  controller.restoreViewport();
  viewport.scrollTop = 180;
  let notifications = 0;
  const unsubscribe = controller.subscribe(() => notifications++);
  controller.navigate('#algebra');
  controller.restoreViewport();
  assert.equal(viewport.scrollTop, 0, 'a first topic visit starts at the top');
  viewport.scrollTop = 390;

  browser.history.back();
  const restored = controller.getSnapshot();
  assert.equal(viewport.scrollTop, 180);
  browser.dispatchEvent(new Event('hashchange'));
  assert.equal(controller.getSnapshot(), restored);
  assert.equal(viewport.scrollTop, 180);
  assert.equal(topics[0].pages[0].element.focusCalls.length, 1);
  assert.equal(changes.length, 3);
  assert.equal(notifications, 2);
  assert.equal(historyWrites.filter(write => write.method === 'pushState').length, 1, 'history traversal does not write another entry');
  controller.restoreViewport();

  browser.history.forward();
  assert.equal(viewport.scrollTop, 390);
  controller.restoreViewport();
  viewport.scrollTop = 450;
  unsubscribe();
  controller.navigate('#overview', { history: 'replace', focus: false });
  assert.equal(viewport.scrollTop, 180, 'a topic link restores its remembered position on return');
  assert.equal(topics[0].pages[0].element.focusCalls.length, 1);
  assert.equal(notifications, 3);
  assert.equal(historyWrites.at(-1).method, 'replaceState');
  controller.navigate('#algebra');
  assert.equal(viewport.scrollTop, 450);
});

test('initial deep links wait for the viewport and one final layout restoration, then stop changing scroll', () => {
  const { controller, topics, viewport, attach } = controllerFixture('#practice-overview');
  assert.ok(topics[0].pages.every(page => page.element.hidden === false));
  attach();
  assert.equal(viewport.scrollTop, 640);
  topics[0].pages[1].element.contentTop = 940;
  controller.restoreViewport();
  assert.equal(viewport.scrollTop, 940, 'the final portal layout determines the anchor offset');
  viewport.scrollTop = 1010;
  topics[0].pages[1].element.contentTop = 1040;
  controller.restoreViewport();
  assert.equal(viewport.scrollTop, 1010, 'later language/quiz layout changes cannot replay navigation');
  assert.equal(topics[0].pages[1].element.focusCalls.length, 0, 'initial loading does not steal focus');
});

test('history returns to the remembered topic offset even when its route contains a practice anchor', () => {
  const { controller, browser, viewport, attach } = controllerFixture('#practice-overview');
  attach();
  controller.restoreViewport();
  viewport.scrollTop = 725;
  controller.navigate('#algebra');
  controller.restoreViewport();
  browser.history.back();
  assert.equal(viewport.scrollTop, 725);
  browser.dispatchEvent(new Event('hashchange'));
  controller.restoreViewport();
  assert.equal(viewport.scrollTop, 725, 'the paired hash event must not retarget practice');
});

test('Read explanation returns to the topic top while exact-route clicks preserve the current scroll', () => {
  const { controller, viewport, attach } = controllerFixture();
  attach();
  controller.restoreViewport();
  viewport.scrollTop = 180;
  controller.navigate('#practice-overview');
  controller.restoreViewport();
  assert.equal(viewport.scrollTop, 640);
  controller.navigate('#overview');
  controller.restoreViewport();
  assert.equal(viewport.scrollTop, 0, 'a same-topic explanation link reaches its beginning');
  viewport.scrollTop = 90;
  const reading = controller.getSnapshot();
  assert.equal(controller.navigate('#overview'), false);
  assert.equal(controller.getSnapshot(), reading);
  assert.equal(viewport.scrollTop, 90);
});

test('Read explanation clicks restart the active topic after scrolling to practice without a hash change', () => {
  const { controller, doc, browser, topics, viewport, historyWrites, attach } = controllerFixture();
  attach();
  controller.restoreViewport();
  viewport.scrollTop = 725;
  const anchor = { href: '#overview', target: '', hasAttribute: () => false,
    classList: { contains: name => name === 'learn-panel__read' } };
  const event = new Event('click', { cancelable: true });
  Object.defineProperties(event, {
    button: { value: 0 }, target: { value: { closest: () => anchor } },
  });
  doc.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(browser.location.hash, '#overview');
  assert.equal(viewport.scrollTop, 0, 'the explicit explanation action reaches the topic beginning');
  assert.deepEqual(topics[0].pages[0].element.focusCalls, [{ preventScroll: true }]);
  assert.ok(topics[0].pages.every(page => page.element.hidden === false));
  assert.equal(historyWrites.filter(write => write.method === 'pushState').length, 0);
});

test('Back and Forward preserve each history entry including repeated topic hashes', () => {
  const initialState = { shell: { selected: 'guide' }, navigationCount: 7 };
  const { controller, browser, viewport, attach } = controllerFixture('#overview', initialState);
  attach();
  controller.restoreViewport();
  viewport.scrollTop = 180;
  controller.navigate('#practice-overview');
  controller.restoreViewport();
  viewport.scrollTop = 725;
  controller.navigate('#overview');
  controller.restoreViewport();
  viewport.scrollTop = 90;

  browser.history.back();
  controller.restoreViewport();
  assert.equal(viewport.scrollTop, 725, 'the practice entry keeps its reading offset');
  browser.history.back();
  controller.restoreViewport();
  assert.equal(browser.location.hash, '#overview');
  assert.equal(viewport.scrollTop, 180, 'the first overview entry retains its pre-practice position');
  browser.history.forward();
  controller.restoreViewport();
  assert.equal(viewport.scrollTop, 725);
  browser.history.forward();
  controller.restoreViewport();
  assert.equal(browser.location.hash, '#overview');
  assert.equal(viewport.scrollTop, 90, 'the later identical hash retains a separate position');
  assert.deepEqual(browser.history.state.shell, initialState.shell);
  assert.equal(browser.history.state.navigationCount, 7);
  assert.deepEqual(initialState, { shell: { selected: 'guide' }, navigationCount: 7 }, 'history metadata never mutates existing state');
});

test('history metadata preserves primitive, array and foreign namespaced state', () => {
  for (const initialState of ['shell-state', ['guide', 7], { __mathAsCodeReaderEntry: { ownedBy: 'shell' } }]) {
    const { controller, browser, viewport, attach } = controllerFixture('#overview', initialState);
    attach();
    controller.restoreViewport();
    viewport.scrollTop = 180;
    controller.navigate('#practice-overview');
    controller.restoreViewport();
    assert.deepEqual(browser.history.state, initialState);
    browser.history.back();
    controller.restoreViewport();
    assert.equal(viewport.scrollTop, 180, 'route memory remains available without changing opaque state');
    assert.deepEqual(browser.history.state, initialState);
  }
});

test('reader viewport cleanup retains scroll through a shell remount', () => {
  const { controller, viewport, attach } = controllerFixture();
  const detach = attach();
  controller.restoreViewport();
  viewport.scrollTop = 120;
  const replacement = { ...viewport, scrollTop: 0 };
  attach(replacement);
  controller.restoreViewport();
  assert.equal(replacement.scrollTop, 120);
  detach();
  replacement.scrollTop = 170;
  controller.navigate('#algebra');
  controller.navigate('#overview');
  assert.equal(replacement.scrollTop, 170, 'an obsolete cleanup cannot detach the current pane');
});

test('skip links focus the reading pane without changing the route or scroll', () => {
  const { doc, browser, viewport, historyWrites, attach } = controllerFixture();
  attach();
  viewport.scrollTop = 230;
  const anchor = { href: '#guide-content', target: '', hasAttribute: () => false };
  const event = new Event('click', { cancelable: true });
  Object.defineProperties(event, {
    button: { value: 0 }, target: { value: { closest: () => anchor } },
  });
  doc.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(viewport.focusCalls, [{ preventScroll: true }]);
  assert.equal(viewport.scrollTop, 230);
  assert.equal(browser.location.hash, '#overview');
  assert.equal(historyWrites.filter(write => write.method === 'pushState').length, 0);
});

test('internal practice clicks prevent native fragment scrolling and target the reading pane', () => {
  const { doc, viewport, topics, attach } = controllerFixture();
  attach();
  const anchor = { href: '#practice-overview', target: '', hasAttribute: () => false };
  const event = new Event('click', { cancelable: true });
  Object.defineProperties(event, {
    button: { value: 0 }, target: { value: { closest: () => anchor } },
  });
  doc.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(viewport.scrollTop, 640);
  assert.ok(topics[0].pages.every(page => page.element.hidden === false));
});

test('reader initialization is safe when imported without a browser document', () => {
  assert.equal(initializeReader(), undefined);
});
