export function decodeReaderHash(hash = '') {
  const value = String(hash).replace(/^#/, '');
  try { return decodeURIComponent(value); } catch { return value; }
}

// Blocks are already semantic units: a notation/code comparison is never split.
// End a step after its example so the next explanation starts a fresh step.
export function planReadingPages(blocks, { maxWords = 300 } = {}) {
  const pages = [];
  let page = [];
  let words = 0;
  const flush = () => {
    if (page.length) pages.push(page);
    page = [];
    words = 0;
  };
  for (const block of blocks) {
    if (block.kind === 'practice') {
      flush();
      pages.push([block]);
      continue;
    }
    const count = Math.max(0, Number(block.words) || 0);
    const hasContent = page.some(item => item.kind !== 'heading' && item.kind !== 'anchor');
    if (hasContent && words + count > maxWords) flush();
    page.push(block);
    words += count;
    if (block.kind === 'example') flush();
  }
  flush();
  return pages;
}

export function resolveReaderRoute(hash, topics, anchors = new Map()) {
  const id = decodeReaderHash(hash);
  const direct = typeof anchors.get === 'function' ? anchors.get(id) : anchors[id];
  if (direct) return { ...direct, targetId: id, known: true };
  for (let topicIndex = 0; topicIndex < topics.length; topicIndex++) {
    const topic = topics[topicIndex];
    if (topic.id === id) return { topicIndex, pageIndex: 0, targetId: id, known: true };
    const pageIndex = topic.pages.findIndex(page => page.id === id);
    if (pageIndex >= 0) return { topicIndex, pageIndex, targetId: id, known: true };
  }
  return { topicIndex: 0, pageIndex: 0, targetId: '', known: false };
}

const sourceHeading = block => block.matches('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')
  ? block
  : block.matches('.markdown-heading') ? block.querySelector('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]') : null;
const isContents = heading => /^(?:contents|table of contents|目录)$/i.test(heading.textContent.trim());
const isEmptyAnchor = block => !block.textContent.trim()
  && (block.matches('a[id]') || block.querySelector('a[id]'))
  && !block.querySelector('img, input, button, pre, .formula');
const routeHref = id => `#${encodeURIComponent(id)}`;
const readers = new WeakMap();

function countWords(block) {
  // Skip repeated language implementations and KaTeX's duplicate rendering
  // without cloning every source panel while the guide initializes.
  const filter = block.ownerDocument.defaultView.NodeFilter;
  const walker = block.ownerDocument.createTreeWalker(block, filter.SHOW_ELEMENT | filter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.nodeType === 1) return node.matches('pre, script, .katex, .code-example__tabs') ? filter.FILTER_REJECT : filter.FILTER_SKIP;
      return filter.FILTER_ACCEPT;
    }
  });
  let content = '';
  for (let node = walker.nextNode(); node; node = walker.nextNode()) content += ` ${node.textContent}`;
  const characters = content.match(/\p{Script=Han}/gu)?.length || 0;
  const words = content.replace(/\p{Script=Han}/gu, ' ').match(/[\p{L}\p{N}]+/gu)?.length || 0;
  return words + Math.ceil(characters / 2);
}

