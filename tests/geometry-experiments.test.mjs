import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  dotProjection, INITIAL_DOT_ANGLE, rotateDotVector, dotAngleForPoint, normalizeVector, normalizationState,
  transformPoint, matrixTransformState, unitCircleState,
  plotCoordinates, normalizationForPoint, matrixEntryForPoint, unitCircleAngleForPoint,
} from '../site/experiments/geometry-model.mjs';

const close = (actual, expected, tolerance = 1e-10) => {
  assert.ok(Number.isFinite(actual), `Non-finite value ${actual}`);
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
};
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const polygonSignedArea = points => points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + point[0] * next[1] - next[0] * point[1];
}, 0) / 2;

test('visible input arrows expose a keyboard-focusable target along the shaft and tip', async () => {
  const compiled = await build({
    entryPoints: [new URL('../site/experiments/geometry.jsx', import.meta.url).pathname],
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), loaded, loaded.exports);
  for (const name of ['DotProjection', 'Normalization', 'UnitCircle']) {
    const html = renderToStaticMarkup(React.createElement(loaded.exports[name]));
    assert.match(html, /class="experiment-handle" role="button" tabindex="0"/, `${name}: keyboard input`);
    assert.match(html, /class="experiment-handle__shaft"/, `${name}: the visible shaft accepts dragging`);
  }
});

test('the initial dot-product scene faithfully represents [1, 2] · [3, 4] = 11', () => {
  const initial = rotateDotVector(INITIAL_DOT_ANGLE);
  close(initial.b[0], 3);
  close(initial.b[1], 4);
  close(initial.dot, 11);
  close(initial.projection[0], 2.2);
  close(initial.projection[1], 4.4);
});

test('projection reconstructs the input and its residual is orthogonal to the axis', () => {
  for (let angle = -180; angle <= 180; angle += 5) {
    const state = rotateDotVector(angle);
    close(Math.hypot(...state.b), 5);
    close(dot(state.a, state.residual), 0);
    state.b.forEach((value, index) => close(state.projection[index] + state.residual[index], value));
    close(state.dot, state.axisLength * state.signedLength);
    close(state.dot, state.axisLength * state.inputLength * Math.cos(angle * Math.PI / 180));
  }
});

test('dragged directions round-trip through the fixed-radius vector without changing its length', () => {
  close(dotAngleForPoint([3, 4]), INITIAL_DOT_ANGLE);
  close(dotAngleForPoint([1, 2]), 0);
  close(Math.abs(dotAngleForPoint([-1, -2])), 180);
  assert.equal(dotAngleForPoint([0, 0]), null, 'the origin cannot invent a direction');
  for (let angle = -179; angle <= 179; angle += 7) {
    const initial = rotateDotVector(angle);
    for (const scale of [0.01, 1, 100]) {
      const recovered = dotAngleForPoint(initial.b.map(value => value * scale));
      close(recovered, angle);
      const state = rotateDotVector(recovered);
      close(Math.hypot(...state.b), 5);
      close(state.dot, initial.dot);
    }
  }
  assert.throws(() => dotAngleForPoint([Infinity, 0]), RangeError);
});

test('projection handles zero input, orthogonality, and opposite signs explicitly', () => {
  const empty = dotProjection([1, 2], [0, 0]);
  close(empty.dot, 0);
  assert.equal(empty.cosine, null);
  assert.deepEqual(empty.projection, [0, 0]);
  close(rotateDotVector(90).dot, 0);
  assert.ok(rotateDotVector(0).dot > 0);
  assert.ok(rotateDotVector(180).dot < 0);
  assert.throws(() => dotProjection([0, 0], [1, 2]), RangeError);
  assert.throws(() => dotProjection([1, 2], [1, 2, 3]), RangeError);
});

test('normalization divides all coordinates by length and preserves direction at every scale', () => {
  const initial = normalizationState(1);
  close(initial.length, 5);
  assert.deepEqual(initial.unit, [0, 0.8, -0.6]);
  for (const scale of [0.2, 0.3, 0.8, 1, 1.25, 2]) {
    const state = normalizationState(scale);
    close(state.length, 5 * scale);
    close(Math.hypot(...state.unit), 1);
    state.input.forEach((value, index) => close(state.unit[index] * state.length, value));
    initial.unit.forEach((value, index) => close(state.unit[index], value));
    // The displayed two-dimensional plane preserves the full 3D vector's length.
    close(Math.hypot(...state.input.slice(1)), state.length);
  }
  assert.throws(() => normalizeVector([0, 0, 0]), RangeError);
});

