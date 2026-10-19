# ML & deep learning

A separate, hands-on path from mathematical notation to a small neural network. The formulas come with editable, runnable code in JavaScript, Python, C, and Rust; the examples use only standard libraries. You can follow the path in order or use a section as a reference.

The final task is to train a two-layer classifier. We show its intimidating-looking expression first, build every ingredient with the same four data points, then run the whole thing. No machine-learning library is needed; basic arrays, loops, exponentials, and derivatives are enough for this demonstration. The [main notation guide](../README.md) can help with sums, matrices, derivatives, and gradients.

# contents

- [the final boss](#the-final-boss)
- [data and shapes](#data-and-shapes)
- [weighted sums and bias](#weighted-sums-and-bias)
- [nonlinearity](#nonlinearity)
- [a network is composition](#a-network-is-composition)
- [from scores to probabilities](#from-scores-to-probabilities)
- [measuring the mistake](#measuring-the-mistake)
- [backpropagation](#backpropagation)
- [gradient descent](#gradient-descent)
- [train the tiny network](#train-the-tiny-network)

## the final boss

By the end, you can run a complete training loop for a network with **two inputs, two hidden units, and two output classes**. Here is its whole objective, followed by its update rule. It is fine if the symbols look crowded right now: each following section replaces one piece with ordinary code.

![ml-1-1](https://latex.codecogs.com/svg.latex?L%28%5Ctheta%29%3D-%5Cfrac%7B1%7D%7BN%7D%5Csum_%7Bi%3D0%7D%5E%7BN-1%7D%5Clog%5C%21%5Cleft%28%5B%5Coperatorname%7Bsoftmax%7D%28%5Coperatorname%7BReLU%7D%28x_iW_1%2Bb_1%29W_2%2Bb_2%29%5D_%7By_i%7D%5Cright%29)

<!-- L(\theta)=-\frac{1}{N}\sum_{i=0}^{N-1}\log\!\left([\operatorname{softmax}(\operatorname{ReLU}(x_iW_1+b_1)W_2+b_2)]_{y_i}\right) -->

![ml-1-2](https://latex.codecogs.com/svg.latex?%5Ctheta%5Cleftarrow%5Ctheta-%5Ceta%5Cnabla_%7B%5Ctheta%7DL%28%5Ctheta%29)

<!-- \theta\leftarrow\theta-\eta\nabla_{\theta}L(\theta) -->

Read the first line as: make a prediction, take the probability assigned to the correct answer, measure its mistake, then average over the examples. Read the second as: subtract a small amount of the gradient from every parameter.

`N = 4` counts the examples. `x_i` is input row `i`; `y_i` is its correct class index, either `0` or `1`. `W1`, `b1`, `W2`, and `b2` are the weights and biases; together their **12 trainable numbers** are `θ` (theta). `η` (eta) is the step size. `∇θ L` is the gradient: one sensitivity for each of those numbers. `log` means the natural logarithm. The subscript `[y_i]` selects the correct class's probability, not a multiplication.

<!-- comparison:break -->

Start with one inspectable number. Later sections derive this probability for our first example; this preview measures that one example, rather than the average:

```js
// Preview: the first input will receive this probability for its correct class.
const pTrue = 0.6456563062257954;
console.log("sample_loss", (-Math.log(pTrue)).toFixed(6));
```

The result is `sample_loss 0.437488`. Our destination is a program that computes these probabilities itself and reduces the average mistake through repeated updates. The route is data → weighted sums → ReLU → scores → probabilities → loss → gradients → updates. Reading the route is a starting point; changing and checking the runnable examples is the work.

## data and shapes

Keep these same four examples throughout the guide. Each example has two input features, each `+1` or `-1`. Class `0` means their signs match; class `1` means their signs differ. These are invented labels for a tiny demonstration.

| row `i` | `x_i[0]` | `x_i[1]` | correct class `y_i` |
| --- | --- | --- | --- |
| 0 | 1 | 1 | 0 |
| 1 | 1 | -1 | 1 |
| 2 | -1 | 1 | 1 |
| 3 | -1 | -1 | 0 |

A **shape** counts rows and columns. `X` is `4 × 2`: examples down the rows, features across the columns. Every individual `x_i` is a row vector of length two. We use zero-based indexing in both formulas and code: `X[0][1]` means feature `1` of example `0`.

The first matrix's rows correspond to input features and its columns to hidden units. The second matrix's rows correspond to hidden units and its columns to classes. Both happen to be `2 × 2`; their roles are different. Biases have length two and are added to each example's output row.

![ml-2-1](https://latex.codecogs.com/svg.latex?X%5Cin%5Cmathbb%7BR%7D%5E%7B4%5Ctimes2%7D%2C%5Cquad%20W_1%5Cin%5Cmathbb%7BR%7D%5E%7B2%5Ctimes2%7D%2C%5Cquad%20W_2%5Cin%5Cmathbb%7BR%7D%5E%7B2%5Ctimes2%7D%2C%5Cquad%20b_1%2Cb_2%5Cin%5Cmathbb%7BR%7D%5E%7B2%7D)

<!-- X\in\mathbb{R}^{4\times2},\quad W_1\in\mathbb{R}^{2\times2},\quad W_2\in\mathbb{R}^{2\times2},\quad b_1,b_2\in\mathbb{R}^{2} -->

Store the rows and inspect the first one:

```js
const X = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const y = [0, 1, 1, 0];
console.log("examples", X.length);
console.log("features", X[0].length);
console.log("x0", X[0][0].toFixed(6), X[0][1].toFixed(6));
console.log("y0", y[0]);
```

Try changing one feature and predict which class its signs describe. This only changes the stored data; it does not retrain a model.

## weighted sums and bias

A hidden unit begins with a **weighted sum**: multiply each feature by its weight, add the products, then add a bias. A weight controls how strongly an input contributes; a bias shifts the result even when every input is zero.

For our first row `x = [1, 1]`, the first hidden unit computes `1 × 0.5 + 1 × 0.5 − 0.2 = 0.8`. The second computes `1 × (−0.5) + 1 × (−0.5) − 0.2 = −1.2`.

Here `d` selects an input feature and `j` selects a hidden unit. `W1[d][j]` is the connection **from feature `d` to hidden unit `j`**. `a` is the row before the activation function.

![ml-3-1](https://latex.codecogs.com/svg.latex?a%3DxW_1%2Bb_1%2C%5Cqquad%20a_j%3D%5Csum_%7Bd%3D0%7D%5E%7B1%7Dx_d%28W_1%29_%7Bdj%7D%2B%28b_1%29_j)

<!-- a=xW_1+b_1,\qquad a_j=\sum_{d=0}^{1}x_d(W_1)_{dj}+(b_1)_j -->

Compute both hidden units with the same two input numbers:

```js
const x = [1, 1];
const W1 = [[0.5, -0.5], [0.5, -0.5]];
const b1 = [-0.2, -0.2];
const a = [0, 1].map(j =>
  x.reduce((sum, value, d) => sum + value * W1[d][j], 0) + b1[j]
);
console.log("a", ...a.map(value => value.toFixed(6)));
```

The result is `a 0.800000 -1.200000`. Before running an edit, change `b1[0]` from `−0.2` to `0` and predict the first number.

## nonlinearity

**ReLU** is a small rule with a long name: rectified linear unit. It keeps a positive number and replaces a negative number with zero. Applied to our row, `[0.8, −1.2]` becomes `[0.8, 0]`. We call this activated row `h`, for hidden representation.

Why add this rule? Composing weighted sums and biases alone still produces a weighted sum and bias. ReLU introduces a bend: different inputs can switch different hidden units on. A linear classifier cannot put the two matching-sign corners in one class and the two other corners in another, whereas this hidden representation can separate our four points.

![ml-4-1](https://latex.codecogs.com/svg.latex?h_j%3D%5Coperatorname%7BReLU%7D%28a_j%29%3D%5Cmax%280%2Ca_j%29)

<!-- h_j=\operatorname{ReLU}(a_j)=\max(0,a_j) -->

Apply the rule to the values we just calculated:

```js
const a = [0.8, -1.2];
const h = a.map(value => Math.max(0, value));
console.log("h", ...h.map(value => value.toFixed(6)));
```

Change the second input to ReLU from `−1.2` to `0.2`; its output becomes `0.2`. Later, the backward pass will use which side of zero each value took.

## a network is composition

**Composition** means feeding one function's output into the next. Our network does a weighted sum, ReLU, then another weighted sum. The hidden units are ordinary intermediate values, not a separate kind of arithmetic.

`W2[j][k]` connects hidden unit `j` to class `k`. For `h = [0.8, 0]`, the first class score is `0.8 × 0.5 + 0 × 0.5 − 0.1 = 0.3`; the second is `−0.3`. Scores, often called **logits**, may be negative and need not sum to one. They are not probabilities yet.

This deliberately small feedforward network exposes the same composition used when more layers are stacked. It is an introduction to the mechanics of deep learning, rather than a claim that this tiny model needs great depth. The [Stanford CS231n worked network](https://cs231n.github.io/neural-networks-case-study/#training-a-neural-network) connects these same forward and backward operations in a larger example.

![ml-5-1](https://latex.codecogs.com/svg.latex?z%3DhW_2%2Bb_2%3D%5Coperatorname%7BReLU%7D%28xW_1%2Bb_1%29W_2%2Bb_2)

<!-- z=hW_2+b_2=\operatorname{ReLU}(xW_1+b_1)W_2+b_2 -->

Run the complete path from the original input to the two scores:

```js
const x = [1, 1];
const W1 = [[0.5, -0.5], [0.5, -0.5]];
const b1 = [-0.2, -0.2];
const W2 = [[0.5, -0.5], [0.5, -0.5]];
const b2 = [-0.1, 0.1];
const a = [0, 1].map(j =>
  x.reduce((sum, value, d) => sum + value * W1[d][j], 0) + b1[j]
);
const h = a.map(value => Math.max(0, value));
const z = [0, 1].map(k =>
  h.reduce((sum, value, j) => sum + value * W2[j][k], 0) + b2[k]
);
console.log("scores", ...z.map(value => value.toFixed(6)));
```

The result is `scores 0.300000 -0.300000`. Try the row `[-1, −1]`. The other hidden unit turns on, but the scores stay the same: both rows have matching signs.

## from scores to probabilities

**Softmax** converts scores into positive numbers that sum to one. Exponentiate each score, then divide each exponential by their total. `p[k]` is the model's probability for class `k`; the class with the highest probability is its prediction. These numbers express the model's distribution and need not be calibrated to real-world frequencies.

We first subtract the largest score `m`. Subtracting the same number from every score leaves the ratio unchanged, because its common exponential factor cancels. It also makes every exponent nonpositive, avoiding overflow from exponentiating a large positive score. For our scores, the shifted values are `[0, −0.6]`.

![ml-6-1](https://latex.codecogs.com/svg.latex?p_k%3D%5Cfrac%7Be%5E%7Bz_k-m%7D%7D%7B%5Csum_%7Br%3D0%7D%5E%7B1%7De%5E%7Bz_r-m%7D%7D%2C%5Cqquad%20m%3D%5Cmax_r%20z_r)

<!-- p_k=\frac{e^{z_k-m}}{\sum_{r=0}^{1}e^{z_r-m}},\qquad m=\max_r z_r -->

Normalize the two scores and check their sum:

```js
const z = [0.3, -0.3];
const m = Math.max(...z);
const e = z.map(value => Math.exp(value - m));
const total = e.reduce((sum, value) => sum + value, 0);
const p = e.map(value => value / total);
console.log("p", ...p.map(value => value.toFixed(6)));
console.log("sum", p.reduce((sum, value) => sum + value, 0).toFixed(6));
```

You get `p 0.645656 0.354344` and `sum 1.000000`. Add `1000` to **both** scores and rerun: the probabilities stay the same. A larger correct-class score relative to the other score raises its probability.

## measuring the mistake

The correct class for our first row is `y[0] = 0`. Its probability is therefore `p[0]`, not the entire probability row. **Cross-entropy loss** for a known class is `−log(p[correct class])`: probability `1` gives loss `0`, probability `0.5` gives about `0.693147`, and a confidently wrong prediction gets a large loss.

`ℓ_i` (ell) is one example's loss. `L` is the mean of the four losses. The initial score rows are `[0.3, −0.3]`, `[−0.1, 0.1]`, `[−0.1, 0.1]`, and `[0.3, −0.3]`; the code below uses exactly those rows.

Mathematically we can take `−log(p[y])`. For computation, combine softmax and the logarithm instead: `log(sum(exp(z − m))) − (z[y] − m)`. This avoids taking the log of a probability that has rounded down to zero. [SciPy's log-sum-exp documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.special.logsumexp.html) describes the corresponding stable reduction; our code implements the small calculation directly and has no SciPy dependency.

![ml-7-1](https://latex.codecogs.com/svg.latex?%5Cell_i%3D-%5Clog%20p_%7Bi%2Cy_i%7D%3D%5Clog%5C%21%5Cleft%28%5Csum_%7Bk%3D0%7D%5E%7B1%7De%5E%7Bz_%7Bik%7D-m_i%7D%5Cright%29-%28z_%7Bi%2Cy_i%7D-m_i%29%2C%5Cqquad%20L%3D%5Cfrac%7B1%7D%7BN%7D%5Csum_%7Bi%3D0%7D%5E%7BN-1%7D%5Cell_i)

<!-- \ell_i=-\log p_{i,y_i}=\log\!\left(\sum_{k=0}^{1}e^{z_{ik}-m_i}\right)-(z_{i,y_i}-m_i),\qquad L=\frac{1}{N}\sum_{i=0}^{N-1}\ell_i -->

Select each correct class with its label, then average the four mistakes:

```js
// Initial score rows in the same order as X and y.
const scores = [[0.3, -0.3], [-0.1, 0.1], [-0.1, 0.1], [0.3, -0.3]];
const y = [0, 1, 1, 0];
const losses = scores.map((z, i) => {
  const m = Math.max(...z);
  const total = z.reduce((sum, value) => sum + Math.exp(value - m), 0);
  return Math.log(total) - (z[y[i]] - m);
});
console.log("p_true", Math.exp(-losses[0]).toFixed(6));
console.log("sample_loss", losses[0].toFixed(6));
console.log("mean_loss", (losses.reduce((sum, value) => sum + value, 0) / losses.length).toFixed(6));
```

The first example contributes `0.437488`; the mean is `0.517813`. Change only `y[0]` from `0` to `1` and predict whether its loss will rise or fall. The probabilities have not changed; which answer we call correct has.

## backpropagation

A **gradient** asks how the loss changes when one value changes a little. Backpropagation applies the chain rule from the loss back through the operations we already ran. It calculates sensitivities; it does not change weights.

Start with one example's loss `ℓ`. Differentiating softmax gives `∂p_y/∂z_k = p_y(1[k=y] − p_k)`. Multiplying by `∂ℓ/∂p_y = −1/p_y` cancels `p_y`, leaving `g_z[k] = p[k] − 1[k=y]`. The indicator `1[condition]` is `1` when its condition is true and `0` otherwise.

For a product, each input's gradient is the other input times the incoming gradient. Thus `∂ℓ/∂W2[j][k] = h[j] × g_z[k]`. Sum all outgoing paths to get `g_h[j]`. Through ReLU, pass that gradient only when the saved `a[j]` was positive. ReLU has no ordinary derivative at zero; **we choose the subgradient `0` at zero**, as the code's `a[j] > 0` test states. Finally `∂ℓ/∂W1[d][j] = x[d] × g_a[j]`.

In the row-vector formulas below, `T` means transpose and `⊙` means element-by-element multiplication. Bias gradients are `g_z` and `g_a` because adding a bias has derivative `1`. For the mean loss, average each parameter's gradients over the four examples. This is the analytic chain rule, rather than guessing gradients by small weight changes. [CS231n's backpropagation steps](https://cs231n.github.io/neural-networks-case-study/#computing-the-analytic-gradient-with-backpropagation) show the same score gradient.

![ml-8-1](https://latex.codecogs.com/svg.latex?%5Cbegin%7Baligned%7Dg_z%26%3Dp-e_y%2C%26g_h%26%3Dg_zW_2%5ET%2C%26g_a%26%3Dg_h%5Codot%5Cmathbf%7B1%7D%5Ba%3E0%5D%5C%5C%20%5Cfrac%7B%5Cpartial%5Cell%7D%7B%5Cpartial%20W_2%7D%26%3Dh%5ETg_z%2C%26%5Cfrac%7B%5Cpartial%5Cell%7D%7B%5Cpartial%20b_2%7D%26%3Dg_z%2C%26%5Cfrac%7B%5Cpartial%5Cell%7D%7B%5Cpartial%20W_1%7D%26%3Dx%5ETg_a%2C%26%5Cfrac%7B%5Cpartial%5Cell%7D%7B%5Cpartial%20b_1%7D%26%3Dg_a%5Cend%7Baligned%7D)

<!-- \begin{aligned}g_z&=p-e_y,&g_h&=g_zW_2^T,&g_a&=g_h\odot\mathbf{1}[a>0]\\ \frac{\partial\ell}{\partial W_2}&=h^Tg_z,&\frac{\partial\ell}{\partial b_2}&=g_z,&\frac{\partial\ell}{\partial W_1}&=x^Tg_a,&\frac{\partial\ell}{\partial b_1}&=g_a\end{aligned} -->

![ml-8-2](https://latex.codecogs.com/svg.latex?%5Cnabla_%5Ctheta%20L%3D%5Cfrac%7B1%7D%7BN%7D%5Csum_%7Bi%3D0%7D%5E%7BN-1%7D%5Cnabla_%5Ctheta%5Cell_i)

<!-- \nabla_\theta L=\frac{1}{N}\sum_{i=0}^{N-1}\nabla_\theta\ell_i -->

Trace the first example all the way back to both weight matrices:

```js
const x = [1, 1];
const W1 = [[0.5, -0.5], [0.5, -0.5]];
const b1 = [-0.2, -0.2];
const W2 = [[0.5, -0.5], [0.5, -0.5]];
const b2 = [-0.1, 0.1];
const label = 0;
const a = [0, 1].map(j => x.reduce((s, v, d) => s + v * W1[d][j], 0) + b1[j]);
const h = a.map(value => Math.max(0, value));
const z = [0, 1].map(k => h.reduce((s, v, j) => s + v * W2[j][k], 0) + b2[k]);
const m = Math.max(...z);
const e = z.map(value => Math.exp(value - m));
const total = e[0] + e[1];
const p = e.map(value => value / total);
const dz = p.map((value, k) => value - (k === label ? 1 : 0));
const dW2 = h.map(value => dz.map(gradient => value * gradient));
const db2 = [...dz];
const dh = [0, 1].map(j => dz.reduce((sum, gradient, k) => sum + W2[j][k] * gradient, 0));
const da = dh.map((gradient, j) => a[j] > 0 ? gradient : 0);
const dW1 = x.map(value => da.map(gradient => value * gradient));
const db1 = [...da];
console.log("dz", ...dz.map(value => value.toFixed(6)));
console.log("da", ...da.map(value => value.toFixed(6)));
console.log("dW2_00", dW2[0][0].toFixed(6));
console.log("dW1_00", dW1[0][0].toFixed(6));
```

Here `dz` is `[-0.354344, 0.354344]`. The negative first component says increasing the correct class's score locally decreases loss. The inactive second hidden unit has `da[1] = 0`. The printed weight gradients are `dW2_00 −0.283475` and `dW1_00 −0.354344`. None is an update yet.

## gradient descent

Now use a gradient. For a parameter `w`, subtract `η × gradient` from its current value. The gradient describes sensitivity; the **update** is the signed amount `−η × gradient`. A negative gradient therefore produces a positive update.

To inspect just one subtraction, freeze the other eleven parameters and update `w = W2[0][0]` using the first example's loss. Its gradient is `h[0] × (p[0] − 1) = −0.283475`. With `η = 0.1`, the update is `+0.028347`, moving `w` from `0.5` to `0.528347`.

This is a single-coordinate, single-example illustration. The final program will use the mean loss and update all twelve parameters together from gradients computed at the same old parameters. A step size is a choice, not a derivative; a large step can increase loss.

![ml-9-1](https://latex.codecogs.com/svg.latex?%5CDelta%20w%3D-%5Ceta%5Cfrac%7B%5Cpartial%5Cell%7D%7B%5Cpartial%20w%7D%2C%5Cqquad%20w_%7B%5Cmathrm%7Bnew%7D%7D%3Dw%2B%5CDelta%20w)

<!-- \Delta w=-\eta\frac{\partial\ell}{\partial w},\qquad w_{\mathrm{new}}=w+\Delta w -->

Compute the gradient and the update separately, then measure the new loss:

```js
function sampleLoss(w) {
  const z = [0.8 * w - 0.1, -0.3];
  const m = Math.max(...z);
  const total = z.reduce((sum, value) => sum + Math.exp(value - m), 0);
  return Math.log(total) - (z[0] - m);
}
const w = 0.5, eta = 0.1, h0 = 0.8;
const p0 = 1 / (1 + Math.exp(-0.6));
const gradient = h0 * (p0 - 1);
const delta = -eta * gradient;
const updated = w + delta;
console.log("gradient", gradient.toFixed(6));
console.log("delta", delta.toFixed(6));
console.log("weight_after", updated.toFixed(6));
console.log("sample_loss_before", sampleLoss(w).toFixed(6));
console.log("sample_loss_after", sampleLoss(updated).toFixed(6));
```

The example's loss falls from `0.437488` to `0.429511`. Predict what `eta = 0` will print, then try it. This one successful step is evidence about these numbers, not a guarantee that every neural-network update improves its loss.

## train the tiny network

Return to the final boss. Every part now has a job: `xW1 + b1` mixes inputs, ReLU bends the function, `hW2 + b2` makes scores, softmax makes probabilities, cross-entropy measures the correct answer's probability, and the mean combines examples. The gradient travels back along that exact route. An update is one subtraction for each of twelve numbers.

This standalone program computes all four examples, accumulates their **mean-loss gradients**, then updates all parameters. Dividing `dz` by `X.length` once accounts for the mean; do not divide the resulting gradients again. It repeats exactly **120 full-batch steps**, with `η = 0.1`, fixed inputs and fixed initial weights. All loops are bounded. The final printed loss is evaluated after the last update.

The starting weights are deliberately hand-chosen to make the hidden units easy to inspect. They already predict all four labels correctly; training here increases confidence and lowers the mean loss. Training is optimization on observed examples. **Generalization** means performing well on new examples; four training points and their training accuracy do not establish that. There is no held-out test set in this demonstration.

![ml-10-1](https://latex.codecogs.com/svg.latex?L%28%5Ctheta%29%3D-%5Cfrac%7B1%7D%7B4%7D%5Csum_%7Bi%3D0%7D%5E%7B3%7D%5Clog%5C%21%5Cleft%28%5B%5Coperatorname%7Bsoftmax%7D%28%5Coperatorname%7BReLU%7D%28x_iW_1%2Bb_1%29W_2%2Bb_2%29%5D_%7By_i%7D%5Cright%29%2C%5Cqquad%5Ctheta%5Cleftarrow%5Ctheta-0.1%5Cnabla_%5Ctheta%20L)

<!-- L(\theta)=-\frac{1}{4}\sum_{i=0}^{3}\log\!\left([\operatorname{softmax}(\operatorname{ReLU}(x_iW_1+b_1)W_2+b_2)]_{y_i}\right),\qquad\theta\leftarrow\theta-0.1\nabla_\theta L -->

Run the complete forward → loss → backward → update loop:

```js
const X = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const y = [0, 1, 1, 0];

function makeNetwork() {
  return { W1: [[0.5, -0.5], [0.5, -0.5]], b1: [-0.2, -0.2],
           W2: [[0.5, -0.5], [0.5, -0.5]], b2: [-0.1, 0.1] };
}

function forward(net, x) {
  const a = [0, 1].map(j =>
    x.reduce((sum, value, d) => sum + value * net.W1[d][j], 0) + net.b1[j]
  );
  const h = a.map(value => Math.max(0, value));
  const z = [0, 1].map(k =>
    h.reduce((sum, value, j) => sum + value * net.W2[j][k], 0) + net.b2[k]
  );
  const m = Math.max(...z);
  const e = z.map(value => Math.exp(value - m));
  const total = e[0] + e[1];
  return { a, h, z, p: e.map(value => value / total), m, logTotal: Math.log(total) };
}

function meanLoss(net) {
  return X.reduce((sum, x, i) => {
    const f = forward(net, x);
    return sum + f.logTotal - (f.z[y[i]] - f.m);
  }, 0) / X.length;
}

function gradients(net) {
  const g = { W1: [[0, 0], [0, 0]], b1: [0, 0],
              W2: [[0, 0], [0, 0]], b2: [0, 0] };
  X.forEach((x, i) => {
    const f = forward(net, x);
    const dz = f.p.map((value, k) => (value - (k === y[i] ? 1 : 0)) / X.length);
    const da = [0, 1].map(j => f.a[j] > 0
      ? dz.reduce((sum, value, k) => sum + net.W2[j][k] * value, 0) : 0);
    for (let j = 0; j < 2; j++) {
      for (let k = 0; k < 2; k++) g.W2[j][k] += f.h[j] * dz[k];
      g.b1[j] += da[j];
    }
    for (let k = 0; k < 2; k++) g.b2[k] += dz[k];
    for (let d = 0; d < 2; d++) {
      for (let j = 0; j < 2; j++) g.W1[d][j] += x[d] * da[j];
    }
  });
  return g;
}

function trainStep(net, eta) {
  const g = gradients(net); // ALL gradients use the old parameters.
  for (const name of ["W1", "W2"]) {
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) net[name][row][col] -= eta * g[name][row][col];
    }
  }
  for (const name of ["b1", "b2"]) {
    for (let k = 0; k < 2; k++) net[name][k] -= eta * g[name][k];
  }
}

const net = makeNetwork();
console.log("initial_loss", meanLoss(net).toFixed(6));
for (let step = 0; step < 120; step++) trainStep(net, 0.1);
console.log("final_loss", meanLoss(net).toFixed(6));
const predictions = X.map(x => {
  const { z } = forward(net, x);
  return z[0] >= z[1] ? 0 : 1;
});
console.log("predictions", ...predictions);
console.log("training_correct", predictions.filter((label, i) => label === y[i]).length + "/" + X.length);
```

The default run prints `initial_loss 0.517813`, `final_loss 0.098281`, `predictions 0 1 1 0`, and `training_correct 4/4`.

Try three checks: set the iteration count to zero and confirm the loss is unchanged; compare one step with 120; explain why gradients are computed before any parameter is edited. Then follow one example forward and one weight backward without hiding behind the full expression. The final boss is that sequence of familiar operations, repeated with measured feedback.

Larger datasets and deeper networks require additional choices and validation. The reusable part here is the loop: compute → measure → differentiate → update → check.
