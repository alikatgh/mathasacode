// Translations of top-level README code fences, indexed from one.
// Examples use only the language standard libraries.

export const advanced = {
  32: {
    python: String.raw`# Two conventions for the natural numbers:
# N = {0, 1, 2, 3, ...}
# N = {1, 2, 3, 4, ...}`,
    c: String.raw`// Two conventions for the natural numbers:
// N = {0, 1, 2, 3, ...}
// N = {1, 2, 3, 4, ...}`,
    rust: String.raw`// Two conventions for the natural numbers:
// N = {0, 1, 2, 3, ...}
// N = {1, 2, 3, 4, ...}`
  },
  33: {
    python: String.raw`import math

def is_natural_number(n):
    if isinstance(n, bool):
        return False
    if isinstance(n, int):
        return n >= 0  # Python integers may be arbitrarily large.
    return isinstance(n, float) and math.isfinite(n) and n >= 0 and n.is_integer()`,
    c: String.raw`#include <stdbool.h>
#include <math.h>

bool is_natural_number(double n) {
    return isfinite(n) && n >= 0 && trunc(n) == n;
}`,
    rust: String.raw`fn is_natural_number(n: f64) -> bool {
    n.is_finite() && n >= 0.0 && n.trunc() == n
}`
  },
  34: {
    python: String.raw`def square(x):
    return x ** 2`,
    c: String.raw`double square(double x) {
    return x * x;
}`,
    rust: String.raw`fn square(x: f64) -> f64 {
    x.powi(2)
}`
  },
  35: {
    python: String.raw`import math

def length(x, y):
    return math.sqrt(x * x + y * y)`,
    c: String.raw`#include <math.h>

double length(double x, double y) {
    return sqrt(x * x + y * y);
}`,
    rust: String.raw`fn length(x: f64, y: f64) -> f64 {
    (x * x + y * y).sqrt()
}`
  },
  36: {
    python: String.raw`def f(x):
    if x >= 1:
        return (x ** 2 - x) / x
    return 0`,
    c: String.raw`double f(double x) {
    if (x >= 1) {
        return (x * x - x) / x;
    }
    return 0;
}`,
    rust: String.raw`fn f(x: f64) -> f64 {
    if x >= 1.0 {
        (x * x - x) / x
    } else {
        0.0
    }
}`
  },
  37: {
    python: String.raw`def sgn(x):
    if x < 0:
        return -1
    if x > 0:
        return 1
    return 0`,
    c: String.raw`int sgn(double x) {
    if (x < 0) return -1;
    if (x > 0) return 1;
    return 0;
}`,
    rust: String.raw`fn sgn(x: f64) -> i32 {
    if x < 0.0 { -1 } else if x > 0.0 { 1 } else { 0 }
}`
  },
  38: {
    python: String.raw`def square(a: float) -> float:
    """Square a real number; reject non-numeric values."""
    if isinstance(a, bool) or not isinstance(a, (int, float)):
        raise TypeError("expected a number")
    return a ** 2`,
    c: String.raw`// The function's parameter type is checked by the C compiler.
double square(double a) {
    return a * a;
}`,
    rust: String.raw`// Rust checks the parameter type before the program runs.
fn square(a: f64) -> f64 {
    a.powi(2)
}`
  },
  39: {
    python: String.raw`def f(x):
    return x ** 2

def f_prime(x):
    return 2 * x`,
    c: String.raw`double f(double x) {
    return x * x;
}

double f_prime(double x) {
    return 2 * x;
}`,
    rust: String.raw`fn f(x: f64) -> f64 {
    x.powi(2)
}

fn f_prime(x: f64) -> f64 {
    2.0 * x
}`
  },
  40: {
    python: String.raw`import math

# x is the real-valued input.
def bounds(x):
    return math.floor(x), math.ceil(x)`,
    c: String.raw`#include <math.h>

void bounds(double x, double *lower, double *upper) {
    *lower = floor(x);
    *upper = ceil(x);
}`,
    rust: String.raw`fn bounds(x: f64) -> (f64, f64) {
    (x.floor(), x.ceil())
}`
  },
  41: {
    python: String.raw`import math

def js_round(x):
    # JavaScript resolves halfway ties toward +infinity.
    # Python's built-in round uses ties to even instead.
    if not math.isfinite(x) or x == 0:
        return x
    lower = math.floor(x)
    rounded = lower if x - lower < 0.5 else lower + 1
    return math.copysign(0.0, x) if rounded == 0 else float(rounded)

# js_round(x)`,
    c: String.raw`#include <math.h>

double js_round(double x) {
    // C round() resolves halfway ties away from zero.
    // Match JavaScript's ties toward +infinity, including -0.
    if (!isfinite(x) || x == 0) return x;
    double lower = floor(x);
    double rounded = x - lower < 0.5 ? lower : lower + 1;
    return rounded == 0 ? copysign(0.0, x) : rounded;
}`,
    rust: String.raw`fn js_round(x: f64) -> f64 {
    // f64::round() resolves halfway ties away from zero.
    // Match JavaScript's ties toward +infinity, including -0.
    if !x.is_finite() || x == 0.0 { return x; }
    let lower = x.floor();
    let rounded = if x - lower < 0.5 { lower } else { lower + 1.0 };
    if rounded == 0.0 { 0.0_f64.copysign(x) } else { rounded }
}`
  },
  42: {
    python: String.raw`def check_implication(A, B):
    if A is True:
        assert B is True`,
    c: String.raw`#include <stdbool.h>
#include <assert.h>

void check_implication(bool a, bool b) {
    if (a) {
        assert(b);
    }
}`,
    rust: String.raw`fn check_implication(a: bool, b: bool) {
    if a {
        assert!(b);
    }
}`
  },
  43: {
    python: String.raw`assert 50 > 2
assert 2 < 10
assert 3 <= 4
assert 4 >= 4`,
    c: String.raw`#include <assert.h>

int main(void) {
    assert(50 > 2);
    assert(2 < 10);
    assert(3 <= 4);
    assert(4 >= 4);
}`,
    rust: String.raw`fn main() {
    assert!(50 > 2);
    assert!(2 < 10);
    assert!(3 <= 4);
    assert!(4 >= 4);
}`
  },
  44: {
    python: String.raw`import math

def has_larger_order(k, j):
    # Positive finite inputs; use the next example's truncation convention.
    return math.trunc(math.log10(k)) > math.trunc(math.log10(j))`,
    c: String.raw`#include <stdbool.h>
#include <math.h>

bool has_larger_order(double k, double j) {
    // Positive finite inputs; truncation is toward zero.
    return trunc(log10(k)) > trunc(log10(j));
}`,
    rust: String.raw`fn has_larger_order(k: f64, j: f64) -> bool {
    // Positive finite inputs; truncation is toward zero.
    k.log10().trunc() > j.log10().trunc()
}`
  },
  45: {
    python: String.raw`import math

def log10(n):
    return math.log10(n)

def order_of_magnitude(n):
    # Positive finite n; matches the source's truncation toward zero.
    return math.trunc(log10(n))`,
    c: String.raw`#include <math.h>

double order_of_magnitude(double n) {
    // log10 is provided by <math.h>; n must be positive and finite.
    return trunc(log10(n));
}`,
    rust: String.raw`fn order_of_magnitude(n: f64) -> f64 {
    // Positive finite n; matches truncation toward zero.
    n.log10().trunc()
}`
  },
  46: {
    python: String.raw`def check_integer(k: int):
    # This implication assumes k is an integer.
    if k > 2 and k < 4:
        assert k == 3`,
    c: String.raw`#include <assert.h>

void check_integer(int k) {
    if (k > 2 && k < 4) {
        assert(k == 3);
    }
}`,
    rust: String.raw`fn check_integer(k: i32) {
    if k > 2 && k < 4 {
        assert_eq!(k, 3);
    }
}`
  },
  47: {
    python: String.raw`def check_three(k):
    if k == 3:
        assert k > 2 and k < 4`,
    c: String.raw`#include <assert.h>

void check_three(double k) {
    if (k == 3) {
        assert(k > 2 && k < 4);
    }
}`,
    rust: String.raw`fn check_three(k: f64) {
    if k == 3.0 {
        assert!(k > 2.0 && k < 4.0);
    }
}`
  },
  48: {
    python: String.raw`def either(A: bool, B: bool) -> bool:
    return A or B`,
    c: String.raw`#include <stdbool.h>

bool either(bool a, bool b) {
    return a || b;
}`,
    rust: String.raw`fn either(a: bool, b: bool) -> bool {
    a || b
}`
  },
  49: {
    python: String.raw`def check_different(x, y):
    if x != y:
        assert not (x == y)`,
    c: String.raw`#include <assert.h>

void check_different(double x, double y) {
    if (x != y) {
        assert(!(x == y));
    }
}`,
    rust: String.raw`fn check_different(x: f64, y: f64) {
    if x != y {
        assert!(!(x == y));
    }
}`
  },
  50: {
    python: String.raw`import math

a = (math.nextafter(0, math.inf), math.nextafter(1, -math.inf)) # (0, 1)
b = (math.nextafter(0, math.inf), 1.0)                       # (0, 1]
c = (0.0, math.nextafter(1, -math.inf))                      # [0, 1)
d = (0.0, 1.0)                                              # [0, 1]`,
    c: String.raw`#include <math.h>

int main(void) {
    double a[2] = {nextafter(0, INFINITY), nextafter(1, -INFINITY)}; // (0, 1)
    double b[2] = {nextafter(0, INFINITY), 1};                     // (0, 1]
    double c[2] = {0, nextafter(1, -INFINITY)};                    // [0, 1)
    double d[2] = {0, 1};                                         // [0, 1]
    (void)a; (void)b; (void)c; (void)d;
}`,
    rust: String.raw`fn main() {
    let a = (0.0_f64.next_up(), 1.0_f64.next_down()); // (0, 1)
    let b = (0.0_f64.next_up(), 1.0);                 // (0, 1]
    let c = (0.0, 1.0_f64.next_down());               // [0, 1)
    let d = (0.0, 1.0);                             // [0, 1]
    let _ = (a, b, c, d);
}`
  },
  51: {
    python: String.raw`import math

# Floating-point endpoint representation of a = [3, 5), b = [4, 6].
a = (3.0, math.nextafter(5, -math.inf))
b = (4.0, 6.0)

intersection = (max(a[0], b[0]), min(a[1], b[1]))
union = (min(a[0], b[0]), max(a[1], b[1])) # These intervals overlap.
a_minus_b = (a[0], math.nextafter(b[0], -math.inf))
b_minus_a = (math.nextafter(a[1], math.inf), b[1])

print(intersection) # (4.0, 4.999999999999999)
print(union)        # (3.0, 6.0)
print(a_minus_b)    # (3.0, 3.9999999999999996)
print(b_minus_a)    # (5.0, 6.0)`,
    c: String.raw`#include <math.h>
#include <stdio.h>

int main(void) {
    // These intervals overlap: a = [3, 5), b = [4, 6].
    double a[2] = {3, nextafter(5, -INFINITY)}, b[2] = {4, 6};
    double intersection[2] = {fmax(a[0], b[0]), fmin(a[1], b[1])};
    double combined[2] = {fmin(a[0], b[0]), fmax(a[1], b[1])};
    double a_minus_b[2] = {a[0], nextafter(b[0], -INFINITY)};
    double b_minus_a[2] = {nextafter(a[1], INFINITY), b[1]};
    printf("[%.17g, %.17g]\n", intersection[0], intersection[1]);
    printf("[%.17g, %.17g]\n", combined[0], combined[1]);
    printf("[%.17g, %.17g]\n", a_minus_b[0], a_minus_b[1]);
    printf("[%.17g, %.17g]\n", b_minus_a[0], b_minus_a[1]);
}`,
    rust: String.raw`fn main() {
    // These intervals overlap: a = [3, 5), b = [4, 6].
    let a = (3.0_f64, 5.0_f64.next_down());
    let b = (4.0_f64, 6.0_f64);
    let intersection = (a.0.max(b.0), a.1.min(b.1));
    let union = (a.0.min(b.0), a.1.max(b.1));
    let a_minus_b = (a.0, b.0.next_down());
    let b_minus_a = (a.1.next_up(), b.1);
    println!("{intersection:?}"); // (4.0, 4.999999999999999)
    println!("{union:?}");        // (3.0, 6.0)
    println!("{a_minus_b:?}");    // (3.0, 3.9999999999999996)
    println!("{b_minus_a:?}");    // (5.0, 6.0)
}`
  },
  52: {
    python: String.raw`def multiply_matrices(a, b):
    # Nonempty rectangular arrays with matching inner dimensions.
    assert len(a[0]) == len(b)
    return [
        [sum(row[k] * b[k][j] for k in range(len(b)))
         for j in range(len(b[0]))]
        for row in a
    ]

a = [[1, 2, 3], [4, 5, 6]]
b = [[7, 8], [9, 10], [11, 12]]
print(multiply_matrices(a, b)) # [[58, 64], [139, 154]]`,
    c: String.raw`#include <stddef.h>
#include <stdio.h>

// Nonempty matrices; matching inner dimension n. C99 array parameters.
void multiply_matrices(size_t m, size_t n, size_t p,
                       const double a[m][n], const double b[n][p],
                       double result[m][p]) {
    for (size_t i = 0; i < m; ++i) {
        for (size_t j = 0; j < p; ++j) {
            result[i][j] = 0;
            for (size_t k = 0; k < n; ++k)
                result[i][j] += a[i][k] * b[k][j];
        }
    }
}

int main(void) {
    const double a[2][3] = {{1, 2, 3}, {4, 5, 6}};
    const double b[3][2] = {{7, 8}, {9, 10}, {11, 12}};
    double result[2][2];
    multiply_matrices(2, 3, 2, a, b, result);
    for (size_t i = 0; i < 2; ++i)
        printf("[%.0f, %.0f]\n", result[i][0], result[i][1]);
    // [58, 64], [139, 154]
}`,
    rust: String.raw`fn multiply_matrices(a: &[Vec<f64>], b: &[Vec<f64>]) -> Vec<Vec<f64>> {
    // Nonempty rectangular matrices, with matching inner dimensions.
    assert!(!a.is_empty() && !b.is_empty());
    let n = b.len();
    let p = b[0].len();
    assert!(a.iter().all(|row| row.len() == n));
    assert!(b.iter().all(|row| row.len() == p));
    a.iter().map(|row| {
        (0..p).map(|j| (0..n).map(|k| row[k] * b[k][j]).sum()).collect()
    }).collect()
}

fn main() {
    let a = vec![vec![1.0, 2.0, 3.0], vec![4.0, 5.0, 6.0]];
    let b = vec![vec![7.0, 8.0], vec![9.0, 10.0], vec![11.0, 12.0]];
    println!("{:?}", multiply_matrices(&a, &b)); // [[58.0, 64.0], [139.0, 154.0]]
}`
  },
  53: {
    python: String.raw`def kronecker_product(a, b):
    # Nonempty rectangular arrays.
    return [
        [value_a * value_b for value_a in row_a for value_b in row_b]
        for row_a in a for row_b in b
    ]

print(kronecker_product([[1], [2]], [[3, 4, 5]]))
# [[3, 4, 5], [6, 8, 10]]`,
    c: String.raw`#include <stddef.h>
#include <stdio.h>

// Nonempty rectangular arrays; C99 array parameters.
void kronecker_product(size_t m, size_t n, size_t p, size_t q,
                       const double a[m][n], const double b[p][q],
                       double result[m * p][n * q]) {
    for (size_t i = 0; i < m; ++i)
        for (size_t j = 0; j < n; ++j)
            for (size_t k = 0; k < p; ++k)
                for (size_t l = 0; l < q; ++l)
                    result[i * p + k][j * q + l] = a[i][j] * b[k][l];
}

int main(void) {
    const double a[2][1] = {{1}, {2}}, b[1][3] = {{3, 4, 5}};
    double result[2][3];
    kronecker_product(2, 1, 1, 3, a, b, result);
    for (size_t i = 0; i < 2; ++i)
        printf("[%.0f, %.0f, %.0f]\n", result[i][0], result[i][1], result[i][2]);
    // [3, 4, 5], [6, 8, 10]
}`,
    rust: String.raw`fn kronecker_product(a: &[Vec<f64>], b: &[Vec<f64>]) -> Vec<Vec<f64>> {
    // Nonempty rectangular arrays.
    let (m, n, p, q) = (a.len(), a[0].len(), b.len(), b[0].len());
    let mut result = vec![vec![0.0; n * q]; m * p];
    for i in 0..m {
        for j in 0..n {
            for k in 0..p {
                for l in 0..q {
                    result[i * p + k][j * q + l] = a[i][j] * b[k][l];
                }
            }
        }
    }
    result
}

fn main() {
    let a = vec![vec![1.0], vec![2.0]];
    let b = vec![vec![3.0, 4.0, 5.0]];
    println!("{:?}", kronecker_product(&a, &b));
    // [[3.0, 4.0, 5.0], [6.0, 8.0, 10.0]]
}`
  },
  54: {
    python: String.raw`def kronecker_product(a, b):
    # Nonempty rectangular arrays.
    return [
        [value_a * value_b for value_a in row_a for value_b in row_b]
        for row_a in a for row_b in b
    ]

print(kronecker_product([[1, 2], [3, 4]], [[0, 5], [6, 7]]))
# [[0, 5, 0, 10], [6, 7, 12, 14],
#  [0, 15, 0, 20], [18, 21, 24, 28]]`,
    c: String.raw`#include <stddef.h>
#include <stdio.h>

// Nonempty rectangular arrays; C99 array parameters.
void kronecker_product(size_t m, size_t n, size_t p, size_t q,
                       const double a[m][n], const double b[p][q],
                       double result[m * p][n * q]) {
    for (size_t i = 0; i < m; ++i)
        for (size_t j = 0; j < n; ++j)
            for (size_t k = 0; k < p; ++k)
                for (size_t l = 0; l < q; ++l)
                    result[i * p + k][j * q + l] = a[i][j] * b[k][l];
}

int main(void) {
    const double a[2][2] = {{1, 2}, {3, 4}}, b[2][2] = {{0, 5}, {6, 7}};
    double result[4][4];
    kronecker_product(2, 2, 2, 2, a, b, result);
    for (size_t i = 0; i < 4; ++i)
        printf("[%.0f, %.0f, %.0f, %.0f]\n",
               result[i][0], result[i][1], result[i][2], result[i][3]);
    // [0, 5, 0, 10], [6, 7, 12, 14],
    // [0, 15, 0, 20], [18, 21, 24, 28]
}`,
    rust: String.raw`fn kronecker_product(a: &[Vec<f64>], b: &[Vec<f64>]) -> Vec<Vec<f64>> {
    // Nonempty rectangular arrays.
    let (m, n, p, q) = (a.len(), a[0].len(), b.len(), b[0].len());
    let mut result = vec![vec![0.0; n * q]; m * p];
    for i in 0..m {
        for j in 0..n {
            for k in 0..p {
                for l in 0..q {
                    result[i * p + k][j * q + l] = a[i][j] * b[k][l];
                }
            }
        }
    }
    result
}

fn main() {
    let a = vec![vec![1.0, 2.0], vec![3.0, 4.0]];
    let b = vec![vec![0.0, 5.0], vec![6.0, 7.0]];
    println!("{:?}", kronecker_product(&a, &b));
    // [[0.0, 5.0, 0.0, 10.0], [6.0, 7.0, 12.0, 14.0],
    //  [0.0, 15.0, 0.0, 20.0], [18.0, 21.0, 24.0, 28.0]]
}`
  },
  55: {
    python: String.raw`def f(x):
    return x * x

old_x = 2
new_x = 3
delta_x = new_x - old_x         # 1
delta_f = f(new_x) - f(old_x)   # 5`,
    c: String.raw`#include <stdio.h>

double f(double x) { return x * x; }

int main(void) {
    double old_x = 2, new_x = 3;
    double delta_x = new_x - old_x;
    double delta_f = f(new_x) - f(old_x);
    printf("%g %g\n", delta_x, delta_f); // 1 5
}`,
    rust: String.raw`fn f(x: f64) -> f64 { x * x }

fn main() {
    let (old_x, new_x) = (2.0, 3.0);
    let delta_x = new_x - old_x;
    let delta_f = f(new_x) - f(old_x);
    println!("{delta_x} {delta_f}"); // 1 5
}`
  },
  56: {
    python: String.raw`def kronecker_delta(i, j):
    return int(i == j)

print(kronecker_delta(2, 2)) # 1
print(kronecker_delta(2, 3)) # 0`,
    c: String.raw`#include <stdio.h>

int kronecker_delta(int i, int j) {
    return i == j ? 1 : 0;
}

int main(void) {
    printf("%d\n", kronecker_delta(2, 2)); // 1
    printf("%d\n", kronecker_delta(2, 3)); // 0
}`,
    rust: String.raw`fn kronecker_delta(i: usize, j: usize) -> i32 {
    if i == j { 1 } else { 0 }
}

fn main() {
    println!("{}", kronecker_delta(2, 2)); // 1
    println!("{}", kronecker_delta(2, 3)); // 0
}`
  },
  57: {
    python: String.raw`import math

def finite_number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TypeError("expected a finite real number")
    try:
        value = float(value)
    except OverflowError as error:
        raise ValueError("number is outside the floating-point range") from error
    if not math.isfinite(value):
        raise ValueError("expected a finite real number")
    return value

def derivative(f, x, h=0.00001):
    if not callable(f):
        raise TypeError("f must be callable")
    x, h = finite_number(x), finite_number(h)
    if h <= 0:
        raise ValueError("h must be positive")
    lower = finite_number(x - h)
    upper = finite_number(x + h)
    denominator = finite_number(2 * h)
    if lower >= x or upper <= x:
        raise ValueError("h must change x in floating-point arithmetic")
    difference = finite_number(finite_number(f(upper)) - finite_number(f(lower)))
    return finite_number(difference / denominator)

print(derivative(lambda x: x * x, 2, 0.00001)) # approximately 4`,
    c: String.raw`#include <errno.h>
#include <math.h>
#include <stdio.h>

double square(double x) { return x * x; }

// Invalid inputs or non-finite arithmetic return NAN and set errno.
double derivative(double (*f)(double), double x, double h) {
    if (!f || !isfinite(x) || !isfinite(h) || h <= 0) {
        errno = EDOM;
        return NAN;
    }
    double lower = x - h, upper = x + h, denominator = 2 * h;
    if (!isfinite(lower) || !isfinite(upper) || !isfinite(denominator)
        || lower >= x || upper <= x) {
        errno = ERANGE;
        return NAN;
    }
    double left = f(lower), right = f(upper);
    if (!isfinite(left) || !isfinite(right)) {
        errno = EDOM;
        return NAN;
    }
    double difference = right - left;
    double result = difference / denominator;
    if (!isfinite(difference) || !isfinite(result)) {
        errno = ERANGE;
        return NAN;
    }
    return result;
}

int main(void) {
    printf("%.10f\n", derivative(square, 2, 0.00001)); // approximately 4
}`,
    rust: String.raw`fn derivative(f: impl Fn(f64) -> f64, x: f64, h: f64) -> f64 {
    assert!(x.is_finite() && h.is_finite() && h > 0.0,
            "x must be finite and h must be finite and positive");
    let (lower, upper, denominator) = (x - h, x + h, 2.0 * h);
    assert!(lower.is_finite() && upper.is_finite() && denominator.is_finite(),
            "sample points and denominator must remain finite");
    assert!(lower < x && upper > x, "h must change x in floating-point arithmetic");
    let (left, right) = (f(lower), f(upper));
    assert!(left.is_finite() && right.is_finite(), "function values must be finite");
    let difference = right - left;
    let result = difference / denominator;
    assert!(difference.is_finite() && result.is_finite(), "derivative must remain finite");
    result
}

fn main() {
    println!("{:.10}", derivative(|x| x * x, 2.0, 0.00001)); // approximately 4
}`
  },
  58: {
    python: String.raw`weights = [0.0, 0.0]
samples = [([1.0, 0.0], 2.0), ([0.0, 1.0], 4.0)]
eta = 0.5
m = len(samples)

def loss(w):
    return sum(
        (sum(wj * xj for wj, xj in zip(w, x)) - y) ** 2
        for x, y in samples
    ) / (2 * m)

gradient = [0.0] * len(weights)
for x, y in samples:
    error = sum(wj * xj for wj, xj in zip(weights, x)) - y
    for j in range(len(weights)):
        gradient[j] += error * x[j] / m

# Compute every gradient component before updating any weight.
new_weights = [w - eta * g for w, g in zip(weights, gradient)]
print(gradient)         # [-1.0, -2.0]
print(new_weights)      # [0.5, 1.0]
print(loss(weights))    # 5.0
print(loss(new_weights)) # 2.8125
print(weights)          # [0.0, 0.0], unchanged`,
    c: String.raw`#include <stddef.h>
#include <stdio.h>

typedef struct { double x[2], y; } Sample;

double loss(const double w[2], const Sample samples[], size_t m) {
    double total = 0;
    for (size_t i = 0; i < m; ++i) {
        double error = w[0] * samples[i].x[0] + w[1] * samples[i].x[1]
                       - samples[i].y;
        total += error * error;
    }
    return total / (2 * m);
}

int main(void) {
    const double weights[2] = {0, 0};
    const Sample samples[2] = {{{1, 0}, 2}, {{0, 1}, 4}};
    const size_t m = 2;
    const double eta = 0.5;
    double gradient[2] = {0, 0}, updated[2];
    for (size_t i = 0; i < m; ++i) {
        double error = weights[0] * samples[i].x[0]
                       + weights[1] * samples[i].x[1] - samples[i].y;
        for (size_t j = 0; j < 2; ++j)
            gradient[j] += error * samples[i].x[j] / m;
    }
    // All components use the old weights; update only after the gradient is ready.
    for (size_t j = 0; j < 2; ++j)
        updated[j] = weights[j] - eta * gradient[j];
    printf("gradient: [%g, %g]\n", gradient[0], gradient[1]); // [-1, -2]
    printf("weights: [%g, %g]\n", updated[0], updated[1]);    // [0.5, 1]
    printf("losses: %g -> %g\n", loss(weights, samples, m), loss(updated, samples, m));
    // 5 -> 2.8125; weights remains [0, 0].
}`,
    rust: String.raw`fn loss(w: &[f64; 2], samples: &[([f64; 2], f64)]) -> f64 {
    samples.iter().map(|(x, y)| {
        let error = w[0] * x[0] + w[1] * x[1] - y;
        error * error
    }).sum::<f64>() / (2.0 * samples.len() as f64)
}

fn main() {
    let weights = [0.0, 0.0];
    let samples = [([1.0, 0.0], 2.0), ([0.0, 1.0], 4.0)];
    let eta = 0.5;
    let mut gradient = [0.0; 2];
    for (x, y) in &samples {
        let error = weights[0] * x[0] + weights[1] * x[1] - y;
        for j in 0..2 {
            gradient[j] += error * x[j] / samples.len() as f64;
        }
    }
    // All gradient components use the old weights.
    let updated = [weights[0] - eta * gradient[0], weights[1] - eta * gradient[1]];
    println!("gradient: {gradient:?}"); // [-1.0, -2.0]
    println!("weights: {updated:?}");   // [0.5, 1.0]
    println!("losses: {} -> {}", loss(&weights, &samples), loss(&updated, &samples));
    // 5 -> 2.8125; weights remains [0.0, 0.0].
}`
  },
  59: {
    python: String.raw`def antiderivative(C):
    return lambda x: x * x + C

print(antiderivative(0)(3)) # 9
print(antiderivative(7)(3)) # 16`,
    c: String.raw`#include <stdio.h>

// C passes the captured constant explicitly instead of returning a closure.
double antiderivative(double x, double constant) {
    return x * x + constant;
}

int main(void) {
    printf("%g\n", antiderivative(3, 0)); // 9
    printf("%g\n", antiderivative(3, 7)); // 16
}`,
    rust: String.raw`fn antiderivative(constant: f64) -> impl Fn(f64) -> f64 {
    move |x| x * x + constant
}

fn main() {
    println!("{}", antiderivative(0.0)(3.0)); // 9
    println!("{}", antiderivative(7.0)(3.0)); // 16
}`
  },
  60: {
    python: String.raw`def integrate_trapezoid(f, a, b, n=1000):
    if not isinstance(n, int) or not 1 <= n <= 1_000_000:
        raise ValueError("n must be an integer from 1 to 1,000,000")
    h = (b - a) / n
    total = (f(a) + f(b)) / 2
    total += sum(f(a + i * h) for i in range(1, n))
    return h * total

print(integrate_trapezoid(lambda x: x * x, 0, 1, 1000)) # approximately 0.3333335
print(integrate_trapezoid(lambda x: x * x, 1, 0, 1000)) # approximately -0.3333335`,
    c: String.raw`#include <assert.h>
#include <stddef.h>
#include <stdio.h>

double square(double x) { return x * x; }

double integrate_trapezoid(double (*f)(double), double a, double b, size_t n) {
    assert(n > 0 && n <= 1000000);
    double h = (b - a) / n;
    double total = (f(a) + f(b)) / 2;
    for (size_t i = 1; i < n; ++i) total += f(a + i * h);
    return h * total;
}

int main(void) {
    printf("%.10f\n", integrate_trapezoid(square, 0, 1, 1000)); // 0.3333335
    printf("%.10f\n", integrate_trapezoid(square, 1, 0, 1000)); // -0.3333335
}`,
    rust: String.raw`fn integrate_trapezoid(f: impl Fn(f64) -> f64, a: f64, b: f64, n: usize) -> f64 {
    assert!(n > 0 && n <= 1_000_000);
    let h = (b - a) / n as f64;
    let mut total = (f(a) + f(b)) / 2.0;
    for i in 1..n { total += f(a + i as f64 * h); }
    h * total
}

fn main() {
    println!("{:.10}", integrate_trapezoid(|x| x * x, 0.0, 1.0, 1000)); // 0.3333335
    println!("{:.10}", integrate_trapezoid(|x| x * x, 1.0, 0.0, 1000)); // -0.3333335
}`
  },
  61: {
    python: String.raw`import math

def finite_number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TypeError("expected a finite real number")
    try:
        value = float(value)
    except OverflowError as error:
        raise ValueError("number is outside the floating-point range") from error
    if not math.isfinite(value):
        raise ValueError("expected a finite real number")
    return value

def unit_vector(vector):
    if not isinstance(vector, (list, tuple)) or len(vector) != 3:
        raise ValueError("expected a three-component vector")
    values = [finite_number(value) for value in vector]
    scale = max(abs(value) for value in values)
    if scale == 0:
        raise ValueError("vector must be nonzero")
    # Scale before squaring or multiplying large components.
    scaled = [value / scale for value in values]
    length = math.sqrt(math.fsum(value * value for value in scaled))
    return [value / length for value in scaled]

def lambertian_reflection(reflectance, irradiance, normal, light):
    reflectance, irradiance = finite_number(reflectance), finite_number(irradiance)
    if not 0 <= reflectance <= 1 or irradiance < 0:
        raise ValueError("reflectance must be in [0, 1] and irradiance nonnegative")
    n, wi = unit_vector(normal), unit_vector(light)
    cosine = max(0.0, min(1.0, math.fsum(a * b for a, b in zip(n, wi))))
    return finite_number(reflectance * (irradiance / math.pi) * cosine)

reflectance = 0.5
beam_irradiance = 2 * math.pi # W/m², on a plane perpendicular to the beam
normal = [0, 0, 1]
light_direction = [0, math.sqrt(3), 1] # normalized by the function
print(lambertian_reflection(reflectance, beam_irradiance, normal, light_direction))
# approximately 0.5 W/(m² sr)`,
    c: String.raw`#include <stdbool.h>
#include <errno.h>
#include <math.h>
#include <stdio.h>

bool normalize3(const double vector[3], double unit[3]) {
    if (!vector || !unit) return false;
    double scale = 0;
    for (int i = 0; i < 3; ++i) {
        if (!isfinite(vector[i])) return false;
        scale = fmax(scale, fabs(vector[i]));
    }
    if (scale == 0) return false;
    // Scale before squaring or multiplying large components.
    double squared_length = 0;
    for (int i = 0; i < 3; ++i) {
        unit[i] = vector[i] / scale;
        squared_length += unit[i] * unit[i];
    }
    double length = sqrt(squared_length);
    for (int i = 0; i < 3; ++i) unit[i] /= length;
    return true;
}

// Invalid inputs return NAN and set errno.
double lambertian_reflection(double reflectance, double irradiance,
                              const double normal[3], const double light[3]) {
    double n[3], wi[3];
    if (!isfinite(reflectance) || !isfinite(irradiance)
        || reflectance < 0 || reflectance > 1 || irradiance < 0
        || !normalize3(normal, n) || !normalize3(light, wi)) {
        errno = EDOM;
        return NAN;
    }
    double dot = n[0] * wi[0] + n[1] * wi[1] + n[2] * wi[2];
    double cosine = fmax(0, fmin(1, dot));
    double result = reflectance * (irradiance / acos(-1.0)) * cosine;
    if (!isfinite(result)) {
        errno = ERANGE;
        return NAN;
    }
    return result;
}

int main(void) {
    const double normal[3] = {0, 0, 1}, light[3] = {0, sqrt(3), 1};
    double result = lambertian_reflection(0.5, 2 * acos(-1.0), normal, light);
    printf("%.10f\n", result); // approximately 0.5 W/(m² sr)
}`,
    rust: String.raw`use std::f64::consts::PI;

fn normalize3(vector: [f64; 3]) -> [f64; 3] {
    assert!(vector.iter().all(|value| value.is_finite()), "vector must be finite");
    let scale = vector.iter().fold(0.0_f64, |scale, value| scale.max(value.abs()));
    assert!(scale > 0.0, "vector must be nonzero");
    // Scale before squaring or multiplying large components.
    let scaled = vector.map(|value| value / scale);
    let length = scaled.iter().map(|value| value * value).sum::<f64>().sqrt();
    scaled.map(|value| value / length)
}

fn lambertian_reflection(reflectance: f64, irradiance: f64,
                        normal: [f64; 3], light: [f64; 3]) -> f64 {
    assert!(reflectance.is_finite() && irradiance.is_finite()
            && (0.0..=1.0).contains(&reflectance) && irradiance >= 0.0,
            "reflectance must be in [0, 1] and irradiance finite and nonnegative");
    let n = normalize3(normal);
    let wi = normalize3(light);
    let cosine = n.iter().zip(wi).map(|(a, b)| a * b).sum::<f64>().clamp(0.0, 1.0);
    let result = reflectance * (irradiance / PI) * cosine;
    assert!(result.is_finite(), "reflected radiance must remain finite");
    result
}

fn main() {
    let normal = [0.0, 0.0, 1.0];
    let light = [0.0, 3.0_f64.sqrt(), 1.0];
    let result = lambertian_reflection(0.5, 2.0 * PI, normal, light);
    println!("{result:.10}"); // approximately 0.5 W/(m² sr)
}`
  }
}

