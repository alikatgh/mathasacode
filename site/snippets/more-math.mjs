// Standard-library translations of the ten additional README examples.
// Numeric keys are the one-based code-fence positions in README.md.
export const moreMath = {
  62: {
    python: String.raw`import math

base = 2.0
exponent = 3.0
x = 8.0
power = base ** exponent
logarithm = math.log(x) / math.log(base)
print(f"power = {power:.6f}")
print(f"logarithm = {logarithm:.6f}")`,
    c: String.raw`#include <math.h>
#include <stdio.h>

int main(void) {
    double base = 2.0, exponent = 3.0, x = 8.0;
    double power = pow(base, exponent);
    double logarithm = log(x) / log(base);
    printf("power = %.6f\n", power);
    printf("logarithm = %.6f\n", logarithm);
    return 0;
}`,
    rust: String.raw`fn main() {
    let base: f64 = 2.0;
    let exponent: f64 = 3.0;
    let x: f64 = 8.0;
    let power = base.powf(exponent);
    let logarithm = x.ln() / base.ln();
    println!("power = {:.6}", power);
    println!("logarithm = {:.6}", logarithm);
}`
  },
  63: {
    python: String.raw`import math

degrees = 30.0
radians = degrees * math.pi / 180.0
print(f"sine = {math.sin(radians):.6f}")
print(f"cosine = {math.cos(radians):.6f}")`,
    c: String.raw`#include <math.h>
#include <stdio.h>

int main(void) {
    double degrees = 30.0;
    double pi = acos(-1.0);
    double radians = degrees * pi / 180.0;
    printf("sine = %.6f\n", sin(radians));
    printf("cosine = %.6f\n", cos(radians));
    return 0;
}`,
    rust: String.raw`fn main() {
    let degrees: f64 = 30.0;
    let radians = degrees * std::f64::consts::PI / 180.0;
    println!("sine = {:.6}", radians.sin());
    println!("cosine = {:.6}", radians.cos());
}`
  },
  64: {
    python: String.raw`a = -8
modulus = 5
remainder = ((a % modulus) + modulus) % modulus
print(f"remainder = {remainder}")`,
    c: String.raw`#include <stdio.h>

int main(void) {
    int a = -8, modulus = 5;
    int remainder = ((a % modulus) + modulus) % modulus;
    printf("remainder = %d\n", remainder);
    return 0;
}`,
    rust: String.raw`fn main() {
    let a: i32 = -8;
    let modulus: i32 = 5;
    let remainder = ((a % modulus) + modulus) % modulus;
    println!("remainder = {}", remainder);
}`
  },
  65: {
    python: String.raw`n = 5
k = 2
factorials = [1]
for i in range(1, n + 1):
    factorials.append(factorials[i - 1] * i)
combinations = factorials[n] // (factorials[k] * factorials[n - k])
print(f"n_factorial = {factorials[n]}")
print(f"zero_factorial = {factorials[0]}")
print(f"combinations = {combinations}")`,
    c: String.raw`#include <stdio.h>

int main(void) {
    int n = 5, k = 2;
    int factorials[6] = {1};
    for (int i = 1; i <= n; ++i) {
        factorials[i] = factorials[i - 1] * i;
    }
    int combinations = factorials[n] / (factorials[k] * factorials[n - k]);
    printf("n_factorial = %d\n", factorials[n]);
    printf("zero_factorial = %d\n", factorials[0]);
    printf("combinations = %d\n", combinations);
    return 0;
}`,
    rust: String.raw`fn main() {
    let n: usize = 5;
    let k: usize = 2;
    let mut factorials = [1u64; 6];
    for i in 1..=n {
        factorials[i] = factorials[i - 1] * i as u64;
    }
    let combinations = factorials[n] / (factorials[k] * factorials[n - k]);
    println!("n_factorial = {}", factorials[n]);
    println!("zero_factorial = {}", factorials[0]);
    println!("combinations = {}", combinations);
}`
  },
  66: {
    python: String.raw`outcomes = [1, 2, 3, 4, 5, 6]
favorable = 0
for outcome in outcomes:
    if outcome % 2 == 0:
        favorable += 1
probability = favorable / len(outcomes)
print(f"probability = {probability:.6f}")`,
    c: String.raw`#include <stdio.h>

int main(void) {
    int outcomes[] = {1, 2, 3, 4, 5, 6};
    int count = (int)(sizeof outcomes / sizeof outcomes[0]);
    int favorable = 0;
    for (int i = 0; i < count; ++i) {
        if (outcomes[i] % 2 == 0) ++favorable;
    }
    double probability = (double)favorable / count;
    printf("probability = %.6f\n", probability);
    return 0;
}`,
    rust: String.raw`fn main() {
    let outcomes = [1, 2, 3, 4, 5, 6];
    let mut favorable = 0;
    for outcome in outcomes {
        if outcome % 2 == 0 { favorable += 1; }
    }
    let probability = favorable as f64 / outcomes.len() as f64;
    println!("probability = {:.6}", probability);
}`
  },
  67: {
    python: String.raw`values = [0.0, 10.0]
probabilities = [0.75, 0.25]
expected = 0.0
for i in range(len(values)):
    expected += values[i] * probabilities[i]
print(f"expected = {expected:.6f}")`,
    c: String.raw`#include <stdio.h>

int main(void) {
    double values[] = {0.0, 10.0};
    double probabilities[] = {0.75, 0.25};
    int count = (int)(sizeof values / sizeof values[0]);
    double expected = 0.0;
    for (int i = 0; i < count; ++i) {
        expected += values[i] * probabilities[i];
    }
    printf("expected = %.6f\n", expected);
    return 0;
}`,
    rust: String.raw`fn main() {
    let values = [0.0, 10.0];
    let probabilities = [0.75, 0.25];
    let mut expected = 0.0;
    for i in 0..values.len() {
        expected += values[i] * probabilities[i];
    }
    println!("expected = {:.6}", expected);
}`
  },
  68: {
    python: String.raw`import math

values = [2.0, 4.0, 6.0, 8.0]
mean = sum(values) / len(values)
squared_deviations = 0.0
for value in values:
    squared_deviations += (value - mean) ** 2
variance = squared_deviations / len(values)
standard_deviation = math.sqrt(variance)
print(f"variance = {variance:.6f}")
print(f"standard_deviation = {standard_deviation:.6f}")`,
    c: String.raw`#include <math.h>
#include <stdio.h>

int main(void) {
    double values[] = {2.0, 4.0, 6.0, 8.0};
    int count = (int)(sizeof values / sizeof values[0]);
    double total = 0.0;
    for (int i = 0; i < count; ++i) total += values[i];
    double mean = total / count;
    double squared_deviations = 0.0;
    for (int i = 0; i < count; ++i) {
        double difference = values[i] - mean;
        squared_deviations += difference * difference;
    }
    double variance = squared_deviations / count;
    double standard_deviation = sqrt(variance);
    printf("variance = %.6f\n", variance);
    printf("standard_deviation = %.6f\n", standard_deviation);
    return 0;
}`,
    rust: String.raw`fn main() {
    let values = [2.0_f64, 4.0, 6.0, 8.0];
    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let mut squared_deviations = 0.0;
    for value in values {
        squared_deviations += (value - mean).powi(2);
    }
    let variance = squared_deviations / values.len() as f64;
    let standard_deviation = variance.sqrt();
    println!("variance = {:.6}", variance);
    println!("standard_deviation = {:.6}", standard_deviation);
}`
  },
  69: {
    python: String.raw`prior = 0.01
true_positive = 0.90
false_positive = 0.05
joint = true_positive * prior
evidence = joint + false_positive * (1.0 - prior)
posterior = joint / evidence
print(f"evidence = {evidence:.6f}")
print(f"posterior = {posterior:.6f}")`,
    c: String.raw`#include <stdio.h>

int main(void) {
    double prior = 0.01, true_positive = 0.90, false_positive = 0.05;
    double joint = true_positive * prior;
    double evidence = joint + false_positive * (1.0 - prior);
    double posterior = joint / evidence;
    printf("evidence = %.6f\n", evidence);
    printf("posterior = %.6f\n", posterior);
    return 0;
}`,
    rust: String.raw`fn main() {
    let prior = 0.01;
    let true_positive = 0.90;
    let false_positive = 0.05;
    let joint = true_positive * prior;
    let evidence = joint + false_positive * (1.0 - prior);
    let posterior = joint / evidence;
    println!("evidence = {:.6}", evidence);
    println!("posterior = {:.6}", posterior);
}`
  },
  70: {
    python: String.raw`import math

x = [1.0, 2.0, 3.0]
y = [2.0, 4.0, 5.0]
count = len(x)
mean_x = sum(x) / count
mean_y = sum(y) / count
cross = 0.0
squares_x = 0.0
squares_y = 0.0
for i in range(count):
    dx = x[i] - mean_x
    dy = y[i] - mean_y
    cross += dx * dy
    squares_x += dx * dx
    squares_y += dy * dy
covariance = cross / count
variance_x = squares_x / count
variance_y = squares_y / count
correlation = covariance / math.sqrt(variance_x * variance_y)
print(f"covariance = {covariance:.6f}")
print(f"correlation = {correlation:.6f}")`,
    c: String.raw`#include <math.h>
#include <stdio.h>

int main(void) {
    double x[] = {1.0, 2.0, 3.0};
    double y[] = {2.0, 4.0, 5.0};
    int count = (int)(sizeof x / sizeof x[0]);
    double total_x = 0.0, total_y = 0.0;
    for (int i = 0; i < count; ++i) {
        total_x += x[i];
        total_y += y[i];
    }
    double mean_x = total_x / count, mean_y = total_y / count;
    double cross = 0.0, squares_x = 0.0, squares_y = 0.0;
    for (int i = 0; i < count; ++i) {
        double dx = x[i] - mean_x, dy = y[i] - mean_y;
        cross += dx * dy;
        squares_x += dx * dx;
        squares_y += dy * dy;
    }
    double covariance = cross / count;
    double variance_x = squares_x / count, variance_y = squares_y / count;
    double correlation = covariance / sqrt(variance_x * variance_y);
    printf("covariance = %.6f\n", covariance);
    printf("correlation = %.6f\n", correlation);
    return 0;
}`,
    rust: String.raw`fn main() {
    let x = [1.0_f64, 2.0, 3.0];
    let y = [2.0_f64, 4.0, 5.0];
    let count = x.len() as f64;
    let mean_x = x.iter().sum::<f64>() / count;
    let mean_y = y.iter().sum::<f64>() / count;
    let mut cross = 0.0;
    let mut squares_x = 0.0;
    let mut squares_y = 0.0;
    for i in 0..x.len() {
        let dx = x[i] - mean_x;
        let dy = y[i] - mean_y;
        cross += dx * dy;
        squares_x += dx * dx;
        squares_y += dy * dy;
    }
    let covariance = cross / count;
    let variance_x = squares_x / count;
    let variance_y = squares_y / count;
    let correlation = covariance / (variance_x * variance_y).sqrt();
    println!("covariance = {:.6}", covariance);
    println!("correlation = {:.6}", correlation);
}`
  },
  71: {
    python: String.raw`import math

probabilities = [0.5, 0.25, 0.25, 0.0]
entropy_bits = 0.0
for probability in probabilities:
    if probability > 0.0:
        entropy_bits -= probability * math.log2(probability)
print(f"entropy_bits = {entropy_bits:.6f}")`,
    c: String.raw`#include <math.h>
#include <stdio.h>

int main(void) {
    double probabilities[] = {0.5, 0.25, 0.25, 0.0};
    int count = (int)(sizeof probabilities / sizeof probabilities[0]);
    double entropy_bits = 0.0;
    for (int i = 0; i < count; ++i) {
        double probability = probabilities[i];
        if (probability > 0.0) {
            entropy_bits -= probability * log2(probability);
        }
    }
    printf("entropy_bits = %.6f\n", entropy_bits);
    return 0;
}`,
    rust: String.raw`fn main() {
    let probabilities = [0.5_f64, 0.25, 0.25, 0.0];
    let mut entropy_bits = 0.0;
    for probability in probabilities {
        if probability > 0.0 {
            entropy_bits -= probability * probability.log2();
        }
    }
    println!("entropy_bits = {:.6}", entropy_bits);
}`
  }
}
