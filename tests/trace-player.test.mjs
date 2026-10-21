import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import React from 'react';

const bundle = await build({
  entryPoints: [new URL('../site/trace-visualizer.jsx', import.meta.url).pathname],
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external',
  logLevel: 'silent',
});

// Exercise the production component's controls/effects with a deterministic
// clock. The fixture never executes any example code or starts a real timer.
function player() {
  const slots = [], pending = [], timers = new Map(), listeners = new Map();
  let cursor = 0, changed = false, timerId = 0, tree, props, hiddenTopic = false;
  const doc = { hidden: false, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  const element = { ownerDocument: doc, closest: () => hiddenTopic ? {} : null, getClientRects: () => hiddenTopic ? [] : [{}] };
  const hooks = {
    ...React,
    useId: () => 'test-player',
    useRef: initial => { const index = cursor++; slots[index] ??= { current: initial }; return slots[index]; },
    useState: initial => {
      const index = cursor++; slots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, value => {
        const next = typeof value === 'function' ? value(slots[index].value) : value;
        if (!Object.is(next, slots[index].value)) { slots[index].value = next; changed = true; }
      }];
    },
    useEffect: (fn, deps) => {
      const index = cursor++, previous = slots[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        pending.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: fn() }; });
      }
    },
  };
  const loaded = { exports: {} }, require = createRequire(import.meta.url);
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', bundle.outputFiles[0].text)(
    name => name === 'react' ? hooks : require(name), loaded, loaded.exports,
    (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; }, id => timers.delete(id));
  const frames = Array.from({ length: 4 }, (_, i) => ({ line: i + 1, event: 'line', locals: {} }));
  const model = { status: 'success', step: 0, count: 4, frame: frames[0], changes: [], collections: [], numericNames: [], warnings: [] };
  function render() {
    let attempts = 0;
    do {
      changed = false; cursor = 0;
      tree = loaded.exports.TraceVisualizer(props);
      tree.props.ref.current = element;
      for (const effect of pending.splice(0)) effect();
      assert.ok(++attempts < 8, 'effects settle without a render loop');
    } while (changed);
  }
  function seek(step) { model.step = step; model.frame = frames[step]; render(); }
  props = { model, scene: null, onStep: seek };
  render();
  function find(node, label) {
    if (!node || typeof node !== 'object') return null;
    if (node.props?.['aria-label'] === label) return node;
    for (const child of React.Children.toArray(node.props?.children)) {
      const result = find(child, label); if (result) return result;
    }
    return null;
  }
  return {
    model, timers, doc,
    control: label => find(tree, label),
    click(label) { const button = find(tree, label); assert.ok(button, label); assert.ok(!button.props.disabled, label); button.props.onClick(); render(); },
    change(label, value) { find(tree, label).props.onChange({ target: { value } }); render(); },
    tick() { const next = timers.entries().next().value; assert.ok(next, 'one pending playback timer'); timers.delete(next[0]); next[1].fn(); render(); },
    seek,
    hideDocument() { doc.hidden = true; listeners.get('visibilitychange')?.(); render(); },
    hideTopic() { hiddenTopic = true; },
    dispose() { for (const slot of slots) slot?.cleanup?.(); },
  };
}

test('replay advances only recorded frames, stops at the end and restarts from the beginning', () => {
  const p = player();
  assert.equal(p.timers.size, 0);
  p.click('Play visualization');
  assert.equal(p.timers.size, 1);
  p.tick(); assert.equal(p.model.step, 1);
  p.tick(); assert.equal(p.model.step, 2);
  p.tick(); assert.equal(p.model.step, 3);
  assert.equal(p.timers.size, 0);
  assert.ok(p.control('Play visualization'));
  p.click('Play visualization');
  assert.equal(p.model.step, 0);
  assert.equal(p.timers.size, 1);
  p.dispose(); assert.equal(p.timers.size, 0);
});

test('manual seek in either panel pauses playback and speed changes keep one timer', () => {
  const p = player();
  p.click('Play visualization');
  p.change('Replay speed', '2');
  assert.equal(p.timers.size, 1);
  assert.equal([...p.timers.values()][0].delay, 450);
  p.change('Visualization step', '3');
  assert.equal(p.model.step, 2);
  assert.equal(p.timers.size, 0);
  p.click('Play visualization');
  p.seek(0); // The independent code panel calls the same parent callback.
  assert.equal(p.timers.size, 0);
  p.click('Next visualized step'); assert.equal(p.model.step, 1);
  p.click('Previous visualized step'); assert.equal(p.model.step, 0);
  p.dispose();
});

test('visibility, hidden topics and unmount stop outstanding replay work', () => {
  const p = player(); p.click('Play visualization'); p.hideDocument();
  assert.equal(p.timers.size, 0);
  const q = player(); q.click('Play visualization'); q.hideTopic(); q.tick();
  assert.equal(q.model.step, 0);
  assert.equal(q.timers.size, 0);
  const r = player(); r.click('Play visualization'); r.dispose();
  assert.equal(r.timers.size, 0);
});
