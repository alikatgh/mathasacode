// Authored explanations only: local text, small worked examples, no remote assets.
// Topic aliases use the guide's rendered github-slugger IDs. A diagram belongs
// to the most specific useful topic, rather than repeating at its parent heading.
export const mathVisuals = {
  equality: {
    topics: ['equals-symbols', '等号'],
    en: {
      title: 'Define a value, then check a claim',
      source: 'flowchart LR\n A["k = 2, j = 3"] --> B["2kj = 2 × 2 × 3 = 12"]\n B --> C["Define x := 12"]\n C --> D["Claim x = 12: true"]',
      steps: ['Start with k equal to 2 and j equal to 3.', 'Evaluate 2kj as 2 × 2 × 3, which is 12.', 'The definition x := 12 gives x this value.', 'The equality x = 12 is a claim; checking it here gives true.'],
      takeaway: 'The symbol := introduces a definition. The symbol = states that two expressions have the same value.'
    },
    zh: {
      title: '先定义数值，再检验命题',
      source: 'flowchart LR\n A["k = 2，j = 3"] --> B["2kj = 2 × 2 × 3 = 12"]\n B --> C["定义 x := 12"]\n C --> D["命题 x = 12：真"]',
      steps: ['从 k 等于 2、j 等于 3 开始。', '将 2kj 计算为 2 × 2 × 3，结果为 12。', '定义 x := 12，把这个数值赋给 x。', '等式 x = 12 是一个命题；在这里检验的结果为真。'],
      takeaway: ':= 引入一个定义；= 表示两个表达式的值相同。'
    }
  },
  squareRoot: {
    topics: ['square-root-and-complex-numbers', '平方根与复数'],
    en: {
      title: 'A root is a number that squares back',
      source: 'flowchart TD\n A["Square back: r² = x"] --> B["x = 9"]\n B --> C["√9 = 3"]\n A --> D["x = −1"]\n D --> E["√−1 = i"]',
      steps: ['A square root r must satisfy r² = x.', 'For x = 9, both 3 and −3 square to 9, but √9 denotes the principal root, 3.', 'For x = −1, there is no real square root.', 'In the complex numbers, the principal square root of −1 is i, with i² = −1.'],
      takeaway: '√9 means the nonnegative root, 3. Complex numbers let us take square roots of negative real numbers.'
    },
    zh: {
      title: '平方后能还原原数的数',
      source: 'flowchart TD\n A["平方还原：r² = x"] --> B["x = 9"]\n B --> C["√9 = 3"]\n A --> D["x = −1"]\n D --> E["√−1 = i"]',
      steps: ['平方根 r 必须满足 r² = x。', '当 x = 9 时，3 和 −3 的平方都是 9，但 √9 表示主平方根 3。', '当 x = −1 时，不存在实数平方根。', '在复数中，−1 的主平方根是 i，并且 i² = −1。'],
      takeaway: '√9 表示非负的平方根 3；引入复数后，负实数也有平方根。'
    }
  },
  dot: {
    topics: ['dot-product', '点乘'],
    en: {
      title: 'Pair, multiply, add',
      source: 'flowchart LR\n A["a = [1,2], b = [3,4]"] --> B["Pair products: [3,8]"]\n B --> C["a · b = 3 + 8 = 11"]',
      steps: ['Take the vectors a = [1,2] and b = [3,4].', 'Multiply matching coordinates: 1 × 3 = 3 and 2 × 4 = 8.', 'Add the products to obtain the scalar dot product, 11.'],
      takeaway: 'A dot product reduces two equal-length vectors to one number: multiply matching coordinates, then sum.'
    },
    zh: {
      title: '对应相乘，再求和',
      source: 'flowchart LR\n A["a = [1,2]，b = [3,4]"] --> B["对应乘积：[3,8]"]\n B --> C["a · b = 3 + 8 = 11"]',
      steps: ['取向量 a = [1,2] 和 b = [3,4]。', '将对应坐标相乘：1 × 3 = 3，2 × 4 = 8。', '将乘积相加，得到标量点积 11。'],
      takeaway: '点积把两个维数相同的向量变成一个数：对应坐标相乘，再把乘积相加。'
    }
  },
  cross: {
    topics: ['cross-product', '叉乘'],
    en: {
      title: 'A perpendicular vector with an order',
      source: 'flowchart TD\n A["a = [0,1,0], b = [1,0,0]"] --> B["a × b = [0,0,−1]"]\n A --> C["b × a = [0,0,1]"]\n B --> D["Both perpendicular to a and b"]\n C --> D',
      sourceNarrow: 'flowchart TD\n A["a = [0,1,0]"] --> B["b = [1,0,0]"]\n B --> C["a × b = [0,0,−1]"]\n C --> D["b × a = [0,0,1]"]\n D --> E["Perpendicular to both inputs"]',
      steps: ['Start with a = [0,1,0] and b = [1,0,0].', 'Taking a × b gives [0,0,−1].', 'Reversing the order gives b × a = [0,0,1], the opposite direction.', 'Both results are perpendicular to each input vector.'],
      takeaway: 'The 3D cross product returns a vector. Swapping its inputs reverses the direction.'
    },
    zh: {
      title: '垂直方向取决于顺序',
      source: 'flowchart TD\n A["a = [0,1,0]，b = [1,0,0]"] --> B["a × b = [0,0,−1]"]\n A --> C["b × a = [0,0,1]"]\n B --> D["两者都垂直于 a 和 b"]\n C --> D',
      sourceNarrow: 'flowchart TD\n A["a = [0,1,0]"] --> B["b = [1,0,0]"]\n B --> C["a × b = [0,0,−1]"]\n C --> D["b × a = [0,0,1]"]\n D --> E["都垂直于两个输入"]',
      steps: ['从 a = [0,1,0] 和 b = [1,0,0] 开始。', '计算 a × b，得到 [0,0,−1]。', '交换顺序，b × a = [0,0,1]，方向相反。', '这两个结果都分别与两个输入向量垂直。'],
      takeaway: '三维叉积的结果是向量；交换两个输入的顺序，结果的方向就会反转。'
    }
  },
  sum: {
    topics: ['sigma', '西格玛sigma'],
    en: {
      title: 'Read Σ as a short loop',
      source: 'flowchart LR\n A["i = 1, 2, 3"] --> B["Evaluate 2i + 1 each time"]\n B --> C["Terms: 3, 5, 7"]\n C --> D["Σ = 3 + 5 + 7 = 15"]',
      steps: ['The lower and upper bounds let i take the values 1, 2 and 3, including both endpoints.', 'Evaluate the summand 2i + 1 separately for each value of i.', 'The resulting terms are 3, 5 and 7.', 'The sigma adds these terms to give 15.'],
      takeaway: 'Σ tells you what to add and which index values to visit. It is a loop that accumulates a total.'
    },
    zh: {
      title: '把 Σ 读成一个短循环',
      source: 'flowchart LR\n A["i = 1、2、3"] --> B["每次计算 2i + 1"]\n B --> C["各项：3、5、7"]\n C --> D["Σ = 3 + 5 + 7 = 15"]',
      steps: ['上下限让 i 依次取 1、2、3，包含两个端点。', '对每一个 i，分别计算求和项 2i + 1。', '得到的各项为 3、5、7。', '西格玛符号把这些项加起来，结果为 15。'],
      takeaway: 'Σ 指明要加什么，以及下标要遍历哪些值；它就像一个累加总和的循环。'
    }
  },
  average: {
    topics: ['averages', '平均值'],
    en: {
      title: 'One total, shared across four values',
      source: 'flowchart TD\n A["Values: 2, 4, 6, 8"] --> B["Total: 20"]\n A --> C["Count n: 4"]\n B --> D["Mean: 20 / 4 = 5"]\n C --> D',
      steps: ['The observations are 2, 4, 6 and 8.', 'Adding them gives a total of 20.', 'There are four observations, so n is 4.', 'Divide the total by the count: the arithmetic mean is 5.'],
      takeaway: 'The factor 1/n turns a sum into a mean. Count every observation, including repeated values; an empty list has no mean.'
    },
    zh: {
      title: '把总和平均分给四个数',
      source: 'flowchart TD\n A["数值：2、4、6、8"] --> B["总和：20"]\n A --> C["数量 n：4"]\n B --> D["平均值：20 / 4 = 5"]\n C --> D',
      steps: ['观测值是 2、4、6、8。', '把它们相加，总和为 20。', '共有四个观测值，所以 n 为 4。', '总和除以数量，算术平均值为 5。'],
      takeaway: '求和前的 1/n 把总和变成平均值；重复的观测值也要分别计数，空列表没有平均值。'
    }
  },
  product: {
    topics: ['capital-pi', '大写-pi'],
    en: {
      title: 'Π multiplies where Σ adds',
      source: 'flowchart LR\n A["i runs from 1 through 6"] --> B["1 × 2 × 3 × 4 × 5 × 6"]\n B --> C["Product: 720"]',
      steps: ['Let i visit every integer from 1 through 6.', 'Multiply the terms 1, 2, 3, 4, 5 and 6, starting from an accumulator of 1.', 'The product is 720.'],
      takeaway: 'Capital Π is a multiplication loop. Starting from 1 preserves the product; starting from 0 would erase it.'
    },
    zh: {
      title: 'Σ 做加法，Π 做乘法',
      source: 'flowchart LR\n A["i 从 1 遍历到 6"] --> B["1 × 2 × 3 × 4 × 5 × 6"]\n B --> C["乘积：720"]',
      steps: ['让 i 遍历从 1 到 6 的每个整数。', '将 1、2、3、4、5、6 连乘，累乘器从 1 开始。', '最后得到乘积 720。'],
      takeaway: '大写 Π 表示累乘循环；初始值是 1，如果从 0 开始，整个乘积都会变成 0。'
    }
  },
  norm: {
    topics: ['euclidean-norm', '欧几里得模euclidean-norm'],
    en: {
      title: 'A vector length from its coordinates',
      source: 'flowchart LR\n A["v = [0,4,−3]"] --> B["Square: [0,16,9]"]\n B --> C["Add: 0 + 16 + 9 = 25"]\n C --> D["Length: √25 = 5"]',
      steps: ['The vector has coordinates 0, 4 and −3.', 'Square each coordinate to get 0, 16 and 9.', 'Add the squares to get 25.', 'Take the square root: the Euclidean norm is 5.'],
      takeaway: '‖v‖ measures distance from the origin. Squaring means negative coordinates still contribute positive length.'
    },
    zh: {
      title: '用坐标算出向量长度',
      source: 'flowchart LR\n A["v = [0,4,−3]"] --> B["平方：[0,16,9]"]\n B --> C["相加：0 + 16 + 9 = 25"]\n C --> D["长度：√25 = 5"]',
      steps: ['向量的坐标为 0、4、−3。', '各坐标分别平方，得到 0、16、9。', '将平方相加，得到 25。', '再开平方，欧几里得模为 5。'],
      takeaway: '‖v‖ 是向量端点到原点的距离；坐标先平方，所以负坐标也会对长度产生正的贡献。'
    }
  },
  normalization: {
    topics: ['hat', '帽子'],
    en: {
      title: 'Keep the direction, make the length one',
      source: 'flowchart LR\n A["v = [0,4,−3]"] --> B["Length ‖v‖ = 5"]\n B --> C["Divide every coordinate by 5"]\n C --> D["Unit vector: [0,0.8,−0.6]"]\n D --> E["New length: √(0.64 + 0.36) = 1"]',
      steps: ['Start with the nonzero vector [0,4,−3].', 'Its Euclidean length is 5.', 'Divide every coordinate by that same length.', 'The normalized vector is [0,0.8,−0.6].', 'Its length is √(0.8² + (−0.6)²) = 1, with the original direction preserved.'],
      takeaway: 'A hat often means a unit vector: v̂ = v/‖v‖. The zero vector has no direction and cannot be normalized this way.'
    },
    zh: {
      title: '保留方向，把长度变成 1',
      source: 'flowchart LR\n A["v = [0,4,−3]"] --> B["长度 ‖v‖ = 5"]\n B --> C["每个坐标都除以 5"]\n C --> D["单位向量：[0,0.8,−0.6]"]\n D --> E["新长度：√(0.64 + 0.36) = 1"]',
      steps: ['从非零向量 [0,4,−3] 开始。', '它的欧几里得长度为 5。', '将每个坐标都除以这个长度。', '归一化后的向量为 [0,0.8,−0.6]。', '它的长度为 √(0.8² + (−0.6)²) = 1，方向与原向量相同。'],
      takeaway: '帽子符号常表示单位向量：v̂ = v/‖v‖。零向量没有方向，不能用这个方法归一化。'
    }
  },
  determinant: {
    topics: ['determinant', '行列式'],
    en: {
      title: 'Two diagonal products, one signed area scale',
      source: 'flowchart TD\n A["A = [[2,1],[1,3]]"] --> B["2 × 3 = 6"]\n A --> C["1 × 1 = 1"]\n B --> D["det A = 6 − 1 = 5"]\n C --> D\n D --> E["Area scale: 5"]',
      steps: ['Use the 2 × 2 matrix with rows [2,1] and [1,3].', 'Multiply the main diagonal: 2 × 3 = 6.', 'Multiply the other diagonal: 1 × 1 = 1.', 'Subtract the second product from the first: the determinant is 5.', 'This linear transformation multiplies areas by 5 and preserves orientation.'],
      takeaway: 'For a 2 × 2 matrix, det A = ad − bc. Its magnitude scales area; its sign records orientation, and zero means flattening.'
    },
    zh: {
      title: '两个对角线乘积，得到有向面积缩放率',
      source: 'flowchart TD\n A["A = [[2,1],[1,3]]"] --> B["2 × 3 = 6"]\n A --> C["1 × 1 = 1"]\n B --> D["det A = 6 − 1 = 5"]\n C --> D\n D --> E["面积倍率：5"]',
      steps: ['使用两行分别为 [2,1] 和 [1,3] 的 2 × 2 矩阵。', '主对角线相乘：2 × 3 = 6。', '另一条对角线相乘：1 × 1 = 1。', '前者减去后者，行列式为 5。', '这个线性变换使面积变为原来的 5 倍，并保持定向。'],
      takeaway: '二阶矩阵的行列式是 ad − bc；绝对值表示面积缩放率，正负号表示定向，零表示被压扁。'
    }
  },
  set: {
    topics: ['element', 'set-builder-notation', '属于'],
    en: {
      title: 'Build a set, then test membership',
      source: 'flowchart TD\n A["Candidates: 1, 2, 3, 4"] --> B["Keep the even values"]\n B --> C["A = {2,4}"]\n C --> D["2 ∈ A: true"]\n C --> E["3 ∉ A: true"]',
      steps: ['Begin with the candidate integers 1, 2, 3 and 4.', 'A set-building condition keeps only the even candidates.', 'The resulting set A is {2,4}.', 'The membership statement 2 ∈ A is true.', 'The non-membership statement 3 ∉ A is also true.'],
      takeaway: 'Set-builder notation is a filter. The symbols ∈ and ∉ ask whether a value is in the resulting set.'
    },
    zh: {
      title: '先构造集合，再判断是否属于它',
      source: 'flowchart TD\n A["候选值：1、2、3、4"] --> B["只保留偶数"]\n B --> C["A = {2,4}"]\n C --> D["2 ∈ A：真"]\n C --> E["3 ∉ A：真"]',
      steps: ['从候选整数 1、2、3、4 开始。', '集合的构造条件只保留其中的偶数。', '得到集合 A = {2,4}。', '属于命题 2 ∈ A 为真。', '不属于命题 3 ∉ A 也为真。'],
      takeaway: '集合描述法就像筛选器；∈ 和 ∉ 分别判断一个值是否属于筛选后的集合。'
    }
  },
  numberSets: {
    topics: ['common-number-sets', '常见数字集'],
    en: {
      title: 'Larger sets keep the earlier numbers',
      source: 'flowchart LR\n A["ℕ: 0, 1, 2, …"] --> B["ℤ adds negative integers"]\n B --> C["ℚ adds ratios, such as 1/2"]\n C --> D["ℝ adds irrationals, such as √2"]\n D --> E["ℂ adds numbers such as i"]',
      steps: ['Here the natural numbers ℕ use the convention that includes zero.', 'The integers ℤ include all natural numbers and also negative integers.', 'The rationals ℚ include all integers and ratios such as 1/2.', 'The reals ℝ also include irrational numbers such as √2.', 'The complex numbers ℂ include every real number and numbers such as i. Each arrow means inclusion, not a calculation.'],
      takeaway: 'ℕ ⊆ ℤ ⊆ ℚ ⊆ ℝ ⊆ ℂ: these categories overlap. Check the author’s convention for whether ℕ includes zero.'
    },
    zh: {
      title: '更大的数集保留前面的所有数',
      source: 'flowchart LR\n A["ℕ：0、1、2、…"] --> B["ℤ 还包含负整数"]\n B --> C["ℚ 还包含 1/2 等比值"]\n C --> D["ℝ 还包含 √2 等无理数"]\n D --> E["ℂ 还包含 i 等数"]',
      steps: ['这里采用自然数集 ℕ 包含零的约定。', '整数集 ℤ 包含所有自然数，还包含负整数。', '有理数集 ℚ 包含所有整数，以及 1/2 等比值。', '实数集 ℝ 还包含 √2 等无理数。', '复数集 ℂ 包含所有实数，以及 i 等数。每个箭头表示包含关系，不是计算。'],
      takeaway: 'ℕ ⊆ ℤ ⊆ ℚ ⊆ ℝ ⊆ ℂ，这些分类相互包含；ℕ 是否包含零，要看作者采用的约定。'
    }
  },
  function: {
    topics: ['function-notation', '函数符号'],
    en: {
      title: 'Read the arrow as an input rule',
      source: 'flowchart LR\n A["Input: −3 ∈ ℝ"] --> B["Rule f: x ↦ x²"]\n B --> C["Output: f(−3) = 9 ∈ ℝ"]',
      steps: ['Choose the real input x = −3.', 'Apply the rule f: x ↦ x², meaning square the input.', 'The output f(−3) is 9, another real number.'],
      takeaway: 'x ↦ x² gives the rule for individual inputs. ℝ → ℝ names the domain and codomain; it does not say every real output is reached.'
    },
    zh: {
      title: '把箭头读成处理输入的规则',
      source: 'flowchart LR\n A["输入：−3 ∈ ℝ"] --> B["规则 f：x ↦ x²"]\n B --> C["输出：f(−3) = 9 ∈ ℝ"]',
      steps: ['选择实数输入 x = −3。', '应用规则 f：x ↦ x²，即把输入平方。', '输出 f(−3) 为 9，也是实数。'],
      takeaway: 'x ↦ x² 说明每个输入如何变换；ℝ → ℝ 指明定义域与陪域，并不保证每个实数都是实际输出。'
    }
  },
  piecewise: {
    topics: ['piecewise-function', '分段函数'],
    en: {
      title: 'Pick one branch before calculating',
      source: 'flowchart TD\n A["Input x"] --> B["x ≥ 1?"]\n B --> C["Yes: (x² − x)/x"]\n B --> D["No: return 0"]\n C --> E["x = 2 gives 1"]\n D --> F["x = 0 gives 0"]',
      sourceNarrow: 'flowchart TD\n A["x ≥ 1?"] --> B["Yes: x − 1"]\n A --> C["No: 0"]\n B --> D["x = 2 → 1"]\n C --> E["x = 0 → 0"]',
      steps: ['Start with the input x.', 'Test the condition x ≥ 1.', 'If it is true, evaluate (x² − x)/x, equivalently x − 1 in this branch; for x = 2 the result is 1.', 'If it is false, return 0; for x = 0 the result is 0 without evaluating a division.'],
      takeaway: 'A piecewise function is an if/else. Evaluate the chosen formula only after its condition has selected it.'
    },
    zh: {
      title: '先选分支，再代入计算',
      source: 'flowchart TD\n A["输入 x"] --> B["x ≥ 1？"]\n B --> C["是：(x² − x)/x"]\n B --> D["否：返回 0"]\n C --> E["x = 2 时得到 1"]\n D --> F["x = 0 时得到 0"]',
      sourceNarrow: 'flowchart TD\n A["x ≥ 1？"] --> B["是：x − 1"]\n A --> C["否：0"]\n B --> D["x = 2 → 1"]\n C --> E["x = 0 → 0"]',
      steps: ['从输入 x 开始。', '判断条件 x ≥ 1 是否成立。', '若成立，则计算 (x² − x)/x，在这个分支中等价于 x − 1；x = 2 时结果为 1。', '若不成立，则返回 0；x = 0 时直接得到 0，不会执行除法。'],
      takeaway: '分段函数就像 if/else；先根据条件选择分支，再计算该分支的公式。'
    }
  },
  implication: {
    topics: ['material-implication', '实质蕴含material-implication'],
    en: {
      title: 'What would break A ⇒ B?',
      source: 'flowchart TD\n A["Claim: A ⇒ B"] --> B["A false: true"]\n A --> C["A true"]\n C --> D["B true: true"]\n C --> E["B false: false"]',
      sourceNarrow: 'flowchart TD\n A["A ⇒ B; T=true, F=false"] --> B["A=F: T"]\n A --> C["A=T"]\n C --> D["B=T: T"]\n C --> E["B=F: F"]',
      steps: ['Consider the implication A ⇒ B.', 'When A is false, the implication puts no restriction on B and is true.', 'When A is true, check B.', 'If B is also true, the implication holds.', 'If B is false while A is true, the implication fails.'],
      takeaway: 'A ⇒ B rules out just one case: A true and B false. It does not automatically establish the reverse implication.'
    },
    zh: {
      title: '什么情况会推翻 A ⇒ B？',
      source: 'flowchart TD\n A["命题：A ⇒ B"] --> B["A 假：真"]\n A --> C["A 真"]\n C --> D["B 真：真"]\n C --> E["B 假：假"]',
      sourceNarrow: 'flowchart TD\n A["A ⇒ B；T 真，F 假"] --> B["A=F: T"]\n A --> C["A=T"]\n C --> D["B=T: T"]\n C --> E["B=F: F"]',
      steps: ['考虑蕴含命题 A ⇒ B。', '当 A 为假时，命题不对 B 作限制，蕴含命题为真。', '当 A 为真时，需要检查 B。', '若 B 也为真，蕴含命题成立。', '若 A 为真而 B 为假，蕴含命题不成立。'],
      takeaway: 'A ⇒ B 只排除一种情况：A 为真而 B 为假；它并不自动说明反向的蕴含也成立。'
    }
  },
  logic: {
    topics: ['conjunction--disjunction', '与conjunction--或disjunction'],
    en: {
      title: 'The same inputs, three logical operations',
      source: 'flowchart TD\n A["A = true; B = ¬A = false"] --> B["AND: false"]\n A --> C["OR: true"]',
      steps: ['Use A = true and B = false.', 'AND, written A ∧ B, is false because both inputs must be true.', 'OR, written A ∨ B, is true because at least one input is true.', 'NOT, written ¬A, flips A from true to false.'],
      takeaway: '∧ needs both, ∨ needs at least one, and ¬ flips truth. Mathematical OR includes the case where both inputs are true.'
    },
    zh: {
      title: '相同输入，三种逻辑运算',
      source: 'flowchart TD\n A["A = 真；B = ¬A = 假"] --> B["与：假"]\n A --> C["或：真"]',
      steps: ['令 A 为真，B 为假。', '与运算 A ∧ B 为假，因为它要求两个输入都为真。', '或运算 A ∨ B 为真，因为至少一个输入为真。', '非运算 ¬A 把 A 的真值从真变为假。'],
      takeaway: '∧ 要求两者都为真，∨ 要求至少一个为真，¬ 则反转真值；数学中的或也包含两者都为真的情况。'
    }
  },
  interval: {
    topics: ['intervals', '区间intervals'],
    en: {
      title: 'Two endpoint tests describe one interval',
      source: 'flowchart TD\n A["Interval [0,1)"] --> B["Include 0: x ≥ 0"]\n A --> C["Exclude 1: x < 1"]\n B --> D["Both: 0 ≤ x < 1"]\n C --> D',
      sourceNarrow: 'flowchart TD\n A["[0,1)"] --> B["0 included"]\n A --> C["1 excluded"]\n B --> D["0 ≤ x < 1"]\n C --> D',
      steps: ['Read the interval [0,1).', 'The square bracket includes the left endpoint, so x must be at least 0.', 'The parenthesis excludes the right endpoint, so x must be less than 1.', 'Both conditions hold together: 0 is included, 1 is excluded, and every real value between them is included.'],
      takeaway: 'A square bracket includes its endpoint; a parenthesis excludes it. An interval contains real values between the endpoints, not just integers.'
    },
    zh: {
      title: '两个端点条件描述一个区间',
      source: 'flowchart TD\n A["区间 [0,1)"] --> B["含 0：x ≥ 0"]\n A --> C["不含 1：x < 1"]\n B --> D["同时：0 ≤ x < 1"]\n C --> D',
      sourceNarrow: 'flowchart TD\n A["[0,1)"] --> B["包含 0"]\n A --> C["不包含 1"]\n B --> D["0 ≤ x < 1"]\n C --> D',
      steps: ['读区间 [0,1)。', '左侧方括号包含左端点，因此 x 至少为 0。', '右侧圆括号不包含右端点，因此 x 必须小于 1。', '两个条件同时成立：包含 0、不包含 1，也包含两者之间的每个实数。'],
      takeaway: '方括号包含端点，圆括号排除端点；区间包含端点之间的实数，而不只是整数。'
    }
  },
  matrix: {
    topics: ['matrix-multiplication', '矩阵乘法'],
    en: {
      title: 'Each output entry is a row–column dot product',
      source: 'flowchart TD\n A["A = [[1,2],[3,4]], v = [5,6]"] --> B["5 + 12 = 17"]\n A --> C["15 + 24 = 39"]\n B --> D["Av = [17,39]"]\n C --> D',
      sourceNarrow: 'flowchart TD\n A["A = [[1,2],[3,4]]"] --> B["Column v = [5,6]"]\n B --> C["Row 1: 5 + 12 = 17"]\n C --> D["Row 2: 15 + 24 = 39"]\n D --> E["Av = [17,39]"]',
      steps: ['Take A with rows [1,2] and [3,4], and treat v = [5,6] as a column vector.', 'Dot the first row with the column: 1 × 5 + 2 × 6 = 17.', 'Dot the second row with the same column: 3 × 5 + 4 × 6 = 39.', 'Put these values in their row order to obtain Av = [17,39].'],
      takeaway: 'Matrix multiplication pairs rows with columns. The inner dimensions must match; the remaining dimensions determine the output shape.'
    },
    zh: {
      title: '每个输出元素都是行与列的点积',
      source: 'flowchart TD\n A["A = [[1,2],[3,4]]，v = [5,6]"] --> B["5 + 12 = 17"]\n A --> C["15 + 24 = 39"]\n B --> D["Av = [17,39]"]\n C --> D',
      sourceNarrow: 'flowchart TD\n A["A = [[1,2],[3,4]]"] --> B["列向量 v = [5,6]"]\n B --> C["第 1 行：5 + 12 = 17"]\n C --> D["第 2 行：15 + 24 = 39"]\n D --> E["Av = [17,39]"]',
      steps: ['A 的两行是 [1,2] 和 [3,4]，将 v = [5,6] 看作列向量。', '第一行与该列做点积：1 × 5 + 2 × 6 = 17。', '第二行与同一列做点积：3 × 5 + 4 × 6 = 39。', '按行的顺序放置结果，得到 Av = [17,39]。'],
      takeaway: '矩阵乘法把左侧的行与右侧的列配对；内侧维度必须相同，外侧维度决定结果的形状。'
    }
  },
  tensor: {
    topics: ['tensor-product', '张量积'],
    en: {
      title: 'Keep every pair of products',
      source: 'flowchart TD\n A["a = [1,2], b = [3,4,5]"] --> B["1 × b = [3,4,5]"]\n A --> C["2 × b = [6,8,10]"]\n B --> D["Outer product: [[3,4,5],[6,8,10]]"]\n C --> D',
      sourceNarrow: 'flowchart TD\n A["a = [1,2], b = [3,4,5]"] --> B["1 × b = [3,4,5]"]\n B --> C["2 × b = [6,8,10]"]\n C --> D["[[3,4,5],[6,8,10]]"]',
      steps: ['Use a column vector a = [1,2] and a row vector b = [3,4,5].', 'Multiply the whole row b by the first coordinate of a to form [3,4,5].', 'Multiply b by the second coordinate to form [6,8,10].', 'Stack these rows to obtain a 2 × 3 outer-product matrix, a coordinate representation of this tensor product.'],
      takeaway: 'This tensor product keeps every coordinate pair. A dot product instead sums matching pairs into one scalar.'
    },
    zh: {
      title: '保留每一对坐标的乘积',
      source: 'flowchart TD\n A["a = [1,2]，b = [3,4,5]"] --> B["1 × b = [3,4,5]"]\n A --> C["2 × b = [6,8,10]"]\n B --> D["外积：[[3,4,5],[6,8,10]]"]\n C --> D',
      sourceNarrow: 'flowchart TD\n A["a = [1,2]，b = [3,4,5]"] --> B["1 × b = [3,4,5]"]\n B --> C["2 × b = [6,8,10]"]\n C --> D["[[3,4,5],[6,8,10]]"]',
      steps: ['使用列向量 a = [1,2] 和行向量 b = [3,4,5]。', '用 a 的第一个坐标乘整行 b，得到 [3,4,5]。', '用第二个坐标乘 b，得到 [6,8,10]。', '将这两行叠放，得到 2 × 3 的外积矩阵，它是这个张量积的一种坐标表示。'],
      takeaway: '这个张量积保留每一对坐标的乘积；点积则把对应坐标的乘积相加，得到一个标量。'
    }
  },
  derivative: {
    topics: ['derivatives', '导数'],
    en: {
      title: 'Chain rule: multiply the local rates',
      source: 'flowchart TD\n A["At x = 1"] --> B["u = 3x = 3"]\n B --> C["y = u² = 9"]\n A --> D["du/dx = 3"]\n B --> E["dy/du = 6"]\n D --> F["dy/dx = 6 × 3 = 18"]\n E --> F',
      sourceNarrow: 'flowchart TD\n A["x = 1; u = 3x = 3"] --> B["y = u² = 9"]\n B --> C["Inner rate: du/dx = 3"]\n C --> D["Outer rate: dy/du = 2u = 6"]\n D --> E["dy/dx = 6 × 3 = 18"]',
      steps: ['Evaluate the composition y = (3x)² at x = 1.', 'The inner function u = 3x gives u = 3, then the outer function y = u² gives y = 9.', 'The inner local rate is du/dx = 3.', 'The outer local rate at u = 3 is dy/du = 2u = 6.', 'The chain rule multiplies these rates: dy/dx = 6 × 3 = 18.'],
      takeaway: 'A derivative is a local rate of change, not the function value. For a composition, multiply the outer rate by the inner rate.'
    },
    zh: {
      title: '链式法则：把局部变化率相乘',
      source: 'flowchart TD\n A["在 x = 1 处"] --> B["u = 3x = 3"]\n B --> C["y = u² = 9"]\n A --> D["du/dx = 3"]\n B --> E["dy/du = 6"]\n D --> F["dy/dx = 6 × 3 = 18"]\n E --> F',
      sourceNarrow: 'flowchart TD\n A["x = 1；u = 3x = 3"] --> B["y = u² = 9"]\n B --> C["内层：du/dx = 3"]\n C --> D["外层：dy/du = 2u = 6"]\n D --> E["dy/dx = 6 × 3 = 18"]',
      steps: ['在 x = 1 处计算复合函数 y = (3x)²。', '内层函数 u = 3x 得到 u = 3，再由外层函数 y = u² 得到 y = 9。', '内层的局部变化率为 du/dx = 3。', '在 u = 3 处，外层的局部变化率为 dy/du = 2u = 6。', '链式法则把两个变化率相乘：dy/dx = 6 × 3 = 18。'],
      takeaway: '导数是局部变化率，不是函数值；对复合函数求导，要把外层变化率与内层变化率相乘。'
    }
  },
  gradient: {
    topics: ['gradients-and-gradient-descent', '梯度与梯度下降'],
    en: {
      title: 'Average the sample gradients, then take one step',
      source: 'flowchart TD\n A["Old w = [0,0]"] --> B["∇Q₁ = [−2,0]"]\n A --> C["∇Q₂ = [0,−4]"]\n B --> D["Mean ∇Q = [−1,−2]"]\n C --> D\n D --> E["Subtract 0.5 × ∇Q"]\n E --> F["New w = [0.5,1]"]',
      sourceNarrow: 'flowchart TD\n A["Old w = [0,0]"] --> B["∇Q₁ = [−2,0]"]\n B --> C["∇Q₂ = [0,−4]"]\n C --> D["Mean ∇Q = [−1,−2]"]\n D --> E["Subtract 0.5 × ∇Q"]\n E --> F["New w = [0.5,1]"]',
      steps: ['Use old weights [0,0], sample features [1,0] with target 2, and [0,1] with target 4; each loss is half the squared residual.', 'At the same old weights, the sample gradients are [−2,0] and [0,−4].', 'Add the sample gradients and divide by two to get [−1,−2].', 'Multiply the mean gradient by the learning rate 0.5 and subtract it from the old weights.', 'The new weights are [0.5,1]; every coordinate uses the same old weights.'],
      takeaway: 'Mean loss is (2 + 8)/2 = 5; the loss of the mean residual is 4.5, a different quantity. Average the sample gradients at the old weights, then subtract η times that average.'
    },
    zh: {
      title: '先平均样本梯度，再更新一步',
      source: 'flowchart TD\n A["旧 w = [0,0]"] --> B["∇Q₁ = [−2,0]"]\n A --> C["∇Q₂ = [0,−4]"]\n B --> D["平均 ∇Q = [−1,−2]"]\n C --> D\n D --> E["减去 0.5 × ∇Q"]\n E --> F["新 w = [0.5,1]"]',
      sourceNarrow: 'flowchart TD\n A["旧 w = [0,0]"] --> B["∇Q₁ = [−2,0]"]\n B --> C["∇Q₂ = [0,−4]"]\n C --> D["平均 ∇Q = [−1,−2]"]\n D --> E["减去 0.5 × ∇Q"]\n E --> F["新 w = [0.5,1]"]',
      steps: ['使用旧权重 [0,0]；样本特征 [1,0] 的目标值为 2，[0,1] 的目标值为 4；每个损失是残差平方的一半。', '在同一组旧权重处，两个样本的梯度分别为 [−2,0] 和 [0,−4]。', '将两个样本梯度相加再除以 2，得到 [−1,−2]。', '把平均梯度乘以学习率 0.5，再从旧权重中减去。', '新权重为 [0.5,1]；所有坐标都根据同一组旧权重更新。'],
      takeaway: '损失的平均值是 (2 + 8)/2 = 5，而平均残差的损失为 4.5，两者不同。先在旧权重处平均样本梯度，再减去 η 乘以这个平均值。'
    }
  },
  integral: {
    topics: ['integrals', '积分'],
    en: {
      title: 'Accumulation from an antiderivative',
      source: 'flowchart TD\n A["Integrate x² from 0 to 1"] --> B["F(x) = x³/3"]\n B --> C["F(1) = 1/3"]\n B --> D["F(0) = 0"]\n C --> E["F(1) − F(0) = 1/3"]\n D --> E',
      steps: ['Find the definite integral of x² from 0 to 1.', 'An antiderivative is F(x) = x³/3, because its derivative is x².', 'Evaluate the upper endpoint: F(1) = 1/3.', 'Evaluate the lower endpoint: F(0) = 0.', 'Subtract lower from upper to get 1/3. An added constant in F would cancel.'],
      takeaway: 'A definite integral is signed accumulation. An antiderivative turns it into upper-endpoint value minus lower-endpoint value.'
    },
    zh: {
      title: '用原函数算出累积量',
      source: 'flowchart TD\n A["对 x² 从 0 积分到 1"] --> B["F(x) = x³/3"]\n B --> C["F(1) = 1/3"]\n B --> D["F(0) = 0"]\n C --> E["F(1) − F(0) = 1/3"]\n D --> E',
      steps: ['求 x² 在 0 到 1 上的定积分。', '一个原函数是 F(x) = x³/3，因为它的导数为 x²。', '代入上限，F(1) = 1/3。', '代入下限，F(0) = 0。', '上限的值减去下限的值，得到 1/3；原函数中增加的常数会在相减时抵消。'],
      takeaway: '定积分表示带符号的累积量；找到原函数后，用上限处的值减去下限处的值。'
    }
  },
  logarithm: {
    topics: ['powers-and-logarithms', '幂与对数'],
    en: {
      title: 'A logarithm recovers the exponent',
      source: 'flowchart LR\n A["Power: 2³ = 8"] --> B["Which exponent takes 2 to 8?"]\n B --> C["Logarithm: log₂ 8 = 3"]',
      steps: ['Raise the base 2 to the exponent 3 to obtain 8.', 'Reverse the question: which exponent of 2 gives 8?', 'The answer is 3, written log₂ 8 = 3.'],
      takeaway: 'A power produces a value; a logarithm finds the exponent. For real logᵦ x, require b > 0, b ≠ 1 and x > 0.'
    },
    zh: {
      title: '对数找回指数',
      source: 'flowchart LR\n A["幂：2³ = 8"] --> B["2 的几次方等于 8？"]\n B --> C["对数：log₂ 8 = 3"]',
      steps: ['把底数 2 提高到指数 3，得到 8。', '反过来问：2 的几次方等于 8？', '答案是 3，写成 log₂ 8 = 3。'],
      takeaway: '乘幂算出数值，对数找回指数；实数范围内的 logᵦ x 要求 b > 0、b ≠ 1 且 x > 0。'
    }
  },
  trigonometry: {
    topics: ['trigonometry', '三角函数'],
    en: {
      title: 'Convert degrees before calling sin or cos',
      source: 'flowchart TD\n A["Angle: 30°"] --> B["Radians: 30 × π/180 = π/6"]\n B --> C["sin = 1/2"]\n B --> D["cos = √3/2"]',
      steps: ['Start with an angle of 30 degrees.', 'Multiply by π/180 to obtain π/6 radians.', 'The sine is exactly 1/2, or 0.5.', 'The cosine is √3/2, approximately 0.866025.'],
      takeaway: 'Standard sin and cos functions take radians. On the unit circle, cosine is the horizontal coordinate and sine is the vertical coordinate.'
    },
    zh: {
      title: '调用 sin 或 cos 前，先换成弧度',
      source: 'flowchart TD\n A["角度：30°"] --> B["弧度：30 × π/180 = π/6"]\n B --> C["sin = 1/2"]\n B --> D["cos = √3/2"]',
      steps: ['从 30 度的角开始。', '乘以 π/180，得到 π/6 弧度。', '正弦精确等于 1/2，即 0.5。', '余弦等于 √3/2，近似为 0.866025。'],
      takeaway: '标准库中的 sin 和 cos 接收弧度；在单位圆上，余弦是横坐标，正弦是纵坐标。'
    }
  },
  modulo: {
    topics: ['modular-arithmetic', '模运算'],
    en: {
      title: 'A negative number can have a positive residue',
      source: 'flowchart LR\n A["a = −8, modulus m = 5"] --> B["Choose q = −2: q × m = −10"]\n B --> C["Remainder: −8 − (−10) = 2"]\n C --> D["Valid range: 0 ≤ 2 < 5"]',
      steps: ['Use the integer −8 and positive modulus 5.', 'Choose the integer quotient −2, giving a multiple of −10.', 'Subtract that multiple: −8 − (−10) = 2.', 'The result is in the required range from 0 up to, but not including, 5. Thus −8 is congruent to 2 modulo 5.'],
      takeaway: 'Modulo wraps integers into a fixed range. Some languages give negative % remainders, so normalize when you need 0 ≤ r < m.'
    },
    zh: {
      title: '负数也可以有非负的模余数',
      source: 'flowchart LR\n A["a = −8，模数 m = 5"] --> B["取 q = −2：q × m = −10"]\n B --> C["余数：−8 − (−10) = 2"]\n C --> D["符合范围：0 ≤ 2 < 5"]',
      steps: ['使用整数 −8 和正模数 5。', '取整数商 −2，得到 5 的倍数 −10。', '减去这个倍数：−8 − (−10) = 2。', '结果位于包含 0、不包含 5 的范围内，因此 −8 与 2 模 5 同余。'],
      takeaway: '模运算把整数绕回固定范围；有些语言的 % 会产生负余数，若需要 0 ≤ r < m，就要将结果规范化。'
    }
  },
  combinations: {
    topics: ['factorials-and-combinations', '阶乘与组合'],
    en: {
      title: 'Count orders, then remove repeated groups',
      source: 'flowchart LR\n A["Choose 2 distinct objects from 5"] --> B["First: 5 choices; second: 4"]\n B --> C["Ordered pairs: 5 × 4 = 20"]\n C --> D["Unordered groups: 20 / 2! = 10"]',
      sourceNarrow: 'flowchart TD\n A["Choose 2 of 5; ignore order"] --> B["5 × 4 = 20 orders"]\n B --> C["Each pair has 2 orders"]\n C --> D["20 / 2! = 10 groups"]',
      steps: ['Choose two distinct objects from a collection of five.', 'There are five choices for the first object and four for the second.', 'This gives twenty ordered pairs.', 'Each unordered pair occurs twice, once in each order. Divide by 2! = 2 to obtain ten combinations.'],
      takeaway: 'A combination ignores order: choosing A then B is the same group as B then A. Factorials account for the repeated orderings.'
    },
    zh: {
      title: '先数顺序，再去掉重复的分组',
      source: 'flowchart LR\n A["从 5 个物体中选 2 个不同的"] --> B["第一次有 5 种，第二次有 4 种"]\n B --> C["有序对：5 × 4 = 20"]\n C --> D["无序组合：20 / 2! = 10"]',
      sourceNarrow: 'flowchart TD\n A["从 5 个中选 2 个，不计顺序"] --> B["5 × 4 = 20 种顺序"]\n B --> C["每一对有 2 种顺序"]\n C --> D["20 / 2! = 10 个组合"]',
      steps: ['从五个物体中选择两个不同的物体。', '第一个物体有五种选法，第二个有四种。', '这样得到二十个有序对。', '每个无序对都因两种顺序被数了两次，除以 2! = 2，得到十个组合。'],
      takeaway: '组合不考虑顺序：先选 A 再选 B，与先选 B 再选 A 是同一组；阶乘用来消除重复计算的顺序。'
    }
  },
  probability: {
    topics: ['probability', '概率'],
    en: {
      title: 'Count an event inside a fair sample space',
      source: 'flowchart LR\n A["Fair die: {1,2,3,4,5,6}"] --> B["Even event: {2,4,6}"]\n B --> C["3 favorable outcomes out of 6"]\n C --> D["P(even) = 3/6 = 0.5"]',
      steps: ['A fair die has six equally likely outcomes: 1 through 6.', 'The even event contains 2, 4 and 6.', 'There are three favorable outcomes among the six possible outcomes.', 'Divide to obtain a probability of 0.5.'],
      takeaway: 'Favorable count divided by total count works for equally likely outcomes. Otherwise, add the assigned probabilities of the event’s outcomes.'
    },
    zh: {
      title: '在等可能的样本空间中数事件',
      source: 'flowchart LR\n A["公平骰子：{1,2,3,4,5,6}"] --> B["偶数事件：{2,4,6}"]\n B --> C["6 个结果中有 3 个符合"]\n C --> D["P(偶数) = 3/6 = 0.5"]',
      steps: ['公平骰子有六个等可能的结果，即 1 到 6。', '偶数事件包含 2、4、6。', '六个可能结果中有三个符合条件。', '相除得到概率 0.5。'],
      takeaway: '只有结果等可能时，才能用符合条件的数量除以总数；否则要把事件中各结果的概率相加。'
    }
  },
  expectation: {
    topics: ['expected-value', '期望值'],
    en: {
      title: 'Weight each reward by its probability',
      source: 'flowchart TD\n A["Rewards: 0 with 0.75; 10 with 0.25"] --> B["0 × 0.75 = 0"]\n A --> C["10 × 0.25 = 2.5"]\n B --> D["E[X] = 0 + 2.5 = 2.5"]\n C --> D',
      sourceNarrow: 'flowchart TD\n A["Rewards: 0 or 10"] --> B["0 × 0.75 = 0"]\n B --> C["10 × 0.25 = 2.5"]\n C --> D["Add: E[X] = 2.5"]',
      steps: ['The reward is 0 with probability 0.75 or 10 with probability 0.25; the probabilities add to 1.', 'Weight the zero reward by its probability to get 0.', 'Weight the reward 10 by its probability to get 2.5.', 'Add the weighted contributions: the expected value is 2.5.'],
      takeaway: 'Expectation is a probability-weighted mean. It need not be a possible single outcome: this reward is always 0 or 10, never 2.5.'
    },
    zh: {
      title: '用概率给每个奖励加权',
      source: 'flowchart TD\n A["奖励：0 的概率为 0.75；10 为 0.25"] --> B["0 × 0.75 = 0"]\n A --> C["10 × 0.25 = 2.5"]\n B --> D["E[X] = 0 + 2.5 = 2.5"]\n C --> D',
      sourceNarrow: 'flowchart TD\n A["奖励：0 或 10"] --> B["0 × 0.75 = 0"]\n B --> C["10 × 0.25 = 2.5"]\n C --> D["相加：E[X] = 2.5"]',
      steps: ['奖励为 0 的概率是 0.75，为 10 的概率是 0.25；概率之和为 1。', '零奖励乘以其概率，贡献为 0。', '奖励 10 乘以其概率，贡献为 2.5。', '将加权贡献相加，期望值为 2.5。'],
      takeaway: '期望值是按概率加权的平均值，不一定是某次可能的结果；这里单次奖励只能是 0 或 10，不会是 2.5。'
    }
  },
  variance: {
    topics: ['variance-and-standard-deviation', '方差与标准差'],
    en: {
      title: 'Spread is the mean squared distance from the mean',
      source: 'flowchart LR\n A["Population: [2,4,6,8]"] --> B["Mean μ = 5"]\n B --> C["Squared deviations: [9,1,1,9]"]\n C --> D["Population variance: 20/4 = 5"]\n D --> E["Standard deviation: √5 ≈ 2.236"]',
      steps: ['Treat [2,4,6,8] as the complete population.', 'The population mean is 5.', 'Subtract 5 from each observation and square: the deviations squared are 9, 1, 1 and 9.', 'Their sum is 20; divide by the population size 4 to obtain variance 5.', 'The standard deviation is the square root of the variance, approximately 2.236.'],
      takeaway: 'Population variance divides by n. Standard deviation returns to the original units; estimating variance from an IID sample usually uses n − 1 instead.'
    },
    zh: {
      title: '离均值有多远：先平方，再平均',
      source: 'flowchart LR\n A["总体：[2,4,6,8]"] --> B["均值 μ = 5"]\n B --> C["离差平方：[9,1,1,9]"]\n C --> D["总体方差：20/4 = 5"]\n D --> E["标准差：√5 ≈ 2.236"]',
      steps: ['把 [2,4,6,8] 当作完整的总体。', '总体均值为 5。', '每个观测值减去 5 再平方，得到 9、1、1、9。', '离差平方和为 20，除以总体大小 4，方差为 5。', '标准差是方差的平方根，约为 2.236。'],
      takeaway: '总体方差除以 n，标准差恢复为原来的单位；用独立同分布样本估计总体方差时，通常改用 n − 1 作分母。'
    }
  },
  bayes: {
    topics: ['conditional-probability-and-bayes', '条件概率与贝叶斯定理'],
    en: {
      title: 'Among all signals, how many are true?',
      source: 'flowchart TD\n A["Model per 10,000 cases"] --> B["Target: 100"]\n A --> C["No target: 9,900"]\n B --> D["100 × 0.90 = 90"]\n C --> E["9,900 × 0.05 = 495"]\n D --> F["P(target | signal) = 90/585 ≈ 15.38%"]\n E --> F',
      sourceNarrow: 'flowchart TD\n A["10,000 cases: 100 targets"] --> B["9,900 without a target"]\n B --> C["True signals: 100 × 0.9 = 90"]\n C --> D["False signals: 9,900 × 0.05 = 495"]\n D --> E["All signals: 90 + 495 = 585"]\n E --> F["90 / 585 ≈ 15.38%"]',
      steps: ['Use the model with target probability 1%, true-signal rate 90%, and false-signal rate 5%. The diagram scales probabilities to expected counts per 10,000 cases.', 'The model gives 100 target-present cases and 9,900 target-absent cases.', 'The target-present branch contributes 100 × 0.90 = 90 expected true signals.', 'The target-absent branch contributes 9,900 × 0.05 = 495 expected false signals.', 'Condition on the 585 total signals: 90/585, or about 15.38%, indicate a target in this model.'],
      takeaway: 'P(signal | target) and P(target | signal) ask different questions. Bayes includes both true and false signals, so the prior target rate matters.'
    },
    zh: {
      title: '所有信号中，有多少来自真实目标？',
      source: 'flowchart TD\n A["模型：每 10,000 个案例"] --> B["有目标：100"]\n A --> C["无目标：9,900"]\n B --> D["100 × 0.90 = 90"]\n C --> E["9,900 × 0.05 = 495"]\n D --> F["P(有目标 | 有信号) = 90/585 ≈ 15.38%"]\n E --> F',
      sourceNarrow: 'flowchart TD\n A["10,000 个案例：100 个有目标"] --> B["9,900 个无目标"]\n B --> C["真信号：100 × 0.9 = 90"]\n C --> D["假信号：9,900 × 0.05 = 495"]\n D --> E["全部信号：90 + 495 = 585"]\n E --> F["90/585 ≈ 15.38% 有目标"]',
      steps: ['模型中，目标概率为 1%，真信号率为 90%，假信号率为 5%；图中把概率换算为每 10,000 个案例的期望数量。', '模型给出 100 个有目标案例和 9,900 个无目标案例。', '有目标分支贡献的真信号期望数为 100 × 0.90 = 90。', '无目标分支贡献的假信号期望数为 9,900 × 0.05 = 495。', '将范围限定为共 585 个信号，有目标的条件概率为 90/585，约 15.38%。'],
      takeaway: 'P(有信号 | 有目标) 与 P(有目标 | 有信号) 问的是不同问题；贝叶斯公式同时计入真信号与假信号，所以目标的先验概率很重要。'
    }
  },
  correlation: {
    topics: ['covariance-and-correlation', '协方差与相关性'],
    en: {
      title: 'Measure how paired values move together',
      source: 'flowchart LR\n A["x = [1,2,3], y = [2,4,5]"] --> B["Means: 2 and 11/3"]\n B --> C["Sum deviation products: 3"]\n C --> D["Population covariance: 3/3 = 1"]\n D --> E["Correlation ρ ≈ 0.982"]',
      steps: ['Pair x = [1,2,3] with y = [2,4,5] in their listed order.', 'Their means are 2 and 11/3.', 'Multiply each paired deviation from its mean and add; the sum is 3.', 'Divide by three pairs to get population covariance 1.', 'The population variances are 2/3 and 14/9. Dividing covariance by the product of standard deviations gives ρ = 1/√((2/3)(14/9)), approximately 0.982.'],
      takeaway: 'Correlation measures linear association; it does not establish a cause. If either list is constant, its correlation is undefined.'
    },
    zh: {
      title: '度量成对数值如何一起变化',
      source: 'flowchart LR\n A["x = [1,2,3]，y = [2,4,5]"] --> B["均值：2 和 11/3"]\n B --> C["离差乘积之和：3"]\n C --> D["总体协方差：3/3 = 1"]\n D --> E["相关系数 ρ ≈ 0.982"]',
      steps: ['按给出的顺序将 x = [1,2,3] 与 y = [2,4,5] 配对。', '两个均值分别为 2 和 11/3。', '每一对数分别减去各自均值，将离差相乘再相加，总和为 3。', '除以三对观测值，得到总体协方差 1。', '两个总体方差为 2/3 和 14/9；协方差除以两个标准差之积，得到 ρ = 1/√((2/3)(14/9))，约为 0.982。'],
      takeaway: '相关系数度量线性关联，不能确立因果关系；若其中一列为常数，相关系数就没有定义。'
    }
  },
  entropy: {
    topics: ['entropy', '熵'],
    en: {
      title: 'Average surprise, measured in bits',
      source: 'flowchart TD\n A["p = [0.5,0.25,0.25,0]"] --> B["Surprise: [1,2,2]"]\n A --> C["p = 0: add 0"]\n B --> D["Weighted: [0.5,0.5,0.5]"]\n C --> E["Entropy H₂ = 1.5 bits"]\n D --> E',
      sourceNarrow: 'flowchart TD\n A["p = [0.5,0.25,0.25,0]"] --> B["Skip p = 0: add 0"]\n B --> C["Positive p: [0.5,0.25,0.25]"]\n C --> D["Surprise: [1,2,2]"]\n D --> E["Weighted: [0.5,0.5,0.5]"]\n E --> F["Add: H₂ = 1.5 bits"]',
      steps: ['Use probabilities [0.5,0.25,0.25,0], which are nonnegative and sum to 1.', 'For the positive probabilities, the surprise −log₂ p is 1, 2 and 2 bits.', 'The zero-probability outcome contributes zero by the limiting convention; skip it before evaluating a logarithm.', 'Multiply each positive probability by its surprise to get 0.5, 0.5 and 0.5 bits.', 'Add all contributions, including zero, to obtain entropy of 1.5 bits.'],
      takeaway: 'Entropy is expected surprise. Base-2 logarithms give bits; treat zero-probability terms as zero without computing log₂ 0.'
    },
    zh: {
      title: '用比特度量平均惊讶程度',
      source: 'flowchart TD\n A["p = [0.5,0.25,0.25,0]"] --> B["惊讶程度：[1,2,2]"]\n A --> C["p = 0：加 0"]\n B --> D["加权：[0.5,0.5,0.5]"]\n C --> E["熵 H₂ = 1.5 比特"]\n D --> E',
      sourceNarrow: 'flowchart TD\n A["p = [0.5,0.25,0.25,0]"] --> B["跳过 p = 0：加 0"]\n B --> C["正概率：[0.5,0.25,0.25]"]\n C --> D["惊讶程度：[1,2,2]"]\n D --> E["加权：[0.5,0.5,0.5]"]\n E --> F["相加：H₂ = 1.5 比特"]',
      steps: ['使用概率 [0.5,0.25,0.25,0]，各项非负且总和为 1。', '对正概率，惊讶程度 −log₂ p 分别为 1、2、2 比特。', '零概率结果按极限约定贡献零，在求对数之前就跳过这一项。', '每个正概率乘以对应的惊讶程度，得到 0.5、0.5、0.5 比特。', '将所有贡献连同零相加，熵为 1.5 比特。'],
      takeaway: '熵是惊讶程度的期望值；以 2 为底得到比特，零概率项直接按零处理，不计算 log₂ 0。'
    }
  }
};
