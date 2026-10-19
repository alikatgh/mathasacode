// Keys are the 1-based, top-level Marked code-fence indices in PYTHON-README.md.
// English aliases are limited to the same worked values and resulting operation.
const matrixExample = {
  javascript: String.raw`const { multiplyMatrices } = require('./examples/notation.cjs');
const A = [[1, 2], [3, 4]];
const B = [[5, 6], [7, 8]];
console.log(multiplyMatrices(A, B));
// [[19, 22], [43, 50]]`,
  c: String.raw`#include <stdio.h>
int main(void) {
    double A[2][2] = {{1, 2}, {3, 4}};
    double B[2][2] = {{5, 6}, {7, 8}}, C[2][2] = {{0}};
    for (int i = 0; i < 2; ++i)
        for (int j = 0; j < 2; ++j)
            for (int k = 0; k < 2; ++k) C[i][j] += A[i][k] * B[k][j];
    printf("[[%g, %g], [%g, %g]]\n", C[0][0], C[0][1], C[1][0], C[1][1]);
    /* [[19, 22], [43, 50]] */
}`,
  rust: String.raw`fn main() {
    let a = [[1.0, 2.0], [3.0, 4.0]];
    let b = [[5.0, 6.0], [7.0, 8.0]];
    let mut c = [[0.0; 2]; 2];
    for i in 0..2 {
        for j in 0..2 {
            c[i][j] = (0..2).map(|k| a[i][k] * b[k][j]).sum::<f64>();
        }
    }
    println!("{:?}", c); // [[19.0, 22.0], [43.0, 50.0]]
}`,
};

