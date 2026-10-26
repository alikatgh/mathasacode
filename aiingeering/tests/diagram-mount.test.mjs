import test from 'node:test';
import assert from 'node:assert/strict';
import { mountCurriculumDiagrams } from '../site/diagram-mount.mjs';

const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
function fixture({ observer = true } = {}) {
  let callback;
  let disconnected = false;
  let contained = true;
  const listeners = new Map();
  const viewport = { clientWidth: 720 };
  const output = { innerHTML: '', style: {} };
  const details = { open: true };
  const status = { hidden: true, textContent: '' };
  const source = 'graph TD\nA["Input"] --> B["Output"]\n';
  const parts = new Map([
    ['.curriculum-diagram-viewport', viewport], ['.diagram-output', output],
    ['.diagram-source', details], ['.diagram-status', status], ['code.language-mermaid', { textContent: source }],
  ]);
  const figure = { dataset: {}, querySelector: selector => parts.get(selector) };
  const view = {
    ...(observer ? { ResizeObserver: class {
      constructor(fn) { callback = fn; }
      observe() {}
      disconnect() { disconnected = true; }
    } } : {}),
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); },
  };
  const host = {
    isConnected: true, ownerDocument: { defaultView: view },
    querySelectorAll: () => [figure], contains: item => contained && item === figure,
  };
  return {
    host, output, details, status, figure, viewport, source, listeners,
    get disconnected() { return disconnected; },
    removeFigure() { contained = false; },
    resize(width) { viewport.clientWidth = width; if (observer) callback([{ target: viewport }]); else listeners.get('resize')?.(); },
  };
}
const graphic = (svg = '<svg/>') => ({ svg, width: 300, height: 200 });

test('commits a Pele diagram at natural dimensions and retains the exact authored source', async () => {
  const f = fixture();
  const calls = [];
  const cleanup = mountCurriculumDiagrams(f.host, { renderDiagram: async (...args) => { calls.push(args); return graphic(); } });
  assert.equal(f.details.open, true, 'source stays readable while rendering');
  await settle();
  assert.equal(calls[0][0], f.source);
  assert.equal(calls[0][1].width, 720);
  assert.equal(f.output.innerHTML, '<svg/>');
  assert.deepEqual(f.output.style, { width: '300px', height: '200px' });
  assert.equal(f.figure.dataset.diagramRenderer, 'pele');
  assert.equal(f.details.open, false);
  f.details.open = true;
  f.resize(320);
  await settle();
  assert.equal(f.details.open, true, 'resizing respects a reader-opened source disclosure');
  assert.equal(calls.length, 2);
  f.resize(320);
  await settle();
  assert.equal(calls.length, 2, 'height changes cannot create a resize render loop');
  cleanup();
  assert.equal(f.disconnected, true);
});

test('a slower previous-width render cannot overwrite a newer diagram', async () => {
  const f = fixture();
  const jobs = [];
  const cleanup = mountCurriculumDiagrams(f.host, { renderDiagram: () => new Promise(resolve => jobs.push(resolve)) });
  f.resize(320);
  jobs[1](graphic('<svg>new</svg>'));
  await settle();
  jobs[0](graphic('<svg>old</svg>'));
  await settle();
  assert.equal(f.output.innerHTML, '<svg>new</svg>');
  cleanup();
});

test('navigation, disposal and remounting prevent stale asynchronous DOM writes', async () => {
  for (const action of ['dispose', 'disconnect', 'remove', 'remount']) {
    const f = fixture();
    let finish;
    const cleanup = mountCurriculumDiagrams(f.host, { renderDiagram: () => new Promise(resolve => { finish = resolve; }) });
    let cleanupAgain;
    if (action === 'dispose') cleanup();
    if (action === 'disconnect') f.host.isConnected = false;
    if (action === 'remove') f.removeFigure();
    if (action === 'remount') cleanupAgain = mountCurriculumDiagrams(f.host, { renderDiagram: async () => graphic('<svg>current</svg>') });
    await settle();
    finish(graphic('<svg>stale</svg>'));
    await settle();
    assert.equal(f.output.innerHTML, action === 'remount' ? '<svg>current</svg>' : '', action);
    cleanupAgain?.();
    cleanup();
  }
});

test('renderer failure exposes the original source and a useful status', async () => {
  const f = fixture();
  const cleanup = mountCurriculumDiagrams(f.host, { renderDiagram: async () => { throw new Error('Unsupported diagram'); } });
  await settle();
  assert.equal(f.details.open, true);
  assert.equal(f.status.hidden, false);
  assert.match(f.status.textContent, /original source/);
  assert.equal(f.output.innerHTML, '');
  assert.equal(f.source, 'graph TD\nA["Input"] --> B["Output"]\n');
  cleanup();
});

test('resize fallback is bounded by width and removed on cleanup', async () => {
  const f = fixture({ observer: false });
  let count = 0;
  const cleanup = mountCurriculumDiagrams(f.host, { renderDiagram: async () => { count++; return graphic(); } });
  await settle();
  f.resize(400);
  await settle();
  assert.equal(count, 2);
  assert.equal(f.listeners.size, 1);
  cleanup();
  assert.equal(f.listeners.size, 0);
  f.resize(300);
  assert.equal(count, 2);
});
