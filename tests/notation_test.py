import ast
import importlib.util
import math
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("notation", ROOT / "examples" / "notation.py")
notation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(notation)


class NotationTests(unittest.TestCase):
    def test_mean_bounds_and_large_values(self):
        self.assertEqual(notation.mean([2, 4, 6, 8]), 5)
        self.assertEqual(notation.mean([1e308, 1e308]), 1e308)
        self.assertEqual(notation.mean([1e308, -1e308]), 0)
        self.assertAlmostEqual(notation.mean([1e16, 1, -1e16]), 1/3)
        self.assertAlmostEqual(notation.mean([1e308, 1, -1e308]), 1/3)
        for values in ([], [math.nan], [True], ["2"], [1]*10001):
            with self.assertRaises((ValueError, TypeError)):
                notation.mean(values)

    def test_gradient_step_is_bounded_simultaneous_and_non_mutating(self):
        weights = [0, 0]
        samples = [{"x": [1, 0], "y": 2}, {"x": [0, 1], "y": 4}]
        self.assertEqual(notation.gradient_descent_step(weights, samples, 0.5), {
            "gradient": [-1, -2], "weights": [0.5, 1], "lossBefore": 5, "lossAfter": 2.8125})
        self.assertEqual(weights, [0, 0])
        self.assertEqual(samples, [{"x": [1, 0], "y": 2}, {"x": [0, 1], "y": 4}])
        coupled = notation.gradient_descent_step([1, 1], [{"x": [1, 1], "y": 0}], 0.1)
        self.assertEqual(coupled["weights"], [0.8, 0.8])
        self.assertAlmostEqual(notation.gradient_descent_step([0], [{"x": [1], "y": y} for y in [-1e16, -1, 1e16]], 1)["gradient"][0], 1/3)
        result = notation.gradient_descent_step([0], [{"x": [1], "y": 2}], 3)
        self.assertGreater(result["lossAfter"], result["lossBefore"])
        for rate in (0, -1, math.inf, True):
            with self.assertRaises((ValueError, TypeError)):
                notation.gradient_descent_step(weights, samples, rate)
        for bad in ([], [{"x": [1], "y": 2}], [{"x": [math.nan, 0], "y": 2}], samples*5001):
            with self.assertRaises((ValueError, TypeError)):
                notation.gradient_descent_step(weights, bad, 0.1)
        with self.assertRaises((ValueError, TypeError)):
            notation.gradient_descent_step([0]*20, [{"x": [1]*20, "y": 1}]*5001, 0.1)
        with self.assertRaises((ValueError, OverflowError)):
            notation.gradient_descent_step([1e308], [{"x": [1e308], "y": 0}], 0.1)

    def test_matrix_product_and_shape_errors(self):
        a = [[1, 2], [3, 4]]
        self.assertEqual(notation.multiply_matrices(a, [[5, 6], [7, 8]]), [[19, 22], [43, 50]])
        self.assertEqual(a, [[1, 2], [3, 4]])
        for bad in ([], [[1], [2, 3]], [[float("nan")]], [[True]]):
            with self.assertRaises((ValueError, TypeError)):
                notation.multiply_matrices(bad, [[1]])
        with self.assertRaises(ValueError):
            notation.multiply_matrices([[1, 2]], [[1, 2]])

    def test_tensor_shape_and_expansion_limit(self):
        self.assertEqual(notation.kronecker_product([[1], [2]], [[3, 4, 5]]), [[3, 4, 5], [6, 8, 10]])
        matrix = [[1] * 100 for _ in range(100)]
        with self.assertRaisesRegex(ValueError, "size limit"):
            notation.kronecker_product(matrix, matrix)
        self.assertEqual(notation.kronecker_delta(2, 2), 1)
        self.assertEqual(notation.kronecker_delta(2, 3), 0)
        for index in (0.5, True, "2"):
            with self.assertRaises(TypeError):
                notation.kronecker_delta(index, 2)

    def test_derivative_values_and_bad_steps(self):
        self.assertAlmostEqual(notation.derivative(lambda x: x*x, 3), 6, places=7)
        self.assertAlmostEqual(notation.derivative(math.sin, 0), 1, places=7)
        for step in (0, -1, math.inf):
            with self.assertRaises(ValueError):
                notation.derivative(lambda x: x, 2, step)
        with self.assertRaises(ValueError):
            notation.derivative(lambda x: x, 1e20)

    def test_quadrature_work_and_orientation(self):
        calls = []
        value = notation.integrate_trapezoid(lambda x: calls.append(x) or x*x, 0, 1)
        self.assertAlmostEqual(value, 0.3333335, places=10)
        self.assertEqual(len(calls), 1001)
        self.assertAlmostEqual(notation.integrate_trapezoid(lambda x: x*x, 1, 0), -value, places=10)
        self.assertEqual(notation.integrate_trapezoid(lambda x: 1/0, 3, 3), 0)
        for count in (0, -1, 0.5, 1000001, 10**20):
            with self.assertRaises((ValueError, TypeError)):
                notation.integrate_trapezoid(lambda x: self.fail("limit checked after callback"), 0, 1, count)
        with self.assertRaises(ValueError):
            notation.integrate_trapezoid(lambda x: math.nan, 0, 1)

    def test_lambertian_projection_and_scaling(self):
        self.assertAlmostEqual(notation.lambertian_reflection(0.5, 10, [0, 0, 1e300], [0, 0, 1e300]), 5/math.pi)
        self.assertEqual(notation.lambertian_reflection(1, 10, [0, 0, 1], [0, 0, -1]), 0)
        for reflectance in (-1, 2, math.nan):
            with self.assertRaises(ValueError):
                notation.lambertian_reflection(reflectance, 1, [0, 0, 1], [0, 0, 1])

    def test_guide_snippets_are_valid_python(self):
        source = (ROOT / "PYTHON-README.md").read_text()
        snippets = re.findall(r"```(?:python|py)\s*\n(.*?)```", source, re.S)
        self.assertGreater(len(snippets), 50)
        for index, snippet in enumerate(snippets):
            with self.subTest(index=index):
                ast.parse(snippet)


if __name__ == "__main__":
    unittest.main()
