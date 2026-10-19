// Standalone standard-library translations of docs/ml-deep-learning.md fences 1–10.
// Matrix rows are inputs and columns are outputs; every example prints its result.
export const machineLearning = {
  1: {
    python: String.raw`import math

# A preview of the first example's probability, derived in later sections.
p_true = 0.6456563062257954
print(f"sample_loss {-math.log(p_true):.6f}")`,
    c: String.raw`#include <math.h>
#include <stdio.h>

int main(void) {
    /* A preview; later sections derive this probability. */
    double p_true = 0.6456563062257954;
    printf("sample_loss %.6f\n", -log(p_true));
    return 0;
}`,
    rust: String.raw`fn main() {
    // A preview; later sections derive this probability.
    let p_true: f64 = 0.6456563062257954;
    println!("sample_loss {:.6}", -p_true.ln());
}`
  },
  2: {
    python: String.raw`X = [[1.0, 1.0], [1.0, -1.0], [-1.0, 1.0], [-1.0, -1.0]]
y = [0, 1, 1, 0]
print(f"examples {len(X)}")
print(f"features {len(X[0])}")
print(f"x0 {X[0][0]:.6f} {X[0][1]:.6f}")
print(f"y0 {y[0]}")`,
    c: String.raw`#include <stdio.h>

int main(void) {
    double X[4][2] = {{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
    int y[4] = {0, 1, 1, 0};
    printf("examples %d\n", 4);
    printf("features %d\n", 2);
    printf("x0 %.6f %.6f\n", X[0][0], X[0][1]);
    printf("y0 %d\n", y[0]);
    return 0;
}`,
    rust: String.raw`fn main() {
    let x = [[1.0_f64, 1.0], [1.0, -1.0], [-1.0, 1.0], [-1.0, -1.0]];
    let y = [0, 1, 1, 0];
    println!("examples {}", x.len());
    println!("features {}", x[0].len());
    println!("x0 {:.6} {:.6}", x[0][0], x[0][1]);
    println!("y0 {}", y[0]);
}`
  },
  3: {
    python: String.raw`x = [1.0, 1.0]
W1 = [[0.5, -0.5], [0.5, -0.5]]
b1 = [-0.2, -0.2]
a = [sum(x[d] * W1[d][j] for d in range(2)) + b1[j] for j in range(2)]
print(f"a {a[0]:.6f} {a[1]:.6f}")`,
    c: String.raw`#include <stdio.h>

int main(void) {
    double x[2] = {1, 1};
    double W1[2][2] = {{0.5, -0.5}, {0.5, -0.5}};
    double b1[2] = {-0.2, -0.2}, a[2];
    for (int j = 0; j < 2; j++) {
        a[j] = b1[j];
        for (int d = 0; d < 2; d++) a[j] += x[d] * W1[d][j];
    }
    printf("a %.6f %.6f\n", a[0], a[1]);
    return 0;
}`,
    rust: String.raw`fn main() {
    let x = [1.0_f64, 1.0];
    let w1 = [[0.5, -0.5], [0.5, -0.5]];
    let b1 = [-0.2, -0.2];
    let mut a = [0.0; 2];
    for j in 0..2 {
        a[j] = b1[j];
        for d in 0..2 { a[j] += x[d] * w1[d][j]; }
    }
    println!("a {:.6} {:.6}", a[0], a[1]);
}`
  },
  4: {
    python: String.raw`a = [0.8, -1.2]
h = [max(0.0, value) for value in a]
print(f"h {h[0]:.6f} {h[1]:.6f}")`,
    c: String.raw`#include <math.h>
#include <stdio.h>

int main(void) {
    double a[2] = {0.8, -1.2};
    double h[2] = {fmax(0, a[0]), fmax(0, a[1])};
    printf("h %.6f %.6f\n", h[0], h[1]);
    return 0;
}`,
    rust: String.raw`fn main() {
    let a = [0.8_f64, -1.2];
    let h = [a[0].max(0.0), a[1].max(0.0)];
    println!("h {:.6} {:.6}", h[0], h[1]);
}`
  },
  5: {
    python: String.raw`x = [1.0, 1.0]
W1 = [[0.5, -0.5], [0.5, -0.5]]
b1 = [-0.2, -0.2]
W2 = [[0.5, -0.5], [0.5, -0.5]]
b2 = [-0.1, 0.1]
a = [sum(x[d] * W1[d][j] for d in range(2)) + b1[j] for j in range(2)]
h = [max(0.0, value) for value in a]
z = [sum(h[j] * W2[j][k] for j in range(2)) + b2[k] for k in range(2)]
print(f"scores {z[0]:.6f} {z[1]:.6f}")`,
    c: String.raw`#include <math.h>
#include <stdio.h>

int main(void) {
    double x[2] = {1, 1};
    double W1[2][2] = {{0.5, -0.5}, {0.5, -0.5}};
    double b1[2] = {-0.2, -0.2};
    double W2[2][2] = {{0.5, -0.5}, {0.5, -0.5}};
    double b2[2] = {-0.1, 0.1}, a[2], h[2], z[2];
    for (int j = 0; j < 2; j++) {
        a[j] = b1[j];
        for (int d = 0; d < 2; d++) a[j] += x[d] * W1[d][j];
        h[j] = fmax(0, a[j]);
    }
    for (int k = 0; k < 2; k++) {
        z[k] = b2[k];
        for (int j = 0; j < 2; j++) z[k] += h[j] * W2[j][k];
    }
    printf("scores %.6f %.6f\n", z[0], z[1]);
    return 0;
}`,
    rust: String.raw`fn main() {
    let x = [1.0_f64, 1.0];
    let w1 = [[0.5, -0.5], [0.5, -0.5]];
    let b1 = [-0.2, -0.2];
    let w2 = [[0.5, -0.5], [0.5, -0.5]];
    let b2 = [-0.1, 0.1];
    let (mut a, mut h, mut z) = ([0.0_f64; 2], [0.0_f64; 2], [0.0_f64; 2]);
    for j in 0..2 {
        a[j] = b1[j];
        for d in 0..2 { a[j] += x[d] * w1[d][j]; }
        h[j] = a[j].max(0.0);
    }
    for k in 0..2 {
        z[k] = b2[k];
        for j in 0..2 { z[k] += h[j] * w2[j][k]; }
    }
    println!("scores {:.6} {:.6}", z[0], z[1]);
}`
  },
  6: {
    python: String.raw`import math

z = [0.3, -0.3]
m = max(z)
e = [math.exp(value - m) for value in z]
p = [value / sum(e) for value in e]
print(f"p {p[0]:.6f} {p[1]:.6f}")
print(f"sum {sum(p):.6f}")`,
    c: String.raw`#include <math.h>
#include <stdio.h>

int main(void) {
    double z[2] = {0.3, -0.3}, m = fmax(z[0], z[1]);
    double e[2] = {exp(z[0] - m), exp(z[1] - m)};
    double total = e[0] + e[1];
    double p[2] = {e[0] / total, e[1] / total};
    printf("p %.6f %.6f\n", p[0], p[1]);
    printf("sum %.6f\n", p[0] + p[1]);
    return 0;
}`,
    rust: String.raw`fn main() {
    let z = [0.3_f64, -0.3];
    let m = z[0].max(z[1]);
    let e = [(z[0] - m).exp(), (z[1] - m).exp()];
    let total = e[0] + e[1];
    let p = [e[0] / total, e[1] / total];
    println!("p {:.6} {:.6}", p[0], p[1]);
    println!("sum {:.6}", p[0] + p[1]);
}`
  },
  7: {
    python: String.raw`import math

# The four initial score rows, in the dataset's order.
scores = [[0.3, -0.3], [-0.1, 0.1], [-0.1, 0.1], [0.3, -0.3]]
y = [0, 1, 1, 0]
losses = []
for z, label in zip(scores, y):
    m = max(z)
    total = sum(math.exp(value - m) for value in z)
    losses.append(math.log(total) - (z[label] - m))
print(f"p_true {math.exp(-losses[0]):.6f}")
print(f"sample_loss {losses[0]:.6f}")
print(f"mean_loss {sum(losses) / len(losses):.6f}")`,
    c: String.raw`#include <math.h>
#include <stdio.h>

int main(void) {
    double scores[4][2] = {{0.3, -0.3}, {-0.1, 0.1}, {-0.1, 0.1}, {0.3, -0.3}};
    int y[4] = {0, 1, 1, 0};
    double losses[4], total_loss = 0;
    for (int i = 0; i < 4; i++) {
        double m = fmax(scores[i][0], scores[i][1]);
        double total = exp(scores[i][0] - m) + exp(scores[i][1] - m);
        losses[i] = log(total) - (scores[i][y[i]] - m);
        total_loss += losses[i];
    }
    printf("p_true %.6f\n", exp(-losses[0]));
    printf("sample_loss %.6f\n", losses[0]);
    printf("mean_loss %.6f\n", total_loss / 4);
    return 0;
}`,
    rust: String.raw`fn main() {
    let scores = [[0.3_f64, -0.3], [-0.1, 0.1], [-0.1, 0.1], [0.3, -0.3]];
    let y = [0_usize, 1, 1, 0];
    let mut losses = [0.0; 4];
    for i in 0..4 {
        let m = scores[i][0].max(scores[i][1]);
        let total = (scores[i][0] - m).exp() + (scores[i][1] - m).exp();
        losses[i] = total.ln() - (scores[i][y[i]] - m);
    }
    println!("p_true {:.6}", (-losses[0]).exp());
    println!("sample_loss {:.6}", losses[0]);
    println!("mean_loss {:.6}", losses.iter().sum::<f64>() / 4.0);
}`
  },
  8: {
    python: String.raw`import math

x = [1.0, 1.0]
W1 = [[0.5, -0.5], [0.5, -0.5]]
b1 = [-0.2, -0.2]
W2 = [[0.5, -0.5], [0.5, -0.5]]
b2 = [-0.1, 0.1]
label = 0
a = [sum(x[d] * W1[d][j] for d in range(2)) + b1[j] for j in range(2)]
h = [max(0.0, value) for value in a]
z = [sum(h[j] * W2[j][k] for j in range(2)) + b2[k] for k in range(2)]
m = max(z)
e = [math.exp(value - m) for value in z]
p = [value / sum(e) for value in e]
dz = [p[k] - (1.0 if k == label else 0.0) for k in range(2)]
dW2 = [[h[j] * dz[k] for k in range(2)] for j in range(2)]
db2 = dz[:]
dh = [sum(W2[j][k] * dz[k] for k in range(2)) for j in range(2)]
da = [dh[j] if a[j] > 0 else 0.0 for j in range(2)]
dW1 = [[x[d] * da[j] for j in range(2)] for d in range(2)]
db1 = da[:]
print(f"dz {dz[0]:.6f} {dz[1]:.6f}")
print(f"da {da[0]:.6f} {da[1]:.6f}")
print(f"dW2_00 {dW2[0][0]:.6f}")
print(f"dW1_00 {dW1[0][0]:.6f}")`,
    c: String.raw`#include <math.h>
#include <stdio.h>

int main(void) {
    double x[2] = {1, 1};
    double W1[2][2] = {{0.5, -0.5}, {0.5, -0.5}};
    double b1[2] = {-0.2, -0.2};
    double W2[2][2] = {{0.5, -0.5}, {0.5, -0.5}};
    double b2[2] = {-0.1, 0.1}, a[2], h[2], z[2];
    int label = 0;
    for (int j = 0; j < 2; j++) {
        a[j] = b1[j];
        for (int d = 0; d < 2; d++) a[j] += x[d] * W1[d][j];
        h[j] = fmax(0, a[j]);
    }
    for (int k = 0; k < 2; k++) {
        z[k] = b2[k];
        for (int j = 0; j < 2; j++) z[k] += h[j] * W2[j][k];
    }
    double m = fmax(z[0], z[1]);
    double e[2] = {exp(z[0] - m), exp(z[1] - m)};
    double total = e[0] + e[1], dz[2], db2[2], dh[2] = {0, 0}, da[2], db1[2];
    double dW1[2][2], dW2[2][2];
    for (int k = 0; k < 2; k++) {
        dz[k] = e[k] / total - (k == label ? 1 : 0);
        db2[k] = dz[k];
    }
    for (int j = 0; j < 2; j++) {
        for (int k = 0; k < 2; k++) {
            dW2[j][k] = h[j] * dz[k];
            dh[j] += W2[j][k] * dz[k];
        }
        da[j] = a[j] > 0 ? dh[j] : 0;
        db1[j] = da[j];
        for (int d = 0; d < 2; d++) dW1[d][j] = x[d] * da[j];
    }
    printf("dz %.6f %.6f\n", dz[0], dz[1]);
    printf("da %.6f %.6f\n", da[0], da[1]);
    printf("dW2_00 %.6f\n", dW2[0][0]);
    printf("dW1_00 %.6f\n", dW1[0][0]);
    return 0;
}`,
    rust: String.raw`fn main() {
    let x = [1.0_f64, 1.0];
    let w1 = [[0.5, -0.5], [0.5, -0.5]];
    let b1 = [-0.2, -0.2];
    let w2 = [[0.5, -0.5], [0.5, -0.5]];
    let b2 = [-0.1, 0.1];
    let label = 0;
    let (mut a, mut h, mut z) = ([0.0_f64; 2], [0.0_f64; 2], [0.0_f64; 2]);
    for j in 0..2 {
        a[j] = b1[j];
        for d in 0..2 { a[j] += x[d] * w1[d][j]; }
        h[j] = a[j].max(0.0);
    }
    for k in 0..2 {
        z[k] = b2[k];
        for j in 0..2 { z[k] += h[j] * w2[j][k]; }
    }
    let m = z[0].max(z[1]);
    let e = [(z[0] - m).exp(), (z[1] - m).exp()];
    let total = e[0] + e[1];
    let mut dz = [0.0; 2];
    for k in 0..2 { dz[k] = e[k] / total - if k == label { 1.0 } else { 0.0 }; }
    let db2 = dz;
    let (mut dh, mut da) = ([0.0; 2], [0.0; 2]);
    let (mut dw1, mut dw2) = ([[0.0; 2]; 2], [[0.0; 2]; 2]);
    for j in 0..2 {
        for k in 0..2 {
            dw2[j][k] = h[j] * dz[k];
            dh[j] += w2[j][k] * dz[k];
        }
        da[j] = if a[j] > 0.0 { dh[j] } else { 0.0 };
        for d in 0..2 { dw1[d][j] = x[d] * da[j]; }
    }
    let db1 = da;
    let _ = (db1, db2); // Computed biases, ready for a later update.
    println!("dz {:.6} {:.6}", dz[0], dz[1]);
    println!("da {:.6} {:.6}", da[0], da[1]);
    println!("dW2_00 {:.6}", dw2[0][0]);
    println!("dW1_00 {:.6}", dw1[0][0]);
}`
  },
  9: {
    python: String.raw`import math

def sample_loss(w):
    z = [0.8 * w - 0.1, -0.3]
    m = max(z)
    return math.log(sum(math.exp(value - m) for value in z)) - (z[0] - m)

w, eta, h0 = 0.5, 0.1, 0.8
p0 = 1.0 / (1.0 + math.exp(-0.6))
gradient = h0 * (p0 - 1.0)
delta = -eta * gradient
updated = w + delta
print(f"gradient {gradient:.6f}")
print(f"delta {delta:.6f}")
print(f"weight_after {updated:.6f}")
print(f"sample_loss_before {sample_loss(w):.6f}")
print(f"sample_loss_after {sample_loss(updated):.6f}")`,
    c: String.raw`#include <math.h>
#include <stdio.h>

double sample_loss(double w) {
    double z[2] = {0.8 * w - 0.1, -0.3};
    double m = fmax(z[0], z[1]);
    return log(exp(z[0] - m) + exp(z[1] - m)) - (z[0] - m);
}

int main(void) {
    double w = 0.5, eta = 0.1, h0 = 0.8;
    double p0 = 1 / (1 + exp(-0.6));
    double gradient = h0 * (p0 - 1), delta = -eta * gradient;
    double updated = w + delta;
    printf("gradient %.6f\n", gradient);
    printf("delta %.6f\n", delta);
    printf("weight_after %.6f\n", updated);
    printf("sample_loss_before %.6f\n", sample_loss(w));
    printf("sample_loss_after %.6f\n", sample_loss(updated));
    return 0;
}`,
    rust: String.raw`fn sample_loss(w: f64) -> f64 {
    let z = [0.8 * w - 0.1, -0.3];
    let m = z[0].max(z[1]);
    ((z[0] - m).exp() + (z[1] - m).exp()).ln() - (z[0] - m)
}

fn main() {
    let (w, eta, h0) = (0.5_f64, 0.1, 0.8);
    let p0 = 1.0 / (1.0 + (-0.6_f64).exp());
    let gradient = h0 * (p0 - 1.0);
    let delta = -eta * gradient;
    let updated = w + delta;
    println!("gradient {:.6}", gradient);
    println!("delta {:.6}", delta);
    println!("weight_after {:.6}", updated);
    println!("sample_loss_before {:.6}", sample_loss(w));
    println!("sample_loss_after {:.6}", sample_loss(updated));
}`
  },
  10: {
    python: String.raw`import math

X = [[1.0, 1.0], [1.0, -1.0], [-1.0, 1.0], [-1.0, -1.0]]
y = [0, 1, 1, 0]

def make_network():
    return {"W1": [[0.5, -0.5], [0.5, -0.5]], "b1": [-0.2, -0.2],
            "W2": [[0.5, -0.5], [0.5, -0.5]], "b2": [-0.1, 0.1]}

def forward(net, x):
    a = [sum(x[d] * net["W1"][d][j] for d in range(2)) + net["b1"][j]
         for j in range(2)]
    h = [max(0.0, value) for value in a]
    z = [sum(h[j] * net["W2"][j][k] for j in range(2)) + net["b2"][k]
         for k in range(2)]
    m = max(z)
    e = [math.exp(value - m) for value in z]
    total = sum(e)
    return {"a": a, "h": h, "z": z, "p": [v / total for v in e],
            "m": m, "log_total": math.log(total)}

def mean_loss(net):
    total = 0.0
    for x, label in zip(X, y):
        f = forward(net, x)
        total += f["log_total"] - (f["z"][label] - f["m"])
    return total / len(X)

def gradients(net):
    g = {"W1": [[0.0, 0.0], [0.0, 0.0]], "b1": [0.0, 0.0],
         "W2": [[0.0, 0.0], [0.0, 0.0]], "b2": [0.0, 0.0]}
    for x, label in zip(X, y):
        f = forward(net, x)
        dz = [(f["p"][k] - (1.0 if k == label else 0.0)) / len(X) for k in range(2)]
        da = [sum(net["W2"][j][k] * dz[k] for k in range(2))
              if f["a"][j] > 0 else 0.0 for j in range(2)]
        for j in range(2):
            for k in range(2):
                g["W2"][j][k] += f["h"][j] * dz[k]
        for k in range(2):
            g["b2"][k] += dz[k]
        for d in range(2):
            for j in range(2):
                g["W1"][d][j] += x[d] * da[j]
        for j in range(2):
            g["b1"][j] += da[j]
    return g

def train_step(net, eta):
    g = gradients(net)  # Compute ALL gradients before changing any parameter.
    for name in ("W1", "W2"):
        for row in range(2):
            for col in range(2):
                net[name][row][col] -= eta * g[name][row][col]
    for name in ("b1", "b2"):
        for k in range(2):
            net[name][k] -= eta * g[name][k]

net = make_network()
print(f"initial_loss {mean_loss(net):.6f}")
for step in range(120):
    train_step(net, 0.1)
print(f"final_loss {mean_loss(net):.6f}")
predictions = [0 if forward(net, x)["z"][0] >= forward(net, x)["z"][1] else 1 for x in X]
print("predictions " + " ".join(str(label) for label in predictions))
print(f"training_correct {sum(a == b for a, b in zip(predictions, y))}/{len(X)}")`,
    c: String.raw`#include <math.h>
#include <stdio.h>

typedef struct {
    double W1[2][2], b1[2], W2[2][2], b2[2];
} Network;
typedef struct {
    double a[2], h[2], z[2], p[2], m, log_total;
} Forward;
const double X[4][2] = {{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
const int y[4] = {0, 1, 1, 0};

Network make_network(void) {
    Network net = {{{0.5, -0.5}, {0.5, -0.5}}, {-0.2, -0.2},
                   {{0.5, -0.5}, {0.5, -0.5}}, {-0.1, 0.1}};
    return net;
}

Forward forward(const Network *net, const double x[2]) {
    Forward f = {0};
    for (int j = 0; j < 2; j++) {
        f.a[j] = net->b1[j];
        for (int d = 0; d < 2; d++) f.a[j] += x[d] * net->W1[d][j];
        f.h[j] = fmax(0, f.a[j]);
    }
    for (int k = 0; k < 2; k++) {
        f.z[k] = net->b2[k];
        for (int j = 0; j < 2; j++) f.z[k] += f.h[j] * net->W2[j][k];
    }
    f.m = fmax(f.z[0], f.z[1]);
    double e[2] = {exp(f.z[0] - f.m), exp(f.z[1] - f.m)};
    double total = e[0] + e[1];
    f.log_total = log(total);
    for (int k = 0; k < 2; k++) f.p[k] = e[k] / total;
    return f;
}

double mean_loss(const Network *net) {
    double total = 0;
    for (int i = 0; i < 4; i++) {
        Forward f = forward(net, X[i]);
        total += f.log_total - (f.z[y[i]] - f.m);
    }
    return total / 4;
}

Network gradients(const Network *net) {
    Network g = {0};
    for (int i = 0; i < 4; i++) {
        Forward f = forward(net, X[i]);
        double dz[2], da[2] = {0, 0};
        for (int k = 0; k < 2; k++) dz[k] = (f.p[k] - (k == y[i] ? 1 : 0)) / 4;
        for (int j = 0; j < 2; j++) {
            for (int k = 0; k < 2; k++) da[j] += net->W2[j][k] * dz[k];
            if (f.a[j] <= 0) da[j] = 0;
            for (int k = 0; k < 2; k++) g.W2[j][k] += f.h[j] * dz[k];
            g.b1[j] += da[j];
        }
        for (int k = 0; k < 2; k++) g.b2[k] += dz[k];
        for (int d = 0; d < 2; d++) {
            for (int j = 0; j < 2; j++) g.W1[d][j] += X[i][d] * da[j];
        }
    }
    return g;
}

void train_step(Network *net, double eta) {
    Network g = gradients(net); /* ALL gradients use the old parameters. */
    for (int row = 0; row < 2; row++) {
        for (int col = 0; col < 2; col++) {
            net->W1[row][col] -= eta * g.W1[row][col];
            net->W2[row][col] -= eta * g.W2[row][col];
        }
        net->b1[row] -= eta * g.b1[row];
        net->b2[row] -= eta * g.b2[row];
    }
}

int main(void) {
    Network net = make_network();
    printf("initial_loss %.6f\n", mean_loss(&net));
    for (int step = 0; step < 120; step++) train_step(&net, 0.1);
    printf("final_loss %.6f\n", mean_loss(&net));
    int correct = 0;
    printf("predictions");
    for (int i = 0; i < 4; i++) {
        Forward f = forward(&net, X[i]);
        int prediction = f.z[0] >= f.z[1] ? 0 : 1;
        printf(" %d", prediction);
        correct += prediction == y[i];
    }
    printf("\ntraining_correct %d/4\n", correct);
    return 0;
}`,
    rust: String.raw`#[derive(Clone, Copy)]
struct Network {
    w1: [[f64; 2]; 2], b1: [f64; 2], w2: [[f64; 2]; 2], b2: [f64; 2],
}
struct Forward {
    a: [f64; 2], h: [f64; 2], z: [f64; 2], p: [f64; 2], m: f64, log_total: f64,
}
const X: [[f64; 2]; 4] = [[1.0, 1.0], [1.0, -1.0], [-1.0, 1.0], [-1.0, -1.0]];
const Y: [usize; 4] = [0, 1, 1, 0];

fn make_network() -> Network {
    Network { w1: [[0.5, -0.5], [0.5, -0.5]], b1: [-0.2, -0.2],
              w2: [[0.5, -0.5], [0.5, -0.5]], b2: [-0.1, 0.1] }
}

fn forward(net: &Network, x: &[f64; 2]) -> Forward {
    let mut f = Forward { a: [0.0; 2], h: [0.0; 2], z: [0.0; 2],
                          p: [0.0; 2], m: 0.0, log_total: 0.0 };
    for j in 0..2 {
        f.a[j] = net.b1[j];
        for d in 0..2 { f.a[j] += x[d] * net.w1[d][j]; }
        f.h[j] = f.a[j].max(0.0);
    }
    for k in 0..2 {
        f.z[k] = net.b2[k];
        for j in 0..2 { f.z[k] += f.h[j] * net.w2[j][k]; }
    }
    f.m = f.z[0].max(f.z[1]);
    let e = [(f.z[0] - f.m).exp(), (f.z[1] - f.m).exp()];
    let total = e[0] + e[1];
    f.log_total = total.ln();
    for k in 0..2 { f.p[k] = e[k] / total; }
    f
}

fn mean_loss(net: &Network) -> f64 {
    let mut total = 0.0;
    for i in 0..4 {
        let f = forward(net, &X[i]);
        total += f.log_total - (f.z[Y[i]] - f.m);
    }
    total / 4.0
}

fn gradients(net: &Network) -> Network {
    let mut g = Network { w1: [[0.0; 2]; 2], b1: [0.0; 2],
                          w2: [[0.0; 2]; 2], b2: [0.0; 2] };
    for i in 0..4 {
        let f = forward(net, &X[i]);
        let (mut dz, mut da) = ([0.0; 2], [0.0; 2]);
        for k in 0..2 { dz[k] = (f.p[k] - if k == Y[i] { 1.0 } else { 0.0 }) / 4.0; }
        for j in 0..2 {
            for k in 0..2 { da[j] += net.w2[j][k] * dz[k]; }
            if f.a[j] <= 0.0 { da[j] = 0.0; }
            for k in 0..2 { g.w2[j][k] += f.h[j] * dz[k]; }
            g.b1[j] += da[j];
        }
        for k in 0..2 { g.b2[k] += dz[k]; }
        for d in 0..2 {
            for j in 0..2 { g.w1[d][j] += X[i][d] * da[j]; }
        }
    }
    g
}

fn train_step(net: &mut Network, eta: f64) {
    let g = gradients(net); // ALL gradients use the old parameters.
    for row in 0..2 {
        for col in 0..2 {
            net.w1[row][col] -= eta * g.w1[row][col];
            net.w2[row][col] -= eta * g.w2[row][col];
        }
        net.b1[row] -= eta * g.b1[row];
        net.b2[row] -= eta * g.b2[row];
    }
}

fn main() {
    let mut net = make_network();
    println!("initial_loss {:.6}", mean_loss(&net));
    for _step in 0..120 { train_step(&mut net, 0.1); }
    println!("final_loss {:.6}", mean_loss(&net));
    let mut correct = 0;
    print!("predictions");
    for i in 0..4 {
        let f = forward(&net, &X[i]);
        let prediction = if f.z[0] >= f.z[1] { 0 } else { 1 };
        print!(" {}", prediction);
        if prediction == Y[i] { correct += 1; }
    }
    println!("\ntraining_correct {}/4", correct);
}`
  }
};
