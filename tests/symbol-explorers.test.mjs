import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { register, render } from 'pele/core';
import xychart from 'pele/diagrams/xychart';
import katex from 'katex';
import {
  symbolExplorerIds, symbolExplorerDefinitions, symbolExplorerState,
  initialExplorerParameters, boundExplorerControl, explorerPlotSource,
} from '../site/symbol-explorer-model.mjs';

register(xychart);
const close = (a, b, tolerance = 1e-10) => assert.ok(Number.isFinite(a) && Math.abs(a - b) < tolerance, `${a} differs from ${b}`);
function runSource(state) {
  const logged = [];
  vm.runInNewContext(state.source, { console: { log: value => logged.push(String(value)) } }, { timeout: 100 });
  assert.deepEqual(logged, [state.output], `${state.id} code and displayed result disagree`);
}

test('each family is covered and all generated examples agree with the model at every control corner', () => {
  for (const id of ['dot-product', 'derivative', 'conditional-probability', 'bayes-theorem', 'ml-softmax', 'ml-relu', 'ml-learning-update']) assert.ok(symbolExplorerIds.includes(id));
  for (const id of symbolExplorerIds) {
    const { controls } = symbolExplorerDefinitions[id];
    const states = [initialExplorerParameters(id)];
    for (let bits = 0; bits < 2 ** controls.length; bits++) states.push(Object.fromEntries(controls.map((item, i) => [item.key, bits & (1 << i) ? item.max : item.min])));
    for (const params of states) {
      const state = symbolExplorerState(id, params);
      assert.ok(state.source.split('\n').length >= 5 && state.source.split('\n').length <= 12);
      assert.ok(state.formulaText.length > 5 && state.formulaTex.length > 5);
      assert.ok(!/\b(?:fetch|import|eval|setTimeout|setInterval)\b/.test(state.source));
      const values = Array.isArray(state.result) ? state.result : [state.result];
      assert.ok(values.every(value => value === null || Number.isFinite(value)), `${id} has a nonfinite result`);
      if (state.plot) {
        assert.ok(state.plot.values.every(value => Number.isFinite(value) && value >= state.plot.min && value <= state.plot.max));
        if (state.plot.reference) assert.ok(state.plot.reference.every(value => value >= state.plot.min && value <= state.plot.max));
      }
      runSource(state);
    }
  }
});

test('controls reject nonfinite/out-of-range input; pointer bounds snap to the keyboard step', () => {
  for (const id of symbolExplorerIds) for (const item of symbolExplorerDefinitions[id].controls) {
    for (const value of [NaN, Infinity, -Infinity, item.min - 1, item.max + 1, String(item.initial), null]) assert.throws(() => symbolExplorerState(id, { [item.key]: value }), RangeError);
    assert.equal(boundExplorerControl(id, item.key, item.min - 999), item.min);
    assert.equal(boundExplorerControl(id, item.key, item.max + 999), item.max);
    for (const fraction of [0, 0.127, 0.499, 0.753, 1]) {
      const snapped = boundExplorerControl(id, item.key, item.min + (item.max - item.min) * fraction);
      assert.ok(snapped >= item.min && snapped <= item.max);
      close((snapped - item.min) / item.step, Math.round((snapped - item.min) / item.step), 1e-6);
    }
  }
  assert.throws(() => symbolExplorerState('unknown'), RangeError);
  assert.throws(() => boundExplorerControl('derivative', 'x', NaN), RangeError);
  assert.throws(() => boundExplorerControl('derivative', 'missing', 1), RangeError);
});

test('dot products preserve signed component contributions, symmetry and zero-vector distinction', () => {
  for (const [a, b] of [[[1, 0], [0, 3]], [[1, 2], [-3, -4]], [[-4, 3], [2, -1]], [[0, 0], [1, 3]]]) {
    const state = symbolExplorerState('dot-product', { ax: a[0], ay: a[1], bx: b[0], by: b[1] });
    close(state.result, a[0] * b[0] + a[1] * b[1]);
    close(state.result, symbolExplorerState('dot-product', { ax: b[0], ay: b[1], bx: a[0], by: a[1] }).result);
    assert.deepEqual(state.vectors.map(vector => vector.values), [a, b]);
  }
  assert.match(symbolExplorerState('dot-product', { ax: 0, ay: 0 }).explanation, /angle requires both/);
  assert.match(symbolExplorerState('dot-product', { ax: 1, ay: 0, bx: 0, by: 1 }).explanation, /perpendicular/);
});

