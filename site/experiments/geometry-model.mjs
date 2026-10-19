const MAX_COORDINATE = 1_000_000;

function finite(value, name, min = -MAX_COORDINATE, max = MAX_COORDINATE) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be finite and between ${min} and ${max}`);
  }
  return value;
}

function vector(value, name, dimensions) {
  if (!Array.isArray(value) || value.length < 2 || value.length > 8 || (dimensions && value.length !== dimensions)) {
    throw new RangeError(`${name} has an unsupported number of coordinates`);
  }
  return value.map((coordinate, index) => finite(coordinate, `${name}[${index}]`));
}

export function dotProjection(axis, input) {
  const a = vector(axis, 'axis');
  const b = vector(input, 'input', a.length);
  const axisLength = Math.hypot(...a);
  if (axisLength === 0) throw new RangeError('The projection axis must be nonzero');
  const dot = a.reduce((sum, coordinate, index) => sum + coordinate * b[index], 0);
  const coefficient = dot / (axisLength * axisLength);
  const projection = a.map(coordinate => coefficient * coordinate);
  const residual = b.map((coordinate, index) => coordinate - projection[index]);
  const inputLength = Math.hypot(...b);
  return {
    dot,
    coefficient,
    projection,
    residual,
    axisLength,
    inputLength,
    signedLength: dot / axisLength,
    cosine: inputLength === 0 ? null : Math.max(-1, Math.min(1, dot / (axisLength * inputLength))),
  };
}

// The initial angle reproduces a = [1, 2], b = [3, 4], rather than rounding it.
export const INITIAL_DOT_ANGLE = (Math.atan2(4, 3) - Math.atan2(2, 1)) * 180 / Math.PI;

export function rotateDotVector(degrees) {
  finite(degrees, 'angle', -180, 180);
  const radians = Math.atan2(2, 1) + degrees * Math.PI / 180;
  const b = [5 * Math.cos(radians), 5 * Math.sin(radians)];
  return { a: [1, 2], b, degrees, ...dotProjection([1, 2], b) };
}

export function normalizeVector(input) {
  const coordinates = vector(input, 'vector');
  const length = Math.hypot(...coordinates);
  if (length === 0) throw new RangeError('A zero vector has no unit direction');
  return { length, unit: coordinates.map(coordinate => coordinate / length) };
}

export function normalizationState(scale) {
  finite(scale, 'scale', 0.2, 2);
  const input = [0, 4 * scale, -3 * scale];
  return { scale, input, ...normalizeVector(input) };
}

function matrix2(matrix) {
  if (!Array.isArray(matrix) || matrix.length !== 2) throw new RangeError('A 2 by 2 matrix is required');
  return matrix.map((row, index) => vector(row, `row ${index}`, 2));
}

export function transformPoint(matrix, point) {
  const rows = matrix2(matrix);
  const coordinates = vector(point, 'point', 2);
  return rows.map(row => row[0] * coordinates[0] + row[1] * coordinates[1]);
}

export function matrixTransformState(upperRight) {
  finite(upperRight, 'm12', -2, 8);
  const matrix = [[2, upperRight], [1, 3]];
  const square = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const transformed = square.map(point => transformPoint(matrix, point));
  const determinant = 6 - upperRight;
  return {
    matrix,
    square,
    transformed,
    firstBasis: transformPoint(matrix, [1, 0]),
    secondBasis: transformPoint(matrix, [0, 1]),
    determinant,
    area: Math.abs(determinant),
    orientation: determinant === 0 ? 'collapsed' : determinant > 0 ? 'preserved' : 'reversed',
  };
}

export function unitCircleState(degrees) {
  finite(degrees, 'angle', 0, 360);
  const radians = degrees * Math.PI / 180;
  const x = Math.cos(radians);
  const y = Math.sin(radians);
  return { degrees, radians, x, y, xSquared: x * x, ySquared: y * y };
}