/** Retain stable section anchors while grouping each topic into one reading flow. */
export function initializeReader(doc = globalThis.document) {
  const main = doc?.querySelector('main');
  if (!main || doc.body.dataset.guide !== 'true' && doc.body.dataset.reader !== 'true') return;
  if (readers.has(main)) return readers.get(main);
  const blocks = Array.from(main.children);
  const headings = blocks.map(sourceHeading).filter(heading => heading && !isContents(heading));
  if (!headings.length) return;

  const make = (tag, className) => {
    const element = doc.createElement(tag);
    element.className = className;
    return element;
  };
  // The shell owns the contents navigation. Retain the authored duplicate DOM
  // inside the first topic, hidden, without relying on navigation.js running.
  const contents = new Set();
  for (const [index, block] of blocks.entries()) {
    const heading = sourceHeading(block);
    if (!heading || !isContents(heading)) continue;
    contents.add(block);
    if (blocks[index + 1]?.matches('ul')) contents.add(blocks[index + 1]);
  }
  for (const block of contents) block.hidden = true;

  const topics = [];
  const byHeading = new Map();
  const practices = [];
  let current;
  let pending = [];
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    const heading = sourceHeading(block);
    if (contents.has(block)) continue;
    if (heading) {
      current = { id: heading.id, title: heading.textContent.replace(/\s+/g, ' ').trim(), heading, blocks: [], pages: [] };
      topics.push(current);
      byHeading.set(current.id, current);
      current.blocks.push(...pending, { nodes: [block], kind: 'heading', words: 0 });
      pending = [];
    } else if (block.matches('.learn-panel')) {
      const target = decodeReaderHash(block.querySelector('.learn-panel__read')?.hash);
      practices.push({ block, target, fallback: current });
    } else {
      const kind = block.matches('.comparison, .code-example, .code-fence, pre') ? 'example' : isEmptyAnchor(block) ? 'anchor' : 'prose';
      // Math and code occupy reading space even when they contain few prose
      // words. A comparison remains one indivisible notation/example unit.
      const displayEquations = kind === 'prose' ? block.querySelectorAll('.formula--display').length : 0;
      const words = Math.max(countWords(block) + displayEquations * 90, kind === 'example' ? 180 : 0);
      const descriptor = { nodes: [block], kind, words };
      const next = blocks.slice(index + 1).find(candidate => !candidate.hidden);
      if (!current || descriptor.kind === 'anchor' && next && sourceHeading(next)) pending.push(descriptor);
      else {
        const previous = current.blocks.at(-1);
        const precedingNode = previous?.nodes.at(-1);
        const continuesIntroduction = (block.matches('.display-equation') || kind === 'example')
          && previous?.kind === 'prose'
          && precedingNode === blocks[index - 1]
          && /[:：]\s*$/.test(precedingNode.textContent);
        if (continuesIntroduction) {
          // A lead such as “In code:” belongs to the expression it introduces.
          // Preserve the complete semantic unit even when it exceeds a step's
          // usual visual budget; never join across a source heading/practice.
          previous.nodes.push(block);
          previous.words += words;
          previous.kind = kind;
        } else current.blocks.push(descriptor);
      }
    }
  }
  if (pending.length) (current || topics[0]).blocks.push(...pending);
  for (const { block, target, fallback } of practices) {
    // Keep the panel at its original place in the source reading sequence.
    // Parent-topic practice can follow several descendant topics; its existing
    // explanation link still points back to the parent without skipping them.
    (fallback || byHeading.get(target) || topics[0]).blocks.push({ nodes: [block], kind: 'practice', words: 0 });
  }

  const anchors = new Map();
  for (const [topicIndex, topic] of topics.entries()) {
    const section = make('section', 'reader-topic');
    section.dataset.topicId = topic.id;
    section.hidden = true;
    section.setAttribute('aria-labelledby', topic.id);
    topic.element = section;
    if (topicIndex === 0) section.append(...contents);
    const pageBlocks = planReadingPages(topic.blocks, { maxWords: 210 });
    for (const [pageIndex, units] of pageBlocks.entries()) {
      const page = make('div', 'reader-page');
      let id = `reader-${topic.id}-${pageIndex + 1}`;
      while (doc.getElementById(id)) id += '-step';
      page.id = id;
      page.tabIndex = -1;
      // These wrappers preserve old step URLs; they no longer paginate topics.
      page.hidden = false;
      page.dataset.page = String(pageIndex + 1);
      for (const unit of units) page.append(...unit.nodes);
      const practice = units.some(unit => unit.kind === 'practice');
      topic.pages.push({ id, element: page, practice });
      for (const target of [page, ...page.querySelectorAll('[id]')]) {
        anchors.set(target.id, { topicIndex, pageIndex });
      }
      section.append(page);
    }
    main.append(section);
  }

  main.dataset.readerReady = 'true';
  doc.body.classList.add('has-focused-reader');
  const controller = createReaderController({ main, topics, anchors });
  readers.set(main, controller);
  return controller;
}

