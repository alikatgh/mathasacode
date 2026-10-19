import {
  mean,
  gradientDescentStep,
  multiplyMatrices,
  kroneckerProduct,
  kroneckerDelta,
  derivative,
  integrateTrapezoid,
  lambertianReflection
} from './notation.mjs'

// Activities use a fixed set of operations. Input is data, never executable code.
const L = (en, zh) => ({ en, zh })
const number = (key, en, zh, value, limits = {}) => ({
  key, label: L(en, zh), type: 'number', value: String(value),
  min: -1e12, max: 1e12, step: 'any', ...limits
})
const text = (key, en, zh, value) => ({ key, label: L(en, zh), type: 'text', value })
const only = (field, activeWhen) => ({ ...field, activeWhen })
const select = (key, en, zh, value, options) => ({
  key, label: L(en, zh), type: 'select', value,
  options: options.map(([value, en, zh]) => ({ value, label: L(en, zh) }))
})
const quiz = (en, zh, options, answer, explanationEn, explanationZh) => ({
  prompt: L(en, zh),
  options: options.map(([id, en, zh]) => ({ id, text: L(en, zh) })),
  answer,
  explanation: L(explanationEn, explanationZh)
})
const activity = (id, enHeadings, zhHeadings, title, description, fields, calculate, quiz) => ({
  id, headingIds: { en: enHeadings, zh: zhHeadings }, title, description, fields, calculate, quiz
})

function input (values, key) {
  const value = values?.[key]
  if ((typeof value !== 'string' && typeof value !== 'number') ||
      String(value).trim() === '' || String(value).length > 4000) {
    throw new Error(key + ': enter a value of at most 4000 characters.')
  }
  return String(value).trim()
}

function finite (value, name = 'value') {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(name + ': a finite number is required.')
  }
  return value
}

function numeric (values, key, min = -1e12, max = 1e12) {
  const value = finite(Number(input(values, key)), key)
  if (value < min || value > max) throw new Error(key + ': enter a number from ' + min + ' to ' + max + '.')
  return value
}

function integer (values, key, min, max) {
  const value = numeric(values, key, min, max)
  if (!Number.isInteger(value)) throw new Error(key + ': enter a whole number.')
  return value
}

function choice (values, key, options) {
  const value = input(values, key)
  if (!options.includes(value)) throw new Error(key + ': choose one of the available options.')
  return value
}

function json (values, key) {
  try {
    return JSON.parse(input(values, key))
  } catch {
    throw new Error(key + ': enter valid JSON, for example [1, 2, 3].')
  }
}

function vector (values, key, maxLength = 20, minLength = 1) {
  const value = json(values, key)
  if (!Array.isArray(value) || value.length < minLength || value.length > maxLength) {
    throw new Error(key + ': enter an array of ' + minLength + ' to ' + maxLength + ' numbers.')
  }
  value.forEach(entry => finite(entry, key))
  return value
}

function matrix (values, key) {
  const value = json(values, key)
  if (!Array.isArray(value) || value.length < 1 || value.length > 20 ||
      !Array.isArray(value[0]) || value[0].length < 1 || value[0].length > 20) {
    throw new Error(key + ': enter a nonempty matrix with at most 20 rows and 20 columns.')
  }
  const width = value[0].length
  value.forEach(row => {
    if (!Array.isArray(row) || row.length !== width) throw new Error(key + ': every row must have the same length.')
    row.forEach(entry => finite(entry, key))
  })
  return value
}

function fmt (value) {
  if (Array.isArray(value)) return '[' + value.map(fmt).join(', ') + ']'
  if (typeof value === 'boolean') return String(value)
  finite(value, 'result')
  return Object.is(value, -0) ? '0' : Number(value.toPrecision(12)).toString()
}

function output (expression, result) {
  return { expression, result: typeof result === 'string' ? result : fmt(result) }
}

function sameLength (a, b) {
  if (a.length !== b.length) throw new Error('Both vectors must have the same length.')
}

function unit (v) {
  const scale = Math.max(...v.map(Math.abs))
  if (scale === 0) throw new Error('A zero vector has no unit direction.')
  const scaled = v.map(x => x / scale)
  const length = Math.hypot(...scaled)
  return scaled.map(x => x / length)
}

function bounds (values) {
  const lower = integer(values, 'lower', -10000, 10000)
  const upper = integer(values, 'upper', -10000, 10000)
  if (upper < lower || upper - lower + 1 > 10000) {
    throw new Error('Bounds must be ordered and contain at most 10000 terms.')
  }
  return [lower, upper]
}

const functions = {
  square: { label: 'x²', f: x => x * x, prime: x => 2 * x, integral: x => x * x * x / 3, family: 'x³/3' },
  cubic: { label: 'x³', f: x => x * x * x, prime: x => 3 * x * x, integral: x => x ** 4 / 4, family: 'x⁴/4' },
  sin: { label: 'sin(x)', f: Math.sin, prime: Math.cos, integral: x => -Math.cos(x), family: '−cos(x)' },
  linear: { label: '2x', f: x => 2 * x, prime: () => 2, integral: x => x * x, family: 'x²' }
}

