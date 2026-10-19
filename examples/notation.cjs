'use strict'

// Small, finite numerical examples for the reference guide; no symbolic algebra.
var MAX_MATRIX_CELLS = 1000000
var MAX_MATRIX_OPERATIONS = 10000000
var MAX_SUBDIVISIONS = 1000000

function finite (value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(name + ' must be a finite number')
  }
  return value
}

function finiteResult (value) {
  if (!Number.isFinite(value)) {
    throw new RangeError('calculation exceeded finite-number arithmetic')
  }
  return value
}

// Scale before summing so a finite mean need not overflow with a large sum.
function mean (values) {
  if (!Array.isArray(values) || values.length < 1 || values.length > 10000) {
    throw new RangeError('values must be an array of 1 to 10000 finite numbers')
  }
  var scale = 0
  for (var i = 0; i < values.length; i++) {
    scale = Math.max(scale, Math.abs(finite(values[i], 'value')))
  }
  if (scale === 0) return 0
  var sum = 0
  var correction = 0
  for (var j = 0; j < values.length; j++) {
    var term = values[j] / scale
    var next = sum + term
    // Neumaier compensation also retains a small term between opposite large terms.
    correction += Math.abs(sum) >= Math.abs(term)
      ? (sum - next) + term
      : (term - next) + sum
    sum = next
  }
  var total = sum + correction
  // Restore a small cancelled total before dividing, avoiding subnormal loss.
  return finiteResult(Math.abs(total) <= 1
    ? (total * scale) / values.length
    : (total / values.length) * scale)
}

// One full-batch step for Qi(w) = 0.5 * (dot(w, xi) - yi)^2.
// All gradients use the same old weights; no input array/object is modified.
function gradientDescentStep (weights, samples, learningRate) {
  if (!Array.isArray(weights) || weights.length < 1 || weights.length > 20) {
    throw new RangeError('weights must be an array of 1 to 20 finite numbers')
  }
  if (!Array.isArray(samples) || samples.length < 1 || samples.length > 10000 ||
      samples.length * weights.length > 100000) {
    throw new RangeError('samples must contain 1 to 10000 items and at most 100000 feature components')
  }
  finite(learningRate, 'learningRate')
  if (learningRate <= 0) throw new RangeError('learningRate must be positive')
  var oldWeights = []
  for (var j = 0; j < weights.length; j++) oldWeights.push(finite(weights[j], 'weight'))
  for (var i = 0; i < samples.length; i++) {
    var sample = samples[i]
    if (!sample || typeof sample !== 'object' || Array.isArray(sample) ||
        !Array.isArray(sample.x) || sample.x.length !== weights.length) {
      throw new TypeError('each sample must have an x vector matching the weights and a finite y')
    }
    finite(sample.y, 'sample.y')
    for (var k = 0; k < sample.x.length; k++) finite(sample.x[k], 'sample.x entry')
  }
  function residualAt (current, sample) {
    var prediction = 0
    for (var j = 0; j < current.length; j++) {
      prediction = finiteResult(prediction + finiteResult(current[j] * sample.x[j]))
    }
    return finiteResult(prediction - sample.y)
  }
  var contributions = Array.from({ length: weights.length }, function () { return [] })
  var lossesBefore = []
  for (var index = 0; index < samples.length; index++) {
    var residual = residualAt(oldWeights, samples[index])
    lossesBefore.push(finiteResult(0.5 * residual * residual))
    for (var coordinate = 0; coordinate < weights.length; coordinate++) {
      contributions[coordinate].push(finiteResult(residual * samples[index].x[coordinate]))
    }
  }
  var gradient = contributions.map(mean)
  var nextWeights = oldWeights.map(function (weight, index) {
    return finiteResult(weight - finiteResult(learningRate * gradient[index]))
  })
  var lossesAfter = samples.map(function (sample) {
    var residual = residualAt(nextWeights, sample)
    return finiteResult(0.5 * residual * residual)
  })
  return {
    weights: nextWeights,
    gradient: gradient,
    lossBefore: mean(lossesBefore),
    lossAfter: mean(lossesAfter)
  }
}

function matrixShape (matrix, name) {
  if (!Array.isArray(matrix) || matrix.length === 0 ||
      !Array.isArray(matrix[0]) || matrix[0].length === 0) {
    throw new TypeError(name + ' must be a nonempty array of nonempty rows')
  }
  var rows = matrix.length
  var columns = matrix[0].length
  if (rows * columns > MAX_MATRIX_CELLS) {
    throw new RangeError(name + ' exceeds the example matrix size limit')
  }
  for (var i = 0; i < rows; i++) {
    if (!Array.isArray(matrix[i]) || matrix[i].length !== columns) {
      throw new TypeError(name + ' must have equally sized rows')
    }
    for (var j = 0; j < columns; j++) finite(matrix[i][j], name + ' entry')
  }
  return [rows, columns]
}