test('decimal component cancellation is perpendicular without erasing genuinely small signed dots', () => {
  for (const params of [
    { ax: 0.1, ay: 0.3, bx: 3, by: -1 },
    { ax: 0.3, ay: 0.1, bx: 1, by: -3 },
    { ax: -0.1, ay: -0.3, bx: 3, by: -1 },
  ]) {
    const state = symbolExplorerState('dot-product', params);
    assert.equal(state.result, 0);
    assert.equal(state.output, '0');
    assert.match(state.explanation, /perpendicular/);
    runSource(state);
  }
  for (const sign of [-1, 1]) {
    const state = symbolExplorerState('dot-product', { ax: sign * 1e-8, ay: 0, bx: 1e-8, by: 0 });
    assert.equal(Math.sign(state.result), sign, 'A small dot is not a cancellation error');
    assert.match(state.explanation, sign > 0 ? /positive/ : /negative/);
    const nearby = symbolExplorerState('dot-product', { ax: 0.1, ay: 0.3 + sign * 1e-7, bx: 3, by: -1 });
    assert.equal(Math.sign(nearby.result), -sign, 'A real difference beyond rounding error must retain its sign');
  }
});

test('scaling changes length by absolute scale and norms remain nonnegative in all quadrants', () => {
  for (const [x, y] of [[-2, -1], [-1, 2], [1, -2], [2, 1], [0, 0]]) for (const scale of [-2, -0.5, 0, 0.5, 2]) {
    const state = symbolExplorerState('vector-scaling', { x, y, scale });
    close(Math.hypot(...state.result), Math.abs(scale) * Math.hypot(x, y));
    const norm = symbolExplorerState('euclidean-norm', { x, y });
    close(norm.result ** 2, x * x + y * y);
    assert.ok(norm.result >= 0);
  }
});

test('the forward secant uses actual curve points and converges to the exact derivative', () => {
  for (const x of [-2, -1, 0, 1, 2]) {
    let lastError = Infinity;
    for (const h of [1, 0.5, 0.1, 0.01]) {
      const state = symbolExplorerState('derivative', { x, h });
      close(state.result, 2 * x);
      const secant = ((x + h) ** 2 - x ** 2) / h;
      close(secant, 2 * x + h);
      const error = Math.abs(secant - state.result);
      assert.ok(error < lastError); lastError = error;
      assert.ok(state.rows.some(([label, value]) => label === 'Forward secant slope' && Number(value) === Number((2 * x + h).toFixed(4))));
    }
  }
});

test('conditioning excludes outside outcomes, with an explicit undefined empty event', () => {
  for (const both of [0, 1, 20, 50]) for (const onlyB of [0, 1, 30, 50]) {
    const state = symbolExplorerState('conditional-probability', { both, onlyB });
    if (both + onlyB === 0) {
      assert.equal(state.result, null); assert.match(state.explanation, /undefined/);
    } else {
      close(state.result, both / (both + onlyB));
      assert.ok(state.result >= 0 && state.result <= 1);
    }
    assert.deepEqual(state.plot.values, [both, onlyB]);
  }
  close(symbolExplorerState('conditional-probability', { both: 20, onlyB: 30 }).result, 0.4);
});

test('Bayes uses total evidence and preserves zero and certain posteriors without division by zero', () => {
  close(symbolExplorerState('bayes-theorem').result, 0.15384615384615385);
  const common = symbolExplorerState('bayes-theorem', { prior: 0.5 });
  assert.ok(common.result > symbolExplorerState('bayes-theorem').result);
  close(symbolExplorerState('bayes-theorem', { prior: 0, falsePositive: 0.05 }).result, 0);
  close(symbolExplorerState('bayes-theorem', { prior: 1, sensitivity: 0.9 }).result, 1);
  for (const params of [{ prior: 0, falsePositive: 0 }, { prior: 1, sensitivity: 0 }, { sensitivity: 0, falsePositive: 0 }]) {
    const state = symbolExplorerState('bayes-theorem', params);
    assert.equal(state.result, null); assert.equal(state.output, 'undefined (P(B)=0)'); runSource(state);
  }
  const state = symbolExplorerState('bayes-theorem');
  close(state.result, state.plot.values[0] / state.plot.values.reduce((sum, count) => sum + count, 0));
});

test('stable softmax is finite, normalized and invariant to shared shifts beyond naive exp overflow', () => {
  for (const scores of [[0, 0, 0], [8, -8, 0], [-8, 8, 8], [2, 1, 0]]) {
    const base = symbolExplorerState('ml-softmax', { a: scores[0], b: scores[1], c: scores[2] });
    for (const offset of [-1000, 0, 1000]) {
      const state = symbolExplorerState('ml-softmax', { a: scores[0], b: scores[1], c: scores[2], offset });
      close(state.result.reduce((sum, value) => sum + value, 0), 1);
      state.result.forEach((value, i) => { assert.ok(value > 0 && value < 1); close(value, base.result[i]); });
      assert.deepEqual(state.plot.values, state.result); runSource(state);
    }
  }
  assert.equal(Math.exp(1000), Infinity, 'The shared offset should exercise the overflow case');
});

