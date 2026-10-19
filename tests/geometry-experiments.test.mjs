import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dotProjection, INITIAL_DOT_ANGLE, rotateDotVector, normalizeVector, normalizationState,
  transformPoint, matrixTransformState, unitCircleState,
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