/** Navigation and scrolling are owned by the shell's reading viewport. */
export function createReaderController({ main, topics, anchors = new Map() }) {
  const doc = main.ownerDocument;
  const browser = doc.defaultView;
  const subscribers = new Set();
  const positions = new Map();
  const routePositions = new Map();
  const entryPositions = new Map();
  const entryStateKey = '__mathAsCodeReaderEntry';
  const entryPrefix = `math-as-code:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}:`;
  let entrySequence = 0;
  let snapshot;
  let viewport;
  let activeTargetId;
  let pendingPosition;

  if ('scrollRestoration' in browser.history) browser.history.scrollRestoration = 'manual';

  const readEntryKey = state => typeof state?.[entryStateKey] === 'string' && state[entryStateKey].startsWith('math-as-code:')
    ? state[entryStateKey] : undefined;
  const entryState = (state, key) => {
    // Preserve other routers' state, including primitive/array state whose
    // shape cannot safely carry metadata. Route positions remain a fallback
    // for those entries; ordinary object state supports repeated hashes too.
    if (state !== null && (typeof state !== 'object' || Array.isArray(state) || ![Object.prototype, null].includes(Object.getPrototypeOf(state)))) return { state };
    if (state && Object.hasOwn(state, entryStateKey) && !readEntryKey(state)) return { state };
    return { state: { ...state, [entryStateKey]: key }, key };
  };
  const markCurrentEntry = () => {
    const existing = readEntryKey(browser.history.state);
    if (existing) return existing;
    const marked = entryState(browser.history.state, `${entryPrefix}${entrySequence++}`);
    if (marked.key) browser.history.replaceState(marked.state, '', browser.location.href);
    return marked.key;
  };
  let activeEntryKey = markCurrentEntry();

  const currentPage = () => snapshot && topics[snapshot.topicIndex].pages[snapshot.pageIndex];
  const currentTopic = () => snapshot && topics[snapshot.topicIndex];
  const rememberPosition = () => {
    const topic = currentTopic();
    if (viewport && topic) {
      positions.set(topic.id, viewport.scrollTop);
      routePositions.set(activeTargetId, viewport.scrollTop);
      if (activeEntryKey) entryPositions.set(activeEntryKey, viewport.scrollTop);
    }
  };
  const routeTarget = () => {
    const target = activeTargetId !== currentTopic()?.id && doc.getElementById?.(activeTargetId);
    // The shell replaces authored topic headings with its own heading. A legacy
    // alias can also be empty/hidden, so use its visible section as a fallback.
    return target && (!target.getClientRects || target.getClientRects().length) ? target : currentPage()?.element;
  };
  const restorePosition = ({ complete = false } = {}) => {
    if (!viewport || !pendingPosition) return;
    if (pendingPosition.targetId) {
      const target = routeTarget();
      if (target?.getBoundingClientRect && viewport.getBoundingClientRect) {
        const top = viewport.scrollTop + target.getBoundingClientRect().top - viewport.getBoundingClientRect().top - (viewport.clientTop || 0);
        viewport.scrollTop = Math.max(0, top);
      }
    } else viewport.scrollTop = pendingPosition.top;
    if (complete) pendingPosition = undefined;
  };
  const focusTarget = () => {
    const target = routeTarget();
    if (!target) return;
    if (!target.hasAttribute?.('tabindex')) target.tabIndex = -1;
    target.focus({ preventScroll: true });
  };

  function navigate(hash, { history = 'push', focus = true, restore = false, startAtTop = false } = {}) {
    const route = resolveReaderRoute(hash, topics, anchors);
    const topic = topics[route.topicIndex];
    const page = topic?.pages[route.pageIndex];
    if (!page) return false;
    const targetId = route.targetId || topic.id;
    const destinationEntryKey = readEntryKey(browser.history.state);
    const sameTopic = snapshot?.topicIndex === route.topicIndex;
    // Two distinct anchors can occupy the same retained wrapper. Compare their
    // IDs as well as the topic so each can be reached, while repeat clicks and
    // paired popstate/hashchange events preserve scroll and focus exactly.
    if (!startAtTop && sameTopic && activeTargetId === targetId && (!restore || activeEntryKey === destinationEntryKey)) return false;
    rememberPosition();
    if (route.known && (history === 'push' || history === 'replace')) {
      const url = new URL(browser.location.href);
      url.hash = String(hash).startsWith('#') ? hash : routeHref(hash);
      if (url.href !== browser.location.href) {
        const marked = entryState(browser.history.state, `${entryPrefix}${entrySequence++}`);
        browser.history[`${history}State`](marked.state, '', url.href);
        activeEntryKey = marked.key;
      }
    } else if (restore) activeEntryKey = destinationEntryKey || markCurrentEntry();
    else if (snapshot) {
      // A native fragment change made a new browser entry without using our
      // navigate API. Give that entry its own identity before remembering it.
      const marked = entryState(browser.history.state, `${entryPrefix}${entrySequence++}`);
      if (marked.key) browser.history.replaceState(marked.state, '', browser.location.href);
      activeEntryKey = marked.key;
    }
    if (snapshot) currentTopic().element.hidden = true;
    topic.element.hidden = false;
    for (const section of topic.pages) section.element.hidden = false;
    activeTargetId = targetId;
    const remembered = restore
      ? entryPositions.get(activeEntryKey) ?? routePositions.get(targetId) ?? positions.get(topic.id)
      : undefined;
    pendingPosition = startAtTop ? { top: 0 } : remembered !== undefined ? { top: remembered }
      : targetId === topic.id ? { top: sameTopic ? 0 : positions.get(topic.id) ?? 0 }
      : { targetId };
    snapshot = Object.freeze({ topicIndex: route.topicIndex, pageIndex: route.pageIndex });
    // Synchronous listeners can mount the selected code viewer before restoring
    // the reading position. The shell subscribes separately for its own controls.
    doc.dispatchEvent(new browser.CustomEvent('reader:change', { detail: { topicId: topic.id, pageId: page.id } }));
    restorePosition();
    if (focus) focusTarget();
    for (const subscriber of subscribers) subscriber();
    return true;
  }

  const controller = {
    main,
    topics,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    navigate,
    // Reapply one navigation after the shell/code portals commit their layout.
    // Consuming the intent prevents unrelated quiz/language updates from later
    // resetting the reader to an old saved position.
    restoreViewport: () => restorePosition({ complete: true }),
    attachViewport(element) {
      if (viewport !== element) {
        rememberPosition();
        viewport = element;
        if (!pendingPosition) pendingPosition = { top: positions.get(currentTopic()?.id) ?? 0 };
        restorePosition();
      }
      return () => {
        if (viewport !== element) return;
        rememberPosition();
        viewport = undefined;
      };
    },
  };

  doc.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download') || anchor.target && anchor.target !== '_self') return;
    const url = new URL(anchor.href, browser.location.href);
    if (url.origin !== browser.location.origin || url.pathname !== browser.location.pathname || url.search !== browser.location.search || !url.hash) return;
    const id = decodeReaderHash(url.hash);
    if (id === main.id || id === 'guide-content') {
      event.preventDefault();
      // Keep the skip link useful without allowing native fragment scrolling to
      // move an ancestor of the independently scrolling reading pane.
      const target = viewport || currentPage()?.element;
      if (target) {
        if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
      return;
    }
    if (!resolveReaderRoute(url.hash, topics, anchors).known) return;
    event.preventDefault();
    // Practice can be reached by scrolling while its explanation hash stays
    // active. This explicit action must still return to the topic beginning.
    navigate(url.hash, { startAtTop: anchor.classList?.contains('learn-panel__read') });
  });
  const restoreRoute = event => navigate(browser.location.hash, { history: 'none', restore: event.type === 'popstate' });
  // History traversal can emit both events. Stable snapshots make the second
  // event a no-op, including focus, code viewer mounting and scroll restoration.
  browser.addEventListener('hashchange', restoreRoute);
  browser.addEventListener('popstate', restoreRoute);
  navigate(browser.location.hash, { history: 'none', focus: false });
  return controller;
}