// Rows are nested arrays. A(m x n) times B(n x p) produces C(m x p).
function multiplyMatrices (a, b) {
  var aShape = matrixShape(a, 'a')
  var bShape = matrixShape(b, 'b')
  if (aShape[1] !== bShape[0]) {
    throw new RangeError('a columns must equal b rows')
  }
  var cells = aShape[0] * bShape[1]
  if (cells > MAX_MATRIX_CELLS || cells * aShape[1] > MAX_MATRIX_OPERATIONS) {
    throw new RangeError('matrix multiplication exceeds the example work limit')
  }
  return Array.from({ length: aShape[0] }, function (_, i) {
    return Array.from({ length: bShape[1] }, function (_, j) {
      var sum = 0
      for (var k = 0; k < aShape[1]; k++) {
        sum = finiteResult(sum + finiteResult(a[i][k] * b[k][j]))
      }
      return sum
    })
  })
}

// A(m x n) tensor B(p x q), represented as an (mp x nq) block matrix.
function kroneckerProduct (a, b) {
  var aShape = matrixShape(a, 'a')
  var bShape = matrixShape(b, 'b')
  var rows = aShape[0] * bShape[0]
  var columns = aShape[1] * bShape[1]
  if (rows * columns > MAX_MATRIX_CELLS) {
    throw new RangeError('Kronecker product exceeds the example matrix size limit')
  }
  return Array.from({ length: rows }, function (_, i) {
    return Array.from({ length: columns }, function (_, j) {
      return finiteResult(a[Math.floor(i / bShape[0])][Math.floor(j / bShape[1])] *
        b[i % bShape[0]][j % bShape[1]])
    })
  })
}

function kroneckerDelta (i, j) {
  if (!Number.isSafeInteger(i) || !Number.isSafeInteger(j)) {
    throw new TypeError('indices must be safe integers')
  }
  return i === j ? 1 : 0
}

// A centered finite difference, not a proof that f is differentiable at x.
function derivative (f, x, h = 0.00001) {
  if (typeof f !== 'function') throw new TypeError('f must be a function')
  finite(x, 'x')
  finite(h, 'h')
  if (h <= 0) throw new RangeError('h must be positive')
  var left = finiteResult(x - h)
  var right = finiteResult(x + h)
  var denominator = finiteResult(2 * h)
  if (left >= x || right <= x) {
    throw new RangeError('h must change x in floating-point arithmetic')
  }
  var difference = finiteResult(finite(f(right), 'f(x + h)') - finite(f(left), 'f(x - h)'))
  return finiteResult(difference / denominator)
}

// Composite trapezoidal rule on a finite interval. At most n + 1 evaluations.
function integrateTrapezoid (f, a, b, n = 1000) {
  if (typeof f !== 'function') throw new TypeError('f must be a function')
  finite(a, 'a')
  finite(b, 'b')
  if (!Number.isInteger(n) || n < 1 || n > MAX_SUBDIVISIONS) {
    throw new RangeError('n must be an integer from 1 to ' + MAX_SUBDIVISIONS)
  }
  if (a === b) return 0
  var span = finiteResult(b - a)
  var h = span / n
  if (h === 0 || a + h === a || b - h === b) {
    throw new RangeError('subdivisions are too small for the interval')
  }
  var sum = finiteResult(finite(f(a), 'f(a)') / 2 + finite(f(b), 'f(b)') / 2)
  for (var i = 1; i < n; i++) {
    var x = a + span * (i / n)
    sum = finiteResult(sum + finite(f(x), 'f(x)'))
  }
  return finiteResult(h * sum)
}

function normalize3 (vector, name) {
  if (!Array.isArray(vector) || vector.length !== 3) {
    throw new TypeError(name + ' must be an array of three finite numbers')
  }
  var scale = 0
  for (var i = 0; i < 3; i++) scale = Math.max(scale, Math.abs(finite(vector[i], name + ' entry')))
  if (scale === 0) throw new RangeError(name + ' must be nonzero')
  var scaled = vector.map(function (value) { return value / scale })
  var length = Math.hypot(scaled[0], scaled[1], scaled[2])
  return scaled.map(function (value) { return value / length })
}

// One beam/color channel. Irradiance is measured perpendicular to the beam.
// lightDirection points from the surface toward the light, like PBRT's wi.
function lambertianReflection (reflectance, irradiance, normal, lightDirection) {
  finite(reflectance, 'reflectance')
  finite(irradiance, 'irradiance')
  if (reflectance < 0 || reflectance > 1 || irradiance < 0) {
    throw new RangeError('reflectance must be in [0, 1] and irradiance nonnegative')
  }
  var n = normalize3(normal, 'normal')
  var wi = normalize3(lightDirection, 'lightDirection')
  var cosine = Math.max(0, Math.min(1, n[0] * wi[0] + n[1] * wi[1] + n[2] * wi[2]))
  return finiteResult(reflectance * (irradiance / Math.PI) * cosine)
}

module.exports = {
  mean,
  gradientDescentStep,
  multiplyMatrices,
  kroneckerProduct,
  kroneckerDelta,
  derivative,
  integrateTrapezoid,
  lambertianReflection
}
