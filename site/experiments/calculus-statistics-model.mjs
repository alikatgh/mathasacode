const MAX_POINTS = 32;
export const MAX_RECTANGLES = 64;
export const MIN_GAP = 0.01;

function finite(value, name, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be finite and between ${min} and ${max}`);
  }
  return value;
}

// This scene uses the lesson's f(x) = x². The secant remains a finite
// difference, even when the two lines look indistinguishable on the screen.
export function derivativeState(x, h) {
  finite(x, 'x', -1.5, 1.5);
  finite(h, 'h', -1, 1);
  if (Math.abs(h) < MIN_GAP) throw new RangeError(`The nonzero gap must have magnitude at least ${MIN_GAP}`);
  const base = [x, x * x];
  const nearby = [x + h, (x + h) ** 2];
  const rise = nearby[1] - base[1];
  const secant = rise / h;
  const derivative = 2 * x;
  return { x, h, base, nearby, rise, secant, derivative, error: secant - derivative };
}

// A new signed-area example: f(x) = x² − 1 and F(x) = x³/3 − x.
// Bounds retain their order: a negative width reverses every contribution.
export function integralState(a, b, count, method = 'midpoint') {
  finite(a, 'a', -2, 2);
  finite(b, 'b', -2, 2);
  if (!Number.isInteger(count) || count < 1 || count > MAX_RECTANGLES) {
    throw new RangeError(`Use 1 through ${MAX_RECTANGLES} rectangles`);
  }
  if (method !== 'midpoint' && method !== 'left') throw new RangeError('Unknown rectangle rule');
  const width = (b - a) / count;
  let sum = 0;
  let positive = 0;
  let negative = 0;
  const rectangles = Array.from({ length: count }, (_, index) => {
    const from = a + index * width;
    const to = a + (index + 1) * width;
    const sample = method === 'midpoint' ? (from + to) / 2 : from;
    const height = sample * sample - 1;
    const contribution = height * width;
    sum += contribution;
    positive += Math.max(0, contribution);
    negative += Math.min(0, contribution);
    return { from, to, sample, height, width, contribution, cumulative: sum };
  });
  // Factoring F(b) − F(a) avoids cancellation for a ≈ b and preserves the
  // exact zero when the positive and negative regions cancel at [−1, 2].
  const exact = (b - a) * (b * b + a * b + a * a - 3) / 3;
  return { a, b, count, method, width, direction: Math.sign(b - a), rectangles, sum, positive, negative, exact, error: sum - exact };
}

export const CORRELATION_PRESETS = {
  positive: [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6]],
  negative: [[1, 6], [2, 5], [3, 4], [4, 3], [5, 2], [6, 1]],
  curved: [[1, 6], [2, 3], [3, 1], [4, 1], [5, 3], [6, 6]],
  outlier: [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 0.5]],
  constant: [[3.5, 1], [3.5, 2], [3.5, 3], [3.5, 4], [3.5, 5], [3.5, 6]],
};

export function correlationState(points) {
  if (!Array.isArray(points) || points.length < 2 || points.length > MAX_POINTS) {
    throw new RangeError(`Use 2 through ${MAX_POINTS} paired points`);
  }
  const data = points.map((point, index) => {
    if (!Array.isArray(point) || point.length !== 2) throw new RangeError('Each point must have two coordinates');
    return point.map((value, axis) => finite(value, `Point ${index}, axis ${axis}`, -10_000, 10_000));
  });
  const count = data.length;
  // Center the mean calculation on one observed value. Repeated decimal
  // coordinates must stay exactly constant, rather than acquiring variance
  // from summing the same inexact binary fraction several times.
  const meanX = data[0][0] + data.reduce((sum, point) => sum + (point[0] - data[0][0]), 0) / count;
  const meanY = data[0][1] + data.reduce((sum, point) => sum + (point[1] - data[0][1]), 0) / count;
  const deviations = data.map(([x, y]) => {
    const dx = x - meanX;
    const dy = y - meanY;
    return { dx, dy, product: dx * dy };
  });
  const sumProducts = deviations.reduce((sum, point) => sum + point.product, 0);
  const covariance = sumProducts / count;
  const varianceX = deviations.reduce((sum, point) => sum + point.dx * point.dx, 0) / count;
  const varianceY = deviations.reduce((sum, point) => sum + point.dy * point.dy, 0) / count;
  const sigmaX = Math.sqrt(varianceX);
  const sigmaY = Math.sqrt(varianceY);
  const correlation = sigmaX === 0 || sigmaY === 0 ? null : Math.max(-1, Math.min(1, covariance / sigmaX / sigmaY));
  const slope = varianceX === 0 ? null : covariance / varianceX;
  return {
    points: data, count, meanX, meanY, deviations, sumProducts, covariance, varianceX, varianceY, sigmaX, sigmaY,
    correlation, slope, intercept: slope === null ? null : meanY - slope * meanX,
    undefinedAxis: sigmaX === 0 && sigmaY === 0 ? 'both' : sigmaX === 0 ? 'x' : sigmaY === 0 ? 'y' : null,
  };
}
