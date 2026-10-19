"""Small, dependency-free Python 3 implementations used by PYTHON-README.md.

These illustrate notation, rather than replace a numerical analysis library.
Inputs and results must be finite real numbers; booleans are not numbers here.
"""

import math
from numbers import Integral, Real


__all__ = [
    "mean",
    "gradient_descent_step",
    "multiply_matrices",
    "kronecker_product",
    "kronecker_delta",
    "derivative",
    "integrate_trapezoid",
    "lambertian_reflection",
]

MAX_SUBDIVISIONS = 1_000_000
MAX_MATRIX_CELLS = 1_000_000
MAX_MATRIX_OPERATIONS = 10_000_000
MAX_MEAN_VALUES = 10_000
MAX_GRADIENT_SAMPLES = 10_000
MAX_GRADIENT_DIMENSIONS = 20
MAX_GRADIENT_FEATURES = 100_000


def _finite_real(value, name):
    if isinstance(value, bool) or not isinstance(value, Real):
        raise TypeError(f"{name} must be a real number")
    try:
        value = float(value)
    except (OverflowError, ValueError):
        raise ValueError(f"{name} must be finite") from None
    if not math.isfinite(value):
        raise ValueError(f"{name} must be finite")
    return value


def _matrix(value, name):
    if not isinstance(value, (list, tuple)) or not value:
        raise ValueError(f"{name} must be a nonempty list or tuple of rows")
    if not isinstance(value[0], (list, tuple)) or not value[0]:
        raise ValueError(f"{name} must have nonempty list or tuple rows")
    if len(value) * len(value[0]) > MAX_MATRIX_CELLS:
        raise ValueError(f"{name} exceeds the example matrix size limit")
    rows = []
    width = None
    for row in value:
        if not isinstance(row, (list, tuple)) or not row:
            raise ValueError(f"{name} must have nonempty list or tuple rows")
        if width is None:
            width = len(row)
        elif len(row) != width:
            raise ValueError(f"{name} must be rectangular")
        rows.append([_finite_real(entry, f"{name} entry") for entry in row])
    return rows


def _finite_sum(values):
    try:
        total = math.fsum(values)
    except OverflowError:
        raise ValueError("sum exceeds the finite floating-point range") from None
    return _finite_real(total, "sum")


def mean(values):
    """Return the mean of 1 through 10,000 finite real list/tuple entries.

    Scaling before summing avoids an overflowing sum when the mean is finite.
    The input is not changed; an empty input has no mean in this example.
    """
    if not isinstance(values, (list, tuple)) or not 1 <= len(values) <= MAX_MEAN_VALUES:
        raise ValueError(f"values must contain 1 through {MAX_MEAN_VALUES} entries")
    values = [_finite_real(value, "mean entry") for value in values]
    scale = max(abs(value) for value in values)
    if scale == 0:
        return 0.0
    normalized_mean = _finite_sum(value / scale for value in values) / len(values)
    return _finite_real(normalized_mean * scale, "mean")