export const activities = [
  activity(
    'variable-conventions', ['variable-name-conventions'], ['变量名约定'],
    L('Read the shape', '读懂变量的形状'),
    L('Change the kind of quantity. Italic lowercase, bold lowercase and bold uppercase often signal scalar, vector and matrix.',
      '改变量的类型。斜体小写、粗体小写和粗体大写通常分别表示标量、向量和矩阵。'),
    [
      select('kind', 'Quantity', '量的类型', 'vector', [['scalar', 'Scalar s', '标量 s'], ['vector', 'Vector x', '向量 x'], ['matrix', 'Matrix A', '矩阵 A']]),
      number('x', 'First value', '第一个值', 3),
      only(number('y', 'Second value', '第二个值', 4), v => v.kind === 'vector' || v.kind === 'matrix')
    ],
    v => {
      const kind = choice(v, 'kind', ['scalar', 'vector', 'matrix'])
      const x = numeric(v, 'x')
      if (kind === 'scalar') return output('s ∈ ℝ', x)
      const y = numeric(v, 'y')
      if (kind === 'vector') return output('x ∈ ℝ²', [x, y])
      return output('A ∈ ℝ²ˣ²', [[x, y], [0, 1]])
    },
    quiz('Which conventional name suggests a matrix?', '按本指南的约定，哪个名称表示矩阵？',
      [['s', 'Italic lowercase s', '斜体小写 s'], ['x', 'Bold lowercase x', '粗体小写 x'], ['A', 'Bold uppercase A', '粗体大写 A']],
      'A', 'Bold uppercase letters commonly name matrices; context still determines the meaning.',
      '粗体大写字母通常表示矩阵；具体含义仍取决于上下文。')
  ),
  activity(
    'equals', ['equals-symbols'], ['等号'],
    L('Exact or approximate?', '精确相等还是近似相等？'),
    L('Compare exact equality with an absolute tolerance ε. This calculator uses |a − b| ≤ ε.',
      '比较精确相等与绝对容差 ε。本计算器使用 |a − b| ≤ ε。'),
    [number('a', 'a', 'a', 0.1), number('b', 'b', 'b', 0.100001), number('epsilon', 'Tolerance ε', '容差 ε', 0.00001, { min: 0 })],
    v => {
      const a = numeric(v, 'a'); const b = numeric(v, 'b'); const epsilon = numeric(v, 'epsilon', 0)
      return output(fmt(a) + ' = ' + fmt(b) + ' ; |a − b| ≤ ' + fmt(epsilon),
        '= : ' + (a === b) + ' ; ≈ : ' + (Math.abs(a - b) <= epsilon))
    },
    quiz('What does a ≈ b communicate?', 'a ≈ b 表达什么？',
      [['exact', 'The values are exactly equal', '两个值精确相等'], ['tolerance', 'The values are close under a stated criterion', '两个值在指定标准下足够接近'], ['assign', 'Assign b to a', '把 b 赋给 a']],
      'tolerance', 'Approximation needs a tolerance or context; it does not assert exact equality.',
      '近似相等需要容差或上下文，并不表示精确相等。')
  ),
  activity(
    'square-root-complex', ['square-root-and-complex-numbers'], ['平方根与复数'],
    L('Cross into complex numbers', '进入复数世界'),
    L('Find the principal square root of a real number. A negative input produces an imaginary result.',
      '求实数的主平方根。负数输入会得到虚数结果。'),
    [number('x', 'Radicand x', '被开方数 x', -9)],
    v => {
      const x = numeric(v, 'x')
      return output('√(' + fmt(x) + ')', x < 0 ? fmt(Math.sqrt(-x)) + 'i' : Math.sqrt(x))
    },
    quiz('Over the complex numbers, what is the principal square root of −9?', '在复数范围内，−9 的主平方根是多少？',
      [['negative', '−3', '−3'], ['imaginary', '3i', '3i'], ['real', '3', '3']],
      'imaginary', '(3i)² = −9. The principal root uses the positive imaginary direction here.',
      '(3i)² = −9。在这里，主平方根取虚部为正的那个根。')
  ),
  activity(
    'dot-cross', ['dot--cross', 'scalar-multiplication', 'vector-multiplication', 'dot-product', 'cross-product'],
    ['点--叉', '标量乘法', '向量乘法', '点乘', '叉乘'],
    L('Choose the vector operation', '选择向量运算'),
    L('The same vectors give different results under dot, cross and element-wise multiplication. Cross products require three components.',
      '同一组向量在点乘、叉乘和逐元素乘法下会得到不同结果。叉乘需要三个分量。'),
    [
      select('operation', 'Operation', '运算', 'dot', [['dot', 'Dot ·', '点乘 ·'], ['cross', 'Cross ×', '叉乘 ×'], ['hadamard', 'Element-wise ∘', '逐元素乘法 ∘'], ['scalar', 'Scalar multiplication', '标量乘法']]),
      text('a', 'Vector a (JSON)', '向量 a（JSON）', '[1,0,0]'),
      only(text('b', 'Vector b (JSON)', '向量 b（JSON）', '[0,1,0]'), v => ['dot', 'cross', 'hadamard'].includes(v.operation)),
      only(number('scale', 'Scalar multiplier', '标量倍数', 2), v => v.operation === 'scalar')
    ],
    v => {
      const op = choice(v, 'operation', ['dot', 'cross', 'hadamard', 'scalar'])
      const a = vector(v, 'a')
      if (op === 'scalar') {
        const scale = numeric(v, 'scale')
        return output(fmt(scale) + 'a', a.map(x => x * scale))
      }
      const b = vector(v, 'b'); sameLength(a, b)
      if (op === 'dot') return output(fmt(a) + ' · ' + fmt(b), a.reduce((sum, x, i) => sum + x * b[i], 0))
      if (op === 'hadamard') return output(fmt(a) + ' ∘ ' + fmt(b), a.map((x, i) => x * b[i]))
      if (a.length !== 3) throw new Error('Cross products here require two 3D vectors.')
      return output(fmt(a) + ' × ' + fmt(b), [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]])
    },
    quiz('What is [1, 0, 0] · [0, 1, 0]?', '[1, 0, 0] · [0, 1, 0] 等于什么？',
      [['zero', '0', '0'], ['one', '1', '1'], ['vector', '[0, 0, 1]', '[0, 0, 1]']],
      'zero', 'Their dot product is zero: the two nonzero vectors are perpendicular.',
      '点乘结果为零，说明这两个非零向量互相垂直。')
  ),
  activity(
    'summation', ['sigma'], ['西格玛sigma'],
    L('Expand a sum', '展开求和'),
    L('Both bounds are included. Change the summand and compare its accumulation.',
      '上下界都包含在内。改变求和项，观察总和如何变化。'),
    [
      number('lower', 'Lower bound', '下界', 1, { min: -10000, max: 10000, step: 1 }),
      number('upper', 'Upper bound', '上界', 100, { min: -10000, max: 10000, step: 1 }),
      select('term', 'Summand', '求和项', 'i', [['i', 'i', 'i'], ['odd', '2i + 1', '2i + 1'], ['square', 'i²', 'i²']])
    ],
    v => {
      const [lo, hi] = bounds(v); const term = choice(v, 'term', ['i', 'odd', 'square'])
      let sum = 0
      for (let i = lo; i <= hi; i++) sum += term === 'i' ? i : term === 'odd' ? 2 * i + 1 : i * i
      return output('Σ(i=' + lo + '…' + hi + ') ' + ({ i: 'i', odd: '(2i + 1)', square: 'i²' })[term], sum)
    },
    quiz('What is Σ from i = 1 to 3 of i?', 'i 从 1 到 3 时，Σ i 等于多少？',
      [['three', '3', '3'], ['six', '6', '6'], ['ten', '10', '10']],
      'six', 'The inclusive bounds give 1 + 2 + 3 = 6.', '上下界都包含在内，因此 1 + 2 + 3 = 6。')
  ),
  activity(
    'averages', ['averages'], ['平均值'],
    L('Turn a sum into a mean', '从总和求平均值'),
    L('The factor 1/n divides the sum by the number of terms. Use a nonempty list; repeated observations still count.',
      '因子 1/n 表示用总和除以项数。列表不能为空；重复的观测值也分别计数。'),
    [text('values', 'Values (JSON array)', '数值（JSON 数组）', '[2,4,6,8]')],
    v => {
      const values = vector(v, 'values', 10000)
      return output('x̄ = (1/' + values.length + ') Σ(i=1…' + values.length + ') xᵢ', mean(values))
    },
    quiz('For values [2, 4, 6, 8], what does (1/n)Σxᵢ equal?', '对于数值 [2, 4, 6, 8]，(1/n)Σxᵢ 等于多少？',
      [['mean', '5', '5'], ['sum', '20', '20'], ['count', '4', '4']],
      'mean', 'There are four terms and their sum is 20, so the arithmetic mean is 20/4 = 5.',
      '共有四项，总和为 20，因此算术平均值为 20/4 = 5。')
  ),
  activity(
    'products', ['capital-pi'], ['大写-pi'],
    L('Multiply a sequence', '连乘一个序列'),
    L('Π multiplies the terms between inclusive bounds. Very large products can overflow finite arithmetic.',
      'Π 表示把包含上下界的各项相乘。过大的乘积可能超出有限数值运算范围。'),
    [
      number('lower', 'Lower bound', '下界', 1, { min: -10000, max: 10000, step: 1 }),
      number('upper', 'Upper bound', '上界', 6, { min: -10000, max: 10000, step: 1 }),
      select('term', 'Factor', '乘积项', 'i', [['i', 'i', 'i'], ['shift', 'i + 1', 'i + 1'], ['growth', '1 + i/10', '1 + i/10']])
    ],
    v => {
      const [lo, hi] = bounds(v); const term = choice(v, 'term', ['i', 'shift', 'growth'])
      let product = 1
      for (let i = lo; i <= hi; i++) product = finite(product * (term === 'i' ? i : term === 'shift' ? i + 1 : 1 + i / 10), 'product')
      return output('Π(i=' + lo + '…' + hi + ') ' + ({ i: 'i', shift: '(i + 1)', growth: '(1 + i/10)' })[term], product)
    },
    quiz('What is Π from i = 1 to 4 of i?', 'i 从 1 到 4 时，Π i 等于多少？',
      [['ten', '10', '10'], ['twentyfour', '24', '24'], ['sixteen', '16', '16']],
      'twentyfour', 'Multiply rather than add: 1 × 2 × 3 × 4 = 24.', '这里需要相乘：1 × 2 × 3 × 4 = 24。')
  ),
  activity(
    'bars', ['pipes', 'absolute-value', 'euclidean-norm', 'determinant'],
    ['管道pipes', '绝对值', '欧几里得模euclidean-norm', '行列式'],
    L('Read the bars in context', '根据上下文理解竖线'),
    L('Choose absolute value, vector length or a 2×2 determinant. Each uses its matching input below.',
      '选择绝对值、向量长度或 2×2 行列式。每种运算使用下方对应的输入。'),
    [
      select('operation', 'Meaning of the bars', '竖线的含义', 'norm', [['absolute', 'Absolute value', '绝对值'], ['norm', 'Euclidean norm', '欧几里得模'], ['determinant', '2×2 determinant', '2×2 行列式']]),
      only(number('scalar', 'Scalar', '标量', -5), v => v.operation === 'absolute'),
      only(text('vector', 'Vector (JSON)', '向量（JSON）', '[3,4]'), v => v.operation === 'norm'),
      only(text('matrix', '2×2 matrix (JSON)', '2×2 矩阵（JSON）', '[[1,2],[3,4]]'), v => v.operation === 'determinant')
    ],
    v => {
      const op = choice(v, 'operation', ['absolute', 'norm', 'determinant'])
      if (op === 'absolute') {
        const x = numeric(v, 'scalar')
        return output('|' + fmt(x) + '|', Math.abs(x))
      }
      if (op === 'norm') {
        const a = vector(v, 'vector')
        return output('‖' + fmt(a) + '‖₂', Math.hypot(...a))
      }
      const a = matrix(v, 'matrix')
      if (a.length !== 2 || a[0].length !== 2) throw new Error('This determinant activity requires a 2×2 matrix.')
      return output('det(' + fmt(a) + ')', a[0][0] * a[1][1] - a[0][1] * a[1][0])
    },
    quiz('What is the Euclidean length of [3, 4]?', '向量 [3, 4] 的欧几里得长度是多少？',
      [['seven', '7', '7'], ['five', '5', '5'], ['twentyfive', '25', '25']],
      'five', 'The norm is √(3² + 4²) = 5.', '模为 √(3² + 4²) = 5。')
  ),
  activity(
    'unit-vector', ['hat'], ['帽子'],
    L('Keep direction, change length', '保留方向，改变长度'),
    L('Normalize a nonzero vector by dividing by its length. The zero vector has no direction to preserve.',
      '用非零向量除以它的长度，得到单位向量。零向量没有可保留的方向。'),
    [text('vector', 'Vector (JSON)', '向量（JSON）', '[0,4,-3]')],
    v => {
      const a = vector(v, 'vector')
      return output('â = ' + fmt(a) + ' / ‖' + fmt(a) + '‖', unit(a))
    },
    quiz('How do you normalize a nonzero vector v?', '如何把非零向量 v 归一化？',
      [['length', 'Divide v by ‖v‖', '用 v 除以 ‖v‖'], ['square', 'Square each component', '把每个分量平方'], ['zero', 'Replace every component with zero', '把所有分量变为零']],
      'length', 'Dividing by the positive norm makes the new norm 1 and preserves direction.',
      '除以正的模会把长度变为 1，同时保留方向。')
  ),
  activity(
    'membership', ['element'], ['属于'],
    L('Ask whether a value belongs', '判断一个值是否属于集合'),
    L('A set keeps unique values. Membership tests whether the value occurs, not how many times.',
      '集合只保留不同的值。成员关系检查一个值是否存在，而不是出现了多少次。'),
    [text('set', 'Set values (JSON array)', '集合的值（JSON 数组）', '[3,9,14]'), number('value', 'Value to find', '要查找的值', 9)],
    v => {
      const set = [...new Set(vector(v, 'set', 100, 0))]
      const value = numeric(v, 'value')
      return output(fmt(value) + ' ∈ {' + set.map(fmt).join(', ') + '}', set.includes(value))
    },
    quiz('How many elements are in the set {3, 3, 9}?', '集合 {3, 3, 9} 中有多少个元素？',
      [['two', '2', '2'], ['three', '3', '3'], ['one', '1', '1']],
      'two', 'Duplicate 3 does not create a new set element.', '重复的 3 不会增加新的集合元素。')
  ),
  activity(
    'number-sets', ['common-number-sets'], ['常见数字集'],
    L('Place a number in its sets', '判断数字所属的数集'),
    L('These are exact, curated mathematical values. The calculator does not guess irrationality from a rounded decimal.',
      '这里使用预先定义的精确数学值，不会根据四舍五入的小数推断无理性。'),
    [
      select('value', 'Exact value', '精确值', 'half', [['negative', '−3', '−3'], ['zero', '0', '0'], ['half', '1/2', '1/2'], ['sqrt2', '√2', '√2'], ['i', 'i', 'i']]),
      select('naturals', 'Convention for ℕ', 'ℕ 的约定', 'zero', [['zero', 'Include 0', '包含 0'], ['positive', 'Start at 1', '从 1 开始']])
    ],
    v => {
      const key = choice(v, 'value', ['negative', 'zero', 'half', 'sqrt2', 'i'])
      const naturals = choice(v, 'naturals', ['zero', 'positive'])
      const data = {
        negative: ['−3', ['ℤ', 'ℚ', 'ℝ', 'ℂ']], zero: ['0', ['ℤ', 'ℚ', 'ℝ', 'ℂ']],
        half: ['1/2', ['ℚ', 'ℝ', 'ℂ']], sqrt2: ['√2', ['ℝ', 'ℂ']], i: ['i', ['ℂ']]
      }[key]
      const sets = key === 'zero' && naturals === 'zero' ? ['ℕ', ...data[1]] : data[1]
      return output(data[0] + ' ∈ ?', sets.join(', '))
    },
    quiz('Which is the smallest set listed that contains 1/2?', '下列数集中，包含 1/2 的最小数集是哪一个？',
      [['natural', 'ℕ', 'ℕ'], ['integer', 'ℤ', 'ℤ'], ['rational', 'ℚ', 'ℚ']],
      'rational', '1/2 is rational but is neither an integer nor a natural number.',
      '1/2 是有理数，但不是整数，也不是自然数。')
  ),
  activity(
    'functions', ['function', 'functions', 'piecewise-function', 'common-functions', 'function-notation'], ['函数', '分段函数', '通用函数', '函数符号'],
    L('Follow an input through a function', '观察函数如何处理输入'),
    L('Choose a rule and evaluate it. The piecewise example selects a branch before evaluating that branch.',
      '选择规则并求值。分段函数会先选择分支，再计算该分支。'),
    [
      select('rule', 'Function', '函数', 'square', [['square', 'f(x) = x²', 'f(x) = x²'], ['length', 'f(x,y) = √(x²+y²)', 'f(x,y) = √(x²+y²)'], ['piecewise', 'Piecewise: x−1 for x≥1, otherwise 0', '分段：x≥1 时为 x−1，否则为 0']]),
      number('x', 'x', 'x', 2),
      only(number('y', 'y (length only)', 'y（仅用于长度）', 3), v => v.rule === 'length')
    ],
    v => {
      const rule = choice(v, 'rule', ['square', 'length', 'piecewise']); const x = numeric(v, 'x')
      if (rule === 'square') return output('f(' + fmt(x) + ') = (' + fmt(x) + ')²', x * x)
      if (rule === 'length') {
        const y = numeric(v, 'y')
        return output('f(' + fmt(x) + ', ' + fmt(y) + ') = √(x² + y²)', Math.hypot(x, y))
      }
      return output('f(' + fmt(x) + ') = { x−1, x≥1; 0, x<1 }', x >= 1 ? x - 1 : 0)
    },
    quiz('For f(x) = x−1 when x≥1 and 0 otherwise, what is f(0)?', '若 x≥1 时 f(x)=x−1，否则为 0，那么 f(0) 是多少？',
      [['zero', '0', '0'], ['negative', '−1', '−1'], ['undefined', 'Undefined', '无定义']],
      'zero', 'At x=0 the otherwise branch is selected.', 'x=0 时选择“否则”分支。')
  ),
  activity(
    'prime', ['prime'], ['撇号prime'],
    L('Read repeated primes', '理解连续撇号'),
    L('For f(x)=x², compare its first, second and third derivatives. Here a prime denotes differentiation.',
      '对于 f(x)=x²，比较它的一阶、二阶和三阶导数。这里的撇号表示求导。'),
    [
      number('x', 'x', 'x', 2),
      select('order', 'Derivative order', '导数阶数', '1', [['1', 'f′', 'f′'], ['2', 'f′′', 'f′′'], ['3', 'f′′′', 'f′′′']])
    ],
    v => {
      const x = numeric(v, 'x'); const order = choice(v, 'order', ['1', '2', '3'])
      return output('f' + '′'.repeat(Number(order)) + '(' + fmt(x) + '), f(x)=x²', order === '1' ? 2 * x : order === '2' ? 2 : 0)
    },
    quiz('For f(x)=x², what is f′′(x)?', '对于 f(x)=x²，f′′(x) 是什么？',
      [['two', '2', '2'], ['twox', '2x', '2x'], ['zero', '0', '0']],
      'two', 'Differentiate twice: x² becomes 2x, then 2.', '连续求导两次：x² 变为 2x，再变为 2。')
  ),
  activity(
    'floor-ceiling', ['floor--ceiling'], ['向下取整和向上取整floor--ceiling'],
    L('Round toward an integer bound', '向整数边界取整'),
    L('Floor moves toward negative infinity; ceiling moves toward positive infinity. Try negative values.',
      '向下取整朝负无穷方向，向上取整朝正无穷方向。可以尝试负数。'),
    [number('x', 'x', 'x', -2.4), select('operation', 'Operation', '运算', 'floor', [['floor', 'Floor ⌊x⌋', '向下取整 ⌊x⌋'], ['ceil', 'Ceiling ⌈x⌉', '向上取整 ⌈x⌉']])],
    v => {
      const x = numeric(v, 'x'); const op = choice(v, 'operation', ['floor', 'ceil'])
      return output(op === 'floor' ? '⌊' + fmt(x) + '⌋' : '⌈' + fmt(x) + '⌉', op === 'floor' ? Math.floor(x) : Math.ceil(x))
    },
    quiz('What is ⌊−1.2⌋?', '⌊−1.2⌋ 等于多少？',
      [['minusone', '−1', '−1'], ['minustwo', '−2', '−2'], ['zero', '0', '0']],
      'minustwo', '−2 is the greatest integer less than or equal to −1.2.',
      '−2 是不大于 −1.2 的最大整数。')
  ),
  activity(
    'logic', ['arrows', 'material-implication', 'inequality', 'conjunction--disjunction'],
    ['箭头', '实质蕴含material-implication', '等式equality', '与conjunction--或disjunction'],
    L('Build a truth table row', '构造真值表的一行'),
    L('Implication A⇒B is false only when A is true and B is false. Equivalence requires matching truth values.',
      '蕴含 A⇒B 仅在 A 为真且 B 为假时为假。等价要求两边真值相同。'),
    [
      select('A', 'A', 'A', 'true', [['true', 'True', '真'], ['false', 'False', '假']]),
      select('B', 'B', 'B', 'false', [['true', 'True', '真'], ['false', 'False', '假']]),
      select('operation', 'Connective', '逻辑连接词', 'implies', [['implies', 'A ⇒ B', 'A ⇒ B'], ['equivalent', 'A ⇔ B', 'A ⇔ B'], ['and', 'A ∧ B', 'A ∧ B'], ['or', 'A ∨ B', 'A ∨ B']])
    ],
    v => {
      const a = choice(v, 'A', ['true', 'false']) === 'true'; const b = choice(v, 'B', ['true', 'false']) === 'true'
      const op = choice(v, 'operation', ['implies', 'equivalent', 'and', 'or'])
      const symbols = { implies: '⇒', equivalent: '⇔', and: '∧', or: '∨' }
      const result = op === 'implies' ? !a || b : op === 'equivalent' ? a === b : op === 'and' ? a && b : a || b
      return output(String(a) + ' ' + symbols[op] + ' ' + String(b), result)
    },
    quiz('If A is false and B is false, what is A⇒B?', '若 A 为假且 B 为假，A⇒B 的真值是什么？',
      [['true', 'True', '真'], ['false', 'False', '假'], ['unknown', 'Cannot be determined', '无法确定']],
      'true', 'A false antecedent makes material implication true; the only false row is true⇒false.',
      '前件为假时，实质蕴含为真；唯一为假的情况是真⇒假。')
  ),
  activity(
    'negation', ['logical-negation'], ['逻辑非logical-negation'],
    L('Negate a statement', '否定一个命题'),
    L('First evaluate the comparison, then reverse its truth value.',
      '先判断比较式的真值，再把真值取反。'),
    [number('a', 'a', 'a', 2), number('b', 'b', 'b', 3), select('comparison', 'Comparison', '比较', 'equal', [['equal', 'a = b', 'a = b'], ['less', 'a < b', 'a < b']])],
    v => {
      const a = numeric(v, 'a'); const b = numeric(v, 'b'); const op = choice(v, 'comparison', ['equal', 'less'])
      return output('¬(' + fmt(a) + (op === 'equal' ? ' = ' : ' < ') + fmt(b) + ')', !(op === 'equal' ? a === b : a < b))
    },
    quiz('If P is true, what is ¬P?', '若 P 为真，¬P 的真值是什么？',
      [['false', 'False', '假'], ['true', 'True', '真'], ['zero', 'The number 0', '数字 0']],
      'false', 'Logical negation reverses a truth value.', '逻辑非把真值取反。')
  ),
  activity(
    'intervals', ['intervals'], ['区间intervals'],
    L('Test an interval boundary', '测试区间边界'),
    L('Square brackets include an endpoint; parentheses exclude it. Compare a value with both endpoints.',
      '方括号包含端点，圆括号排除端点。将一个值与两个端点比较。'),
    [
      number('lower', 'Lower endpoint', '左端点', 0), number('upper', 'Upper endpoint', '右端点', 1), number('x', 'Value x', '值 x', 0.5),
      select('closure', 'Endpoint inclusion', '端点是否包含', '[)', [['[]', '[a, b]', '[a, b]'], ['[)', '[a, b)', '[a, b)'], ['(]', '(a, b]', '(a, b]'], ['()', '(a, b)', '(a, b)']])
    ],
    v => {
      const lo = numeric(v, 'lower'); const hi = numeric(v, 'upper'); const x = numeric(v, 'x')
      const closure = choice(v, 'closure', ['[]', '[)', '(]', '()'])
      if (lo > hi) throw new Error('The lower endpoint must not exceed the upper endpoint.')
      const inside = (closure[0] === '[' ? x >= lo : x > lo) && (closure[1] === ']' ? x <= hi : x < hi)
      return output(fmt(x) + ' ∈ ' + closure[0] + fmt(lo) + ', ' + fmt(hi) + closure[1], inside)
    },
    quiz('Does [0, 1) contain 1?', '[0, 1) 包含 1 吗？',
      [['no', 'No', '不包含'], ['yes', 'Yes', '包含'], ['depends', 'Only if 0 is included', '只有包含 0 时才包含']],
      'no', 'The closing parenthesis excludes the right endpoint.', '右侧圆括号表示不包含右端点。')
  ),
  activity(
    'matrix-multiplication', ['matrix-multiplication'], ['矩阵乘法'],
    L('Multiply rows by columns', '用行乘列'),
    L('Enter matrices as JSON arrays of rows, up to 20×20. The left column count must match the right row count.',
      '用 JSON 行数组输入矩阵，最多 20×20。左矩阵的列数必须等于右矩阵的行数。'),
    [text('a', 'Matrix A (JSON rows)', '矩阵 A（JSON 行数组）', '[[1,2,3],[4,5,6]]'), text('b', 'Matrix B (JSON rows)', '矩阵 B（JSON 行数组）', '[[7,8],[9,10],[11,12]]')],
    v => {
      const a = matrix(v, 'a'); const b = matrix(v, 'b')
      return output('A(' + a.length + '×' + a[0].length + ') B(' + b.length + '×' + b[0].length + ')', multiplyMatrices(a, b))
    },
    quiz('What is the shape of a 2×3 matrix times a 3×4 matrix?', '2×3 矩阵乘以 3×4 矩阵，结果的形状是什么？',
      [['twofour', '2×4', '2×4'], ['threethree', '3×3', '3×3'], ['fourtwo', '4×2', '4×2']],
      'twofour', 'The matching inner dimensions are summed; the outer dimensions remain.',
      '相同的内侧维度被求和消去，外侧维度保留下来。')
  ),
  activity(
    'tensor-product', ['tensor-product'], ['张量积'],
    L('Build the Kronecker blocks', '构造 Kronecker 分块'),
    L('Each A entry scales an entire B block. Both sets of indices remain; there is no contraction. Expansion is capped at 10000 entries.',
      'A 的每个元素乘以整个 B 分块。两组指标都保留，不进行缩并。展开结果最多包含 10000 个元素。'),
    [text('a', 'Matrix A (JSON rows)', '矩阵 A（JSON 行数组）', '[[1,2],[3,4]]'), text('b', 'Matrix B (JSON rows)', '矩阵 B（JSON 行数组）', '[[0,5],[6,7]]')],
    v => {
      const a = matrix(v, 'a'); const b = matrix(v, 'b')
      if (a.length * a[0].length * b.length * b[0].length > 10000) throw new Error('The expanded Kronecker product must have at most 10000 entries.')
      return output('A ⊗ B → (' + a.length * b.length + '×' + a[0].length * b[0].length + ')', kroneckerProduct(a, b))
    },
    quiz('What is the shape of (2×2) ⊗ (2×3)?', '(2×2) ⊗ (2×3) 的结果形状是什么？',
      [['four-six', '4×6', '4×6'], ['two-three', '2×3', '2×3'], ['scalar', 'A scalar', '一个标量']],
      'four-six', 'Multiply row counts and column counts separately: 2·2 by 2·3.',
      '分别将行数和列数相乘：2·2 行，2·3 列。')
  ),
  activity(
    'delta', ['delta', 'finite-change', 'kronecker-delta', 'dirac-delta'], ['delta', '有限变化', 'kronecker-delta', 'dirac-delta'],
    L('Distinguish changes and selectors', '区分变化量与选择器'),
    L('Δ measures finite change; δᵢⱼ selects matching integer indices. Neither is the Dirac delta distribution.',
      'Δ 表示有限变化，δᵢⱼ 用来选择相同的整数指标。它们都不是 Dirac delta 分布。'),
    [
      select('operation', 'Delta meaning', 'Delta 的含义', 'change', [['change', 'Finite change of f(x)=x²', 'f(x)=x² 的有限变化'], ['kronecker', 'Kronecker δᵢⱼ', 'Kronecker δᵢⱼ']]),
      only(number('oldX', 'Old x', '原来的 x', 2), v => v.operation === 'change'),
      only(number('newX', 'New x', '新的 x', 3), v => v.operation === 'change'),
      only(number('i', 'Index i', '指标 i', 2, { step: 1 }), v => v.operation === 'kronecker'),
      only(number('j', 'Index j', '指标 j', 3, { step: 1 }), v => v.operation === 'kronecker')
    ],
    v => {
      const op = choice(v, 'operation', ['change', 'kronecker'])
      if (op === 'kronecker') {
        const i = integer(v, 'i', -1e12, 1e12); const j = integer(v, 'j', -1e12, 1e12)
        return output('δ(' + i + ', ' + j + ')', kroneckerDelta(i, j))
      }
      const oldX = numeric(v, 'oldX'); const newX = numeric(v, 'newX')
      return output('f(x)=x²; ' + fmt(oldX) + ' → ' + fmt(newX), 'Δx = ' + fmt(newX - oldX) + ' ; Δf = ' + fmt(newX * newX - oldX * oldX))
    },
    quiz('For a smooth test function φ, what does ∫δ(x−a)φ(x) dx over the real line select?', '对光滑测试函数 φ，在整条实线上积分 ∫δ(x−a)φ(x) dx 会选出什么？',
      [['value', 'φ(a)', 'φ(a)'], ['one', 'Always 1', '总是 1'], ['equality', 'Whether x === a', '判断 x === a 是否成立']],
      'value', 'The Dirac distribution selects a function value through integration; it is not a finite equality spike.',
      'Dirac 分布通过积分选出函数值，并不是一个有限高度的相等性脉冲。')
  ),
  activity(
    'derivatives', ['derivatives'], ['导数'],
    L('Compare a numerical slope', '比较数值斜率'),
    L('A centered difference estimates f′(x) from two finite samples. The exact derivative below is known for these selected functions.',
      '中心差分用两个有限样本估计 f′(x)。下面所选函数的精确导数是已知的。'),
    [
      select('function', 'Function', '函数', 'square', [['square', 'x²', 'x²'], ['cubic', 'x³', 'x³'], ['sin', 'sin(x), radians', 'sin(x)，弧度']]),
      number('x', 'x', 'x', 2), number('h', 'Step h', '步长 h', 0.00001, { min: 1e-12, max: 1, step: 'any' })
    ],
    v => {
      const key = choice(v, 'function', ['square', 'cubic', 'sin']); const x = numeric(v, 'x')
      const h = numeric(v, 'h', 1e-12, 1); const f = functions[key]
      return output('d/dx ' + f.label + ' | x=' + fmt(x) + ', h=' + fmt(h),
        '≈ ' + fmt(derivative(f.f, x, h)) + ' ; f′(x) = ' + fmt(f.prime(x)))
    },
    quiz('A centered difference of |x| at zero gives 0. Does that prove a derivative exists there?', '|x| 在零点的中心差分为 0。这能证明该点存在导数吗？',
      [['no', 'No: left and right slopes disagree', '不能：左右斜率不同'], ['yes', 'Yes: a finite answer is proof', '能：有限结果就是证明'], ['always', 'Every continuous function is differentiable', '连续函数一定可导']],
      'no', 'Numerical samples do not prove a limit exists. |x| has slopes −1 and +1 at the two sides of zero.',
      '数值样本不能证明极限存在。|x| 在零点两侧的斜率分别为 −1 和 +1。')
  ),
  activity(
    'gradient-descent', ['gradients-and-gradient-descent'], ['梯度与梯度下降'],
    L('Take one full-batch gradient step', '执行一次全批量梯度更新'),
    L('For Qi(w)=½(w·xi−yi)², average all sample gradients at the same old weights, then update once. A larger positive learning rate can increase loss.',
      '对于 Qi(w)=½(w·xi−yi)²，在同一组旧权重上计算并平均所有样本梯度，再更新一次。较大的正学习率可能使损失增加。'),
    [
      text('weights', 'Old weights w (JSON array)', '旧权重 w（JSON 数组）', '[0,0]'),
      text('samples', 'Samples [{x:[…],y:…}] (JSON)', '样本 [{x:[…],y:…}]（JSON）', '[{"x":[1,0],"y":2},{"x":[0,1],"y":4}]'),
      number('eta', 'Learning rate η', '学习率 η', 0.5, { min: 0, max: 10 })
    ],
    v => {
      const weights = vector(v, 'weights', 20)
      const samples = json(v, 'samples')
      const eta = numeric(v, 'eta', 0, 10)
      const step = gradientDescentStep(weights, samples, eta)
      return output('w_new = w − (' + fmt(eta) + '/' + samples.length + ') Σ ∇Qᵢ(w)',
        '∇Q = ' + fmt(step.gradient) + ' ; w_new = ' + fmt(step.weights) + ' ; Q: ' + fmt(step.lossBefore) + ' → ' + fmt(step.lossAfter))
    },
    quiz('With old w=[0,0], average gradient [−1,−2] and η=0.5, what are the new weights?', '旧权重 w=[0,0]、平均梯度为 [−1,−2]、η=0.5 时，新权重是什么？',
      [['step', '[0.5, 1]', '[0.5, 1]'], ['sign', '[−0.5, −1]', '[−0.5, −1]'], ['twice', '[0.25, 0.5]', '[0.25, 0.5]']],
      'step', 'Subtract η times the average gradient from the same old vector. The gradient is already averaged; do not divide by n again.',
      '从同一个旧向量减去 η 乘以平均梯度。梯度已经取过平均，不要再次除以 n。')
  ),
  activity(
    'integrals', ['integrals', 'indefinite-integrals', 'definite-integrals'], ['积分', '不定积分', '定积分'],
    L('Accumulate or find a family', '求累积量或原函数族'),
    L('Definite mode uses bounded trapezoidal quadrature. Indefinite mode shows a known antiderivative family; it does not numerically discover a formula.',
      '定积分模式使用有界的梯形求积。不定积分模式展示已知的原函数族，不会通过数值运算自动发现公式。'),
    [
      select('mode', 'Integral type', '积分类型', 'definite', [['definite', 'Definite integral', '定积分'], ['indefinite', 'Indefinite integral', '不定积分']]),
      select('function', 'Integrand', '被积函数', 'square', [['square', 'x²', 'x²'], ['linear', '2x', '2x'], ['sin', 'sin(x), radians', 'sin(x)，弧度']]),
      only(number('a', 'Lower endpoint a', '下端点 a', 0), v => v.mode === 'definite'),
      only(number('b', 'Upper endpoint b', '上端点 b', 1), v => v.mode === 'definite'),
      only(number('n', 'Subdivisions (definite only)', '分段数（仅用于定积分）', 1000, { min: 1, max: 10000, step: 1 }), v => v.mode === 'definite'),
      only(number('C', 'Constant C (indefinite only)', '常数 C（仅用于不定积分）', 0), v => v.mode === 'indefinite')
    ],
    v => {
      const mode = choice(v, 'mode', ['definite', 'indefinite']); const key = choice(v, 'function', ['square', 'linear', 'sin'])
      const f = functions[key]
      if (mode === 'indefinite') {
        const C = numeric(v, 'C')
        return output('∫ ' + f.label + ' dx', f.family + ' + C ; C = ' + fmt(C))
      }
      const a = numeric(v, 'a'); const b = numeric(v, 'b'); const n = integer(v, 'n', 1, 10000)
      return output('∫[' + fmt(a) + ', ' + fmt(b) + '] ' + f.label + ' dx; n=' + n,
        '≈ ' + fmt(integrateTrapezoid(f.f, a, b, n)) + ' ; F(b)−F(a) = ' + fmt(f.integral(b) - f.integral(a)))
    },
    quiz('Why does ∫2x dx include +C?', '为什么 ∫2x dx 要包含 +C？',
      [['family', 'Every constant has derivative zero', '任意常数的导数都是零'], ['error', 'C is numerical integration error', 'C 是数值积分误差'], ['bound', 'C is always the upper bound', 'C 总是积分上界']],
      'family', 'All functions x²+C have the same derivative 2x, so the indefinite integral describes a family.',
      '所有 x²+C 的导数都是 2x，因此不定积分表示一个函数族。')
  ),
  activity(
    'lambertian', ['worked-graphics-expression'], ['图形学实例lambertian-反射'],
    L('Turn a beam into reflected radiance', '计算光束的反射辐亮度'),
    L('Input beam irradiance E⊥ in W/m², measured perpendicular to the beam. The helper normalizes both directions and applies the surface cosine once.',
      '输入在垂直于光束的平面上测得的辐照度 E⊥，单位为 W/m²。辅助函数会归一化两个方向，并将表面余弦因子计入一次。'),
    [
      number('reflectance', 'Reflectance R', '反射率 R', 0.5, { min: 0, max: 1 }),
      number('irradiance', 'Beam irradiance E⊥ (W/m²)', '光束辐照度 E⊥（W/m²）', 2 * Math.PI, { min: 0 }),
      text('normal', 'Surface normal (3D JSON)', '表面法线（三维 JSON）', '[0,0,1]'),
      text('light', 'Direction toward light (3D JSON)', '朝向光源的方向（三维 JSON）', '[0,1,1]')
    ],
    v => {
      const R = numeric(v, 'reflectance', 0, 1); const E = numeric(v, 'irradiance', 0)
      const normal = vector(v, 'normal', 3); const light = vector(v, 'light', 3)
      if (normal.length !== 3 || light.length !== 3) throw new Error('The normal and light direction each need exactly 3 components.')
      return output('Lₒ = (R/π) E⊥ max(0, n̂·ω̂ᵢ)',
        fmt(lambertianReflection(R, E, normal, light)) + ' W/(m² sr)')
    },
    quiz('If E already means surface irradiance after cosine weighting, how do you compute Lambertian outgoing radiance?', '若 E 已经是包含余弦权重的表面辐照度，如何计算 Lambertian 出射辐亮度？',
      [['once', 'Lₒ = (R/π) E', 'Lₒ = (R/π) E'], ['twice', 'Multiply by the cosine again', '再乘一次余弦'], ['omitpi', 'Lₒ = R E', 'Lₒ = R E']],
      'once', 'The cosine was included in surface irradiance. Applying it again would count it twice.',
      '表面辐照度已经包含余弦因子，再乘一次会重复计入。')
  ),
  activity(
    'set-builder', ['set-builder-notation'], [],
    L('Filter a finite set', '筛选有限集合'),
    L('Comprehension notation combines a source set, a condition and an expression. This activity enumerates at most 10000 integers.',
      '集合构造式结合来源集合、条件和表达式。本活动最多枚举 10000 个整数。'),
    [
      number('lower', 'Lower integer', '最小整数', -3, { min: -10000, max: 10000, step: 1 }),
      number('upper', 'Upper integer', '最大整数', 3, { min: -10000, max: 10000, step: 1 }),
      select('filter', 'Keep', '保留', 'even', [['even', 'Even integers', '偶数'], ['positive', 'Positive integers', '正整数'], ['all', 'All integers', '所有整数']]),
      select('map', 'Expression', '表达式', 'square', [['identity', 'x', 'x'], ['square', 'x²', 'x²']])
    ],
    v => {
      const [lo, hi] = bounds(v); const filter = choice(v, 'filter', ['even', 'positive', 'all']); const map = choice(v, 'map', ['identity', 'square'])
      const values = new Set()
      for (let x = lo; x <= hi; x++) {
        if (filter === 'all' || (filter === 'even' ? x % 2 === 0 : x > 0)) values.add(map === 'square' ? x * x : x)
      }
      const condition = filter === 'all' ? 'x ∈ ℤ' : filter === 'even' ? 'x ∈ 2ℤ' : 'x > 0'
      return output('{' + (map === 'square' ? 'x²' : 'x') + ' | ' + lo + ' ≤ x ≤ ' + hi + ', ' + condition + '}',
        '{' + [...values].sort((a, b) => a - b).map(fmt).join(', ') + '}')
    },
    quiz('What is {x² | x ∈ {−2, −1, 0, 1, 2}, x is even}?', '{x² | x ∈ {−2, −1, 0, 1, 2}，且 x 为偶数} 是什么？',
      [['zero-four', '{0, 4}', '{0, 4}'], ['all', '{0, 1, 4}', '{0, 1, 4}'], ['duplicates', '{4, 0, 4} with repeated elements', '保留重复元素的 {4, 0, 4}']],
      'zero-four', 'Keep −2, 0 and 2, square them, then remove duplicate values because the result is a set.',
      '先保留 −2、0 和 2，再平方，并按集合规则去掉重复值。')
  )
]
