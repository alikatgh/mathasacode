import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Compile only this JSX module in memory so the production timing helper is
// tested directly without a DOM, a browser tab, or generated build artifacts.
const bundle = await build({
  entryPoints: [new URL('../site/reui-examples.jsx', import.meta.url).pathname],
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external',
  define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent',
});
const compiled = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), compiled, compiled.exports);
const { preserveLanguageAnchor } = compiled.exports;

function fixture() {
  const browser = new EventTarget();
  const inputSurface = new EventTarget();
  const frames = new Map();
  let time = 0;
  let nextFrame = 0;
  let contentTop = 1000;
  Object.assign(browser, {
    performance: { now: () => time },
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id),
  });
  const viewport = {
    isConnected: true, scrollTop: 846, scrollHeight: 2400, clientHeight: 674,
    closest: () => inputSurface,
  };
  const anchor = {
    isConnected: true, closest: () => null,
    getBoundingClientRect: () => ({ top: contentTop - viewport.scrollTop }),
  };
  return {
    browser, inputSurface, viewport, anchor, frames,
    record: { anchor, viewport, top: 154 },
    moveContent: value => { contentTop = value; },
    advance(milliseconds = 16) {
      time += milliseconds;
      const callbacks = [...frames.values()]; frames.clear();
      for (const callback of callbacks) callback(time);
    },
  };
}

test('language anchoring corrects late layout passes and then stops', () => {
  const f = fixture();
  f.moveContent(1100);
  preserveLanguageAnchor(f.record, f.browser);
  assert.equal(f.anchor.getBoundingClientRect().top, 154);
  f.moveContent(950);
  f.advance();
  assert.equal(f.anchor.getBoundingClientRect().top, 154, 'a later layout keeps the selected toolbar in place');
  f.moveContent(1080);
  f.advance();
  assert.equal(f.anchor.getBoundingClientRect().top, 154);
  f.advance();
  assert.equal(f.frames.size, 0, 'only three post-commit frames are scheduled');
  const settledScroll = f.viewport.scrollTop;
  f.moveContent(1200);
  f.advance();
  assert.equal(f.viewport.scrollTop, settledScroll, 'later quiz or content changes do not trigger anchoring');
});

test('reader input and route cleanup cancel pending language corrections', () => {
  for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown', 'resize', 'cleanup']) {
    const f = fixture();
    const cancel = preserveLanguageAnchor(f.record, f.browser);
    const before = f.viewport.scrollTop;
    f.moveContent(1200);
    if (type === 'cleanup') cancel();
    else (type === 'resize' ? f.browser : f.inputSurface).dispatchEvent(new Event(type));
    f.advance();
    assert.equal(f.frames.size, 0, `${type} cancels outstanding frames`);
    assert.equal(f.viewport.scrollTop, before, `${type} leaves subsequent scrolling alone`);
  }
});

test('language corrections cannot resume after a hidden page or a long frame stall', () => {
  for (const stoppedBy of ['hidden', 'stall']) {
    const f = fixture();
    preserveLanguageAnchor(f.record, f.browser);
    const before = f.viewport.scrollTop;
    f.moveContent(1200);
    if (stoppedBy === 'hidden') f.anchor.closest = () => ({});
    f.advance(stoppedBy === 'stall' ? 200 : 16);
    assert.equal(f.frames.size, 0);
    assert.equal(f.viewport.scrollTop, before);
  }
});