test('SVG-local drag coordinates map into each scene and preserve its constraints', () => {
  assert.deepEqual(plotCoordinates({ x: 234, y: 68 }, [180, 140], 18), [3, 4]);
  close(dotAngleForPoint(plotCoordinates({ x: 234, y: 68 }, [180, 140], 18)), INITIAL_DOT_ANGLE);

  for (const direction of [[4, -3], [-4, 3], [-4, -3], [0, 5], [5, 0]]) {
    const local = { x: 180 + direction[0] * 11, y: 132 - direction[1] * 11 };
    const selected = normalizationForPoint(plotCoordinates(local, [180, 132], 11));
    const state = normalizationState(selected.scale, selected.direction);
    close(state.length, 5);
    close(Math.hypot(...state.unit), 1);
    assert.equal(state.input[0], 0);
    direction.forEach((coordinate, index) => close(state.input[index + 1], coordinate));
    const scaled = normalizationState(2, selected.direction);
    scaled.unit.forEach((coordinate, index) => close(coordinate, state.unit[index]));
  }
  for (const [point, expectedScale] of [[[100, -100], 2], [[-0.001, 0], 0.2]]) {
    const selected = normalizationForPoint(point);
    assert.equal(selected.scale, expectedScale);
    close(normalizationState(selected.scale, selected.direction).length, expectedScale * 5);
  }
  assert.equal(normalizationForPoint([0, 0]), null, 'dragging through zero never invents a unit direction');
  assert.throws(() => normalizationState(1, [0, 0]), RangeError);
  assert.deepEqual(normalizationState(1).input, [0, 4, -3], 'reset restores the authored vector');

  for (const x of [-100, -2, 0, 1, 6, 8, 100]) {
    const entry = matrixEntryForPoint(plotCoordinates({ x: 86 + x * 26, y: 20 }, [86, 220], 26));
    const state = matrixTransformState(entry);
    assert.equal(entry, Math.max(-2, Math.min(8, x)));
    assert.deepEqual(state.firstBasis, [2, 1]);
    assert.deepEqual(state.secondBasis, [entry, 3], 'vertical movement cannot change fixed matrix entries');
  }

  for (const [point, angle] of [[[270, 132], 0], [[180, 42], 90], [[90, 132], 180], [[180, 222], 270]]) {
    const recovered = unitCircleAngleForPoint(plotCoordinates({ x: point[0], y: point[1] }, [180, 132], 90));
    close(recovered, angle);
    close(Math.hypot(unitCircleState(recovered).x, unitCircleState(recovered).y), 1);
  }
  assert.equal(unitCircleAngleForPoint([0, 0]), null);
  assert.throws(() => normalizationForPoint([NaN, 1]), RangeError);
  assert.throws(() => matrixEntryForPoint([Infinity, 1]), RangeError);
  assert.throws(() => unitCircleAngleForPoint([1, Infinity]), RangeError);
  assert.throws(() => plotCoordinates({ x: NaN, y: 1 }, [0, 0], 1), RangeError);
  assert.throws(() => plotCoordinates({ x: 1, y: 1 }, [0, 0], 0), RangeError);
});

test('arrow shaft dragging removes screen scaling, keeps its grab offset, and releases pointer capture', async () => {
  const compiled = await build({
    entryPoints: [new URL('../site/experiments/scene-ui.jsx', import.meta.url).pathname],
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  });
  const loaded = { exports: {} };
  const require = createRequire(import.meta.url);
  new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(
    name => name === 'react' ? { ...React, useRef: value => ({ current: value }) } : require(name), loaded, loaded.exports);
  const moves = [];
  const nudges = [];
  const handle = loaded.exports.SvgHandle({ from: [0, 0], x: 80, y: 40, label: 'Input vector',
    onMove: point => moves.push(point), onNudge: (...delta) => nudges.push(delta) });
  const captures = new Set();
  const svg = {
    getScreenCTM: () => ({ inverse: () => ({ a: 0.5, d: 0.5, e: -50, f: -25 }) }),
    createSVGPoint: () => ({ x: 0, y: 0, matrixTransform(matrix) {
      return { x: this.x * matrix.a + matrix.e, y: this.y * matrix.d + matrix.f };
    } }),
  };
  let focusCalls = 0;
  const target = {
    ownerSVGElement: svg, focus() { focusCalls++; },
    setPointerCapture: id => captures.add(id), hasPointerCapture: id => captures.has(id),
    releasePointerCapture: id => captures.delete(id),
  };
  const event = (x, y, extra = {}) => ({ currentTarget: target, pointerId: 7, isPrimary: true, button: 0,
    clientX: x, clientY: y, preventDefault() { this.prevented = true; }, ...extra });
  handle.props.onPointerDown(event(180, 90, { isPrimary: false }));
  assert.equal(captures.size, 0);
  handle.props.onPointerDown(event(180, 90, { button: 2 }));
  assert.equal(captures.size, 0);
  handle.props.onPointerDown(event(180, 90));
  assert.equal(focusCalls, 1);
  assert.ok(captures.has(7));
  assert.deepEqual(moves.at(-1), { x: 80, y: 40 }, 'grabbing the shaft does not shrink the vector');
  handle.props.onPointerMove(event(200, 110));
  assert.deepEqual(moves.at(-1), { x: 90, y: 50 }, '20 screen pixels are 10 SVG units');
  handle.props.onPointerMove(event(220, 130, { pointerId: 8 }));
  assert.equal(moves.length, 2, 'a second pointer cannot take over');
  handle.props.onPointerCancel(event(200, 110));
  assert.equal(captures.size, 0);
  handle.props.onPointerMove(event(220, 130));
  assert.equal(moves.length, 2, 'cancelled dragging is finished');
  handle.props.onPointerDown(event(180, 90));
  handle.props.onPointerUp(event(180, 90));
  assert.equal(captures.size, 0);
  handle.props.onPointerDown(event(180, 90));
  handle.props.onLostPointerCapture();
  handle.props.onPointerMove(event(220, 130));
  assert.equal(moves.length, 4, 'lost capture ends dragging');
  const key = event(0, 0, { key: 'ArrowUp' });
  handle.props.onKeyDown(key);
  assert.equal(key.prevented, true);
  assert.deepEqual(nudges, [[0, -1]]);
});

