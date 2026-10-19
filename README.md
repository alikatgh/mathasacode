# math-as-code

>[Chinese translation (中文版)](./README-zh.md)  
>[Python version (English)](./PYTHON-README.md)

This is a reference to ease developers into mathematical notation by showing comparisons with JavaScript code.

Motivation: Academic papers can be intimidating for self-taught game and graphics programmers. :) 

This guide covers common notation for arithmetic, vectors, matrices, sets, logic, introductory calculus, probability and statistics, plus a worked graphics example. If you see errors or want to contribute, please [open a ticket](https://github.com/alikatgh/mathasacode/issues) or send a PR.

> **Note**: For brevity, some code examples make use of [npm packages](https://www.npmjs.com/). You can refer to their GitHub repos for implementation details.



# foreword

Mathematical symbols can mean different things depending on the author, context and the field of study (linear algebra, set theory, etc). This guide may not cover *all* uses of a symbol. In some cases, real-world references (blog posts, publications, etc) will be cited to demonstrate how a symbol might appear in the wild.

For a more complete list, refer to [Wikipedia - List of Mathematical Symbols](https://en.wikipedia.org/wiki/List_of_mathematical_symbols). 

For simplicity, many of the code examples here operate on floating point values and are not numerically robust. For more details on why this may be a problem, see [Robust Arithmetic Notes](https://github.com/mikolalysenko/robust-arithmetic-notes) by Mikola Lysenko.

# contents

- [variable name conventions](#variable-name-conventions)
- [equals `=` `≈` `≠` `:=`](#equals-symbols)
- [square root and complex numbers `√` *`i`*](#square-root-and-complex-numbers)
- [dot & cross `·` `×` `∘`](#dot--cross)
  - [scalar multiplication](#scalar-multiplication)
  - [vector multiplication](#vector-multiplication)
  - [dot product](#dot-product)
  - [cross product](#cross-product)
- [sigma `Σ`](#sigma) - *summation*
- [averages `1/n Σ`](#averages)
- [capital Pi `Π`](#capital-pi) - *products of sequences*
- [pipes `||`](#pipes)
  - [absolute value](#absolute-value)
  - [Euclidean norm](#euclidean-norm)
  - [determinant](#determinant)
- [hat **`â`**](#hat) - *unit vector*
- ["element of" `∈` `∉`](#element)
- [common number sets `ℝ` `ℤ` `ℚ` `ℕ`](#common-number-sets)
- [function `ƒ`](#function)
  - [piecewise function](#piecewise-function)
  - [common functions](#common-functions)
  - [function notation `↦` `→`](#function-notation)
- [prime `′`](#prime)
- [floor & ceiling `⌊` `⌉`](#floor--ceiling)
- [arrows](#arrows)
  - [material implication `⇒` `→`](#material-implication)
  - [inequality `<` `≥` `≫`](#inequality)
  - [conjunction & disjunction `∧` `∨`](#conjunction--disjunction)
- [logical negation `¬` `~` `!`](#logical-negation)
- [intervals](#intervals)
- [matrix multiplication](#matrix-multiplication)
- [tensor product `⊗`](#tensor-product)
- [delta `Δ` `δ`](#delta)
- [derivatives `f′` `d/dx`](#derivatives)
- [gradients and gradient descent `∇`](#gradients-and-gradient-descent)
- [integrals `∫`](#integrals)
- [worked graphics expression](#worked-graphics-expression)
  - [running the examples](#running-the-examples)
- [powers and logarithms](#powers-and-logarithms)
- [trigonometry](#trigonometry)
- [modular arithmetic](#modular-arithmetic)
- [factorials and combinations](#factorials-and-combinations)
- [probability](#probability)
- [expected value](#expected-value)
- [variance and standard deviation](#variance-and-standard-deviation)
- [conditional probability and Bayes](#conditional-probability-and-bayes)
- [covariance and correlation](#covariance-and-correlation)
- [entropy](#entropy)
- [more...](#more)

## variable name conventions

There are a variety of naming conventions depending on the context and field of study, and they are not always consistent. However, in some of the literature you may find variable names to follow a pattern like so:

- *s* - italic lowercase letters for scalars (e.g. a number)
- **x** - bold lowercase letters for vectors (e.g. a 2D point)
- **A** - bold uppercase letters for matrices (e.g. a 3D transformation)
- *θ* - italic lowercase Greek letters for constants and special variables (e.g. [polar angle *θ*, *theta*](https://en.wikipedia.org/wiki/Spherical_coordinate_system))

This will also be the format of this guide.

## equals symbols

There are a number of symbols resembling the equals sign `=`. Here are a few common examples:

- `=` is for equality (values are the same)
- `≠` is for inequality (value are not the same)
- `≈` is for approximately equal to (`π ≈ 3.14159`)
- `:=` is for definition (A is defined as B)

In JavaScript:

```js
// equality
2 === 3

// inequality
2 !== 3

// approximately equal
almostEqual(Math.PI, 3.14159, 1e-5)

function almostEqual(a, b, epsilon) {
  return Math.abs(a - b) <= epsilon
}
```

You might see the `:=`, `=:` and `=` symbols being used for *definition*.<sup>[1]</sup>

For example, the following defines *x* to be another name for 2*kj*.

![equals1](http://latex.codecogs.com/svg.latex?x%20%3A%3D%202kj)

<!-- x := 2kj -->

In JavaScript, we might use `var` to *define* our variables and provide aliases:

```js
var x = 2 * k * j
```

However, this is mutable, and only takes a snapshot of the values at that time. Some languages have pre-processor `#define` statements, which are closer to a mathematical *define*. 

A more accurate *define* in JavaScript (ES6) might look a bit like this:

```js
const f = (k, j) => 2 * k * j
```

The following, on the other hand, represents equality:

![equals2](http://latex.codecogs.com/svg.latex?x%20%3D%202kj)

<!-- x = 2kj -->

The above equation might be interpreted in code as an [assertion](https://developer.mozilla.org/en-US/docs/Web/API/console/assert):

```js
console.assert(x === (2 * k * j))
```

## square root and complex numbers

A square root operation is of the form:

![squareroot](http://latex.codecogs.com/svg.latex?%5Cleft%28%5Csqrt%7Bx%7D%5Cright%29%5E2%20%3D%20x)

<!-- \left(\sqrt{x}\right)^2 = x -->

In programming we use a `sqrt` function, like so: 

```js
var x = 9;
console.log(Math.sqrt(x));
//=> 3
```

Complex numbers are expressions of the form ![complex](http://latex.codecogs.com/svg.latex?a&space;&plus;&space;ib), where ![a](http://latex.codecogs.com/svg.latex?a) is the real part and ![b](http://latex.codecogs.com/svg.latex?b) is the imaginary part. The imaginary number ![i](http://latex.codecogs.com/svg.latex?i) is defined as:

![imaginary](http://latex.codecogs.com/svg.latex?i%3D%5Csqrt%7B-1%7D).
<!-- i=\sqrt{-1} -->

In JavaScript, there is no built-in functionality for complex numbers, but there are some libraries that support complex number arithmetic. For example, using [mathjs](https://www.npmjs.com/package/mathjs):

```js
var math = require('mathjs')

var a = math.complex(3, -1)
//=> { re: 3, im: -1 }

var b = math.sqrt(-1)
//=> { re: 0, im: 1 }

console.log(math.multiply(a, b).toString())
//=> '1 + 3i'
```

The library also supports [evaluating a string expression](https://mathjs.org/docs/reference/functions/evaluate.html), so the above could be re-written as:

```js
console.log(math.evaluate('(3 - i) * i').toString())
//=> '1 + 3i'
```

Other implementations:

- [immutable-complex](https://www.npmjs.com/package/immutable-complex)
- [complex-js](https://www.npmjs.com/package/complex-js)
- [Numeric-js](http://www.numericjs.com/)

## dot & cross

The dot `·` and cross `×` symbols have different uses depending on context.

They might seem obvious, but it's important to understand the subtle differences before we continue into other sections.

#### scalar multiplication

Both symbols can represent simple multiplication of scalars. The following are equivalent:

![dotcross1](http://latex.codecogs.com/svg.latex?5%20%5Ccdot%204%20%3D%205%20%5Ctimes%204)

<!-- 5 \cdot 4 = 5 \times 4 -->

In programming languages we tend to use asterisk for multiplication:

```js
var result = 5 * 4
```

Often, the multiplication sign is only used to avoid ambiguity (e.g. between two numbers). Here, we can omit it entirely:

![dotcross2](http://latex.codecogs.com/svg.latex?3kj)

<!-- 3kj -->

If these variables represent scalars, the code would be:

```js
var result = 3 * k * j
```

#### vector multiplication

To denote multiplication of one vector with a scalar, or element-wise multiplication of a vector with another vector, we typically do not use the dot `·` or cross `×` symbols. These have different meanings in linear algebra, discussed shortly.

Let's take our earlier example but apply it to vectors. For element-wise vector multiplication, you might see an open dot `∘` to represent the [Hadamard product](https://en.wikipedia.org/wiki/Hadamard_product_%28matrices%29).<sup>[2]</sup>

![dotcross3](http://latex.codecogs.com/svg.latex?3%5Cmathbf%7Bk%7D%5Ccirc%5Cmathbf%7Bj%7D)

<!-- 3\mathbf{k}\circ\mathbf{j} -->

In other instances, the author might explicitly define a different notation, such as a circled dot `⊙` or a filled circle `●`.<sup>[3]</sup>

Here is how it would look in code, using arrays `[x, y]` to represent the 2D vectors.

```js
var s = 3
var k = [ 1, 2 ]
var j = [ 2, 3 ]

var tmp = multiply(k, j)
var result = multiplyScalar(tmp, s)
//=> [ 6, 18 ]
```

Our `multiply` and `multiplyScalar` functions look like this:

```js
function multiply(a, b) {
  return [ a[0] * b[0], a[1] * b[1] ]
}

function multiplyScalar(a, scalar) {
  return [ a[0] * scalar, a[1] * scalar ]
}
```

Similarly, [matrix multiplication](#matrix-multiplication) typically does not use the dot `·` or cross symbol `×`.

#### dot product

The dot symbol `·` can be used to denote the [*dot product*](https://en.wikipedia.org/wiki/Dot_product) of two vectors. Sometimes this is called the *scalar product* since it evaluates to a scalar.

![dotcross4](http://latex.codecogs.com/svg.latex?%5Cmathbf%7Bk%7D%5Ccdot%20%5Cmathbf%7Bj%7D)

<!-- \mathbf{k}\cdot \mathbf{j} -->

It is a very common feature of linear algebra, and with a 3D vector it might look like this:

```js
var k = [ 0, 1, 0 ]
var j = [ 1, 0, 0 ]

var d = dot(k, j)
//=> 0
```

The result `0` tells us our vectors are perpendicular. Here is a `dot` function for 3-component vectors:

```js
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
```

#### cross product

The cross symbol `×` can be used to denote the [*cross product*](https://en.wikipedia.org/wiki/Cross_product) of two vectors.

![dotcross5](http://latex.codecogs.com/svg.latex?%5Cmathbf%7Bk%7D%5Ctimes%20%5Cmathbf%7Bj%7D)

<!-- \mathbf{k}\times \mathbf{j} -->

In code, it would look like this:

```js
var k = [ 0, 1, 0 ]
var j = [ 1, 0, 0 ]

var result = cross(k, j)
//=> [ 0, 0, -1 ]
```

Here, we get `[ 0, 0, -1 ]`, which is perpendicular to both **k** and **j**.

Our `cross` function:

```js
function cross(a, b) {
  var ax = a[0], ay = a[1], az = a[2],
    bx = b[0], by = b[1], bz = b[2]

  var rx = ay * bz - az * by
  var ry = az * bx - ax * bz
  var rz = ax * by - ay * bx
  return [ rx, ry, rz ]
}
```

For other implementations of vector multiplication, cross product, and dot product:

- [gl-vec3](https://github.com/stackgl/gl-vec3)
- [gl-vec2](https://github.com/stackgl/gl-vec2)
- [vectors](https://github.com/hughsk/vectors) - includes n-dimensional

## sigma 

The big Greek `Σ` (Sigma) is for [Summation](https://en.wikipedia.org/wiki/Summation). In other words: summing up some numbers.

![sigma](http://latex.codecogs.com/svg.latex?%5Csum_%7Bi%3D1%7D%5E%7B100%7Di)

<!-- \sum_{i=1}^{100}i -->

Here, `i=1` says to start at `1` and end at the number above the Sigma, `100`. These are the lower and upper bounds, respectively. The *i* to the right of the "E" tells us what we are summing. In code:

```js
var sum = 0
for (var i = 1; i <= 100; i++) {
  sum += i
}
```

The result of `sum` is `5050`.

**Tip:** With whole numbers, this particular pattern can be optimized to the following:

```js
var n = 100 // upper bound
var sum = (n * (n + 1)) / 2
```

Here is another example where the *i*, or the "what to sum," is different:

![sum2](http://latex.codecogs.com/svg.latex?%5Csum_%7Bi%3D1%7D%5E%7B100%7D%282i&plus;1%29)

<!-- \sum_{i=1}^{100}(2i+1) -->

In code:

```js
var sum = 0
for (var i = 1; i <= 100; i++) {
  sum += (2 * i + 1)
}
```

The result of `sum` is `10200`.

The notation can be nested, which is much like nesting a `for` loop. You should evaluate the right-most sigma first, unless the author has enclosed them in parentheses to alter the order. However, in the following case, since we are dealing with finite sums, the order does not matter.

![sigma3](http://latex.codecogs.com/svg.latex?%5Csum_%7Bi%3D1%7D%5E%7B2%7D%5Csum_%7Bj%3D4%7D%5E%7B6%7D%283ij%29)

<!-- \sum_{i=1}^{2}\sum_{j=4}^{6}(3ij) -->

In code:

```js
var sum = 0
for (var i = 1; i <= 2; i++) {
  for (var j = 4; j <= 6; j++) {
    sum += (3 * i * j)
  }
}
```

Here, `sum` will be `135`.

## averages

A factor `1/n` in front of a [sum](#sigma) turns the total into an *arithmetic mean*: add the *n* terms, then divide by their count. Here *n* must be a positive integer; the mean of an empty list is undefined.

![arithmetic-mean](https://latex.codecogs.com/svg.latex?%5Cbegin%7Baligned%7D%5Cbar%7Bx%7D%26%3D%5Cfrac%7B1%7D%7Bn%7D%5Csum_%7Bi%3D1%7D%5E%7Bn%7Dx_i%2C%5Cqquad%20n%3E0%5C%5C%26%3D%5Cfrac%7Bx_1%2Bx_2%2B%5Ccdots%2Bx_n%7D%7Bn%7D%5Cend%7Baligned%7D)

<!-- \begin{aligned}\bar{x}&=\frac{1}{n}\sum_{i=1}^{n}x_i,\qquad n>0\\&=\frac{x_1+x_2+\cdots+x_n}{n}\end{aligned} -->

For the four values 2, 4, 6 and 8, the sum is 20, *n = 4*, and the mean is *20/4 = 5*. The subscript *i* selects a term; it does not multiply that term by *i*. Repeated observations still count separately.

```js
var { mean } = require('./examples/notation.cjs')

var values = [2, 4, 6, 8]
mean(values)
//=> 5
```

The [checked implementation](./examples/notation.cjs) accepts 1 through 10,000 finite numbers and leaves the input unchanged. It scales the terms before summing to reduce overflow, but still uses floating-point arithmetic. See [OpenStax, Sigma Notation and Calculating the Arithmetic Mean](https://openstax.org/books/introductory-business-statistics-2e/pages/2-4-sigma-notation-and-calculating-the-arithmetic-mean).


## capital Pi

The capital Pi or "Big Pi" is very similar to [Sigma](#sigma), except we are using multiplication to find the product of a sequence of values. 

Take the following:

![capitalPi](http://latex.codecogs.com/svg.latex?%5Cprod_%7Bi%3D1%7D%5E%7B6%7Di)

<!-- \prod_{i=1}^{6}i -->

In code, it might look like this:

```js
var value = 1
for (var i = 1; i <= 6; i++) {
  value *= i
}
```

Where `value` will evaluate to `720`.

## pipes

Pipe symbols, known as *bars*, can mean different things depending on the context. Below are three common uses: [absolute value](#absolute-value), [Euclidean norm](#euclidean-norm), and [determinant](#determinant).

These three features all describe the *length* of an object.

#### absolute value 

![pipes1](http://latex.codecogs.com/svg.latex?%5Cleft%20%7C%20x%20%5Cright%20%7C)

<!-- \left | x \right | -->

For a number *x*, `|x|` means the absolute value of *x*. In code:

```js
var x = -5
var result = Math.abs(x)
// => 5
```

#### Euclidean norm

![pipes4](http://latex.codecogs.com/svg.latex?%5Cleft%20%5C%7C%20%5Cmathbf%7Bv%7D%20%5Cright%20%5C%7C)

<!-- \left \| \mathbf{v} \right \| -->

For a vector **v**, `‖v‖` is the [Euclidean norm](https://en.wikipedia.org/wiki/Norm_%28mathematics%29#Euclidean_norm) of **v**. It is also referred to as the "magnitude" or "length" of a vector.

Often this is represented by double-bars to avoid ambiguity with the *absolute value* notation, but sometimes you may see it with single bars:

![pipes2](http://latex.codecogs.com/svg.latex?%5Cleft%20%7C%20%5Cmathbf%7Bv%7D%20%5Cright%20%7C)

<!-- \left | \mathbf{v} \right | -->

Here is an example using an array `[x, y, z]` to represent a 3D vector.

```js
var v = [ 0, 4, -3 ]
length(v)
//=> 5
```

The `length` function:

```js
function length (vec) {
  var x = vec[0]
  var y = vec[1]
  var z = vec[2]
  return Math.sqrt(x * x + y * y + z * z)
}
```

Other implementations:

- [magnitude](https://github.com/mattdesl/magnitude/blob/864ff5a7eb763d34bf154ac5f5332d7601192b70/index.js) - n-dimensional
- [gl-vec2/length](https://github.com/stackgl/gl-vec2/blob/21f460a371540258521fd2f720d80f14e87bd400/length.js) - 2D vector
- [gl-vec3/length](https://github.com/stackgl/gl-vec3/blob/507480fa57ba7c5fb70679cf531175a52c48cf53/length.js) - 3D vector

#### determinant

![pipes3](http://latex.codecogs.com/svg.latex?%5Cleft%20%7C%5Cmathbf%7BA%7D%20%5Cright%20%7C)

<!-- \left |\mathbf{A}  \right | -->

For a matrix **A**, `|A|` means the [determinant](https://en.wikipedia.org/wiki/Determinant) of matrix **A**.

Here is an example computing the determinant of a 2x2 matrix, represented by a flat array in column-major format.

```js
var determinant = require('gl-mat2/determinant')

var matrix = [ 1, 0, 0, 1 ]
var det = determinant(matrix)
//=> 1
```

Implementations:

- [gl-mat4/determinant](https://github.com/stackgl/gl-mat4/blob/c2e2de728fe7eba592f74cd02266100cc21ec89a/determinant.js) - also see [gl-mat3](https://github.com/stackgl/gl-mat3) and [gl-mat2](https://github.com/stackgl/gl-mat2)
- [ndarray-determinant](https://www.npmjs.com/package/ndarray-determinant)
- [glsl-determinant](https://www.npmjs.com/package/glsl-determinant)
- [robust-determinant](https://www.npmjs.com/package/robust-determinant)
- [robust-determinant-2](https://www.npmjs.com/package/robust-determinant-2) and [robust-determinant-3](https://www.npmjs.com/package/robust-determinant-3), specifically for 2x2 and 3x3 matrices, respectively

## hat

In geometry, the "hat" symbol above a character is used to represent a [unit vector](https://en.wikipedia.org/wiki/Unit_vector). For example, here is the unit vector of **a**:

![hat](http://latex.codecogs.com/svg.latex?%5Chat%7B%5Cmathbf%7Ba%7D%7D)

<!-- \hat{\mathbf{a}} -->

In Cartesian space, a unit vector is typically length 1. That means each part of the vector will be in the range of -1.0 to 1.0. Here we *normalize* a 3D vector into a unit vector:

```js
var a = [ 0, 4, -3 ]
normalize(a)
//=> [ 0, 0.8, -0.6 ]
```

Here is the `normalize` function, operating on 3D vectors:

```js
function normalize(vec) {
  var x = vec[0]
  var y = vec[1]
  var z = vec[2]
  var squaredLength = x * x + y * y + z * z

  if (squaredLength > 0) {
    var length = Math.sqrt(squaredLength)
    vec[0] = x / length
    vec[1] = y / length
    vec[2] = z / length
  }
  return vec
}
```

Other implementations:

- [gl-vec3/normalize](https://github.com/stackgl/gl-vec3/blob/507480fa57ba7c5fb70679cf531175a52c48cf53/normalize.js) and [gl-vec2/normalize](https://github.com/stackgl/gl-vec2/blob/21f460a371540258521fd2f720d80f14e87bd400/normalize.js)
- [vectors/normalize-nd](https://github.com/hughsk/vectors/blob/master/normalize-nd.js) (n-dimensional)

## element

In set theory, the "element of" symbol `∈` and `∋` can be used to describe whether something is an element of a *set*. For example:

![element1](http://latex.codecogs.com/svg.latex?A%3D%5Cleft%20%5C%7B3%2C9%2C14%20%5Cright%20%5C%7D%2C%203%20%5Cin%20A)

<!-- A=\left \{3,9,14}{  \right \}, 3 \in A -->

Here we have a set of numbers *A* `{ 3, 9, 14 }` and we are saying `3` is an "element of" that set. 

A simple implementation in ES5 might look like this:

```js
var A = [ 3, 9, 14 ]

A.indexOf(3) >= 0
//=> true
```

However, it would be more accurate to use a `Set` which only holds unique values. This is a feature of ES6.

```js
var A = new Set([ 3, 9, 14 ])

A.has(3)
//=> true
```

The backwards `∋` is the same, but the order changes:

![element2](http://latex.codecogs.com/svg.latex?A%3D%5Cleft%20%5C%7B3%2C9%2C14%20%5Cright%20%5C%7D%2C%20A%20%5Cni%203)

<!-- A=\left \{3,9,14}{  \right \}, A \ni 3 -->

You can also use the "not an element of" symbols `∉` and `∌` like so:

![element3](http://latex.codecogs.com/svg.latex?A%3D%5Cleft%20%5C%7B3%2C9%2C14%20%5Cright%20%5C%7D%2C%206%20%5Cnotin%20A)

<!-- A=\left \{3,9,14}{  \right \}, 6 \notin A -->

## common number sets

You may see some some large [Blackboard](https://en.wikipedia.org/wiki/Blackboard_bold) letters among equations. Often, these are used to describe sets.

For example, we might describe *k* to be an [element of](#element) the set `ℝ`. 

![real](http://latex.codecogs.com/svg.latex?k%20%5Cin%20%5Cmathbb%7BR%7D)

<!-- k \in \mathbb{R} -->

Listed below are a few common sets and their symbols.

#### `ℝ` real numbers

The large `ℝ` describes the set of *real numbers*. These include integers, as well as rational and irrational numbers.

JavaScript treats floats and integers as the same type, so the following would be a simple test of our *k* ∈ ℝ example:

```js
function isReal (k) {
  return typeof k === 'number' && isFinite(k);
}
```

*Note:* Real numbers are also *finite*, as in, *not infinite.*

#### `ℚ` rational numbers

Rational numbers are real numbers that can be expressed as a fraction, or *ratio* (like `⅗`). Rational numbers cannot have zero as a denominator.

This also means that all integers are rational numbers, since the denominator can be expressed as 1.

An irrational number, on the other hand, is one that cannot be expressed as a ratio, like π (PI). 

#### `ℤ` integers

An integer, i.e. a real number that has no fractional part. These can be positive or negative.

A simple test in JavaScript might look like this:

```js
function isInteger (n) {
  return typeof n === 'number' && n % 1 === 0
}
```

#### `ℕ` natural numbers

A natural number, a positive and non-negative integer. Depending on the context and field of study, the set may or may not include zero, so it could look like either of these:

```js
{ 0, 1, 2, 3, ... }
{ 1, 2, 3, 4, ... }
```

The former is more common in computer science, for example:

```js
function isNaturalNumber (n) {
  return isInteger(n) && n >= 0
}
```

#### `ℂ` complex numbers

A complex number is a combination of a real and imaginary number, viewed as a co-ordinate in the 2D plane. For more info, see [A Visual, Intuitive Guide to Imaginary Numbers](http://betterexplained.com/articles/a-visual-intuitive-guide-to-imaginary-numbers/).

## function

[Functions](https://en.wikipedia.org/wiki/Function_%28mathematics%29) are fundamental features of mathematics, and the concept is fairly easy to translate into code.

A function relates an input to an output value. For example, the following is a function:

![function1](http://latex.codecogs.com/svg.latex?x%5E%7B2%7D)

<!-- x^{2} -->

We can give this function a *name*. Commonly, we use `ƒ` to describe a function, but it could be named `A(x)` or anything else.

![function2](http://latex.codecogs.com/svg.latex?f%5Cleft%20%28x%20%5Cright%20%29%20%3D%20x%5E%7B2%7D)

<!-- f\left (x  \right ) = x^{2} -->

In code, we might name it `square` and write it like this:

```js
function square (x) {
  return Math.pow(x, 2)
}
```

Sometimes a function is not named, and instead the output is written.

![function3](http://latex.codecogs.com/svg.latex?y%20%3D%20x%5E%7B2%7D)

<!-- y = x^{2} -->

In the above example, *x* is the input, the relationship is *squaring*, and *y* is the output.

Functions can also have multiple parameters, like in a programming language. These are known as *arguments* in mathematics, and the number of arguments a function takes is known as the *arity* of the function.

![function4](http://latex.codecogs.com/svg.latex?f%28x%2Cy%29%20%3D%20%5Csqrt%7Bx%5E2%20&plus;%20y%5E2%7D)

<!-- f(x,y) = \sqrt{x^2 + y^2} -->

In code:

```js
function length (x, y) {
  return Math.sqrt(x * x + y * y)
}
```

### piecewise function

Some functions will use different relationships depending on the input value, *x*.

The following function *ƒ* chooses between two "sub functions" depending on the input value.

![piecewise1](http://latex.codecogs.com/svg.latex?f%28x%29%3D%20%5Cbegin%7Bcases%7D%20%5Cfrac%7Bx%5E2-x%7D%7Bx%7D%2C%26%20%5Ctext%7Bif%20%7D%20x%5Cgeq%201%5C%5C%200%2C%20%26%20%5Ctext%7Botherwise%7D%20%5Cend%7Bcases%7D)

<!--    f(x)= 
\begin{cases}
    \frac{x^2-x}{x},& \text{if } x\geq 1\\
    0, & \text{otherwise}
\end{cases} -->

This is very similar to `if` / `else` in code. The right-side conditions are often written as **"for x < 0"** or **"if x = 0"**. If the condition is true, the function to the left is used.

In piecewise functions, **"otherwise"** and **"elsewhere"** are analogous to the `else` statement in code.

```js
function f (x) {
  if (x >= 1) {
    return (Math.pow(x, 2) - x) / x
  } else {
    return 0
  }
}
```

### common functions

There are some function names that are ubiquitous in mathematics. For a programmer, these might be analogous to functions "built-in" to the language (like `parseInt` in JavaScript).

One such example is the *sgn* function. This is the *signum* or *sign* function. Let's use [piecewise function](#piecewise-function) notation to describe it:

![sgn](http://latex.codecogs.com/svg.latex?sgn%28x%29%20%3A%3D%20%5Cbegin%7Bcases%7D%20-1%26%20%5Ctext%7Bif%20%7D%20x%20%3C%200%5C%5C%200%2C%20%26%20%5Ctext%7Bif%20%7D%20%7Bx%20%3D%200%7D%5C%5C%201%2C%20%26%20%5Ctext%7Bif%20%7D%20x%20%3E%200%5C%5C%20%5Cend%7Bcases%7D)

<!-- sgn(x) := 
\begin{cases}
    -1& \text{if } x < 0\\
    0, & \text{if } {x = 0}\\
    1, & \text{if } x > 0\\
\end{cases} -->

In code, it might look like this:

```js
function sgn (x) {
  if (x < 0) return -1
  if (x > 0) return 1
  return 0
}
```

See [signum](https://github.com/scijs/signum) for this function as a module.

Other examples of such functions: *sin*, *cos*, *tan*.

### function notation

In some literature, functions may be defined with more explicit notation. For example, let's go back to the `square` function we mentioned earlier:

![function2](http://latex.codecogs.com/svg.latex?f%5Cleft%20%28x%20%5Cright%20%29%20%3D%20x%5E%7B2%7D)

<!-- f\left (x  \right ) = x^{2} -->

It might also be written in the following form:

![mapsto](http://latex.codecogs.com/svg.latex?f%20%3A%20x%20%5Cmapsto%20x%5E2)

<!-- f : x \mapsto x^2 -->

The arrow here with a tail typically means "maps to," as in *x maps to x<sup>2</sup>*. 

Sometimes, when it isn't obvious, the notation will also describe the *domain* and *codomain* of the function. A more formal definition of *ƒ* might be written as:

![funcnot](http://latex.codecogs.com/svg.latex?%5Cbegin%7Balign*%7D%20f%20%3A%26%5Cmathbb%7BR%7D%20%5Crightarrow%20%5Cmathbb%7BR%7D%5C%5C%20%26x%20%5Cmapsto%20x%5E2%20%5Cend%7Balign*%7D)

<!-- \begin{align*}
f :&\mathbb{R} \rightarrow \mathbb{R}\\
&x \mapsto x^2 
\end{align*}
 -->

A function's *domain* and *codomain* is a bit like its *input* and *output* types, respectively. Here's another example, using our earlier *sgn* function, which outputs an integer:

![domain2](http://latex.codecogs.com/svg.latex?sgn%20%3A%20%5Cmathbb%7BR%7D%20%5Crightarrow%20%5Cmathbb%7BZ%7D)

<!-- sgn : \mathbb{R} \rightarrow \mathbb{Z} -->

The arrow here (without a tail) is used to map one *set* to another.

In JavaScript and other dynamically typed languages, you might use documentation and/or runtime checks to explain and validate a function's input/output. Example:

```js
/**
 * Squares a number.
 * @param  {Number} a real number
 * @return {Number} a real number
 */
function square (a) {
  if (typeof a !== 'number') {
    throw new TypeError('expected a number')
  }
  return Math.pow(a, 2)
}
```

Some tools like [flowtype](http://flowtype.org/) attempt to bring static typing into JavaScript.

Other languages, like Java, allow for true method overloading based on the static types of a function's input/output. This is closer to mathematics: two functions are not the same if they use a different *domain*.

## prime

The prime symbol (`′`) is often used in variable names to describe things which are similar, without giving it a different name altogether. It can describe the "next value" after some transformation.

For example, if we take a 2D point *(x, y)* and rotate it, you might name the result *(x′, y′)*. Or, the *transpose* of matrix **M** might be named **M′**.

In code, we typically just assign the variable a more descriptive name, like `transformedPosition`.

For a mathematical [function](#function), the prime symbol often describes the [*derivative*](#derivatives) of that function. Let's take our earlier function:

![function2](http://latex.codecogs.com/svg.latex?f%5Cleft%20%28x%20%5Cright%20%29%20%3D%20x%5E%7B2%7D)

<!-- f\left (x  \right ) = x^{2} -->

Its derivative could be written with a prime `′` symbol:

![prime1](http://latex.codecogs.com/svg.latex?f%27%28x%29%20%3D%202x)

<!-- f'(x) = 2x -->

In code:

```js
function f (x) {
  return Math.pow(x, 2)
}

function fPrime (x) {
  return 2 * x
}
```

Multiple prime symbols can be used to describe the second derivative *ƒ′′* and third derivative *ƒ′′′*. After this, authors typically express higher orders with roman numerals *ƒ*<sup>IV</sup> or superscript numbers *ƒ*<sup>(n)</sup>.

## floor & ceiling

The special brackets `⌊x⌋` and `⌈x⌉` represent the *floor* and *ceil* functions, respectively.

![floor](http://latex.codecogs.com/svg.latex?floor%28x%29%20%3D%20%5Clfloor%20x%20%5Crfloor)

<!-- floor(x) =  \lfloor x \rfloor -->

![ceil](http://latex.codecogs.com/svg.latex?ceil%28x%29%20%3D%20%5Clceil%20x%20%5Crceil)

<!-- ceil(x) =  \lceil x \rceil -->

In code:

```js
Math.floor(x)
Math.ceil(x)
```

When the two symbols are mixed `⌊x⌉`, it typically represents a function that rounds to the nearest integer:

![round](http://latex.codecogs.com/svg.latex?round%28x%29%20%3D%20%5Clfloor%20x%20%5Crceil)

<!-- round(x) =  \lfloor x \rceil -->

In code:

```js
Math.round(x)
```

## arrows

Arrows are often used in [function notation](#function-notation). Here are a few other areas you might see them.

#### material implication

Arrows like `⇒` and `→` are sometimes used in logic for *material implication.* That is, if A is true, then B is also true.

![material1](http://latex.codecogs.com/svg.latex?A%20%5CRightarrow%20B)

<!-- A \Rightarrow B -->

Interpreting this as code might look like this:

```js
if (A === true) {
  console.assert(B === true)
}
```

The arrows can go in either direction `⇐` `⇒`, or both `⇔`. When *A ⇒ B* and *B ⇒ A*, they are said to be equivalent:

![material-equiv](http://latex.codecogs.com/svg.latex?A%20%5CLeftrightarrow%20B)

<!-- A \Leftrightarrow B -->

<a id="equality"></a>

#### inequality

In math, the `<` `>` `≤` and `≥` are typically used in the same way we use them in code: *less than*, *greater than*, *less than or equal to* and *greater than or equal to*, respectively.

```js
50 > 2 === true
2 < 10 === true
3 <= 4 === true
4 >= 4 === true
```

On rare occasions you might see a slash through these symbols, to describe *not*. As in, *k* is "not greater than" *j*.

![ngt](http://latex.codecogs.com/svg.latex?k%20%5Cngtr%20j)

<!-- k \ngtr j -->

The `≪` and `≫` are sometimes used to represent *significant* inequality. That is, *k* is an [order of magnitude](https://en.wikipedia.org/wiki/Order_of_magnitude) larger than *j*.

![orderofmag](http://latex.codecogs.com/svg.latex?k%20%5Cgg%20j)

<!-- k \gg j -->

In mathematics, *order of magnitude* is rather specific; it is not just a "really big difference." A simple example of the above:

```js
orderOfMagnitude(k) > orderOfMagnitude(j)
```

And below is our `orderOfMagnitude` function, using [Math.trunc](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc) (ES6).

```js
function log10(n) {
  // logarithm in base 10
  return Math.log(n) / Math.LN10
}

function orderOfMagnitude (n) {
  return Math.trunc(log10(n))
}
```

<sup>*Note:* This is not numerically robust.</sup>

See [math-trunc](https://www.npmjs.com/package/math-trunc) for a ponyfill in ES5.

#### conjunction & disjunction

Another use of arrows in logic is conjunction `∧` and disjunction `∨`. They are analogous to a programmer's `AND` and `OR` operators, respectively.

The following shows conjunction `∧`, the logical `AND`.

![and](http://latex.codecogs.com/svg.latex?k%20%3E%202%20%5Cland%20k%20%3C%204%20%5CLeftrightarrow%20k%20%3D%203)

<!-- k > 2 \land k <  4 \Leftrightarrow k = 3   -->

In JavaScript, we use `&&`. Assuming *k* is a natural number, the logic implies that *k* is 3:

```js
if (k > 2 && k < 4) {
  console.assert(k === 3)
}
```

Since both sides are equivalent `⇔`, it also implies the following:

```js
if (k === 3) {
  console.assert(k > 2 && k < 4)
}
```

The down arrow `∨` is logical disjunction, like the OR operator.

![logic-or](http://latex.codecogs.com/svg.latex?A%20%5Clor%20B)

<!-- A \lor B -->

In code:

```js
A || B
```

## logical negation

Occasionally, the `¬`, `~` and `!` symbols are used to represent logical `NOT`. For example, *¬A* is only true if A is false.

Here is a simple example using the *not* symbol:

![negation](http://latex.codecogs.com/svg.latex?x%20%5Cneq%20y%20%5CLeftrightarrow%20%5Clnot%28x%20%3D%20y%29)

<!-- x \neq y \Leftrightarrow \lnot(x = y) -->

An example of how we might interpret this in code:

```js
if (x !== y) {
  console.assert(!(x === y))
}
```

*Note:* The tilde `~` has many different meanings depending on context. For example, *row equivalence* (matrix theory) or *same order of magnitude* (discussed in [equality](#equality)).

## intervals

Sometimes a function deals with real numbers restricted to some range of values, such a constraint can be represented using an *interval*

For example we can represent the numbers between zero and one including/not including zero and/or one as:

- Not including zero or one: ![interval-opened-left-opened-right](http://latex.codecogs.com/svg.latex?%280%2C%201%29)

<!-- (0, 1) -->

- Including zero or but not one: ![interval-closed-left-opened-right](http://latex.codecogs.com/svg.latex?%5B0%2C%201%29)

<!-- [0, 1) -->

- Not including zero but including one: ![interval-opened-left-closed-right](http://latex.codecogs.com/svg.latex?%280%2C%201%5D)

<!-- (0, 1] -->

- Including zero and one: ![interval-closed-left-closed-right](http://latex.codecogs.com/svg.latex?%5B0%2C%201%5D)

<!-- [0, 1] -->

For example we to indicate that a point `x` is in the unit cube in 3D we say:

![interval-unit-cube](http://latex.codecogs.com/svg.latex?x%20%5Cin%20%5B0%2C%201%5D%5E3)

<!-- x \in [0, 1]^3 -->

In code we can represent an interval using a two element 1d array:

```js
var nextafter = require('nextafter')

var a = [nextafter(0, Infinity), nextafter(1, -Infinity)]     // open interval
var b = [nextafter(0, Infinity), 1]                           // interval closed on the left 
var c = [0, nextafter(1, -Infinity)]                          // interval closed on the right
var d = [0, 1]                                                // closed interval
```

Intervals are used in conjunction with set operations:

- *intersection* e.g. ![interval-intersection](http://latex.codecogs.com/svg.latex?%5B3%2C%205%29%20%5Ccap%20%5B4%2C%206%5D%20%3D%20%5B4%2C%205%29)

<!-- [3, 5) \cap [4, 6] = [4, 5) -->

- *union* e.g. ![interval-union](http://latex.codecogs.com/svg.latex?%5B3%2C%205%29%20%5Ccup%20%5B4%2C%206%5D%20%3D%20%5B3%2C%206%5D)

<!-- [3, 5) \cup [4, 6] = [3, 6] -->

- *difference* e.g. ![interval-difference-1](http://latex.codecogs.com/svg.latex?%5B3%2C%205%29%20-%20%5B4%2C%206%5D%20%3D%20%5B3%2C%204%29) and ![interval-difference-2](http://latex.codecogs.com/svg.latex?%5B4%2C%206%5D%20-%20%5B3%2C%205%29%20%3D%20%5B5%2C%206%5D)

<!-- [3, 5) - [4, 6] = [3, 4) -->
<!-- [4, 6] - [3, 5)  = [5, 6] -->

In code:

```js
var Interval = require('interval-arithmetic')
var nextafter = require('nextafter')

var a = Interval(3, nextafter(5, -Infinity))
var b = Interval(4, 6)

Interval.intersection(a, b)
// {lo: 4, hi: 4.999999999999999}

Interval.union(a, b)
// {lo: 3, hi: 6}

Interval.difference(a, b)
// {lo: 3, hi: 3.9999999999999996}

Interval.difference(b, a)
// {lo: 5, hi: 6}
```

See:

- [next-after](https://github.com/scijs/nextafter) 
- [interval-arithmetic](https://github.com/maurizzzio/interval-arithmetic)

## matrix multiplication

A matrix has *rows* and *columns*. A matrix with *m* rows and *n* columns has shape *m × n*. For **C = AB**, the number of columns in **A** must equal the number of rows in **B**. The result has **A**'s row count and **B**'s column count.

![matrix-multiplication](https://latex.codecogs.com/svg.latex?A%5Cin%5Cmathbb%7BR%7D%5E%7Bm%5Ctimes%20n%7D%2C%5Cquad%20B%5Cin%5Cmathbb%7BR%7D%5E%7Bn%5Ctimes%20p%7D%2C%5Cquad%20C%3DAB%2C%5Cquad%20c_%7Bij%7D%3D%5Csum_%7Bk%3D1%7D%5E%7Bn%7Da_%7Bik%7Db_%7Bkj%7D)

<!-- A\in\mathbb{R}^{m\times n},\quad B\in\mathbb{R}^{n\times p},\quad C=AB,\quad c_{ij}=\sum_{k=1}^{n}a_{ik}b_{kj} -->

Each result is the [dot product](#dot-product) of a row from **A** with a column from **B**. Here, mathematical indices start at 1; JavaScript array indices start at 0.

These examples store each row as an array, so `A[i][j]` means row `i`, column `j`. This differs from the flat column-major array in the earlier [determinant](#determinant) example; storage must be agreed before copying matrix code.

Using the full implementation in [examples/notation.cjs](./examples/notation.cjs):

```js
var { multiplyMatrices } = require('./examples/notation.cjs')

var A = [ [1, 2, 3], [4, 5, 6] ] // 2 rows, 3 columns
var B = [ [7, 8], [9, 10], [11, 12] ] // 3 rows, 2 columns

multiplyMatrices(A, B)
//=> [ [58, 64], [139, 154] ]
// First entry: 1 * 7 + 2 * 9 + 3 * 11 = 58
```

Order matters: **AB** and **BA** generally differ, and one may be defined while the other is not. For transformations, this guide uses column vectors: **y = Ax** applies **A** to **x**. Then **ABx** applies **B** first and **A** second.

## tensor product

The `⊗` symbol often means *tensor product*. With real vectors in chosen bases, **u ⊗ v** can be represented by an *outer-product* array whose entry at row *i*, column *j* is *uᵢvⱼ*. It keeps both indices; a [dot product](#dot-product) instead sums over an index and produces a scalar.

![vector-tensor-product](https://latex.codecogs.com/svg.latex?u%3D%5Cbegin%7Bbmatrix%7D1%5C%5C2%5Cend%7Bbmatrix%7D%2C%5Cquad%20v%3D%5Cbegin%7Bbmatrix%7D3%5C%5C4%5C%5C5%5Cend%7Bbmatrix%7D%2C%5Cquad%20%28u%5Cotimes%20v%29_%7Bij%7D%3Du_i%20v_j%2C%5Cquad%20uv%5E%7BT%7D%3D%5Cbegin%7Bbmatrix%7D3%264%265%5C%5C6%268%2610%5Cend%7Bbmatrix%7D)

<!-- u=\begin{bmatrix}1\\2\end{bmatrix},\quad v=\begin{bmatrix}3\\4\\5\end{bmatrix},\quad (u\otimes v)_{ij}=u_i v_j,\quad uv^{T}=\begin{bmatrix}3&4&5\\6&8&10\end{bmatrix} -->

The superscript `T` means *transpose*: the column **v** becomes a row. With the helper below, a column matrix and a row matrix give exactly this outer-product representation:

```js
var { kroneckerProduct } = require('./examples/notation.cjs')

kroneckerProduct([ [1], [2] ], [ [3, 4, 5] ])
//=> [ [3, 4, 5], [6, 8, 10] ]
```

For matrices representing linear maps, their tensor product is represented by the *Kronecker product*. Replace each entry *aᵢⱼ* of **A** with the whole block *aᵢⱼB*. An *m × n* matrix and a *p × q* matrix produce an *mp × nq* matrix:

![matrix-kronecker-product](https://latex.codecogs.com/svg.latex?A%5Cotimes%20B%3D%5Cbegin%7Bbmatrix%7Da_%7B11%7DB%26%5Ccdots%26a_%7B1n%7DB%5C%5C%5Cvdots%26%5Cddots%26%5Cvdots%5C%5Ca_%7Bm1%7DB%26%5Ccdots%26a_%7Bmn%7DB%5Cend%7Bbmatrix%7D)

<!-- A\otimes B=\begin{bmatrix}a_{11}B&\cdots&a_{1n}B\\\vdots&\ddots&\vdots\\a_{m1}B&\cdots&a_{mn}B\end{bmatrix} -->

```js
kroneckerProduct([ [1, 2], [3, 4] ], [ [0, 5], [6, 7] ])
//=> [ [0, 5, 0, 10], [6, 7, 12, 14],
//     [0, 15, 0, 20], [18, 21, 24, 28] ]
```

Unlike element-wise multiplication, every entry from the first matrix multiplies every entry from the second. Unlike matrix multiplication, no shared index is summed away. See [Alan Edelman's MIT notes, section 2.1](https://web.mit.edu/18.325/www/handouts/handout2.pdf) for the relationship between tensor products, coordinates and Kronecker products.

## delta

The uppercase `Δ` (*delta*) commonly describes a finite change. For example, `Δx` is a change in input and `Δf` is the resulting change in output:

![finite-change](https://latex.codecogs.com/svg.latex?%5CDelta%20x%3Dx_%7B%5Cmathrm%7Bnew%7D%7D-x_%7B%5Cmathrm%7Bold%7D%7D%2C%5Cqquad%20%5CDelta%20f%3Df%28x_%7B%5Cmathrm%7Bnew%7D%7D%29-f%28x_%7B%5Cmathrm%7Bold%7D%7D%29)

<!-- \Delta x=x_{\mathrm{new}}-x_{\mathrm{old}},\qquad \Delta f=f(x_{\mathrm{new}})-f(x_{\mathrm{old}}) -->

```js
function f (x) { return x * x }
var oldX = 2
var newX = 3
var deltaX = newX - oldX // 1
var deltaF = f(newX) - f(oldX) // 5
```

Lowercase `δ` has several uses. The *Kronecker delta* takes two integer indices and is 1 when they match, 0 otherwise:

![kronecker-delta](https://latex.codecogs.com/svg.latex?%5Cdelta_%7Bij%7D%3D%5Cbegin%7Bcases%7D1%2C%26i%3Dj%5C%5C0%2C%26i%5Cne%20j%5Cend%7Bcases%7D)

<!-- \delta_{ij}=\begin{cases}1,&i=j\\0,&i\ne j\end{cases} -->

```js
var { kroneckerDelta } = require('./examples/notation.cjs')
kroneckerDelta(2, 2) //=> 1
kroneckerDelta(2, 3) //=> 0
```

Thus the identity matrix has entries *Iᵢⱼ = δᵢⱼ*: it keeps the diagonal and clears the other entries.

The *Dirac delta*, often written `δ(x - a)`, is different. It is a distribution, described by how it acts inside an integral. For a smooth test function *φ*, it selects the value at *a*:

![dirac-delta](https://latex.codecogs.com/svg.latex?%5Cint_%7B-%5Cinfty%7D%5E%7B%5Cinfty%7D%5Cdelta%28x-a%29%5C%2C%5Cvarphi%28x%29%5C%2Cdx%3D%5Cvarphi%28a%29)

<!-- \int_{-\infty}^{\infty}\delta(x-a)\,\varphi(x)\,dx=\varphi(a) -->

After applying this identity, the result can be computed as `phi(a)`. A JavaScript function returning 1 only when `x === a` does **not** implement the Dirac delta: a single finite spike has zero integral over a real interval. See [NIST's definition and integral property](https://dlmf.nist.gov/1.17#i).

## derivatives

A derivative measures the local rate of change of a [function](#function). Common notations are *f′(x)*, *df/dx*, and *d/dx f(x)*. For a real function, the definition is a limit, when that limit exists:

![derivative-definition](https://latex.codecogs.com/svg.latex?f%27%28x%29%3D%5Clim_%7Bh%5Cto0%7D%5Cfrac%7Bf%28x%2Bh%29-f%28x%29%7D%7Bh%7D)

<!-- f'(x)=\lim_{h\to0}\frac{f(x+h)-f(x)}{h} -->

The `lim` symbol asks what value the quotient approaches as the nonzero step *h* tends to zero. It does not mean evaluate the fraction with `h = 0`; that would divide by zero. `dx` is differential notation, rather than a fixed gap to a next real number.

For *f(x) = x²*, expand the numerator and cancel *h* while *h ≠ 0*:

![derivative-algebra](https://latex.codecogs.com/svg.latex?%5Cfrac%7B%28x%2Bh%29%5E2-x%5E2%7D%7Bh%7D%3D%5Cfrac%7B2xh%2Bh%5E2%7D%7Bh%7D%3D2x%2Bh%5Cquad%28h%5Cne0%29%2C%5Cqquad%20%5Clim_%7Bh%5Cto0%7D%282x%2Bh%29%3D2x)

<!-- \frac{(x+h)^2-x^2}{h}=\frac{2xh+h^2}{h}=2x+h\quad(h\ne0),\qquad \lim_{h\to0}(2x+h)=2x -->

So the derivative is the function `x => 2 * x`, as in the [prime](#prime) example. This symbolic result holds at every real *x*. See [OpenStax's definition of the derivative](https://openstax.org/books/calculus-volume-1/pages/3-1-defining-the-derivative).

For an ordinary JavaScript function whose formula we have not simplified, we can estimate the derivative with a *centered finite difference*:

![centered-difference](https://latex.codecogs.com/svg.latex?f%27%28x%29%5Capprox%5Cfrac%7Bf%28x%2Bh%29-f%28x-h%29%7D%7B2h%7D)

<!-- f'(x)\approx\frac{f(x+h)-f(x-h)}{2h} -->

```js
var { derivative } = require('./examples/notation.cjs')
derivative(x => x * x, 2, 0.00001)
//=> approximately 4
```

This helper evaluates *f* twice; it does not perform symbolic differentiation or establish that a derivative exists. For example, a centered estimate of `Math.abs` at zero is 0 even though its left and right slopes disagree. A smaller step reduces approximation error only until floating-point cancellation becomes significant. Choose the step for the scale of the input and compare several choices.

## gradients and gradient descent

A [derivative](#derivatives) measures change with one input. For a differentiable scalar function *Q* of a weight vector **w**, the *gradient* `∇Q` (*nabla Q*) collects one partial derivative for each coordinate. A partial derivative changes one coordinate while holding the others fixed:

![gradient-vector](https://latex.codecogs.com/svg.latex?%5Cnabla%20Q%28%5Cmathbf%7Bw%7D%29%3D%5Cbegin%7Bbmatrix%7D%5Cfrac%7B%5Cpartial%20Q%7D%7B%5Cpartial%20w_1%7D%5C%5C%5Cvdots%5C%5C%5Cfrac%7B%5Cpartial%20Q%7D%7B%5Cpartial%20w_d%7D%5Cend%7Bbmatrix%7D)

<!-- \nabla Q(\mathbf{w})=\begin{bmatrix}\frac{\partial Q}{\partial w_1}\\\vdots\\\frac{\partial Q}{\partial w_d}\end{bmatrix} -->

Suppose a finite data set has *n > 0* samples, each with a differentiable loss *Qᵢ(**w**)*. Define the total objective as their [mean](#averages). Differentiating this finite sum gives the average sample gradient, so one gradient-descent update can be written in either form:

![gradient-descent-update](https://latex.codecogs.com/svg.latex?%5Cbegin%7Baligned%7DQ%28%5Cmathbf%7Bw%7D%29%26%3D%5Cfrac%7B1%7D%7Bn%7D%5Csum_%7Bi%3D1%7D%5E%7Bn%7DQ_i%28%5Cmathbf%7Bw%7D%29%5C%5C%5Cmathbf%7Bw%7D_%7B%5Cmathrm%7Bnew%7D%7D%26%3A%3D%5Cmathbf%7Bw%7D-%5Ceta%5Cnabla%20Q%28%5Cmathbf%7Bw%7D%29%5C%5C%26%3D%5Cmathbf%7Bw%7D-%5Cfrac%7B%5Ceta%7D%7Bn%7D%5Csum_%7Bi%3D1%7D%5E%7Bn%7D%5Cnabla%20Q_i%28%5Cmathbf%7Bw%7D%29%5Cend%7Baligned%7D)

<!-- \begin{aligned}Q(\mathbf{w})&=\frac{1}{n}\sum_{i=1}^{n}Q_i(\mathbf{w})\\\mathbf{w}_{\mathrm{new}}&:=\mathbf{w}-\eta\nabla Q(\mathbf{w})\\&=\mathbf{w}-\frac{\eta}{n}\sum_{i=1}^{n}\nabla Q_i(\mathbf{w})\end{aligned} -->

The positive scalar *η* (*eta*) is the *learning rate*. The minus sign moves against the gradient. The symbol `:=` assigns the new weights; every gradient component on the right is evaluated at the **same old vector**, before any coordinate is updated.

Using all *n* samples makes this a **full-batch** update. For a mini-batch containing *m* samples, average just those *m* gradients using `1/m`, not `1/n`. Updating from one sampled observation at a time is the stochastic variant; the full-data update above is not stochastic gradient descent.

For a concrete example, use linear predictions with a fixed squared loss. Each sample has a feature vector **xᵢ** and a target *yᵢ*. The prediction is the [dot product](#dot-product) **w · xᵢ**, the residual is prediction minus target, and the analytic sample gradient is residual times the feature vector:

![squared-loss-gradient](https://latex.codecogs.com/svg.latex?%5Cbegin%7Baligned%7DQ_i%28%5Cmathbf%7Bw%7D%29%26%3D%5Ctfrac12%28%5Cmathbf%7Bw%7D%5Ccdot%5Cmathbf%7Bx%7D_i-y_i%29%5E2%5C%5C%5Cnabla%20Q_i%28%5Cmathbf%7Bw%7D%29%26%3D%28%5Cmathbf%7Bw%7D%5Ccdot%5Cmathbf%7Bx%7D_i-y_i%29%5Cmathbf%7Bx%7D_i%5Cend%7Baligned%7D)

<!-- \begin{aligned}Q_i(\mathbf{w})&=\tfrac12(\mathbf{w}\cdot\mathbf{x}_i-y_i)^2\\\nabla Q_i(\mathbf{w})&=(\mathbf{w}\cdot\mathbf{x}_i-y_i)\mathbf{x}_i\end{aligned} -->

Start at **w = [0, 0]** with two samples: **x₁ = [1, 0]**, *y₁ = 2*, and **x₂ = [0, 1]**, *y₂ = 4*. Their residuals are −2 and −4, giving sample gradients [−2, 0] and [0, −4]. With *η = 0.5*, the displayed full-batch formula becomes:

![gradient-descent-example](https://latex.codecogs.com/svg.latex?%5Cbegin%7Baligned%7D%5Cnabla%20Q%28%5B0%2C0%5D%29%26%3D%5Ctfrac12%28%5B-2%2C0%5D%2B%5B0%2C-4%5D%29%5C%5C%26%3D%5B-1%2C-2%5D%5C%5C%5Cmathbf%7Bw%7D_%7B%5Cmathrm%7Bnew%7D%7D%26%3D%5B0%2C0%5D-0.5%5B-1%2C-2%5D%5C%5C%26%3D%5B0.5%2C1%5D%5Cend%7Baligned%7D)

<!-- \begin{aligned}\nabla Q([0,0])&=\tfrac12([-2,0]+[0,-4])\\&=[-1,-2]\\\mathbf{w}_{\mathrm{new}}&=[0,0]-0.5[-1,-2]\\&=[0.5,1]\end{aligned} -->

```js
var { gradientDescentStep } = require('./examples/notation.cjs')

var weights = [0, 0]
var samples = [
  { x: [1, 0], y: 2 },
  { x: [0, 1], y: 4 }
]
var step = gradientDescentStep(weights, samples, 0.5)

step.gradient   //=> [-1, -2]
step.weights    //=> [0.5, 1]
step.lossBefore //=> 5
step.lossAfter  //=> 2.8125
weights         //=> [0, 0] (unchanged)
```

The original sample losses are 2 and 8, whose mean is 5. After the step, the residuals are −1.5 and −3, giving losses 1.125 and 4.5 and a mean of 2.8125. A larger learning rate can overshoot: with the same starting weights and `η = 5`, the new mean loss is 11.25. A positive learning rate does not guarantee that every finite step reduces the loss.

The helper performs **one** full-batch step for this specific analytic loss, without automatic differentiation or a training loop. It checks finite values, matching dimensions, 1–20 weights, at most 10,000 samples, and at most 100,000 feature components across the samples. It returns new arrays and rejects non-finite calculations. [Stanford CS229 notes, section 1](https://cs229.stanford.edu/notes_archive/cs229-notes-all/cs229-notes1.pdf) derive the squared-loss update, require simultaneous coordinate updates, and distinguish batch from stochastic gradient descent. Those notes use a summed objective; here the explicit `1/n` normalizes both the objective and its gradient.


## integrals

An *indefinite integral* asks for a family of antiderivatives. For example:

![indefinite-integral](https://latex.codecogs.com/svg.latex?%5Cint%202x%5C%2Cdx%3Dx%5E2%2BC)

<!-- \int 2x\,dx=x^2+C -->

The `∫` is the integral sign; `2x` is the *integrand*; `dx` identifies the variable of integration. The arbitrary constant *C* matters because every function *x² + C* has derivative *2x*. Once we have found this formula symbolically, code can represent the family:

```js
function antiderivative (C) {
  return function (x) { return x * x + C }
}

antiderivative(0)(3) //=> 9
antiderivative(7)(3) //=> 16
```

A *definite integral* has lower and upper bounds and returns a number. For continuous *f* with antiderivative *F*, the fundamental theorem of calculus gives:

![definite-integral](https://latex.codecogs.com/svg.latex?%5Cint_a%5Eb%20f%28x%29%5C%2Cdx%3DF%28b%29-F%28a%29%2C%5Cqquad%20%5Cint_0%5E1%20x%5E2%5C%2Cdx%3D%5Cleft%5B%5Cfrac%7Bx%5E3%7D%7B3%7D%5Cright%5D_0%5E1%3D%5Cfrac13)

<!-- \int_a^b f(x)\,dx=F(b)-F(a),\qquad \int_0^1 x^2\,dx=\left[\frac{x^3}{3}\right]_0^1=\frac13 -->

The result is signed accumulation, so contributions below the horizontal axis are negative and swapping the bounds reverses the sign. See [OpenStax on antiderivatives](https://openstax.org/books/calculus-volume-1/pages/4-10-antiderivatives) and [the fundamental theorem](https://openstax.org/books/calculus-volume-2/pages/1-3-the-fundamental-theorem-of-calculus).

We can also approximate a definite integral without finding an antiderivative. The *composite trapezoidal rule* splits the interval into *n* pieces of width *h* and adds the areas of trapezoids:

![trapezoidal-rule](https://latex.codecogs.com/svg.latex?h%3D%5Cfrac%7Bb-a%7D%7Bn%7D%2C%5Cqquad%20%5Cint_a%5Eb%20f%28x%29%5C%2Cdx%5Capprox%20h%5Cleft%5B%5Cfrac%7Bf%28a%29%7D2%2B%5Csum_%7Bi%3D1%7D%5E%7Bn-1%7Df%28a%2Bih%29%2B%5Cfrac%7Bf%28b%29%7D2%5Cright%5D)

<!-- h=\frac{b-a}{n},\qquad \int_a^b f(x)\,dx\approx h\left[\frac{f(a)}2+\sum_{i=1}^{n-1}f(a+ih)+\frac{f(b)}2\right] -->

```js
var { integrateTrapezoid } = require('./examples/notation.cjs')
integrateTrapezoid(x => x * x, 0, 1, 1000)
//=> approximately 0.3333335 (the exact answer is 1/3)

integrateTrapezoid(x => x * x, 1, 0, 1000)
//=> approximately -0.3333335
```

The helper accepts 1 through 1,000,000 subdivisions and makes at most `n + 1` calls to *f*. It accepts finite endpoints and finite function values. Increasing *n* often improves the result for smooth functions, but this method has no automatic error guarantee and can miss narrow features, discontinuities or singularities. It computes a numerical estimate, not an indefinite integral.

## worked graphics expression

Let's combine the notation in a small rendering example. In [*Physically Based Rendering*, section 8.3](https://www.pbr-book.org/3ed-2018/Reflection_Models/Lambertian_Reflection), the Lambertian reflection model has the constant BRDF *fᵣ = R/π*. Here *R* is the fraction of incident energy reflected, between 0 and 1.

The [irradiance integral in section 5.5](https://www.pbr-book.org/3ed-2018/Color_and_Radiometry/Working_with_Radiometric_Integrals) accumulates incident radiance over the upper hemisphere. Combining it with the Lambertian BRDF gives:

![lambertian-radiance](https://latex.codecogs.com/svg.latex?E%3D%5Cint_%7B%5COmega%5E%2B%7DL_i%28%5Comega_i%29%5Cmax%280%2C%5Cmathbf%7Bn%7D%5Ccdot%5Comega_i%29%5C%2Cd%5Comega_i%2C%5Cqquad%20L_o%3D%5Cfrac%7BR%7D%7B%5Cpi%7DE)

<!-- E=\int_{\Omega^+}L_i(\omega_i)\max(0,\mathbf{n}\cdot\omega_i)\,d\omega_i,\qquad L_o=\frac{R}{\pi}E -->

Read the pieces in order: **n** is the unit surface normal; **ωᵢ** is a unit direction pointing toward incoming light; their dot product is the cosine of the incident angle. The integral adds all incoming directions, weighted by this cosine. *Lᵢ* and *Lₒ* are radiance in W/(m² sr), *E* is irradiance in W/m², and the BRDF has units of 1/sr.

For one narrow beam, let *E⊥* be its irradiance measured on a plane perpendicular to the beam. Its contribution to the surface irradiance is *E⊥ max(0, n · ωᵢ)*. Substituting that contribution into the expression gives:

![lambertian-beam](https://latex.codecogs.com/svg.latex?L_o%3D%5Cfrac%7BR%7D%7B%5Cpi%7DE_%7B%5Cperp%7D%5Cmax%280%2C%5Cmathbf%7Bn%7D%5Ccdot%5Comega_i%29)

<!-- L_o=\frac{R}{\pi}E_{\perp}\max(0,\mathbf{n}\cdot\omega_i) -->

```js
var { lambertianReflection } = require('./examples/notation.cjs')

var reflectance = 0.5
var beamIrradiance = 2 * Math.PI // W/m² on a plane perpendicular to the beam
var normal = [0, 0, 1]
var lightDirection = [0, Math.sqrt(3), 1] // helper normalizes both vectors

lambertianReflection(reflectance, beamIrradiance, normal, lightDirection)
//=> approximately 0.5 W/(m² sr)
```

The normalized direction has a z component of 0.5, so the cosine is 0.5 and the output is `(0.5 / Math.PI) * (2 * Math.PI) * 0.5`. Light behind the surface contributes zero. This example uses one scalar or color channel and assumes the beam reaches the surface; visibility, emission and multiple scattering require additional terms.

Be explicit about the input: the helper's `irradiance` argument means *E⊥* for a beam, before the surface cosine. If you already have surface irradiance *E* from the hemisphere integral, use `(reflectance / Math.PI) * E` directly so the cosine is counted once.

### running the examples

The eight helpers used in these sections are implemented in [examples/notation.cjs](./examples/notation.cjs), using only Node.js built-ins and ordinary JavaScript. Run the snippets from the repository root. The implementations reject malformed dimensions, non-finite numbers and unrepresentable numerical steps; they do not mutate their inputs. To keep the examples bounded, matrix inputs and outputs have at most 1,000,000 entries and matrix multiplication has at most 10,000,000 scalar multiply-add iterations.


## powers and logarithms

A power raises a base *b* to an exponent *y*. A logarithm asks which exponent produces *x*. For real logarithms, require `b > 0`, `b ≠ 1` and `x > 0`.

![powers and logarithms 1](https://latex.codecogs.com/svg.latex?b%5Ey%3Dx%5Cquad%5CLongleftrightarrow%5Cquad%5Clog_b%20x%3Dy%2C%5Cqquad%20%5Clog_b%20x%3D%5Cfrac%7B%5Cln%20x%7D%7B%5Cln%20b%7D)

<!-- b^y=x\quad\Longleftrightarrow\quad\log_b x=y,\qquad \log_b x=\frac{\ln x}{\ln b} -->

Here `ln` means the natural logarithm, with base *e*. Compute a power and recover its exponent:

In JavaScript:

```js
const base = 2
const exponent = 3
const x = 8
const power = Math.pow(base, exponent)
const logarithm = Math.log(x) / Math.log(base)
console.log(`power = ${power.toFixed(6)}`)
console.log(`logarithm = ${logarithm.toFixed(6)}`)
```

The output is `power = 8.000000` and `logarithm = 3.000000`, because 2³ = 8. `log` functions do not all use the same base; the change-of-base formula makes the base explicit. Zero and negative inputs have no real logarithm.

## trigonometry

For an acute angle *θ* in a right triangle, sine and cosine are ratios of side lengths. On the unit circle they are the vertical and horizontal coordinates, which extends them to any real angle.

![trigonometry 1](https://latex.codecogs.com/svg.latex?%5Csin%5Ctheta%3D%5Cfrac%7B%5Ctext%7Bopposite%7D%7D%7B%5Ctext%7Bhypotenuse%7D%7D%2C%5Cqquad%20%5Ccos%5Ctheta%3D%5Cfrac%7B%5Ctext%7Badjacent%7D%7D%7B%5Ctext%7Bhypotenuse%7D%7D)

<!-- \sin\theta=\frac{\text{opposite}}{\text{hypotenuse}},\qquad \cos\theta=\frac{\text{adjacent}}{\text{hypotenuse}} -->

![trigonometry 2](https://latex.codecogs.com/svg.latex?%5Ctheta_%7B%5Cmathrm%7Brad%7D%7D%3D%5Ctheta_%7B%5Cmathrm%7Bdeg%7D%7D%5Cfrac%7B%5Cpi%7D%7B180%7D)

<!-- \theta_{\mathrm{rad}}=\theta_{\mathrm{deg}}\frac{\pi}{180} -->

Convert 30 degrees to radians before calling the trigonometric functions:

In JavaScript:

```js
const degrees = 30
const radians = degrees * Math.PI / 180
console.log(`sine = ${Math.sin(radians).toFixed(6)}`)
console.log(`cosine = ${Math.cos(radians).toFixed(6)}`)
```

The output is `sine = 0.500000` and `cosine = 0.866025`. These standard-library functions take radians, so passing `30` directly would mean 30 radians, not 30 degrees. Floating-point results approximate the exact values 1/2 and √3/2.

## modular arithmetic

For an integer *a* and a positive integer modulus *m*, the normalized remainder *r* is the unique integer from 0 through `m − 1` left after subtracting an integer multiple of *m*. Congruence `≡` means the numbers differ by a multiple of *m*.

![modular arithmetic 1](https://latex.codecogs.com/svg.latex?a%3Dqm%2Br%2C%5Cquad%20q%5Cin%5Cmathbb%20Z%2C%5Cquad%200%5Cle%20r%3Cm%2C%5Cqquad%20a%5Cequiv%20r%5Cpmod%20m)

<!-- a=qm+r,\quad q\in\mathbb Z,\quad 0\le r<m,\qquad a\equiv r\pmod m -->

Normalize the remainder of a small negative integer:

In JavaScript:

```js
const a = -8
const modulus = 5
const remainder = ((a % modulus) + modulus) % modulus
console.log(`remainder = ${remainder}`)
```

The output is `remainder = 2`, since −8 = (−2) × 5 + 2. `%` can return a negative remainder in JavaScript, C and Rust; Python already gives a nonnegative remainder for a positive modulus. The normalization works for these fixed small integers in every version. A zero modulus is invalid.

## factorials and combinations

For a nonnegative integer *n*, `n!` is the product of the integers 1 through *n*, with the empty product `0! = 1`. The binomial coefficient `C(n, k)` or `n choose k` counts ways to select *k* distinct objects from *n* without regard to order; require integer `0 ≤ k ≤ n`.

![factorials and combinations 1](https://latex.codecogs.com/svg.latex?n%21%3D%5Cprod_%7Bi%3D1%7D%5E%7Bn%7Di%2C%5Cqquad%200%21%3D1)

<!-- n!=\prod_{i=1}^{n}i,\qquad 0!=1 -->

![factorials and combinations 2](https://latex.codecogs.com/svg.latex?%5Cbinom%20nk%3D%5Cfrac%7Bn%21%7D%7Bk%21%28n-k%29%21%7D)

<!-- \binom nk=\frac{n!}{k!(n-k)!} -->

Build the factorials needed to choose two objects from five:

In JavaScript:

```js
const n = 5
const k = 2
const factorials = [1]
for (let i = 1; i <= n; i++) {
  factorials.push(factorials[i - 1] * i)
}
const combinations = factorials[n] / (factorials[k] * factorials[n - k])
console.log(`n_factorial = ${factorials[n]}`)
console.log(`zero_factorial = ${factorials[0]}`)
console.log(`combinations = ${combinations}`)
```

The output is `n_factorial = 120`, `zero_factorial = 1` and `combinations = 10`. Selecting A then B is the same combination as selecting B then A; counting orders would give 20 instead. The examples fix `n = 5`; factorials grow quickly and can overflow fixed-width integers or lose precision in JavaScript.

## probability

A finite sample space *Ω* lists all possible outcomes. An event *A* is a subset of those outcomes. Each outcome has a nonnegative probability *pᵢ*, and all outcome probabilities sum to 1. If every outcome is equally likely, the probability of *A* is a count ratio; `|A|` denotes the number of elements in *A*.

![probability 1](https://latex.codecogs.com/svg.latex?P%28A%29%3D%5Csum_%7Bi%5Cin%20A%7Dp_i%2C%5Cqquad%20P%28A%29%3D%5Cfrac%7B%7CA%7C%7D%7B%7C%5COmega%7C%7D%5C%20%5Ctext%7Bfor%20equally%20likely%20outcomes%7D)

<!-- P(A)=\sum_{i\in A}p_i,\qquad P(A)=\frac{|A|}{|\Omega|}\ \text{for equally likely outcomes} -->

For a fair six-sided die, count the even outcomes:

In JavaScript:

```js
const outcomes = [1, 2, 3, 4, 5, 6]
let favorable = 0
for (const outcome of outcomes) {
  if (outcome % 2 === 0) favorable++
}
const probability = favorable / outcomes.length
console.log(`probability = ${probability.toFixed(6)}`)
```

The output is `probability = 0.500000`, because the three even outcomes have probability 3/6. Counting outcomes assumes they are equally likely and that the sample space is nonempty. For a loaded die, add the assigned probabilities of 2, 4 and 6 instead.

## expected value

A discrete random variable *X* assigns a number *xᵢ* to each possible outcome. Its expected value `E[X]` is the probability-weighted mean. Here the list is finite, each *pᵢ* is nonnegative, and the probabilities sum to 1.

![expected value 1](https://latex.codecogs.com/svg.latex?%5Coperatorname%7BE%7D%5BX%5D%3D%5Csum_%7Bi%3D1%7D%5E%7Bn%7Dx_i%20p_i%2C%5Cqquad%20p_i%3DP%28X%3Dx_i%29)

<!-- \operatorname{E}[X]=\sum_{i=1}^{n}x_i p_i,\qquad p_i=P(X=x_i) -->

Suppose a reward is 0 with probability 0.75 and 10 with probability 0.25:

In JavaScript:

```js
const values = [0, 10]
const probabilities = [0.75, 0.25]
let expected = 0
for (let i = 0; i < values.length; i++) {
  expected += values[i] * probabilities[i]
}
console.log(`expected = ${expected.toFixed(6)}`)
```

The output is `expected = 2.500000`, from 0 × 0.75 + 10 × 0.25. An expectation need not be an outcome: no single reward here is 2.5. It describes the long-run average under repeated independent draws with the same probabilities, rather than a guaranteed reward.

## variance and standard deviation

Variance measures spread around the mean *μ* by averaging squared deviations. For a nonempty finite population of *n* equally weighted values, write the population variance as `σ²` and its square root, the standard deviation, as `σ`.

![variance and standard deviation 1](https://latex.codecogs.com/svg.latex?%5Cmu%3D%5Cfrac1n%5Csum_%7Bi%3D1%7D%5En%20x_i%2C%5Cqquad%20%5Csigma%5E2%3D%5Cfrac1n%5Csum_%7Bi%3D1%7D%5En%28x_i-%5Cmu%29%5E2%2C%5Cqquad%20%5Csigma%3D%5Csqrt%7B%5Csigma%5E2%7D)

<!-- \mu=\frac1n\sum_{i=1}^n x_i,\qquad \sigma^2=\frac1n\sum_{i=1}^n(x_i-\mu)^2,\qquad \sigma=\sqrt{\sigma^2} -->

Treat all four values as the complete population:

In JavaScript:

```js
const values = [2, 4, 6, 8]
const mean = values.reduce((total, value) => total + value, 0) / values.length
let squaredDeviations = 0
for (const value of values) {
  squaredDeviations += (value - mean) ** 2
}
const variance = squaredDeviations / values.length
const standardDeviation = Math.sqrt(variance)
console.log(`variance = ${variance.toFixed(6)}`)
console.log(`standard_deviation = ${standardDeviation.toFixed(6)}`)
```

The mean is 5, and the squared deviations sum to 20. The output is `variance = 5.000000` and `standard_deviation = 2.236068`. Variance has squared units; standard deviation has the original units. To estimate a population variance from an independent identically distributed sample, the usual unbiased sample variance divides by `n − 1` instead and requires `n > 1`.

## conditional probability and Bayes

Conditional probability `P(A | B)` means the probability of event *A* after restricting attention to event *B*. The intersection `A ∩ B` means both events occur, and conditioning requires `P(B) > 0`.

![conditional probability and Bayes 1](https://latex.codecogs.com/svg.latex?P%28A%5Cmid%20B%29%3D%5Cfrac%7BP%28A%5Ccap%20B%29%7D%7BP%28B%29%7D)

<!-- P(A\mid B)=\frac{P(A\cap B)}{P(B)} -->

![conditional probability and Bayes 2](https://latex.codecogs.com/svg.latex?P%28A%5Cmid%20B%29%3D%5Cfrac%7BP%28B%5Cmid%20A%29P%28A%29%7D%7BP%28B%5Cmid%20A%29P%28A%29%2BP%28B%5Cmid%5Cneg%20A%29P%28%5Cneg%20A%29%7D)

<!-- P(A\mid B)=\frac{P(B\mid A)P(A)}{P(B\mid A)P(A)+P(B\mid\neg A)P(\neg A)} -->

Bayes’ theorem reverses the conditioning. In a fictional detector model, *A* means a target is present and *B* means the detector signals. Use a prior target probability of 0.01, a true-positive probability of 0.90, and a false-positive probability of 0.05:

In JavaScript:

```js
const prior = 0.01
const truePositive = 0.90
const falsePositive = 0.05
const joint = truePositive * prior
const evidence = joint + falsePositive * (1 - prior)
const posterior = joint / evidence
console.log(`evidence = ${evidence.toFixed(6)}`)
console.log(`posterior = ${posterior.toFixed(6)}`)
```

The output is `evidence = 0.058500` and `posterior = 0.153846`: about 15.38% of signals indicate a target in this model. The denominator includes both true and false signals. `P(B | A) = 0.90` is not `P(A | B)`; the prior base rate matters. If no signal can occur, the denominator is zero and this conditional probability is undefined.

## covariance and correlation

For *n* paired observations `(xᵢ, yᵢ)`, population covariance averages the product of their deviations from means *μₓ* and *μᵧ*. A positive value indicates that above-mean values tend to occur together; a negative value indicates the opposite. Both lists must be nonempty and have the same length.

![covariance and correlation 1](https://latex.codecogs.com/svg.latex?%5Coperatorname%7BCov%7D%28X%2CY%29%3D%5Cfrac1n%5Csum_%7Bi%3D1%7D%5En%28x_i-%5Cmu_x%29%28y_i-%5Cmu_y%29)

<!-- \operatorname{Cov}(X,Y)=\frac1n\sum_{i=1}^n(x_i-\mu_x)(y_i-\mu_y) -->

![covariance and correlation 2](https://latex.codecogs.com/svg.latex?%5Crho%3D%5Cfrac%7B%5Coperatorname%7BCov%7D%28X%2CY%29%7D%7B%5Csigma_x%5Csigma_y%7D%2C%5Cqquad%20%5Csigma_x%3E0%2C%5C%20%5Csigma_y%3E0)

<!-- \rho=\frac{\operatorname{Cov}(X,Y)}{\sigma_x\sigma_y},\qquad \sigma_x>0,\ \sigma_y>0 -->

Pearson correlation *ρ* divides by the two population standard deviations, giving a unitless measure of linear association from −1 to 1. Compute both for three paired values:

In JavaScript:

```js
const x = [1, 2, 3]
const y = [2, 4, 5]
const count = x.length
const meanX = x.reduce((total, value) => total + value, 0) / count
const meanY = y.reduce((total, value) => total + value, 0) / count
let cross = 0
let squaresX = 0
let squaresY = 0
for (let i = 0; i < count; i++) {
  const dx = x[i] - meanX
  const dy = y[i] - meanY
  cross += dx * dy
  squaresX += dx * dx
  squaresY += dy * dy
}
const covariance = cross / count
const varianceX = squaresX / count
const varianceY = squaresY / count
const correlation = covariance / Math.sqrt(varianceX * varianceY)
console.log(`covariance = ${covariance.toFixed(6)}`)
console.log(`correlation = ${correlation.toFixed(6)}`)
```

The output is `covariance = 1.000000` and `correlation = 0.981981`. These paired values have strong positive linear association, which does not establish causation. A constant list has zero standard deviation, so its correlation is undefined. This is population covariance; the usual sample covariance uses `n − 1` consistently with sample variances.

## entropy

For a finite discrete distribution, Shannon entropy measures average information per outcome. Each *pᵢ* is an outcome probability, the probabilities are nonnegative and sum to 1, and the logarithm base determines the unit.

![entropy 1](https://latex.codecogs.com/svg.latex?H_2%3D-%5Csum_%7Bi%3D1%7D%5En%20p_i%5Clog_2%20p_i%2C%5Cqquad%200%5Clog_2%200%3A%3D0)

<!-- H_2=-\sum_{i=1}^n p_i\log_2 p_i,\qquad 0\log_2 0:=0 -->

Base 2 gives entropy in bits. Skip zero-probability terms before evaluating the logarithm:

In JavaScript:

```js
const probabilities = [0.5, 0.25, 0.25, 0]
let entropyBits = 0
for (const probability of probabilities) {
  if (probability > 0) {
    entropyBits -= probability * Math.log2(probability)
  }
}
console.log(`entropy_bits = ${entropyBits.toFixed(6)}`)
```

The output is `entropy_bits = 1.500000`, from 0.5 × 1 + 0.25 × 2 + 0.25 × 2. The convention `0 log 0 = 0` is a limit; directly evaluating the logarithm at zero can produce a non-finite result. Natural logarithms would give entropy in nats instead of bits.

## more...

Like this guide? Suggest some [more features](https://github.com/alikatgh/mathasacode/issues) or send us a Pull Request!

## Contributing

For details on how to contribute, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

This interactive edition is based on [Experience-Monks/math-as-code](https://github.com/Experience-Monks/math-as-code). Original authorship and the MIT license are retained.

MIT, see [LICENSE.md](./LICENSE.md) for details.

[1]: http://mimosa-pudica.net/improved-oren-nayar.html#images
[2]: http://buzzard.ups.edu/courses/2007spring/projects/million-paper.pdf
[3]: https://www.math.washington.edu/~morrow/464_12/fft.pdf