def gradient_descent_step(weights, samples, learning_rate):
    """Take one full-batch step for mean half-squared linear-regression loss.

    Each sample is {'x': feature_vector, 'y': target}. There are 1..20 weights,
    1..10,000 samples, and at most 100,000 sample-feature pairs. Every feature
    vector must have the same length as weights. All numerical inputs must be
    finite real values and learning_rate must be positive. No input is changed.

    The returned dict contains weights, gradient, lossBefore, and lossAfter.
    Every gradient component is evaluated using the complete old weight vector;
    a large learning rate may make lossAfter greater than lossBefore.
    """
    if not isinstance(weights, (list, tuple)) or not 1 <= len(weights) <= MAX_GRADIENT_DIMENSIONS:
        raise ValueError(f"weights must contain 1 through {MAX_GRADIENT_DIMENSIONS} entries")
    if not isinstance(samples, (list, tuple)) or not 1 <= len(samples) <= MAX_GRADIENT_SAMPLES:
        raise ValueError(f"samples must contain 1 through {MAX_GRADIENT_SAMPLES} entries")
    if len(weights) * len(samples) > MAX_GRADIENT_FEATURES:
        raise ValueError("sample-feature count exceeds the example work limit")
    old_weights = [_finite_real(value, "weight") for value in weights]
    learning_rate = _finite_real(learning_rate, "learning_rate")
    if learning_rate <= 0:
        raise ValueError("learning_rate must be positive")

    checked_samples = []
    for sample in samples:
        if not isinstance(sample, dict) or "x" not in sample or "y" not in sample:
            raise ValueError("each sample must be a dict with x and y")
        features = sample["x"]
        if not isinstance(features, (list, tuple)) or len(features) != len(old_weights):
            raise ValueError("sample feature count must match the weight count")
        checked_samples.append((
            [_finite_real(value, "feature") for value in features],
            _finite_real(sample["y"], "target"),
        ))

    def residual(current_weights, features, target):
        prediction = _finite_sum(
            _finite_real(weight * feature, "prediction product")
            for weight, feature in zip(current_weights, features)
        )
        return _finite_real(prediction - target, "residual")

    def loss(error):
        return _finite_real(0.5 * error * error, "sample loss")

    gradient_terms = [[] for _ in old_weights]
    losses_before = []
    for features, target in checked_samples:
        error = residual(old_weights, features, target)
        losses_before.append(loss(error))
        for j, feature in enumerate(features):
            gradient_terms[j].append(_finite_real(error * feature, "sample gradient"))

    gradient = [mean(terms) for terms in gradient_terms]
    new_weights = [
        _finite_real(weight - _finite_real(learning_rate * component, "weight change"), "new weight")
        for weight, component in zip(old_weights, gradient)
    ]
    losses_after = [
        loss(residual(new_weights, features, target))
        for features, target in checked_samples
    ]
    return {
        "weights": new_weights,
        "gradient": gradient,
        "lossBefore": mean(losses_before),
        "lossAfter": mean(losses_after),
    }


def multiply_matrices(left, right):
    """Return AB for nonempty rectangular A (m by n), B (n by p).

    Rows and matrices must be lists or tuples. Entries and results are floats.
    Neither input is changed. Incompatible dimensions raise ValueError.
    """
    left = _matrix(left, "left")
    right = _matrix(right, "right")
    if len(left[0]) != len(right):
        raise ValueError("left column count must equal right row count")
    cells = len(left) * len(right[0])
    if cells > MAX_MATRIX_CELLS or cells * len(left[0]) > MAX_MATRIX_OPERATIONS:
        raise ValueError("matrix multiplication exceeds the example work limit")
    columns = list(zip(*right))
    return [
        [
            _finite_sum(
                _finite_real(a * b, "product")
                for a, b in zip(row, column)
            )
            for column in columns
        ]
        for row in left
    ]


def kronecker_product(left, right):
    """Return the block Kronecker product of two nonempty real matrices.

    An m by n left matrix and p by q right matrix give mp by nq entries.
    This keeps all pairwise products and does not sum over an index.
    """
    left = _matrix(left, "left")
    right = _matrix(right, "right")
    if len(left) * len(left[0]) * len(right) * len(right[0]) > MAX_MATRIX_CELLS:
        raise ValueError("Kronecker product exceeds the example matrix size limit")
    return [
        [
            _finite_real(a * b, "product")
            for a in left_row
            for b in right_row
        ]
        for left_row in left
        for right_row in right
    ]


def kronecker_delta(i, j):
    """Return 1 for equal integer indices, otherwise 0 (not a Dirac delta)."""
    if any(isinstance(value, bool) or not isinstance(value, Integral) for value in (i, j)):
        raise TypeError("Kronecker delta indices must be integers")
    return int(i == j)


def derivative(function, x, h=1e-5):
    """Approximate f'(x) with the centered finite difference, using two calls.

    h must be positive, finite, and large enough that x +/- h differ from x.
    The caller must choose samples inside the function's domain. This does not
    establish that a derivative exists or supply an error estimate.
    """
    if not callable(function):
        raise TypeError("function must be callable")
    x = _finite_real(x, "x")
    h = _finite_real(h, "h")
    if h <= 0:
        raise ValueError("h must be positive")
    lower = _finite_real(x - h, "x - h")
    upper = _finite_real(x + h, "x + h")
    denominator = _finite_real(2 * h, "2 * h")
    if lower == x or upper == x:
        raise ValueError("h is too small to change x in floating-point arithmetic")
    difference = _finite_real(
        _finite_real(function(upper), "function result")
        - _finite_real(function(lower), "function result"),
        "function difference",
    )
    return _finite_real(difference / denominator, "derivative approximation")