test('ReLU distinguishes its bend and gradient update exposes an overshooting step', () => {
  assert.equal(symbolExplorerState('ml-relu', { input: -4 }).result, 0);
  assert.equal(symbolExplorerState('ml-relu', { input: 4 }).result, 4);
  assert.match(symbolExplorerState('ml-relu', { input: 0 }).explanation, /ordinary derivative is undefined/);
  const paused = symbolExplorerState('ml-learning-update', { theta: -1, eta: 0 });
  assert.equal(paused.result, -1); close(paused.plot.values[0], paused.plot.values[1]);
  const minimum = symbolExplorerState('ml-learning-update', { theta: -1, eta: 1 });
  assert.equal(minimum.result, 1); assert.equal(minimum.plot.values[1], 0);
  const overshoot = symbolExplorerState('ml-learning-update', { theta: -1, eta: 3 });
  assert.ok(overshoot.plot.values[1] > overshoot.plot.values[0]); assert.match(overshoot.explanation, /increases loss/);
  for (const eta of [0, 0.5, 1, 2, 3]) {
    const state = symbolExplorerState('ml-learning-update', { theta: 1, eta });
    assert.equal(state.result, 1); assert.deepEqual(state.plot.values, [0, 0]);
  }
});

test('decimal gradient reflections at eta 2 preserve equal-loss classification and distinguish overshoots', () => {
  for (const theta of [0.1, -0.8, 0.3, 1.7]) {
    const reflected = symbolExplorerState('ml-learning-update', { theta, eta: 2 });
    close(reflected.plot.values[0], reflected.plot.values[1]);
    assert.match(reflected.explanation, /The loss is unchanged/);
    runSource(reflected);
    const smaller = symbolExplorerState('ml-learning-update', { theta, eta: 1.95 });
    assert.ok(smaller.plot.values[1] < smaller.plot.values[0]);
    assert.match(smaller.explanation, /decreases loss/);
    runSource(smaller);
    const overshoot = symbolExplorerState('ml-learning-update', { theta, eta: 2.05 });
    assert.ok(overshoot.plot.values[1] > overshoot.plot.values[0]);
    assert.match(overshoot.explanation, /increases loss/);
    runSource(overshoot);
  }
});

test('root and positive-base powers preserve their domains and inverse identities', () => {
  for (const input of [0, 0.1, 2, 4, 16]) {
    const state = symbolExplorerState('square-root', { input });
    assert.ok(state.result >= 0); close(state.result ** 2, input);
    assert.ok(state.plot.reference.every(value => value === state.result));
  }
  for (const base of [0.5, 1, 2, 3]) for (const exponent of [0, 0.5, 1, 3, 6]) {
    const state = symbolExplorerState('power', { base, exponent });
    close(state.result, Math.exp(exponent * Math.log(base)));
    assert.ok(state.result > 0); runSource(state);
  }
});

test('all Pele plot definitions render from bounded model values at defaults and extremes', () => {
  for (const id of symbolExplorerIds) {
    const controls = symbolExplorerDefinitions[id].controls;
    for (const params of [{}, Object.fromEntries(controls.map(item => [item.key, item.min])), Object.fromEntries(controls.map(item => [item.key, item.max]))]) {
      const { plot } = symbolExplorerState(id, params);
      if (!plot) continue;
      const { svg } = render(explorerPlotSource(plot), { maxWidth: 600, limit: 6000, outputLimit: 100000, links: false, images: false });
      assert.match(svg, /^<svg/);
      assert.ok(!/NaN|Infinity/.test(svg));
    }
  }
});

test('generated formulas render under strict untrusted KaTeX, including column-vector rows', () => {
  for (const id of symbolExplorerIds) {
    const controls = symbolExplorerDefinitions[id].controls;
    for (const params of [{}, Object.fromEntries(controls.map(item => [item.key, item.min])), Object.fromEntries(controls.map(item => [item.key, item.max]))]) {
      const state = symbolExplorerState(id, params);
      const html = katex.renderToString(state.formulaTex, { output: 'html', strict: 'error', trust: false, throwOnError: true });
      assert.match(html, /class="katex"/);
      if (id === 'vector-scaling' || id === 'ml-softmax') assert.match(state.formulaTex, /\\\\/, 'Column-vector entries need a TeX row separator');
    }
  }
});