test('matrix columns are transformed basis vectors and the far corner is their sum', () => {
  assert.deepEqual(transformPoint([[2, 1], [1, 3]], [1, 0]), [2, 1]);
  for (const upperRight of [-2, 0, 1, 5.9, 6, 6.1, 8]) {
    const state = matrixTransformState(upperRight);
    assert.deepEqual(state.transformed[0], [0, 0]);
    assert.deepEqual(state.transformed[1], state.firstBasis);
    assert.deepEqual(state.transformed[3], state.secondBasis);
    state.transformed[2].forEach((value, index) => close(value, state.firstBasis[index] + state.secondBasis[index]));
    close(polygonSignedArea(state.square), 1);
    close(polygonSignedArea(state.transformed), state.determinant);
    close(Math.abs(polygonSignedArea(state.transformed)), state.area);
  }
});

test('determinant controls collapse, area scaling, and orientation reversal', () => {
  const initial = matrixTransformState(1);
  close(initial.determinant, 5);
  assert.equal(initial.orientation, 'preserved');
  const collapsed = matrixTransformState(6);
  close(collapsed.area, 0);
  assert.equal(collapsed.orientation, 'collapsed');
  close(dot(collapsed.firstBasis, [-collapsed.secondBasis[1], collapsed.secondBasis[0]]), 0);
  assert.equal(matrixTransformState(8).orientation, 'reversed');
  close(matrixTransformState(8).determinant, -2);
});

test('unit-circle coordinates obey quadrant signs, the radius identity, and degree/radian conversion', () => {
  for (let angle = 0; angle <= 360; angle++) {
    const state = unitCircleState(angle);
    close(state.radians, angle * Math.PI / 180);
    close(state.xSquared + state.ySquared, 1);
    close(Math.hypot(state.x, state.y), 1);
  }
  close(unitCircleState(45).x, Math.SQRT1_2);
  close(unitCircleState(45).y, Math.SQRT1_2);
  close(unitCircleState(90).x, 0);
  close(unitCircleState(90).y, 1);
  assert.ok(unitCircleState(225).x < 0 && unitCircleState(225).y < 0);
  close(unitCircleState(0).x, unitCircleState(360).x);
  close(unitCircleState(0).y, unitCircleState(360).y);
});

test('scene models reject unbounded or nonfinite inputs before calculation', () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.throws(() => rotateDotVector(value), RangeError);
    assert.throws(() => normalizationState(value), RangeError);
    assert.throws(() => matrixTransformState(value), RangeError);
    assert.throws(() => unitCircleState(value), RangeError);
  }
  for (const value of [-181, 181]) assert.throws(() => rotateDotVector(value), RangeError);
  for (const value of [0, 0.19, 2.01]) assert.throws(() => normalizationState(value), RangeError);
  for (const value of [-2.01, 8.01]) assert.throws(() => matrixTransformState(value), RangeError);
  for (const value of [-1, 361]) assert.throws(() => unitCircleState(value), RangeError);
  assert.throws(() => normalizeVector([1e7, 2]), RangeError);
  assert.throws(() => transformPoint([[1, 2]], [0, 1]), RangeError);
});
