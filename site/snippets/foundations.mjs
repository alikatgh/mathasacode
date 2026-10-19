// Translations of README.md top-level code fences 1–31, in source order.
// Each snippet uses only its language standard library unless its comment names the checked project helper.
export const foundations = {
  1: {
    python: `import math

def almost_equal(a, b, epsilon):
    return abs(a - b) <= epsilon

2 == 3                                      # False
2 != 3                                      # True
almost_equal(math.pi, 3.14159, 1e-5)          # True`,
    c: `#include <math.h>
#include <stdbool.h>
#include <stdio.h>

bool almost_equal(double a, double b, double epsilon) {
    return fabs(a - b) <= epsilon;
}

int main(void) {
    /* C prints boolean false/true as 0/1. */
    printf("%d\\n", 2 == 3);                         /* 0 */
    printf("%d\\n", 2 != 3);                         /* 1 */
    printf("%d\\n", almost_equal(acos(-1.0), 3.14159, 1e-5)); /* 1 */
    return 0;
}`,
    rust: `fn almost_equal(a: f64, b: f64, epsilon: f64) -> bool {
    (a - b).abs() <= epsilon
}

fn main() {
    println!("{}", 2 == 3); // false
    println!("{}", 2 != 3); // true
    println!("{}", almost_equal(std::f64::consts::PI, 3.14159, 1e-5)); // true
}`
  },
  2: {
    python: `# k and j are scalar inputs from the surrounding calculation.
def capture_value(k, j):
    x = 2 * k * j  # Snapshot of their current values.
    return x`,
    c: `/* Parameterized scope supplies the scalar inputs k and j. */
double capture_value(double k, double j) {
    double x = 2 * k * j; /* Snapshot of their current values. */
    return x;
}`,
    rust: `// Parameterized scope supplies the scalar inputs k and j.
fn capture_value(k: f64, j: f64) -> f64 {
    let x = 2.0 * k * j; // Snapshot of their current values.
    x
}`
  },
  3: {
    python: `def f(k, j):
    return 2 * k * j`,
    c: `double f(double k, double j) {
    return 2 * k * j;
}`,
    rust: `fn f(k: f64, j: f64) -> f64 {
    2.0 * k * j
}`
  },
  4: {
    python: `# x, k and j are values from the surrounding calculation.
def check_equality(x, k, j):
    assert x == 2 * k * j`,
    c: `#include <assert.h>

/* x, k and j are values from the surrounding calculation. */
void check_equality(double x, double k, double j) {
    assert(x == 2 * k * j);
}`,
    rust: `// x, k and j are values from the surrounding calculation.
fn check_equality(x: f64, k: f64, j: f64) {
    assert!(x == 2.0 * k * j);
}`
  },
  5: {
    python: `import math

x = 9
print(math.sqrt(x))  # 3.0`,
    c: `#include <math.h>
#include <stdio.h>

int main(void) {
    double x = 9;
    printf("%g\\n", sqrt(x)); /* 3 */
    return 0;
}`,
    rust: `fn main() {
    let x: f64 = 9.0;
    println!("{}", x.sqrt()); // 3
}`
  },
  6: {
    python: `import cmath

a = complex(3, -1)
b = cmath.sqrt(-1)  # 1j: Python writes the imaginary unit as j.
print(a * b)        # (1+3j)`,
    c: `#include <complex.h>
#include <stdio.h>

int main(void) {
    double complex a = 3.0 - I;
    double complex b = csqrt(-1.0 + 0.0 * I); /* Principal root: +i. */
    double complex result = a * b;
    printf("%g %+.0fi\\n", creal(result), cimag(result)); /* 1 +3i */
    return 0;
}`,
    rust: `// Rust's standard library has no complex-number type.
#[derive(Clone, Copy)]
struct Complex { re: f64, im: f64 }

impl std::ops::Mul for Complex {
    type Output = Self;
    fn mul(self, rhs: Self) -> Self {
        Self {
            re: self.re * rhs.re - self.im * rhs.im,
            im: self.re * rhs.im + self.im * rhs.re,
        }
    }
}

fn sqrt_negative_real(x: f64) -> Complex {
    assert!(x.is_finite() && x < 0.0);
    Complex { re: 0.0, im: (-x).sqrt() }
}

fn main() {
    let a = Complex { re: 3.0, im: -1.0 };
    let b = sqrt_negative_real(-1.0);
    let result = a * b;
    println!("{} {:+}i", result.re, result.im); // 1 +3i
}`
  },
  7: {
    python: `# Stdlib arithmetic for the same fixed expression; no string parser.
result = (3 - 1j) * 1j
print(result)  # (1+3j)`,
    c: `#include <complex.h>
#include <stdio.h>

int main(void) {
    /* C has no stdlib math-expression parser; evaluate this fixed expression. */
    double complex result = (3.0 - I) * I;
    printf("%g %+.0fi\\n", creal(result), cimag(result)); /* 1 +3i */
    return 0;
}`,
    rust: `// Rust's standard library has no complex-number type.
#[derive(Clone, Copy)]
struct Complex { re: f64, im: f64 }

impl std::ops::Mul for Complex {
    type Output = Self;
    fn mul(self, rhs: Self) -> Self {
        Self {
            re: self.re * rhs.re - self.im * rhs.im,
            im: self.re * rhs.im + self.im * rhs.re,
        }
    }
}

fn sqrt_negative_real(x: f64) -> Complex {
    assert!(x.is_finite() && x < 0.0);
    Complex { re: 0.0, im: (-x).sqrt() }
}

fn main() {
    // No stdlib math-expression parser: evaluate the fixed expression directly.
    let i = Complex { re: 0.0, im: 1.0 };
    let result = Complex { re: 3.0, im: -1.0 } * i;
    println!("{} {:+}i", result.re, result.im); // 1 +3i
}`
  },
  8: {
    python: `result = 5 * 4
print(result)  # 20`,
    c: `#include <stdio.h>

int main(void) {
    int result = 5 * 4;
    printf("%d\\n", result); /* 20 */
    return 0;
}`,
    rust: `fn main() {
    let result = 5 * 4;
    println!("{}", result); // 20
}`
  },
  9: {
    python: `# k and j are scalar inputs from the surrounding calculation.
def scalar_product(k, j):
    result = 3 * k * j
    return result`,
    c: `/* Parameterized scope supplies the scalar inputs k and j. */
double scalar_product(double k, double j) {
    double result = 3 * k * j;
    return result;
}`,
    rust: `// Parameterized scope supplies the scalar inputs k and j.
fn scalar_product(k: f64, j: f64) -> f64 {
    let result = 3.0 * k * j;
    result
}`
  },
  10: {
    python: `def multiply(a, b):
    return [a[0] * b[0], a[1] * b[1]]

def multiply_scalar(a, scalar):
    return [a[0] * scalar, a[1] * scalar]

s = 3
k = [1, 2]
j = [2, 3]
tmp = multiply(k, j)
result = multiply_scalar(tmp, s)
print(result)  # [6, 18]`,
    c: `#include <stdio.h>

typedef struct { double x, y; } Vec2;

Vec2 multiply(Vec2 a, Vec2 b) {
    return (Vec2){a.x * b.x, a.y * b.y};
}

Vec2 multiply_scalar(Vec2 a, double scalar) {
    return (Vec2){a.x * scalar, a.y * scalar};
}

int main(void) {
    double s = 3;
    Vec2 k = {1, 2}, j = {2, 3};
    Vec2 tmp = multiply(k, j);
    Vec2 result = multiply_scalar(tmp, s);
    printf("[%g, %g]\\n", result.x, result.y); /* [6, 18] */
    return 0;
}`,
    rust: `fn multiply(a: [f64; 2], b: [f64; 2]) -> [f64; 2] {
    [a[0] * b[0], a[1] * b[1]]
}

fn multiply_scalar(a: [f64; 2], scalar: f64) -> [f64; 2] {
    [a[0] * scalar, a[1] * scalar]
}

fn main() {
    let s = 3.0;
    let k = [1.0, 2.0];
    let j = [2.0, 3.0];
    let tmp = multiply(k, j);
    let result = multiply_scalar(tmp, s);
    println!("{:?}", result); // [6.0, 18.0]
}`
  },
  11: {
    python: `def multiply(a, b):
    return [a[0] * b[0], a[1] * b[1]]

def multiply_scalar(a, scalar):
    return [a[0] * scalar, a[1] * scalar]`,
    c: `typedef struct { double x, y; } Vec2;

Vec2 multiply(Vec2 a, Vec2 b) {
    return (Vec2){a.x * b.x, a.y * b.y};
}

Vec2 multiply_scalar(Vec2 a, double scalar) {
    return (Vec2){a.x * scalar, a.y * scalar};
}`,
    rust: `fn multiply(a: [f64; 2], b: [f64; 2]) -> [f64; 2] {
    [a[0] * b[0], a[1] * b[1]]
}

fn multiply_scalar(a: [f64; 2], scalar: f64) -> [f64; 2] {
    [a[0] * scalar, a[1] * scalar]
}`
  },
  12: {
    python: `def dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

k = [0, 1, 0]
j = [1, 0, 0]
d = dot(k, j)
print(d)  # 0`,
    c: `#include <stdio.h>

double dot(const double a[3], const double b[3]) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

int main(void) {
    double k[3] = {0, 1, 0}, j[3] = {1, 0, 0};
    double d = dot(k, j);
    printf("%g\\n", d); /* 0 */
    return 0;
}`,
    rust: `fn dot(a: [f64; 3], b: [f64; 3]) -> f64 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

fn main() {
    let k = [0.0, 1.0, 0.0];
    let j = [1.0, 0.0, 0.0];
    let d = dot(k, j);
    println!("{}", d); // 0
}`
  },
  13: {
    python: `def dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]`,
    c: `double dot(const double a[3], const double b[3]) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}`,
    rust: `fn dot(a: [f64; 3], b: [f64; 3]) -> f64 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}`
  },
  14: {
    python: `def cross(a, b):
    ax, ay, az = a
    bx, by, bz = b
    rx = ay * bz - az * by
    ry = az * bx - ax * bz
    rz = ax * by - ay * bx
    return [rx, ry, rz]

k = [0, 1, 0]
j = [1, 0, 0]
result = cross(k, j)
print(result)  # [0, 0, -1]`,
    c: `#include <stdio.h>

/* C writes the returned vector into caller-provided storage. */
double *cross(const double a[3], const double b[3], double out[3]) {
    double ax = a[0], ay = a[1], az = a[2];
    double bx = b[0], by = b[1], bz = b[2];
    double rx = ay * bz - az * by;
    double ry = az * bx - ax * bz;
    double rz = ax * by - ay * bx;
    out[0] = rx; out[1] = ry; out[2] = rz;
    return out;
}

int main(void) {
    double k[3] = {0, 1, 0}, j[3] = {1, 0, 0};
    double result[3];
    cross(k, j, result);
    printf("[%g, %g, %g]\\n", result[0], result[1], result[2]);
    /* [0, 0, -1] */
    return 0;
}`,
    rust: `fn cross(a: [f64; 3], b: [f64; 3]) -> [f64; 3] {
    let [ax, ay, az] = a;
    let [bx, by, bz] = b;
    let rx = ay * bz - az * by;
    let ry = az * bx - ax * bz;
    let rz = ax * by - ay * bx;
    [rx, ry, rz]
}

fn main() {
    let k = [0.0, 1.0, 0.0];
    let j = [1.0, 0.0, 0.0];
    let result = cross(k, j);
    println!("{:?}", result); // [0.0, 0.0, -1.0]
}`
  },
  15: {
    python: `def cross(a, b):
    ax, ay, az = a
    bx, by, bz = b
    rx = ay * bz - az * by
    ry = az * bx - ax * bz
    rz = ax * by - ay * bx
    return [rx, ry, rz]`,
    c: `/* C writes the returned vector into caller-provided storage. */
double *cross(const double a[3], const double b[3], double out[3]) {
    double ax = a[0], ay = a[1], az = a[2];
    double bx = b[0], by = b[1], bz = b[2];
    double rx = ay * bz - az * by;
    double ry = az * bx - ax * bz;
    double rz = ax * by - ay * bx;
    out[0] = rx; out[1] = ry; out[2] = rz;
    return out;
}`,
    rust: `fn cross(a: [f64; 3], b: [f64; 3]) -> [f64; 3] {
    let [ax, ay, az] = a;
    let [bx, by, bz] = b;
    let rx = ay * bz - az * by;
    let ry = az * bx - ax * bz;
    let rz = ax * by - ay * bx;
    [rx, ry, rz]
}`
  },
  16: {
    python: `total = 0
for i in range(1, 101):
    total += i
print(total)  # 5050`,
    c: `#include <stdio.h>

int main(void) {
    int sum = 0;
    for (int i = 1; i <= 100; ++i) {
        sum += i;
    }
    printf("%d\\n", sum); /* 5050 */
    return 0;
}`,
    rust: `fn main() {
    let mut sum = 0;
    for i in 1..=100 {
        sum += i;
    }
    println!("{}", sum); // 5050
}`
  },
  17: {
    python: `n = 100  # Inclusive upper bound.
total = n * (n + 1) // 2
print(total)  # 5050`,
    c: `#include <stdio.h>

int main(void) {
    int n = 100; /* Inclusive upper bound. */
    int sum = n * (n + 1) / 2;
    printf("%d\\n", sum); /* 5050 */
    return 0;
}`,
    rust: `fn main() {
    let n = 100; // Inclusive upper bound.
    let sum = n * (n + 1) / 2;
    println!("{}", sum); // 5050
}`
  },
  18: {
    python: `total = 0
for i in range(1, 101):
    total += 2 * i + 1
print(total)  # 10200`,
    c: `#include <stdio.h>

int main(void) {
    int sum = 0;
    for (int i = 1; i <= 100; ++i) {
        sum += 2 * i + 1;
    }
    printf("%d\\n", sum); /* 10200 */
    return 0;
}`,
    rust: `fn main() {
    let mut sum = 0;
    for i in 1..=100 {
        sum += 2 * i + 1;
    }
    println!("{}", sum); // 10200
}`
  },
  19: {
    python: `total = 0
for i in range(1, 3):
    for j in range(4, 7):
        total += 3 * i * j
print(total)  # 135`,
    c: `#include <stdio.h>

int main(void) {
    int sum = 0;
    for (int i = 1; i <= 2; ++i) {
        for (int j = 4; j <= 6; ++j) {
            sum += 3 * i * j;
        }
    }
    printf("%d\\n", sum); /* 135 */
    return 0;
}`,
    rust: `fn main() {
    let mut sum = 0;
    for i in 1..=2 {
        for j in 4..=6 {
            sum += 3 * i * j;
        }
    }
    println!("{}", sum); // 135
}`
  },
  20: {
    python: `# Run from the repository root; this is the checked, stable helper.
from examples.notation import mean

values = [2, 4, 6, 8]
print(mean(values))  # 5.0`,
    c: `#include <stddef.h>
#include <stdio.h>

int main(void) {
    /* Direct arithmetic for this fixed, finite, nonempty four-value example. */
    double values[] = {2, 4, 6, 8};
    size_t n = sizeof values / sizeof values[0];
    double sum = 0;
    for (size_t i = 0; i < n; ++i) {
        sum += values[i];
    }
    double average = sum / (double)n;
    printf("%g\\n", average); /* 5 */
    return 0;
}`,
    rust: `fn main() {
    // Direct arithmetic for this fixed, finite, nonempty four-value example.
    let values = [2.0, 4.0, 6.0, 8.0];
    let average = values.iter().sum::<f64>() / values.len() as f64;
    println!("{}", average); // 5
}`
  },
  21: {
    python: `value = 1
for i in range(1, 7):
    value *= i
print(value)  # 720`,
    c: `#include <stdio.h>

int main(void) {
    int value = 1;
    for (int i = 1; i <= 6; ++i) {
        value *= i;
    }
    printf("%d\\n", value); /* 720 */
    return 0;
}`,
    rust: `fn main() {
    let mut value = 1;
    for i in 1..=6 {
        value *= i;
    }
    println!("{}", value); // 720
}`
  },
  22: {
    python: `x = -5
result = abs(x)
print(result)  # 5`,
    c: `#include <math.h>
#include <stdio.h>

int main(void) {
    double x = -5;
    double result = fabs(x);
    printf("%g\\n", result); /* 5 */
    return 0;
}`,
    rust: `fn main() {
    let x: f64 = -5.0;
    let result = x.abs();
    println!("{}", result); // 5
}`
  },
  23: {
    python: `import math

def length(vec):
    x, y, z = vec
    return math.sqrt(x * x + y * y + z * z)

v = [0, 4, -3]
print(length(v))  # 5.0`,
    c: `#include <stdio.h>
#include <math.h>

double length(const double vec[3]) {
    double x = vec[0], y = vec[1], z = vec[2];
    return sqrt(x * x + y * y + z * z);
}

int main(void) {
    double v[3] = {0, 4, -3};
    printf("%g\\n", length(v)); /* 5 */
    return 0;
}`,
    rust: `fn length(vec: [f64; 3]) -> f64 {
    let [x, y, z] = vec;
    (x * x + y * y + z * z).sqrt()
}

fn main() {
    let v = [0.0, 4.0, -3.0];
    println!("{}", length(v)); // 5
}`
  },
  24: {
    python: `import math

def length(vec):
    x, y, z = vec
    return math.sqrt(x * x + y * y + z * z)`,
    c: `#include <math.h>

double length(const double vec[3]) {
    double x = vec[0], y = vec[1], z = vec[2];
    return sqrt(x * x + y * y + z * z);
}`,
    rust: `fn length(vec: [f64; 3]) -> f64 {
    let [x, y, z] = vec;
    (x * x + y * y + z * z).sqrt()
}`
  },
  25: {
    python: `# Flat 2×2 matrix in column-major order: [a00, a10, a01, a11].
def determinant(matrix):
    return matrix[0] * matrix[3] - matrix[1] * matrix[2]

matrix = [1, 0, 0, 1]
det = determinant(matrix)
print(det)  # 1`,
    c: `#include <stdio.h>

/* Flat column-major layout: [a00, a10, a01, a11]. */
double determinant(const double matrix[4]) {
    return matrix[0] * matrix[3] - matrix[1] * matrix[2];
}

int main(void) {
    double matrix[4] = {1, 0, 0, 1};
    double det = determinant(matrix);
    printf("%g\\n", det); /* 1 */
    return 0;
}`,
    rust: `// Flat column-major layout: [a00, a10, a01, a11].
fn determinant(matrix: &[f64; 4]) -> f64 {
    matrix[0] * matrix[3] - matrix[1] * matrix[2]
}

fn main() {
    let matrix = [1.0, 0.0, 0.0, 1.0];
    let det = determinant(&matrix);
    println!("{}", det); // 1
}`
  },
  26: {
    python: `import math

def normalize(vec):
    x, y, z = vec
    squared_length = x * x + y * y + z * z
    if squared_length > 0:
        length = math.sqrt(squared_length)
        vec[0] = x / length
        vec[1] = y / length
        vec[2] = z / length
    return vec  # Mutates and returns the original list; zero stays zero.

a = [0, 4, -3]
normalize(a)
print(a)  # [0.0, 0.8, -0.6]`,
    c: `#include <stdio.h>
#include <math.h>

double *normalize(double vec[3]) {
    double x = vec[0], y = vec[1], z = vec[2];
    double squared_length = x * x + y * y + z * z;
    if (squared_length > 0) {
        double length = sqrt(squared_length);
        vec[0] = x / length;
        vec[1] = y / length;
        vec[2] = z / length;
    }
    return vec; /* Mutates the original array; zero stays zero. */
}

int main(void) {
    double a[3] = {0, 4, -3};
    normalize(a);
    printf("[%g, %g, %g]\\n", a[0], a[1], a[2]); /* [0, 0.8, -0.6] */
    return 0;
}`,
    rust: `fn normalize(vec: &mut [f64; 3]) -> &mut [f64; 3] {
    let [x, y, z] = *vec;
    let squared_length = x * x + y * y + z * z;
    if squared_length > 0.0 {
        let length = squared_length.sqrt();
        vec[0] = x / length;
        vec[1] = y / length;
        vec[2] = z / length;
    }
    vec // Mutates and returns the original array; zero stays zero.
}

fn main() {
    let mut a = [0.0, 4.0, -3.0];
    normalize(&mut a);
    println!("{:?}", a); // [0.0, 0.8, -0.6]
}`
  },
  27: {
    python: `import math

def normalize(vec):
    x, y, z = vec
    squared_length = x * x + y * y + z * z
    if squared_length > 0:
        length = math.sqrt(squared_length)
        vec[0] = x / length
        vec[1] = y / length
        vec[2] = z / length
    return vec  # Mutates and returns the original list; zero stays zero.`,
    c: `#include <math.h>

double *normalize(double vec[3]) {
    double x = vec[0], y = vec[1], z = vec[2];
    double squared_length = x * x + y * y + z * z;
    if (squared_length > 0) {
        double length = sqrt(squared_length);
        vec[0] = x / length;
        vec[1] = y / length;
        vec[2] = z / length;
    }
    return vec; /* Mutates the original array; zero stays zero. */
}`,
    rust: `fn normalize(vec: &mut [f64; 3]) -> &mut [f64; 3] {
    let [x, y, z] = *vec;
    let squared_length = x * x + y * y + z * z;
    if squared_length > 0.0 {
        let length = squared_length.sqrt();
        vec[0] = x / length;
        vec[1] = y / length;
        vec[2] = z / length;
    }
    vec // Mutates and returns the original array; zero stays zero.
}`
  },
  28: {
    python: `A = [3, 9, 14]
print(3 in A)  # True`,
    c: `#include <stdio.h>
#include <stdbool.h>
#include <stddef.h>

bool contains(const int values[], size_t count, int needle) {
    for (size_t i = 0; i < count; ++i) {
        if (values[i] == needle) return true;
    }
    return false;
}

int main(void) {
    int A[] = {3, 9, 14};
    printf("%d\\n", contains(A, sizeof A / sizeof A[0], 3)); /* 1: true */
    return 0;
}`,
    rust: `fn main() {
    let a = [3, 9, 14];
    println!("{}", a.contains(&3)); // true
}`
  },
  29: {
    python: `A = {3, 9, 14}
print(3 in A)  # True; sets store unique values.`,
    c: `#include <stdio.h>
#include <stdbool.h>
#include <stddef.h>

bool contains(const int values[], size_t count, int needle) {
    for (size_t i = 0; i < count; ++i) {
        if (values[i] == needle) return true;
    }
    return false;
}

int main(void) {
    /* C has no stdlib Set. This fixed array already contains unique members. */
    /* A mutable set implementation would also have to prevent duplicates. */
    int A[] = {3, 9, 14};
    printf("%d\\n", contains(A, sizeof A / sizeof A[0], 3)); /* 1: true */
    return 0;
}`,
    rust: `use std::collections::HashSet;

fn main() {
    let a = HashSet::from([3, 9, 14]);
    println!("{}", a.contains(&3)); // true
}`
  },
  30: {
    python: `import math

def is_real(k):
    # Python integers are finite; bool is deliberately excluded.
    return type(k) is int or (type(k) is float and math.isfinite(k))`,
    c: `#include <math.h>
#include <stdbool.h>

/* The double parameter is already numeric at compile time. */
bool is_real(double k) {
    return isfinite(k);
}`,
    rust: `// The f64 parameter is already numeric at compile time.
fn is_real(k: f64) -> bool {
    k.is_finite()
}`
  },
  31: {
    python: `import math

def is_integer(n):
    # Python ints are exact integers; bool is deliberately excluded.
    return type(n) is int or (
        type(n) is float and math.isfinite(n) and n.is_integer()
    )`,
    c: `#include <math.h>
#include <stdbool.h>

/* The double parameter is already numeric at compile time. */
bool is_integer(double n) {
    return isfinite(n) && trunc(n) == n;
}`,
    rust: `// The f64 parameter is already numeric at compile time.
fn is_integer(n: f64) -> bool {
    n.is_finite() && n.fract() == 0.0
}`
  }
}