export const chineseOverrides = {
  52: {
    python: String.raw`def multiply_matrices(a, b):
    # 非空矩形数组；a 的列数等于 b 的行数。
    assert len(a[0]) == len(b)
    return [
        [sum(row[k] * b[k][j] for k in range(len(b)))
         for j in range(len(b[0]))]
        for row in a
    ]

a = [[1, 2], [3, 4]]
b = [[5, 6], [7, 8]]
print(multiply_matrices(a, b)) # [[19, 22], [43, 50]]`,
    c: String.raw`#include <stdio.h>

int main(void) {
    double A[2][2] = {{1, 2}, {3, 4}};
    double B[2][2] = {{5, 6}, {7, 8}}, C[2][2] = {{0}};
    for (int i = 0; i < 2; ++i)
        for (int j = 0; j < 2; ++j)
            for (int k = 0; k < 2; ++k)
                C[i][j] += A[i][k] * B[k][j];
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
}`
  },
  55: {
    python: String.raw`x0, x1 = 2, 2.5
f = lambda x: x * x
delta_x = x1 - x0             # 0.5
delta_f = f(x1) - f(x0)       # 2.25
average_rate = delta_f / delta_x # 4.5`,
    c: String.raw`#include <stdio.h>

double f(double x) { return x * x; }

int main(void) {
    double x0 = 2, x1 = 2.5;
    double delta_x = x1 - x0;
    double delta_f = f(x1) - f(x0);
    double average_rate = delta_f / delta_x;
    printf("%g %g %g\n", delta_x, delta_f, average_rate); // 0.5 2.25 4.5
}`,
    rust: String.raw`fn f(x: f64) -> f64 { x * x }

fn main() {
    let (x0, x1) = (2.0, 2.5);
    let delta_x = x1 - x0;
    let delta_f = f(x1) - f(x0);
    let average_rate = delta_f / delta_x;
    println!("{delta_x} {delta_f} {average_rate}"); // 0.5 2.25 4.5
}`
  },
  56: {
    python: String.raw`def kronecker_delta(i, j):
    return int(i == j)

print(kronecker_delta(2, 2)) # 1
print(kronecker_delta(2, 3)) # 0
v = [7, 8, 9]
selected = sum(kronecker_delta(1, j) * value for j, value in enumerate(v))
print(selected) # 8，使用从 0 开始的下标`,
    c: String.raw`#include <stddef.h>
#include <stdio.h>

int kronecker_delta(size_t i, size_t j) { return i == j ? 1 : 0; }

int main(void) {
    const int v[3] = {7, 8, 9};
    int selected = 0;
    printf("%d\n", kronecker_delta(2, 2)); // 1
    printf("%d\n", kronecker_delta(2, 3)); // 0
    for (size_t j = 0; j < 3; ++j)
        selected += kronecker_delta(1, j) * v[j];
    printf("%d\n", selected); // 8，下标从 0 开始
}`,
    rust: String.raw`fn kronecker_delta(i: usize, j: usize) -> i32 {
    if i == j { 1 } else { 0 }
}

fn main() {
    println!("{}", kronecker_delta(2, 2)); // 1
    println!("{}", kronecker_delta(2, 3)); // 0
    let v = [7, 8, 9];
    let selected: i32 = v.iter().enumerate()
        .map(|(j, value)| kronecker_delta(1, j) * value).sum();
    println!("{selected}"); // 8，下标从 0 开始
}`
  },
  57: {
    python: String.raw`# 表示 Dirac 分布对测试函数的作用，不是 δ(x) 的点值。
def apply_dirac_at(a, test_function):
    return test_function(a)

print(apply_dirac_at(2, lambda x: x * x)) # 4`,
    c: String.raw`#include <stdio.h>

// 表示分布对测试函数的作用，不是普通函数 δ(x) 的点值。
double apply_dirac_at(double a, double (*test_function)(double)) {
    return test_function(a);
}
double square(double x) { return x * x; }

int main(void) {
    printf("%g\n", apply_dirac_at(2, square)); // 4
}`,
    rust: String.raw`// 表示分布对测试函数的作用，不是普通函数 δ(x) 的点值。
fn apply_dirac_at(a: f64, test_function: impl Fn(f64) -> f64) -> f64 {
    test_function(a)
}

fn main() {
    println!("{}", apply_dirac_at(2.0, |x| x * x)); // 4
}`
  },
  60: {
    python: String.raw`def square_antiderivative(x, C=0):
    return x ** 3 / 3 + C

print(square_antiderivative(2, 0)) # 8 / 3
print(square_antiderivative(2, 5)) # 8 / 3 + 5`,
    c: String.raw`#include <stdio.h>

double square_antiderivative(double x, double constant) {
    return x * x * x / 3 + constant;
}

int main(void) {
    printf("%.10f\n", square_antiderivative(2, 0)); // 8 / 3
    printf("%.10f\n", square_antiderivative(2, 5)); // 8 / 3 + 5
}`,
    rust: String.raw`fn square_antiderivative(x: f64, constant: f64) -> f64 {
    x.powi(3) / 3.0 + constant
}

fn main() {
    println!("{}", square_antiderivative(2.0, 0.0)); // 8 / 3
    println!("{}", square_antiderivative(2.0, 5.0)); // 8 / 3 + 5
}`
  },
  62: {
    python: String.raw`import math

def finite_number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TypeError("expected a finite real number")
    try:
        value = float(value)
    except OverflowError as error:
        raise ValueError("number is outside the floating-point range") from error
    if not math.isfinite(value):
        raise ValueError("expected a finite real number")
    return value

def unit_vector(vector):
    if not isinstance(vector, (list, tuple)) or len(vector) != 3:
        raise ValueError("expected a three-component vector")
    values = [finite_number(value) for value in vector]
    scale = max(abs(value) for value in values)
    if scale == 0:
        raise ValueError("vector must be nonzero")
    # Scale before squaring or multiplying large components.
    scaled = [value / scale for value in values]
    length = math.sqrt(math.fsum(value * value for value in scaled))
    return [value / length for value in scaled]

def lambertian_reflection(reflectance, irradiance, normal, light):
    reflectance, irradiance = finite_number(reflectance), finite_number(irradiance)
    if not 0 <= reflectance <= 1 or irradiance < 0:
        raise ValueError("reflectance must be in [0, 1] and irradiance nonnegative")
    n, wi = unit_vector(normal), unit_vector(light)
    cosine = max(0.0, min(1.0, math.fsum(a * b for a, b in zip(n, wi))))
    return finite_number(reflectance * (irradiance / math.pi) * cosine)

reflectance = 0.5
irradiance = 10 # W/m²，垂直于光束的平面所接收的辐照度
normal = [0, 0, 1]
light_direction = [0, 0, 1] # 从表面指向光源
print(lambertian_reflection(reflectance, irradiance, normal, light_direction))
# 5 / pi，约 1.59155 W/(m² sr)`,
    c: String.raw`#include <stdbool.h>
#include <errno.h>
#include <math.h>
#include <stdio.h>

bool normalize3(const double vector[3], double unit[3]) {
    if (!vector || !unit) return false;
    double scale = 0;
    for (int i = 0; i < 3; ++i) {
        if (!isfinite(vector[i])) return false;
        scale = fmax(scale, fabs(vector[i]));
    }
    if (scale == 0) return false;
    // Scale before squaring or multiplying large components.
    double squared_length = 0;
    for (int i = 0; i < 3; ++i) {
        unit[i] = vector[i] / scale;
        squared_length += unit[i] * unit[i];
    }
    double length = sqrt(squared_length);
    for (int i = 0; i < 3; ++i) unit[i] /= length;
    return true;
}

// Invalid inputs return NAN and set errno.
double lambertian_reflection(double reflectance, double irradiance,
                              const double normal[3], const double light[3]) {
    double n[3], wi[3];
    if (!isfinite(reflectance) || !isfinite(irradiance)
        || reflectance < 0 || reflectance > 1 || irradiance < 0
        || !normalize3(normal, n) || !normalize3(light, wi)) {
        errno = EDOM;
        return NAN;
    }
    double dot = n[0] * wi[0] + n[1] * wi[1] + n[2] * wi[2];
    double cosine = fmax(0, fmin(1, dot));
    double result = reflectance * (irradiance / acos(-1.0)) * cosine;
    if (!isfinite(result)) {
        errno = ERANGE;
        return NAN;
    }
    return result;
}

int main(void) {
    const double normal[3] = {0, 0, 1}, light[3] = {0, 0, 1};
    printf("%.10f\n", lambertian_reflection(0.5, 10, normal, light));
    // 5 / pi，约 1.59155 W/(m² sr)
}`,
    rust: String.raw`use std::f64::consts::PI;

fn normalize3(vector: [f64; 3]) -> [f64; 3] {
    assert!(vector.iter().all(|value| value.is_finite()), "vector must be finite");
    let scale = vector.iter().fold(0.0_f64, |scale, value| scale.max(value.abs()));
    assert!(scale > 0.0, "vector must be nonzero");
    // Scale before squaring or multiplying large components.
    let scaled = vector.map(|value| value / scale);
    let length = scaled.iter().map(|value| value * value).sum::<f64>().sqrt();
    scaled.map(|value| value / length)
}

fn lambertian_reflection(reflectance: f64, irradiance: f64,
                        normal: [f64; 3], light: [f64; 3]) -> f64 {
    assert!(reflectance.is_finite() && irradiance.is_finite()
            && (0.0..=1.0).contains(&reflectance) && irradiance >= 0.0,
            "reflectance must be in [0, 1] and irradiance finite and nonnegative");
    let n = normalize3(normal);
    let wi = normalize3(light);
    let cosine = n.iter().zip(wi).map(|(a, b)| a * b).sum::<f64>().clamp(0.0, 1.0);
    let result = reflectance * (irradiance / PI) * cosine;
    assert!(result.is_finite(), "reflected radiance must remain finite");
    result
}

fn main() {
    let normal = [0.0, 0.0, 1.0];
    let light = [0.0, 0.0, 1.0];
    println!("{:.10}", lambertian_reflection(0.5, 10.0, normal, light));
    // 5 / pi，约 1.59155 W/(m² sr)
}`
  }
}