export const pythonGuide = {
  1: {
    javascript: String.raw`function isClose(a, b, relTol = 1e-9, absTol = 0) {
  return Math.abs(a - b) <= Math.max(relTol * Math.max(Math.abs(a), Math.abs(b)), absTol);
}
function almostEqual(x, y, decimal = 7) {
  return Math.abs(x - y) < 10 ** -decimal;
}
2 === 3; // false
2 !== 3; // true
isClose(Math.PI, 3.14159); // false
isClose(Math.PI, 3.14159, 1e-9, 1e-5); // true
// NumPy's decimal=5 assertion uses this absolute threshold:
if (!(Math.abs(Math.PI - 3.14159) < 1.5 * 10 ** -5)) throw new Error('not close');`,
    c: String.raw`#include <assert.h>
#include <stdbool.h>
#include <math.h>
bool is_close(double a, double b, double rel, double abs_tol) {
    return fabs(a - b) <= fmax(rel * fmax(fabs(a), fabs(b)), abs_tol);
}
bool almost_equal(double x, double y, int decimal) {
    return fabs(x - y) < pow(10.0, -decimal);
}
int main(void) {
    double pi = acos(-1.0);
    assert(!(2 == 3) && (2 != 3));
    assert(!is_close(pi, 3.14159, 1e-9, 0));
    assert(is_close(pi, 3.14159, 1e-9, 1e-5));
    assert(fabs(pi - 3.14159) < 1.5 * pow(10.0, -5));
}`,
    rust: String.raw`fn is_close(a: f64, b: f64, rel: f64, abs_tol: f64) -> bool {
    (a - b).abs() <= (rel * a.abs().max(b.abs())).max(abs_tol)
}
fn almost_equal(x: f64, y: f64, decimal: i32) -> bool {
    (x - y).abs() < 10.0_f64.powi(-decimal)
}
fn main() {
    let pi = std::f64::consts::PI;
    assert!(2 != 3);
    assert!(!is_close(pi, 3.14159, 1e-9, 0.0));
    assert!(is_close(pi, 3.14159, 1e-9, 1e-5));
    assert!((pi - 3.14159).abs() < 1.5 * 10.0_f64.powi(-5));
}`,
  },
  2: { english: 2 },
  3: {
    javascript: 'function plus(x, y) { return x + y; }',
    c: 'double plus(double x, double y) { return x + y; }',
    rust: 'fn plus(x: f64, y: f64) -> f64 { x + y }\nfn main() {}',
  },
  4: {
    javascript: String.raw`function plus(x, y) { return x + y; }
if (plus(1, 1) !== 2) throw new Error('DANGER: PHYSICS IS BROKEN. PLEASE STAY INSIDE.');`,
    c: String.raw`#include <assert.h>
double plus(double x, double y) { return x + y; }
int main(void) { assert(plus(1, 1) == 2); }`,
    rust: String.raw`fn plus(x: f64, y: f64) -> f64 { x + y }
fn main() { assert_eq!(plus(1.0, 1.0), 2.0, "DANGER: PHYSICS IS BROKEN. PLEASE STAY INSIDE."); }`,
  },
  5: {
    javascript: 'console.log(Math.sqrt(2)); // 1.4142135623730951',
    c: '#include <math.h>\n#include <stdio.h>\nint main(void) { printf("%.17g\\n", sqrt(2.0)); }',
    rust: 'fn main() { println!("{}", 2.0_f64.sqrt()); } // 1.4142135623730951',
  },
  6: {
    javascript: String.raw`// JavaScript has no built-in complex-number type; use {re, im} pairs.
function sqrtComplex(z) {
  const magnitude = Math.hypot(z.re, z.im);
  return { re: Math.sqrt((magnitude + z.re) / 2),
    im: (z.im < 0 ? -1 : 1) * Math.sqrt((magnitude - z.re) / 2) };
}
const z = { re: 1, im: 1 };
console.log(z); // {re: 1, im: 1}
console.log(sqrtComplex(z)); // approximately {re: 1.09868411346781, im: 0.45508986056222733}
const conjugate = { re: 0.5, im: -0.5 };
console.log(conjugate);
console.log(sqrtComplex({ re: -1, im: 0 })); // {re: 0, im: 1}`,
    c: String.raw`#include <complex.h>
#include <assert.h>
#include <stdio.h>
int main(void) {
    double complex z = 1.0 + I;
    double complex root = csqrt(z), conjugate = conj(0.5 + 0.5 * I);
    printf("%.15g %+.15gi\n", creal(root), cimag(root));
    /* 1.09868411346781 +0.455089860562227i */
    printf("%g %+.1gi\n", creal(conjugate), cimag(conjugate)); /* 0.5 -0.5i */
    assert(csqrt(-1.0 + 0.0 * I) == I);
    /* sqrt() is the real API; csqrt() is the complex API. */
}`,
    rust: String.raw`#[derive(Debug)]
struct Complex { re: f64, im: f64 }
fn sqrt_complex(z: Complex) -> Complex {
    let magnitude = z.re.hypot(z.im);
    Complex { re: ((magnitude + z.re) / 2.0).sqrt(),
        im: ((magnitude - z.re) / 2.0).sqrt().copysign(z.im) }
}
fn main() {
    // Rust's standard library has no complex type; this pair models one.
    println!("{:?}", sqrt_complex(Complex { re: 1.0, im: 1.0 }));
    // approximately (1.09868411346781, 0.45508986056222733)
    let conjugate = Complex { re: 0.5, im: -0.5 };
    println!("{:?}", conjugate);
    println!("{:?}", sqrt_complex(Complex { re: -1.0, im: 0.0 })); // (0, 1)
}`,
  },
  7: {
    javascript: String.raw`function multiplyComplex(a, b) {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}
const cube = z => multiplyComplex(multiplyComplex(z, z), z);
const z1 = { re: -0.5, im: Math.sqrt(3) / 2 };
const z2 = { re: z1.re, im: -z1.im };
const a = cube(z1), b = cube(z2);
if (Math.hypot(a.re - b.re, a.im - b.im) > 1e-9) throw new Error('not close');
// Both cubes are approximately 1 + 0i. Compare both coordinates.`,
    c: String.raw`#include <assert.h>
#include <complex.h>
#include <math.h>
int main(void) {
    double complex z1 = 0.5 * (-1.0 + sqrt(3.0) * I), z2 = conj(z1);
    double complex a = z1 * z1 * z1, b = z2 * z2 * z2;
    assert(cabs(a - b) <= 1e-9 * fmax(cabs(a), cabs(b)));
    /* Both cubes are approximately 1 + 0i. */
}`,
    rust: String.raw`fn multiply(a: (f64, f64), b: (f64, f64)) -> (f64, f64) {
    (a.0 * b.0 - a.1 * b.1, a.0 * b.1 + a.1 * b.0)
}
fn cube(z: (f64, f64)) -> (f64, f64) { multiply(multiply(z, z), z) }
fn main() {
    let z1 = (-0.5, 3.0_f64.sqrt() / 2.0);
    let z2 = (z1.0, -z1.1);
    let a = cube(z1); let b = cube(z2);
    assert!((a.0 - b.0).hypot(a.1 - b.1) <= 1e-9);
    // Both cubes are approximately (1, 0).
}`,
  },
  8: { english: 8 },
  9: { english: 9 },
  10: {
    javascript: String.raw`const s = 3, k = [1, 2], j = [2, 3];
const tmp = k.map((value, i) => value * j[i]);
const result = tmp.map(value => s * value);
console.log(result); // [6, 18]`,
    c: String.raw`#include <stdio.h>
int main(void) {
    double s = 3, k[2] = {1, 2}, j[2] = {2, 3}, tmp[2], result[2];
    for (int i = 0; i < 2; ++i) { tmp[i] = k[i] * j[i]; result[i] = s * tmp[i]; }
    printf("[%g, %g]\n", result[0], result[1]); /* [6, 18] */
}`,
    rust: String.raw`fn main() {
    let s = 3.0; let k = [1.0, 2.0]; let j = [2.0, 3.0];
    let tmp: Vec<f64> = k.iter().zip(j).map(|(a, b)| a * b).collect();
    let result: Vec<f64> = tmp.iter().map(|x| s * x).collect();
    println!("{:?}", result); // [6.0, 18.0]
}`,
  },
  11: {
    javascript: String.raw`function multiply(a, b) {
  return a.slice(0, Math.min(a.length, b.length)).map((value, i) => value * b[i]);
}
function multiplyScalar(scalar, a) { return a.map(value => scalar * value); }
// Like Python zip(), multiply stops at the shorter input.`,
    c: String.raw`#include <stddef.h>
size_t multiply(const double *a, size_t na, const double *b, size_t nb, double *out) {
    size_t n = na < nb ? na : nb; /* out has capacity n */
    for (size_t i = 0; i < n; ++i) out[i] = a[i] * b[i];
    return n;
}
void multiply_scalar(double scalar, const double *a, size_t n, double *out) {
    for (size_t i = 0; i < n; ++i) out[i] = scalar * a[i];
}`,
    rust: String.raw`fn multiply(a: &[f64], b: &[f64]) -> Vec<f64> {
    a.iter().zip(b).map(|(x, y)| x * y).collect()
}
fn multiply_scalar(scalar: f64, a: &[f64]) -> Vec<f64> {
    a.iter().map(|x| scalar * x).collect()
}
fn main() { assert_eq!(multiply(&[1.0, 2.0], &[2.0, 3.0]), [2.0, 6.0]); }`,
  },
  12: {
    javascript: 'function multiplyScalar(scalar, a) { return a.map(value => scalar * value); }',
    c: '#include <stddef.h>\nvoid multiply_scalar(double scalar, const double *a, size_t n, double *out) {\n    for (size_t i = 0; i < n; ++i) out[i] = scalar * a[i];\n}',
    rust: 'fn multiply_scalar(scalar: f64, a: &[f64]) -> Vec<f64> {\n    a.iter().map(|x| scalar * x).collect()\n}\nfn main() {}',
  },
  13: { english: 12 },
  14: { english: 13 },
  15: { english: 14 },
  16: { english: 15 },
  17: { english: 16 },
  18: {
    javascript: 'function sumToN(n) { return 0.5 * n * (n + 1); }',
    c: 'double sum_to_n(double n) { return 0.5 * n * (n + 1); }',
    rust: 'fn sum_to_n(n: f64) -> f64 { 0.5 * n * (n + 1.0) }\nfn main() {}',
  },
  19: { english: 18 },
  20: { english: 19 },
  21: { english: 20 },
  22: { english: 21 },
  23: {
    javascript: String.raw`const xs = Array.from({ length: 100 }, (_, i) => 2 * (i + 1) + 1);
const ys = [1, 2, 3, 4, 5, 6];
console.log(xs.reduce((sum, x) => sum + x, 0)); // 10200
console.log(ys.reduce((product, y) => product * y, 1)); // 720`,
    c: String.raw`#include <stdio.h>
int main(void) {
    int sum = 0, product = 1;
    for (int k = 1; k <= 100; ++k) sum += 2 * k + 1;
    for (int k = 1; k <= 6; ++k) product *= k;
    printf("%d\n%d\n", sum, product); /* 10200, 720 */
}`,
    rust: String.raw`fn main() {
    let xs: Vec<i32> = (1..=100).map(|k| 2 * k + 1).collect();
    let ys: Vec<i32> = (1..=6).collect();
    println!("{}", xs.iter().sum::<i32>()); // 10200
    println!("{}", ys.iter().product::<i32>()); // 720
}`,
  },
  24: { english: 22 },
  25: { english: 23 },
  26: { english: 24 },
  27: { english: 23 },
  28: { english: 25 },
  29: {
    javascript: String.raw`const identity = Array.from({ length: 100 }, (_, i) =>
  Array.from({ length: 100 }, (_, j) => Number(i === j)));
// A triangular matrix's determinant is the product of its diagonal entries.
const identityDet = identity.reduce((product, row, i) => product * row[i], 1);
const rotation = [[0, -1], [1, 0]];
const rotationDet = rotation[0][0] * rotation[1][1] - rotation[0][1] * rotation[1][0];
console.log(identityDet, rotationDet); // 1, 1`,
    c: String.raw`#include <stdio.h>
int main(void) {
    double identity[100][100] = {{0}}, identity_det = 1;
    for (int i = 0; i < 100; ++i) identity[i][i] = 1;
    /* Product of diagonal entries works here because identity is triangular. */
    for (int i = 0; i < 100; ++i) identity_det *= identity[i][i];
    double r[2][2] = {{0, -1}, {1, 0}};
    double rotation_det = r[0][0] * r[1][1] - r[0][1] * r[1][0];
    printf("%g %g\n", identity_det, rotation_det); /* 1 1 */
}`,
    rust: String.raw`fn main() {
    let mut identity = [[0.0_f64; 100]; 100];
    for i in 0..100 { identity[i][i] = 1.0; }
    // Diagonal product is valid for this triangular matrix, not arbitrary matrices.
    let identity_det: f64 = (0..100).map(|i| identity[i][i]).product();
    let r = [[0.0, -1.0], [1.0, 0.0]];
    let rotation_det = r[0][0] * r[1][1] - r[0][1] * r[1][0];
    println!("{} {}", identity_det, rotation_det); // 1 1
}`,
  },
  30: { english: 26 },
  31: { english: 27 },
  32: {
    javascript: String.raw`function normalize(vec) {
  const length = Math.hypot(...vec);
  if (length > 0) return vec.map(x => x / length);
  return null; // Python's function falls through to None for a zero vector.
}
// Returns a new array; unlike the preceding in-place example, vec is unchanged.`,
    c: String.raw`#include <math.h>
#include <stdbool.h>
#include <stddef.h>
bool normalize_copy(const double *vec, size_t n, double *out) {
    double length = 0;
    for (size_t i = 0; i < n; ++i) length = hypot(length, vec[i]);
    if (!(length > 0)) return false; /* Python returns None; no output vector. */
    for (size_t i = 0; i < n; ++i) out[i] = vec[i] / length;
    return true; /* out has capacity n; vec is unchanged. */
}`,
    rust: String.raw`fn normalize(vec: &[f64]) -> Option<Vec<f64>> {
    let length = vec.iter().fold(0.0_f64, |length, &x| length.hypot(x));
    if length > 0.0 { Some(vec.iter().map(|x| x / length).collect()) }
    else { None }
}
fn main() { assert!(normalize(&[0.0, 0.0]).is_none()); }`,
  },
  33: { english: 28 },
  34: {
    javascript: String.raw`const unique = new Set([3, 3, 3, 2, 4, 3, 3, 3, 1, 2, 4, 5, 3]);
console.log([...unique].sort((a, b) => a - b)); // [1, 2, 3, 4, 5]
const stepped = new Set(Array.from({ length: 5 }, (_, i) => 1 + 4 * i));
console.log(stepped.has(3)); // false`,
    c: String.raw`#include <stdbool.h>
#include <stdio.h>
int main(void) {
    int input[] = {3,3,3,2,4,3,3,3,1,2,4,5,3};
    bool present[6] = {false}; /* This example's values lie between 1 and 5. */
    for (unsigned i = 0; i < sizeof input / sizeof input[0]; ++i) present[input[i]] = true;
    for (int x = 1; x <= 5; ++x) if (present[x]) printf("%d ", x);
    bool contains_three = false;
    for (int x = 1; x < 20; x += 4) if (x == 3) contains_three = true;
    printf("\n%d\n", contains_three); /* 1 2 3 4 5; then 0 (false) */
}`,
    rust: String.raw`use std::collections::BTreeSet;
fn main() {
    let unique: BTreeSet<_> = [3,3,3,2,4,3,3,3,1,2,4,5,3].iter().copied().collect();
    println!("{:?}", unique); // {1, 2, 3, 4, 5}
    let stepped: BTreeSet<_> = (1..20).step_by(4).collect();
    println!("{}", stepped.contains(&3)); // false
}`,
  },
  35: {
    javascript: "console.log(typeof Math.PI === 'number'); // true: Math.PI is a Number",
    c: '#include <math.h>\n#include <stdio.h>\nint main(void) {\n    double pi = acos(-1.0);\n    printf("%d\\n", _Generic(pi, double: 1, default: 0)); /* 1: statically double */\n}',
    rust: String.raw`use std::any::{Any, TypeId};
fn is_f64<T: Any>(_: &T) -> bool { TypeId::of::<T>() == TypeId::of::<f64>() }
fn main() { println!("{}", is_f64(&std::f64::consts::PI)); } // true`,
  },
  36: {
    javascript: String.raw`// Intentional assertion failure, matching the Python example.
const value = 8 / 7;
if (!Number.isInteger(value)) throw new Error('GO DIRECTLY TO JAIL');`,
    c: String.raw`#include <assert.h>
#include <math.h>
int main(void) {
    double value = 8.0 / 7.0; /* floating-point division, not C integer division */
    assert(trunc(value) == value && "GO DIRECTLY TO JAIL"); /* intentionally fails */
}`,
    rust: String.raw`fn main() {
    let value = 8.0_f64 / 7.0; // Explicitly floating-point division.
    assert!(value.fract() == 0.0, "GO DIRECTLY TO JAIL"); // intentionally fails
}`,
  },
  37: {
    javascript: String.raw`// zip(R, R) pairs corresponding entries: these points lie on a diagonal.
// JavaScript has no complex scalar type; distinct {re, im} pairs represent the set.
const R = Array.from({ length: 100 }, (_, i) => -2 + 4 * i / 99);
const complexSamples = R.map(a => ({ re: a, im: a }));
console.log(complexSamples.length); // 100 distinct points, from -2-2i to 2+2i
// This is not the Cartesian product of R with R.`,
    c: String.raw`#include <complex.h>
#include <stdio.h>
int main(void) {
    double complex samples[100];
    for (int i = 0; i < 100; ++i) {
        double a = -2.0 + 4.0 * i / 99.0;
        samples[i] = a + a * I; /* zip(R, R), not all (a,b) combinations */
    }
    printf("%g%+gi ... %g%+gi\n", creal(samples[0]), cimag(samples[0]),
           creal(samples[99]), cimag(samples[99])); /* -2-2i ... 2+2i */
}`,
    rust: String.raw`fn main() {
    // A pair represents a complex value; all 100 sampled values are distinct.
    let r: Vec<f64> = (0..100).map(|i| -2.0 + 4.0 * i as f64 / 99.0).collect();
    let complex_samples: Vec<(f64, f64)> = r.iter().zip(&r).map(|(&a, &b)| (a, b)).collect();
    println!("{:?} ... {:?}", complex_samples[0], complex_samples[99]);
    // (-2.0, -2.0) ... (2.0, 2.0), a diagonal, not a Cartesian product.
}`,
  },
  38: { english: 34 },
  39: {
    javascript: 'const square = x => x ** 2; // anonymous function expression',
    c: '/* C has no anonymous function literal; use a named function. */\ndouble square(double x) { return x * x; }',
    rust: 'fn main() { let square = |x: f64| x.powi(2); assert_eq!(square(3.0), 9.0); }',
  },
  40: { english: 36 },
  41: { english: 37 },
  42: {
    javascript: String.raw`function squareInts(k) {
  if (!Number.isInteger(k)) throw new TypeError('I HUNGER FOR AN INTEGER!');
  return k ** 2;
}`,
    c: '/* C uses an integer parameter here; a floating argument would be converted. */\ndouble square_ints(int k) { return (double)k * (double)k; }',
    rust: 'fn square_ints(k: i64) -> f64 { (k as f64).powi(2) }\nfn main() {} // Non-integer arguments are rejected by the compiler.',
  },
  43: {
    javascript: String.raw`/** @param {number} x @returns {number} — documentation, not a runtime check. */
function square(x) { return x ** 2; }`,
    c: '/* Unlike a Python annotation, these types are checked by the C compiler. */\ndouble square(double x) { return x * x; }',
    rust: 'fn square(x: f64) -> f64 { x * x }\nfn main() {} // The input and output types are statically checked.',
  },
  44: { english: 39 },
  45: {
    javascript: 'Math.floor(4.8); // 4\nMath.ceil(3.1); // 4\nMath.floor(4.9); // 4\nMath.ceil(3.001); // 4',
    c: '#include <math.h>\n#include <stdio.h>\nint main(void) { printf("%g %g %g %g\\n", floor(4.8), ceil(3.1), floor(4.9), ceil(3.001)); } /* 4 4 4 4 */',
    rust: 'fn main() {\n    println!("{} {} {} {}", 4.8_f64.floor(), 3.1_f64.ceil(), 4.9_f64.floor(), 3.001_f64.ceil());\n} // 4 4 4 4',
  },
  46: {
    javascript: String.raw`function ifAThenB(A, B) { return !A || B; }
console.assert(ifAThenB(true, true));
console.assert(ifAThenB(false, false));
console.assert(!ifAThenB(true, false));`,
    c: String.raw`#include <assert.h>
#include <stdbool.h>
bool if_a_then_b(bool a, bool b) { return !a || b; }
int main(void) {
    assert(if_a_then_b(true, true));
    assert(if_a_then_b(false, false));
    assert(!if_a_then_b(true, false));
}`,
    rust: String.raw`fn if_a_then_b(a: bool, b: bool) -> bool { !a || b }
fn main() {
    assert!(if_a_then_b(true, true));
    assert!(if_a_then_b(false, false));
    assert!(!if_a_then_b(true, false));
}`,
  },
  47: { english: 43 },
  48: {
    javascript: 'function checkBetween(k) {\n  if (k > 2 && k < 4 && k !== 3) throw new Error("expected 3");\n}\n// The premise assumes an integer k.',
    c: '#include <assert.h>\nvoid check_between(int k) { if (k > 2 && k < 4) assert(k == 3); }',
    rust: 'fn check_between(k: i64) { if k > 2 && k < 4 { assert_eq!(k, 3); } }\nfn main() {}',
  },
  49: {
    javascript: 'function checkThree(k) {\n  if (k === 3 && !(k > 2 && k < 4)) throw new Error("expected interval membership");\n}',
    c: '#include <assert.h>\nvoid check_three(int k) { if (k == 3) assert(k > 2 && k < 4); }',
    rust: 'fn check_three(k: i64) { if k == 3 { assert!(k > 2 && k < 4); } }\nfn main() {}',
  },
  50: {
    javascript: 'function checkNotEqual(x, y) {\n  if (x !== y && x === y) throw new Error("equality contradiction");\n}',
    c: '#include <assert.h>\nvoid check_not_equal(double x, double y) { if (x != y) assert(!(x == y)); }',
    rust: 'fn check_not_equal(x: f64, y: f64) { if x != y { assert!(!(x == y)); } }\nfn main() {}',
  },
  51: {
    javascript: String.raw`const a = [3, 4], b = [4, 5, 6];
const intersection = a.filter(x => b.includes(x)); // [4]
const union = Array.from({ length: 20 }, (_, x) => x).filter(x => a.includes(x) || b.includes(x));
const aMinusB = a.filter(x => !b.includes(x)); // [3]
const bMinusA = b.filter(x => !a.includes(x)); // [5, 6]
console.log(intersection, union, aMinusB, bMinusA); // [4], [3,4,5,6], [3], [5,6]`,
    c: String.raw`#include <stdio.h>
int main(void) {
    /* Enumerate the same finite integer domain used by the comprehensions. */
    for (int operation = 0; operation < 4; ++operation) {
        for (int x = 0; x < 20; ++x) {
            int a = 3 <= x && x < 5, b = 4 <= x && x <= 6;
            int selected = operation == 0 ? a && b : operation == 1 ? a || b
                         : operation == 2 ? a && !b : b && !a;
            if (selected) printf("%d ", x);
        }
        puts("");
    }
    /* Rows: 4; 3 4 5 6; 3; 5 6. */
}`,
    rust: String.raw`fn main() {
    let a = 3..5; let b = 4..=6;
    let intersection: Vec<_> = a.clone().filter(|x| b.contains(x)).collect();
    let union: Vec<_> = (0..20).filter(|x| a.contains(x) || b.contains(x)).collect();
    let a_minus_b: Vec<_> = a.clone().filter(|x| !b.contains(x)).collect();
    let b_minus_a: Vec<_> = b.clone().filter(|x| !a.contains(x)).collect();
    println!("{:?} {:?} {:?} {:?}", intersection, union, a_minus_b, b_minus_a);
    // [4] [3, 4, 5, 6] [3] [5, 6]
}`,
  },
  52: {
    javascript: String.raw`const R = Array.from({ length: 100 }, (_, i) => -1 + 10 * i / 99);
const inA = x => 3 <= x && x < 5;
const inB = x => 4 <= x && x <= 6;
console.log(R.filter(x => inA(x) && inB(x))); // intersection samples
console.log(R.filter(x => inA(x) || inB(x))); // union samples
console.log(R.filter(x => inA(x) && !inB(x))); // A minus B samples
console.log(R.filter(x => inB(x) && !inA(x))); // B minus A samples
// These are finite samples of the real intervals, not every real point.`,
    c: String.raw`#include <stdio.h>
int main(void) {
    for (int operation = 0; operation < 4; ++operation) {
        for (int i = 0; i < 100; ++i) {
            double x = -1.0 + 10.0 * i / 99.0;
            int a = 3 <= x && x < 5, b = 4 <= x && x <= 6;
            int selected = operation == 0 ? a && b : operation == 1 ? a || b
                         : operation == 2 ? a && !b : b && !a;
            if (selected) printf("%.17g ", x);
        }
        puts("");
    }
    /* Rows are samples of intersection, union, A minus B, and B minus A. */
}`,
    rust: String.raw`fn main() {
    let r: Vec<f64> = (0..100).map(|i| -1.0 + 10.0 * i as f64 / 99.0).collect();
    let a = |x: f64| 3.0 <= x && x < 5.0;
    let b = |x: f64| 4.0 <= x && x <= 6.0;
    let intersection: Vec<_> = r.iter().copied().filter(|&x| a(x) && b(x)).collect();
    let union: Vec<_> = r.iter().copied().filter(|&x| a(x) || b(x)).collect();
    let a_minus_b: Vec<_> = r.iter().copied().filter(|&x| a(x) && !b(x)).collect();
    let b_minus_a: Vec<_> = r.iter().copied().filter(|&x| b(x) && !a(x)).collect();
    println!("{:?}\n{:?}\n{:?}\n{:?}", intersection, union, a_minus_b, b_minus_a);
}`,
  },
  53: matrixExample,
  54: matrixExample,
  55: { english: 53 },
  56: { english: 54 },
  57: {
    javascript: 'const xBefore = 2, xAfter = 5;\nconst f = x => x * x;\nconst deltaX = xAfter - xBefore; // 3\nconst deltaF = f(xAfter) - f(xBefore); // 21\nconst averageSlope = deltaF / deltaX; // 7',
    c: '#include <stdio.h>\ndouble f(double x) { return x * x; }\nint main(void) {\n    double before = 2, after = 5;\n    double dx = after - before, df = f(after) - f(before);\n    printf("%g %g %g\\n", dx, df, df / dx); /* 3 21 7 */\n}',
    rust: 'fn main() {\n    let f = |x: f64| x * x;\n    let (before, after) = (2.0, 5.0);\n    let dx = after - before; let df = f(after) - f(before);\n    println!("{} {} {}", dx, df, df / dx); // 3 21 7\n}',
  },
  58: {
    javascript: String.raw`const { kroneckerDelta } = require('./examples/notation.cjs');
console.log(kroneckerDelta(2, 2), kroneckerDelta(2, 3)); // 1 0
const identity = Array.from({ length: 3 }, (_, i) =>
  Array.from({ length: 3 }, (_, j) => kroneckerDelta(i, j)));
console.log(identity); // [[1,0,0], [0,1,0], [0,0,1]]`,
    c: String.raw`#include <stdio.h>
int kronecker_delta(int i, int j) { return i == j; }
int main(void) {
    printf("%d %d\n", kronecker_delta(2, 2), kronecker_delta(2, 3)); /* 1 0 */
    int identity[3][3];
    for (int i = 0; i < 3; ++i) {
        for (int j = 0; j < 3; ++j) {
            identity[i][j] = kronecker_delta(i, j);
            printf("%d ", identity[i][j]);
        }
        puts("");
    }
}`,
    rust: String.raw`fn kronecker_delta(i: i32, j: i32) -> i32 { i32::from(i == j) }
fn main() {
    println!("{} {}", kronecker_delta(2, 2), kronecker_delta(2, 3)); // 1 0
    let identity: Vec<Vec<i32>> = (0..3).map(|i|
        (0..3).map(|j| kronecker_delta(i, j)).collect()).collect();
    println!("{:?}", identity); // [[1,0,0], [0,1,0], [0,0,1]]
}`,
  },
  59: {
    javascript: "const { derivative } = require('./examples/notation.cjs');\nconst estimate = derivative(x => x * x, 3, 1e-5);\nconsole.log(estimate.toFixed(6)); // 6.000000",
    c: String.raw`#include <assert.h>
#include <math.h>
#include <stdio.h>
double derivative(double (*f)(double), double x, double h) {
    assert(isfinite(x) && isfinite(h) && h > 0 && x + h != x && x - h != x);
    return (f(x + h) - f(x - h)) / (2 * h);
}
double square(double x) { return x * x; }
int main(void) { printf("%.6f\n", derivative(square, 3, 1e-5)); } /* 6.000000 */`,
    rust: String.raw`fn derivative(f: fn(f64) -> f64, x: f64, h: f64) -> f64 {
    assert!(x.is_finite() && h.is_finite() && h > 0.0 && x + h != x && x - h != x);
    (f(x + h) - f(x - h)) / (2.0 * h)
}
fn square(x: f64) -> f64 { x * x }
fn main() { println!("{:.6}", derivative(square, 3.0, 1e-5)); } // 6.000000`,
  },
  60: { english: 58 },
  61: {
    javascript: 'function antiderivative(x, constant = 0) { return x * x + constant; }\n// Both antiderivative(x, 0) and antiderivative(x, 7) differentiate to 2*x.',
    c: 'double antiderivative(double x, double constant) { return x * x + constant; }\n/* Pass constant=0 for the Python default. Every fixed constant has derivative 2*x. */',
    rust: 'fn antiderivative(x: f64, constant: f64) -> f64 { x * x + constant }\nfn main() {} // Pass 0.0 for the Python default constant.',
  },
  62: { english: 60 },
  63: {
    javascript: String.raw`const { lambertianReflection } = require('./examples/notation.cjs');
const radiance = lambertianReflection(0.8, 10, [0, 0, 1], [Math.sqrt(3), 0, 1]);
console.log(Number(radiance.toFixed(6))); // 1.27324 = approximately 4/pi W/(m² sr)`,
    c: String.raw`#include <assert.h>
#include <math.h>
#include <stdio.h>
double lambertian(double rho, double beam_irradiance, const double n[3], const double l[3]) {
    double nn = hypot(hypot(n[0], n[1]), n[2]);
    double ln = hypot(hypot(l[0], l[1]), l[2]);
    assert(nn > 0 && ln > 0 && rho >= 0 && rho <= 1 && beam_irradiance >= 0);
    double cosine = 0;
    for (int i = 0; i < 3; ++i) cosine += (n[i] / nn) * (l[i] / ln);
    return rho / acos(-1.0) * beam_irradiance * fmax(0, fmin(1, cosine));
}
int main(void) {
    double normal[3] = {0, 0, 1}, light[3] = {sqrt(3.0), 0, 1};
    printf("%.6f\n", lambertian(0.8, 10, normal, light)); /* 1.273240 W/(m² sr) */
}`,
    rust: String.raw`fn unit(v: [f64; 3]) -> [f64; 3] {
    let length = v[0].hypot(v[1]).hypot(v[2]);
    assert!(length > 0.0 && length.is_finite());
    v.map(|x| x / length)
}
fn lambertian(rho: f64, beam_irradiance: f64, n: [f64; 3], l: [f64; 3]) -> f64 {
    assert!((0.0..=1.0).contains(&rho) && beam_irradiance >= 0.0);
    let n = unit(n); let l = unit(l);
    let cosine: f64 = (0..3).map(|i| n[i] * l[i]).sum();
    rho / std::f64::consts::PI * beam_irradiance * cosine.clamp(0.0, 1.0)
}
fn main() {
    println!("{:.6}", lambertian(0.8, 10.0, [0.0, 0.0, 1.0], [3.0_f64.sqrt(), 0.0, 1.0]));
    // 1.273240 W/(m² sr), using perpendicular-plane beam irradiance.
}`,
  },
};
