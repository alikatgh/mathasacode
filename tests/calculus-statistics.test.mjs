import test from 'node:test';
import assert from 'node:assert/strict';
import { derivativeState, integralState, correlationState, CORRELATION_PRESETS, MAX_RECTANGLES, MIN_GAP } from '../site/experiments/calculus-statistics-model.mjs';

const close = (actual, expected, tolerance = 1e-10) => {
  assert.ok(Number.isFinite(actual), `Expected a finite value, received ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
};

test('the secant triangle on x² uses the actual two curve points and signed changes', () => {
  for (const x of [-1.5, -1, 0, 0.6, 1, 1.5]) {
    for (const h of [-1, -0.3, -MIN_GAP, MIN_GAP, 0.3, 1]) {
      const state = derivativeState(x, h);
      close(state.base[1], state.base[0] ** 2);
      close(state.nearby[1], state.nearby[0] ** 2);
      close(state.nearby[0] - state.base[0], h);
      close(state.nearby[1] - state.base[1], state.rise);
      close(state.secant * h, state.rise);
      close(state.secant, 2 * x + h);
      close(state.derivative, 2 * x);
      close(state.error, h);
      assert.notEqual(state.secant, state.derivative, 'A finite secant is not the exact derivative of x²');
    }
  }
});

test('secants converge to the same tangent from both sides; halving h halves the error', () => {
  for (const sign of [-1, 1]) {
    let previous = derivativeState(1, sign * 0.8);
    for (const magnitude of [0.4, 0.2, 0.1, 0.05, 0.025, 0.0125]) {
      const next = derivativeState(1, sign * magnitude);
      assert.ok(Math.abs(next.error) < Math.abs(previous.error));
      close(next.error, previous.error / 2);
      previous = next;
    }
    close(derivativeState(1, sign * MIN_GAP).secant, 2 + sign * MIN_GAP);
  }
});

test('signed rectangles retain each sample, signed width, contribution, and running sum', () => {
  const state = integralState(-1, 2, 4);
  close(state.width, 0.75);
  assert.equal(state.exact, 0, 'Equal positive and negative regions should preserve the exact cancellation');
  close(state.sum, -0.140625);
  assert.ok(state.negative < 0);
  assert.ok(state.positive > 0);
  close(state.negative + state.positive, state.sum);
  let cumulative = 0;
  state.rectangles.forEach((rectangle, index) => {
    close(rectangle.from, -1 + index * 0.75);
    close(rectangle.to - rectangle.from, state.width);
    close(rectangle.sample, (rectangle.from + rectangle.to) / 2);
    close(rectangle.height, rectangle.sample ** 2 - 1);
    close(rectangle.contribution, rectangle.height * state.width);
    cumulative += rectangle.contribution;
    close(rectangle.cumulative, cumulative);
  });
  close(cumulative, state.sum);
  close(integralState(-1, 0, 4).exact, -2 / 3);
  close(integralState(1, 2, 4).exact, 4 / 3);
});

test('reversing the bounds reverses exact integrals and midpoint contributions', () => {
  for (const [a, b] of [[-2, 2], [-1, 2], [-1.7, 0.6], [0, 1], [0.5, 0.5]]) {
    for (const n of [1, 4, 13, MAX_RECTANGLES]) {
      const forward = integralState(a, b, n);
      const backward = integralState(b, a, n);
      close(backward.exact, -forward.exact);
      close(backward.sum, -forward.sum);
      close(backward.width, -forward.width);
      forward.rectangles.forEach((rectangle, index) => {
        const reversed = backward.rectangles[n - 1 - index];
        close(rectangle.sample, reversed.sample);
        close(rectangle.contribution, -reversed.contribution);
      });
    }
  }
  const empty = integralState(0.75, 0.75, MAX_RECTANGLES);
  close(empty.sum, 0);
  close(empty.exact, 0);
  assert.ok(empty.rectangles.every(rectangle => rectangle.width === 0 && rectangle.contribution === 0));
});

test('refinement converges with the actual midpoint error and bounded rectangle count', () => {
  for (const [a, b] of [[-1, 2], [2, -1], [-2, 0.25]]) {
    for (const n of [1, 2, 4, 8, 16, 32]) {
      const coarse = integralState(a, b, n);
      const fine = integralState(a, b, n * 2);
      close(coarse.error, -((b - a) ** 3) / (12 * n * n));
      close(fine.error, coarse.error / 4);
      assert.ok(Math.abs(fine.error) < Math.abs(coarse.error));
    }
  }
  const left = integralState(0, 1, 4, 'left');
  close(left.rectangles[0].sample, 0);
  close(left.rectangles[3].sample, 0.75);
  assert.ok(Math.abs(integralState(0, 1, 64, 'left').error) < Math.abs(left.error));
  assert.equal(integralState(-2, 2, MAX_RECTANGLES).rectangles.length, MAX_RECTANGLES);
});

test('population covariance reconstructs every signed rectangle and known lesson values', () => {
  const state = correlationState([[1, 2], [2, 4], [3, 5]]);
  close(state.meanX, 2);
  close(state.meanY, 11 / 3);
  close(state.sumProducts, 3);
  close(state.covariance, 1);
  close(state.correlation, 0.9819805060619656);
  close(state.correlation, state.covariance / (state.sigmaX * state.sigmaY));
  close(state.deviations.reduce((sum, item) => sum + item.dx, 0), 0);
  close(state.deviations.reduce((sum, item) => sum + item.dy, 0), 0);
  state.deviations.forEach(item => close(item.product, item.dx * item.dy));
  close(state.intercept + state.slope * state.meanX, state.meanY);
});

test('semantic presets show positive, negative, nonlinear, outlier and undefined cases', () => {
  close(correlationState(CORRELATION_PRESETS.positive).correlation, 1);
  close(correlationState(CORRELATION_PRESETS.negative).correlation, -1);
  close(correlationState(CORRELATION_PRESETS.curved).correlation, 0);
  assert.ok(correlationState(CORRELATION_PRESETS.curved).sigmaY > 0, 'Zero correlation does not mean constant y');
  const outlier = correlationState(CORRELATION_PRESETS.outlier);
  assert.ok(outlier.correlation < 0.5);
  const restored = CORRELATION_PRESETS.outlier.map(point => [...point]);
  restored[5][1] = 6;
  close(correlationState(restored).correlation, 1);
  const constantX = correlationState(CORRELATION_PRESETS.constant);
  assert.equal(constantX.correlation, null);
  assert.equal(constantX.undefinedAxis, 'x');
  assert.equal(constantX.slope, null);
  assert.equal(correlationState([[1, 2], [2, 2], [3, 2]]).undefinedAxis, 'y');
  assert.equal(correlationState([[2, 2], [2, 2]]).undefinedAxis, 'both');
  assert.equal(correlationState([[0.1, 1], [0.1, 2], [0.1, 3]]).undefinedAxis, 'x');
  assert.equal(correlationState([[1, 3.7], [2, 3.7], [3, 3.7]]).undefinedAxis, 'y');
});

test('correlation stays bounded and is invariant under translation and positive scaling', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const points = Array.from({ length: 6 }, (_, i) => [i + 1, ((seed * (i + 3) * 17) % 37) / 6]);
    const original = correlationState(points);
    const shifted = correlationState(points.map(([x, y]) => [3 * x + 12, 7 * y - 18]));
    const reversed = correlationState(points.map(([x, y]) => [x, -y]));
    assert.ok(original.correlation >= -1 && original.correlation <= 1);
    close(shifted.correlation, original.correlation);
    close(reversed.correlation, -original.correlation);
    close(shifted.covariance, original.covariance * 21);
  }
});

test('all models reject nonfinite, malformed and unbounded input before allocating work', () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.throws(() => derivativeState(value, 0.1), RangeError);
    assert.throws(() => derivativeState(1, value), RangeError);
    assert.throws(() => integralState(value, 1, 4), RangeError);
    assert.throws(() => integralState(0, value, 4), RangeError);
    assert.throws(() => integralState(0, 1, value), RangeError);
    assert.throws(() => correlationState([[1, 2], [3, value]]), RangeError);
  }
  for (const h of [0, -0.0099, 0.0099, -1.01, 1.01]) assert.throws(() => derivativeState(1, h), RangeError);
  for (const x of [-1.51, 1.51]) assert.throws(() => derivativeState(x, 0.1), RangeError);
  for (const n of [0, -1, 1.5, MAX_RECTANGLES + 1, 1e9]) assert.throws(() => integralState(0, 1, n), RangeError);
  assert.throws(() => integralState(-2.01, 1, 4), RangeError);
  assert.throws(() => integralState(0, 2.01, 4), RangeError);
  assert.throws(() => integralState(0, 1, 4, 'unknown'), RangeError);
  for (const points of [[], [[1, 2]], [[1, 2, 3], [2, 3]], [[1, 2], [10_001, 3]], Array.from({ length: 33 }, () => [1, 2])]) {
    assert.throws(() => correlationState(points), RangeError);
  }
});