def integrate_trapezoid(function, a, b, subdivisions=1000):
    """Approximate the signed integral from a to b with composite trapezoids.

    subdivisions is an integer in [1, MAX_SUBDIVISIONS]. At most n + 1 function
    calls are made; equal endpoints return 0 without evaluating the function.
    Reversing endpoints reverses the sign. No error bound is inferred.
    """
    if not callable(function):
        raise TypeError("function must be callable")
    a = _finite_real(a, "a")
    b = _finite_real(b, "b")
    if isinstance(subdivisions, bool) or not isinstance(subdivisions, Integral):
        raise TypeError("subdivisions must be an integer")
    if not 1 <= subdivisions <= MAX_SUBDIVISIONS:
        raise ValueError(f"subdivisions must be between 1 and {MAX_SUBDIVISIONS}")
    if a == b:
        return 0.0
    step = _finite_real(_finite_real(b - a, "interval width") / subdivisions, "step")
    if step == 0:
        raise ValueError("step is too small for floating-point arithmetic")

    def weighted_samples():
        yield _finite_real(function(a), "function result") / 2
        previous = a
        for i in range(1, subdivisions):
            x = _finite_real(a + i * step, "sample position")
            if not (previous < x < b if a < b else previous > x > b):
                raise ValueError("subdivisions produce repeated or out-of-order sample positions")
            yield _finite_real(function(x), "function result")
            previous = x
        yield _finite_real(function(b), "function result") / 2

    return _finite_real(step * _finite_sum(weighted_samples()), "integral approximation")


def _unit_vector(vector, name):
    if not isinstance(vector, (list, tuple)) or len(vector) != 3:
        raise ValueError(f"{name} must be a list or tuple of three components")
    components = [_finite_real(value, f"{name} component") for value in vector]
    scale = max(abs(value) for value in components)
    if scale == 0:
        raise ValueError(f"{name} must be nonzero")
    scaled = [value / scale for value in components]
    length = math.sqrt(math.fsum(value * value for value in scaled))
    return [value / length for value in scaled]


def lambertian_reflection(reflectance, irradiance, normal, light_direction):
    """Return one scalar channel of outgoing Lambertian radiance.

    irradiance is beam irradiance on a plane perpendicular to the beam (W/m²).
    light_direction points from the surface toward an unoccluded beam source.
    Both 3-vectors are normalized internally. Output units are W/(m² sr).
    Assumes a nonemissive surface viewed from its outward-facing hemisphere;
    no shadowing, indirect illumination, or display color transform is included.
    """
    reflectance = _finite_real(reflectance, "reflectance")
    irradiance = _finite_real(irradiance, "irradiance")
    if not 0 <= reflectance <= 1:
        raise ValueError("reflectance must be between 0 and 1")
    if irradiance < 0:
        raise ValueError("irradiance must be nonnegative")
    normal = _unit_vector(normal, "normal")
    light_direction = _unit_vector(light_direction, "light_direction")
    cosine = max(0.0, min(1.0, math.fsum(a * b for a, b in zip(normal, light_direction))))
    return reflectance / math.pi * irradiance * cosine


if __name__ == "__main__":
    print(mean([2, 4, 6, 8]))
    print(gradient_descent_step(
        [0, 0],
        [{"x": [1, 0], "y": 2}, {"x": [0, 1], "y": 4}],
        0.5,
    ))
    print(multiply_matrices([[1, 2], [3, 4]], [[5, 6], [7, 8]]))
    print(kronecker_product([[1, 2], [3, 4]], [[0, 5], [6, 7]]))
    print(kronecker_delta(2, 2), kronecker_delta(2, 3))
    print(round(derivative(lambda x: x * x, 3), 6))
    print(round(integrate_trapezoid(lambda x: x * x, 0, 1), 9))
    print(round(lambertian_reflection(0.8, 10, [0, 0, 1], [math.sqrt(3), 0, 1]), 6))
