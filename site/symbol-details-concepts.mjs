// Expanded, independently runnable examples for sets, logic, and calculus.
export const conceptDetails = {
  'set-builder': {
    readAs: 'The set of x such that the condition holds.',
    intuition: 'Think of a sieve that keeps only the items you ask for. Set-builder notation describes which values belong to a set; repeated copies do not add new members. This example sifts a finite list for even numbers.',
    steps: ['Start with 1, 2, 2, 3, 4.', 'Keep values with remainder 0 after division by 2: 2, 2, 4.', 'Remove the repeated 2 to get the set {2, 4}.'],
    example: {
      title: 'Collect the distinct even values',
      code: `const source = [1, 2, 2, 3, 4];
// The condition after the bar is "x is even".
const isEven = x => x % 2 === 0;
const matching = source.filter(isEven);
// A Set keeps each distinct value once.
const result = [...new Set(matching)];
console.log(JSON.stringify(result));`,
      output: '[2,4]',
      notes: ['filter checks the condition for each supplied number.', 'new Set removes duplicate values; the array makes the result easy to print.'],
    },
    pitfalls: ['A mathematical set has no meaningful element order, even though JavaScript Set preserves insertion order.', 'Filtering a finite list does not enumerate every number satisfying the condition.'],
    related: ['set-membership', 'cardinality', 'quantifiers'],
    diagram: { nodes: ['1, 2, 2, 3, 4', 'keep x % 2 = 0', '2, 2, 4', 'distinct: {2, 4}'], caption: 'The condition selects even values; set membership ignores duplicates.' },
  },
  'set-membership': {
    readAs: 'x is an element of A; x is not an element of A. A contains x.',
    intuition: 'Picture a guest list and ask whether a particular name is on it. Membership tests one value against a set. Reversing the written symbol lets the set appear first without changing that question.',
    steps: ['Make A = {3, 9, 14}.', '3 is on the list, so 3 ∈ A is true.', '6 is absent, so 6 ∉ A is true.', 'A ∋ 3 says the same thing as 3 ∈ A.'],
    example: {
      title: 'Check an included and an excluded value',
      code: `const A = new Set([3, 9, 14]);
// A.has(x) corresponds to x ∈ A.
const includesThree = A.has(3);
// Negating membership corresponds to x ∉ A.
const excludesSix = !A.has(6);
const result = [includesThree, excludesSix];
console.log(JSON.stringify(result));`,
      output: '[true,true]',
      notes: ['has returns a Boolean for the supplied member.', 'The ! changes "is present" into "is absent".'],
    },
    pitfalls: ['A.has(3) checks the number 3; A.has("3") checks a different, string value.', 'Membership of one element is different from asking whether an entire set is a subset.'],
    related: ['set-builder', 'intersection', 'cardinality'],
    diagram: { nodes: ['A = {3, 9, 14}', 'look up 3 and 6', '3 ∈ A: true', '6 ∉ A: true'], caption: 'The same set answers two separate membership questions.' },
  },
  'real-numbers': {
    readAs: 'The real numbers; x belongs to the real numbers.',
    intuition: 'Imagine a number line with no gaps. Real numbers include whole numbers, fractions, and irrational numbers such as the square root of 2. JavaScript Number can store only finite-precision approximations to many of these values.',
    steps: ['Look for the positive number whose square is 2.', '1² = 1 and 2² = 4, so it lies between 1 and 2.', 'Math.sqrt(2) computes a machine approximation.', 'Rounding that approximation to six decimal places displays 1.414214.'],
    example: {
      title: 'Approximate an irrational real number',
      code: `const target = 2;
// The exact square root is a real, irrational number.
const approximateRoot = Math.sqrt(target);
// A decimal display has a chosen finite precision.
const decimalPlaces = 6;
const display = approximateRoot.toFixed(decimalPlaces);
console.log(display);`,
      output: '1.414214',
      notes: ['Math.sqrt produces a Number approximation, not an exact symbolic square root.', 'toFixed chooses the displayed precision and returns a string.'],
    },
    pitfalls: ['JavaScript Number does not represent every real number, or even every integer, exactly.', 'Infinity and NaN are JavaScript Number values but are not real numbers.'],
    related: ['rational-numbers', 'integers', 'square-root'],
    diagram: { nodes: ['1² = 1 < 2 < 4 = 2²', 'compute √2', 'machine approximation', 'six decimals: 1.414214'], caption: 'A rounded decimal locates √2 approximately on the real number line.' },
  },
  'rational-numbers': {
    readAs: 'The rational numbers; one third is a rational number.',
    intuition: 'Think of splitting one pizza into three equal shares. A rational number is any ratio of two integers with a nonzero denominator. Keeping the two integers can preserve the ratio exactly even when its decimal repeats.',
    steps: ['Represent one third by numerator 1 and denominator 3.', 'Multiply the numerator by 3: 1 × 3 = 3.', 'The result equals the denominator, confirming three thirds make one.', 'The exact pair remains 1/3 rather than a shortened decimal.'],
    example: {
      title: 'Keep one third as an exact ratio',
      code: `// BigInt keeps these integer parts exact.
const fraction = { numerator: 1n, denominator: 3n };
const numberOfShares = 3n;
const combinedNumerator = fraction.numerator * numberOfShares;
// Equal numerator and denominator represent one whole.
const makesOneWhole = combinedNumerator === fraction.denominator;
console.log(makesOneWhole);`,
      output: 'true',
      notes: ['The n suffix creates a BigInt integer.', 'The code checks an integer identity without dividing or rounding the fraction.'],
    },
    pitfalls: ['A zero denominator never defines a rational number.', 'BigInt division truncates: 1n / 3n gives 0n, not an exact fraction object.'],
    related: ['real-numbers', 'integers', 'arithmetic-operations'],
    diagram: { nodes: ['ratio 1 / 3', 'three shares: 1 × 3', 'numerator = 3', '3 / 3 = 1 whole'], caption: 'An exact numerator and denominator retain the meaning of one third.' },
  },
  'integers': {
    readAs: 'The integers; minus three belongs to the integers.',
    intuition: 'Picture whole steps left or right from zero. Integers include negative whole numbers, zero, and positive whole numbers, with no fractional parts. The JavaScript check also restricts the example to safely represented machine integers.',
    steps: ['Take the values −3, 0, and 2.5.', '−3 has no fractional part and is safely represented: true.', '0 also passes the safe-integer check: true.', '2.5 has a fractional part, so it fails: false.'],
    example: {
      title: 'Identify safely represented integers',
      code: `const values = [-3, 0, 2.5];
// This checks both integrality and the safe Number range.
const isSafeInteger = value => Number.isSafeInteger(value);
const classifications = values.map(isSafeInteger);
// The positions correspond to -3, 0, and 2.5.
console.log(JSON.stringify(classifications));`,
      output: '[true,true,false]',
      notes: ['Negative values and zero can be integers.', 'Safe-integer checks are narrower than the infinite mathematical set ℤ.'],
    },
    pitfalls: ['A value outside the safe Number range may already have lost precision before a check runs.', 'Integer does not mean positive: −3 and 0 are integers too.'],
    related: ['natural-numbers', 'rational-numbers', 'rounding'],
    diagram: { nodes: ['values: −3, 0, 2.5', 'safe-integer check', '−3: true; 0: true', '2.5: false'], caption: 'Whole values pass here; a fractional value does not.' },
  },
  'natural-numbers': {
    readAs: 'The natural numbers; zero is natural under this convention.',
    intuition: 'Think of counting how many objects are in a box. Here the natural numbers start at zero, so an empty box is allowed. Other authors start at one; the notation alone does not settle that convention.',
    steps: ['Choose the convention ℕ = {0, 1, 2, …}.', '0 is a safe integer and 0 ≥ 0, so it passes.', '3 is a safe integer and 3 ≥ 0, so it passes.', '−1 fails the nonnegative condition, and 1.5 fails the integer condition.'],
    example: {
      title: 'Use a zero-inclusive counting convention',
      code: `// In this example, natural numbers include zero.
const isNatural = n => Number.isSafeInteger(n) && n >= 0;
const candidates = [0, 3, -1, 1.5];
const results = candidates.map(isNatural);
// This tests supplied machine values, not all of ℕ.
console.log(JSON.stringify(results));`,
      output: '[true,true,false,false]',
      notes: ['Both conditions must hold: safe integer and nonnegative.', 'Changing n >= 0 to n >= 1 would use the one-starting convention.'],
    },
    pitfalls: ['Check the author’s zero convention before assuming what ℕ contains.', 'A nonnegative fraction such as 1.5 is not a natural number.'],
    related: ['integers', 'logical-and', 'cardinality'],
    diagram: { nodes: ['0, 3, −1, 1.5', 'safe integer AND ≥ 0', 'keep 0 and 3', '[true,true,false,false]'], caption: 'The chosen convention accepts zero and rejects fractions and negative values.' },
  },
  'complex-numbers': {
    readAs: 'The complex numbers; a plus b i.',
    intuition: 'Imagine a number with two coordinates instead of one. A complex number a + bi has a real part a and an imaginary part b, where i² = −1. Addition combines matching coordinates.',
    steps: ['Start with 3 − i and 1 + 2i.', 'Add the real parts: 3 + 1 = 4.', 'Add the imaginary coefficients: −1 + 2 = 1.', 'The sum is 4 + i, stored as {re: 4, im: 1}.'],
    example: {
      title: 'Add two complex numbers',
      code: `const a = { re: 3, im: -1 };
const b = { re: 1, im: 2 };
// Add the two coordinates separately.
const realPart = a.re + b.re;
const imaginaryPart = a.im + b.im;
const sum = { re: realPart, im: imaginaryPart };
console.log(JSON.stringify(sum));`,
      output: '{"re":4,"im":1}',
      notes: ['re and im are ordinary object fields chosen to represent the parts.', 'im stores the coefficient of i, not i itself.'],
    },
    pitfalls: ['JavaScript does not supply a built-in complex-number arithmetic type.', 'Multiplying complex numbers needs the rule i² = −1; multiplying matching fields alone is incorrect.'],
    related: ['imaginary-unit', 'real-numbers', 'vector-component'],
    diagram: { nodes: ['(3 − i) + (1 + 2i)', 'real: 3 + 1 = 4', 'imaginary: −1 + 2 = 1', 'sum: 4 + i'], caption: 'Addition preserves the real and imaginary parts as separate coordinates.' },
  },
  'ordered-comparison': {
    readAs: 'Less than; greater than; less than or equal to; greater than or equal to; not greater than; not less than.',
    intuition: 'Picture two positions on a number line. A comparison asks which is farther left or whether they coincide. A line under the comparison sign includes equality.',
    steps: ['Compare 3 with 3: 3 < 3 is false.', 'Allow equality: 3 ≤ 3 is true.', 'Compare 2 with 3: 2 > 3 is false.', 'Negating that last statement gives 2 ≯ 3, which is true.'],
    example: {
      title: 'See why equality changes a boundary test',
      code: `const boundary = 3;
const strict = boundary < 3;
const inclusive = boundary <= 3;
// A slash on > means "not greater than".
const notGreater = !(2 > boundary);
const result = [strict, inclusive, notGreater];
console.log(JSON.stringify(result));`,
      output: '[false,true,true]',
      notes: ['The strict comparison excludes an equal endpoint.', 'For real numbers, not greater than is equivalent to less than or equal to.'],
    },
    pitfalls: ['JavaScript does not interpret 0 < x < 1 as two mathematical comparisons; use 0 < x && x < 1.', 'NaN is unordered, so !(NaN > 3) and NaN <= 3 do not agree.'],
    related: ['interval-endpoints', 'logical-not', 'equality'],
    diagram: { nodes: ['boundary = 3', '3 < 3: false', '3 ≤ 3: true', 'not (2 > 3): true'], caption: 'An inclusive sign admits equality; negation reverses the truth of a statement.' },
  },
  'much-less-greater': {
    readAs: 'Much less than; much greater than.',
    intuition: 'Think of comparing the size of a marble with a building. These signs describe a large difference in scale, but do not specify a universal cutoff. This example chooses a factor of 100 for positive quantities.',
    steps: ['Set the chosen scale factor to 100.', 'For b = 2, the threshold is 100 × 2 = 200.', '1000 ≥ 200, so 1000 counts as much larger than 2 under this rule.', '50 < 200, so 50 does not pass the same rule.'],
    example: {
      title: 'Make a scale comparison explicit',
      code: `const factor = 100;
// This chosen rule applies to positive quantities.
const muchLarger = (a, b) => a >= factor * b;
const largeComparison = muchLarger(1000, 2);
const smallerComparison = muchLarger(50, 2);
const result = [largeComparison, smallerComparison];
console.log(JSON.stringify(result));`,
      output: '[true,false]',
      notes: ['The factor of 100 is a stated choice for this example.', 'Both comparisons use the same reference value and threshold.'],
    },
    pitfalls: ['Do not assume ≪ or ≫ has a fixed numerical threshold without context.', 'JavaScript << and >> are bitwise shift operators, not scale comparisons.'],
    related: ['ordered-comparison', 'approximately-equal', 'real-numbers'],
    diagram: { nodes: ['reference b = 2', 'chosen threshold: 100 × 2', '1000 ≥ 200: true', '50 ≥ 200: false'], caption: 'A context-defined scale rule makes this informal comparison testable.' },
  },
  'logical-and': {
    readAs: 'A and B; A conjunction B.',
    intuition: 'Think of a door that opens only when two checks both pass. Logical AND is true only when its two statements are true. Here the number must pass both a lower and an upper bound.',
    steps: ['Set x = 3.', 'Check x > 2: 3 > 2 is true.', 'Check x < 4: 3 < 4 is true.', 'true AND true gives true, so 3 lies between 2 and 4.'],
    example: {
      title: 'Require both range checks',
      code: `const x = 3;
const aboveLowerBound = x > 2;
const belowUpperBound = x < 4;
// Both Boolean conditions must pass.
const isInside = aboveLowerBound && belowUpperBound;
console.log(isInside);`,
      output: 'true',
      notes: ['Each comparison creates a Boolean.', '&& combines them; one false condition would make this result false.'],
    },
    pitfalls: ['With non-Boolean operands, JavaScript && returns an operand rather than always returning true or false.', 'Do not write a chained comparison such as 2 < x < 4 in JavaScript.'],
    related: ['logical-or', 'logical-not', 'interval-endpoints'],
    diagram: { nodes: ['x = 3', '3 > 2: true', '3 < 4: true', 'true AND true = true'], caption: 'Both conditions must pass for the conjunction to hold.' },
  },
  'logical-or': {
    readAs: 'A or B; A disjunction B.',
    intuition: 'Think of a gate that accepts either of two tickets. Logical OR is true when at least one statement is true. Having both tickets also passes; this is inclusive OR.',
    steps: ['Let A be false and B be true.', 'A OR B is true because B passes.', 'Now test true OR true.', 'That also gives true because OR allows both statements to hold.'],
    example: {
      title: 'Accept either condition, including both',
      code: `const A = false;
const B = true;
const onePasses = A || B;
// Inclusive OR also accepts two true statements.
const bothPass = true || true;
const result = [onePasses, bothPass];
console.log(JSON.stringify(result));`,
      output: '[true,true]',
      notes: ['|| is inclusive OR for Boolean inputs.', 'The only false Boolean OR case is false || false.'],
    },
    pitfalls: ['OR does not mean "exactly one" unless an exclusive-OR rule is stated.', 'With non-Boolean inputs, JavaScript || returns an operand and uses truthiness.'],
    related: ['logical-and', 'logical-not', 'union'],
    diagram: { nodes: ['A = false; B = true', 'false OR true = true', 'try both true', 'true OR true = true'], caption: 'One passing statement is enough, and two passing statements still qualify.' },
  },
  'logical-not': {
    readAs: 'Not A; the negation of A.',
    intuition: 'Imagine flipping a switch with only true and false positions. NOT reverses a statement’s truth value. Negating twice returns to the original Boolean value.',
    steps: ['Start with A = false.', 'Negate it: NOT false gives true.', 'Negate the new value: NOT true gives false.', 'The double negation matches the original A.'],
    example: {
      title: 'Flip a Boolean and flip it back',
      code: `const A = false;
// JavaScript uses ! for logical negation.
const once = !A;
const twice = !once;
const result = [A, once, twice];
console.log(JSON.stringify(result));`,
      output: '[false,true,false]',
      notes: ['! produces a Boolean result.', 'For Boolean A, !!A has the same value as A.'],
    },
    pitfalls: ['JavaScript ~ performs bitwise NOT; it is not a synonym for !.', 'Negating a non-Boolean first uses JavaScript truthiness, which may differ from the mathematical statement you intended.'],
    related: ['logical-and', 'logical-or', 'implication'],
    diagram: { nodes: ['A = false', 'first NOT: true', 'second NOT: false'], caption: 'Each negation reverses the Boolean value.' },
  },
  'implication': {
    readAs: 'A implies B; if A, then B. A is implied by B for the reversed arrow.',
    intuition: 'Think of a rule saying, "If the first statement holds, the second must hold too." Material implication fails only when the first is true and the second is false. This is a rule about truth values, not a claim that one event causes another.',
    steps: ['List the pairs (true, true), (true, false), (false, true), (false, false).', 'For each pair, compute NOT A OR B.', 'Only (true, false) gives false.', 'The resulting truth table is [true, false, true, true].'],
    example: {
      title: 'Build the complete implication truth table',
      code: `const implies = (A, B) => !A || B;
// Rows list every possible pair of Boolean inputs.
const rows = [[true, true], [true, false], [false, true], [false, false]];
const results = rows.map(([A, B]) => implies(A, B));
// No causal relationship is asserted by this table.
console.log(JSON.stringify(results));`,
      output: '[true,false,true,true]',
      notes: ['When A is false, !A makes the implication true.', 'For A ⇐ B, evaluate implies(B, A) instead.'],
    },
    pitfalls: ['A ⇒ B does not generally give B ⇒ A.', 'A true implication does not establish causation or prove that A ever occurs.'],
    related: ['logical-not', 'logical-or', 'logical-equivalence'],
    diagram: { nodes: ['TT, TF, FT, FF', 'each row: !A || B', 'only TF fails', 'true, false, true, true'], caption: 'Implication rules out exactly one combination of truth values.' },
  },
  'logical-equivalence': {
    readAs: 'A if and only if B; A is equivalent to B.',
    intuition: 'Think of two indicator lights that must always agree. The biconditional is true when both statements have the same truth value. It requires implication in both directions.',
    steps: ['Test A = true and B = true: the values agree.', 'Test true and false: they disagree.', 'Test false and false: they agree again.', 'The three biconditional results are true, false, true.'],
    example: {
      title: 'Compare truth values in both directions',
      code: `const iff = (A, B) => A === B;
const cases = [[true, true], [true, false], [false, false]];
// Boolean equality implements the biconditional.
const results = cases.map(([A, B]) => iff(A, B));
// Two false statements still agree in truth value.
console.log(JSON.stringify(results));`,
      output: '[true,false,true]',
      notes: ['=== is used here with Boolean operands.', 'One sample where statements agree does not prove equivalence for every input.'],
    },
    pitfalls: ['Showing only A ⇒ B establishes one direction, not A ⇔ B.', 'Two unrelated statements can share a truth value in one case without defining the same property.'],
    related: ['implication', 'equality', 'quantifiers'],
    diagram: { nodes: ['pairs: TT, TF, FF', 'compare A === B', 'agree, differ, agree', 'true, false, true'], caption: 'The biconditional accepts matching truth values, including two false values.' },
  },
  'quantifiers': {
    readAs: 'For all x; there exists an x.',
    intuition: 'Imagine checking a tray of objects: "every object is red" asks about all of them, while "some object is red" needs only one. A quantifier always applies to a stated domain. The code checks only the three numbers supplied here.',
    steps: ['Choose the finite domain {2, 4, 6}.', 'Check evenness: 2, 4, and 6 all have remainder 0 after division by 2.', 'Therefore every supplied value is even: true.', '6 is greater than 5, so there exists a supplied value greater than 5: true.'],
    example: {
      title: 'Check all members and find one witness',
      code: `const domain = [2, 4, 6];
const isEven = x => x % 2 === 0;
const exceedsFive = x => x > 5;
// every checks ∀; some checks ∃ over this finite domain.
const allEven = domain.every(isEven);
const someLarge = domain.some(exceedsFive);
console.log(JSON.stringify([allEven, someLarge]));`,
      output: '[true,true]',
      notes: ['The value 6 is a witness for the existential statement.', 'Testing this finite array does not establish a statement about all integers or reals.'],
    },
    pitfalls: ['Omitting the domain can change the meaning: every member of {2, 4, 6} is even, but every integer is not.', 'On an empty array, every returns true and some returns false.'],
    related: ['set-builder', 'logical-and', 'logical-or'],
    diagram: { nodes: ['domain: {2, 4, 6}', 'even? true, true, true', '∀ even: true', '∃ x > 5: witness 6'], caption: 'A universal check needs all domain members; an existential check needs one witness.' },
  },
  'interval-endpoints': {
    readAs: 'The open interval a to b; the closed interval a to b; closed at a and open at b; open at a and closed at b.',
    intuition: 'Picture a segment of a number line with a gate at each end. A square bracket admits that endpoint; a parenthesis excludes it. Each of the four notations makes an independent choice at the left and right ends.',
    steps: ['Use endpoints a = 0 and b = 1, and test x = 0.', 'The open interval (0, 1) rejects x because 0 > 0 is false.', 'The closed interval [0, 1] and half-open [0, 1) accept x.', 'The half-open interval (0, 1] rejects x because its left endpoint is excluded.'],
    example: {
      title: 'Test the left endpoint in four intervals',
      code: `const a = 0, b = 1, x = 0;
// Parentheses use strict tests; brackets allow equality.
const open = x > a && x < b;
const closed = x >= a && x <= b;
const leftClosed = x >= a && x < b;
const rightClosed = x > a && x <= b;
console.log(JSON.stringify([open, closed, leftClosed, rightClosed]));`,
      output: '[false,true,true,false]',
      notes: ['Each line combines one left-end and one right-end condition.', 'These expressions check membership of a value; they do not generate the continuum of values in an interval.'],
    },
    pitfalls: ['A parenthesis in interval notation excludes an endpoint; it is not an instruction to call a function.', 'A JavaScript array [0, 1] stores two values and does not by itself represent every real number between them.'],
    related: ['ordered-comparison', 'intersection', 'cartesian-power'],
    diagram: { nodes: ['a = 0, b = 1, x = 0', '(0,1): false', '[0,1] and [0,1): true', '(0,1]: false'], caption: 'At x = 0, only intervals with a left square bracket include the point.' },
  },
  'cartesian-power': {
    readAs: 'The closed interval zero to one, cubed; the third Cartesian power of zero to one.',
    intuition: 'Imagine a box with width, height, and depth all running from zero to one. A point belongs to this unit cube when each of its three coordinates lies in that interval. The superscript counts coordinate positions.',
    steps: ['Take the point (0.2, 0.5, 1).', 'It has exactly three coordinates.', '0.2 and 0.5 lie between 0 and 1; the endpoint 1 is included too.', 'All checks pass, so the point belongs to [0, 1]³.'],
    example: {
      title: 'Check a point against a unit cube',
      code: `const point = [0.2, 0.5, 1];
const inUnitInterval = x => x >= 0 && x <= 1;
const hasThreeCoordinates = point.length === 3;
const coordinatesFit = point.every(inUnitInterval);
// Both the dimension and the bounds matter.
const insideCube = hasThreeCoordinates && coordinatesFit;
console.log(insideCube);`,
      output: 'true',
      notes: ['every applies the same interval test to all three coordinates.', 'The closed brackets include the cube’s boundary, including coordinate 1.'],
    },
    pitfalls: ['[0, 1]³ means triples, not the one-dimensional interval obtained by cubing its endpoints.', 'Testing only coordinate bounds would accidentally accept a two-coordinate point unless dimension is checked.'],
    related: ['interval-endpoints', 'vector-component', 'quantifiers'],
    diagram: { nodes: ['point = (0.2, 0.5, 1)', 'coordinate count = 3', 'each coordinate in [0,1]', 'inside unit cube: true'], caption: 'Cartesian power requires the right number of coordinates and valid bounds for each one.' },
  },
  'intersection': {
    readAs: 'A intersect B; the intersection of A and B.',
    intuition: 'Imagine two guest lists and keep only names written on both. Intersection contains the members the sets share. For number-line intervals, it is the overlapping part.',
    steps: ['Start with A = {1, 2, 3} and B = {2, 3, 4}.', '1 is in A but absent from B, so remove it.', '2 and 3 appear in both sets, so keep them.', 'The intersection is {2, 3}.'],
    example: {
      title: 'Keep the shared set members',
      code: `const A = new Set([1, 2, 3]);
const B = new Set([2, 3, 4]);
// Visit A and keep only values also found in B.
const shared = [...A].filter(x => B.has(x));
const intersection = new Set(shared);
console.log(JSON.stringify([...intersection]));`,
      output: '[2,3]',
      notes: ['filter expresses the requirement to belong to both sets.', 'The printed array lists the intersection’s distinct members.'],
    },
    pitfalls: ['Intersection requires membership in both sets; union requires membership in either.', 'For object members, JavaScript Set compares object identity rather than matching their fields.'],
    related: ['union', 'set-difference', 'logical-and'],
    diagram: { nodes: ['A: {1,2,3}; B: {2,3,4}', '1 in B? no', '2 and 3 in B? yes', 'A ∩ B = {2,3}'], caption: 'Only values present in both sets survive.' },
  },
  'union': {
    readAs: 'A union B; the union of A and B.',
    intuition: 'Imagine combining two guest lists into one invitation list. Union includes anyone on either list. A name appearing twice still represents only one member.',
    steps: ['Take A = {1, 2} and B = {2, 3}.', 'Combine their listed values: 1, 2, 2, 3.', 'Count the shared 2 only once.', 'The union is {1, 2, 3}.'],
    example: {
      title: 'Combine two sets without duplicates',
      code: `const A = new Set([1, 2]);
const B = new Set([2, 3]);
// Spreading combines the listed values, including both 2s.
const combined = [...A, ...B];
const union = new Set(combined);
console.log(JSON.stringify([...union]));`,
      output: '[1,2,3]',
      notes: ['The intermediate array can contain duplicates.', 'Constructing a Set turns the combined list into distinct members.'],
    },
    pitfalls: ['Concatenating arrays alone retains duplicates and is not a set union.', 'The size of a union is not generally the sum of the input sizes because shared members overlap.'],
    related: ['intersection', 'cardinality', 'logical-or'],
    diagram: { nodes: ['A = {1,2}; B = {2,3}', 'combine: 1,2,2,3', 'remove repeated 2', 'A ∪ B = {1,2,3}'], caption: 'Union collects members from either set while counting shared members once.' },
  },
  'set-difference': {
    readAs: 'A minus B; A set minus B; the difference of A and B.',
    intuition: 'Think of crossing names off your list when they also appear on another list. A minus B keeps the members of A that are absent from B. Swapping the two lists changes which members can remain.',
    steps: ['Use A = {1, 2, 3} and B = {2, 3, 4}.', 'Remove 2 and 3 from A because B contains them; A ∖ B = {1}.', 'For B ∖ A, remove 2 and 3 from B instead.', 'The reversed difference is {4}, a different result.'],
    example: {
      title: 'Compare the two directions of subtraction',
      code: `const A = new Set([1, 2, 3]);
const B = new Set([2, 3, 4]);
// Keep members of the first set absent from the second.
const aWithoutB = [...A].filter(x => !B.has(x));
const bWithoutA = [...B].filter(x => !A.has(x));
console.log(JSON.stringify([aWithoutB, bWithoutA]));`,
      output: '[[1],[4]]',
      notes: ['!B.has(x) says x is not a member of B.', 'The two arrays show why the operand order matters.'],
    },
    pitfalls: ['Set difference does not subtract the numeric values of corresponding elements.', 'A ∖ B and B ∖ A are generally different sets.'],
    related: ['intersection', 'union', 'logical-not'],
    diagram: { nodes: ['A: {1,2,3}; B: {2,3,4}', 'remove shared 2 and 3', 'A ∖ B = {1}', 'B ∖ A = {4}'], caption: 'The first set supplies candidates; the second set determines what to remove.' },
  },
  'cardinality': {
    readAs: 'The cardinality of A; the size of A.',
    intuition: 'Imagine counting different kinds of cards rather than every physical copy. Cardinality counts the distinct members of a finite set. Repeated input values collapse to a single member before counting.',
    steps: ['Begin with the list 1, 1, 2, 3, which has four entries.', 'Turn it into the set {1, 2, 3}.', 'Count the distinct members: three.', 'Therefore |A| = 3 even though the source list length was 4.'],
    example: {
      title: 'Count distinct values rather than copies',
      code: `const source = [1, 1, 2, 3];
const A = new Set(source);
// Array length counts entries; Set size counts members.
const listLength = source.length;
const setSize = A.size;
console.log(JSON.stringify([listLength, setSize]));`,
      output: '[4,3]',
      notes: ['source.length counts both copies of 1.', 'A.size counts 1 once, together with 2 and 3.'],
    },
    pitfalls: ['The same bars can mean absolute value or determinant in other contexts; inspect the object between them.', 'A JavaScript Set has .size, not the array property .length.'],
    related: ['set-builder', 'union', 'event-probability'],
    diagram: { nodes: ['list: [1,1,2,3]', 'distinct set: {1,2,3}', 'list length = 4', 'set cardinality |A| = 3'], caption: 'Cardinality counts distinct set members rather than repeated list entries.' },
  },
  'function-notation': {
    readAs: 'f of x; x maps to x squared; f maps A to B.',
    intuition: 'Think of a machine that follows one rule for each allowed input. A function assigns exactly one output to each member of its domain. f(x) requests the output, while f: A → B names its input domain and output codomain.',
    steps: ['Define the rule f(x) = x².', 'Give the machine input 3.', 'Apply the rule: 3 × 3 = 9.', 'Inputs 1, 2, and 3 similarly produce 1, 4, and 9.'],
    example: {
      title: 'Apply the same mapping to three inputs',
      code: `// The rule is x ↦ x².
const f = x => x * x;
const inputs = [1, 2, 3];
const outputs = inputs.map(x => f(x));
// f(3) is the last output: 9.
console.log(JSON.stringify(outputs));`,
      output: '[1,4,9]',
      notes: ['Calling f(x) applies the rule; it does not multiply f by x.', 'The code evaluates three inputs and does not specify the full mathematical domain and codomain.'],
    },
    pitfalls: ['A codomain can contain values the function never reaches; it is not necessarily the image.', 'The arrow → can mean implication in logic, so interpret it from context.'],
    related: ['piecewise-function', 'power', 'implication'],
    diagram: { nodes: ['inputs: 1, 2, 3', 'rule: multiply x by x', '1×1, 2×2, 3×3', 'outputs: 1, 4, 9'], caption: 'One rule consistently maps each supplied input to a single output.' },
  },
  'piecewise-function': {
    readAs: 'f of x equals this expression when the condition holds, and otherwise that expression.',
    intuition: 'Imagine a machine with a switch that chooses a rule based on its input. A piecewise function uses different formulas on different parts of its domain. Each allowed input needs one unambiguous result.',
    steps: ['Define f(x) = (x² − x)/x for x ≥ 1, and 0 otherwise.', 'For x = 3, the condition passes: (9 − 3)/3 = 2.', 'For x = 1, the condition passes: (1 − 1)/1 = 0.', 'For x = 0, take the otherwise branch and return 0 without dividing by zero.'],
    example: {
      title: 'Choose the formula before calculating',
      code: `const f = x => {
  // Only this branch divides by x.
  if (x >= 1) return (x * x - x) / x;
  return 0;
};
const inputs = [3, 1, 0];
const results = inputs.map(f);
console.log(JSON.stringify(results));`,
      output: '[2,0,0]',
      notes: ['The if condition selects the correct formula.', 'At x = 0 the division expression is never evaluated.'],
    },
    pitfalls: ['Check which branch includes a boundary such as x = 1.', 'Computing every branch first can evaluate an expression that is undefined for the current input.'],
    related: ['function-notation', 'ordered-comparison', 'sign-function'],
    diagram: { nodes: ['inputs: 3, 1, 0', '3 and 1: use (x²−x)/x', '0: use otherwise → 0', 'outputs: 2, 0, 0'], caption: 'The input condition determines which formula is evaluated.' },
  },
  'sign-function': {
    readAs: 'Sign of x; signum of x.',
    intuition: 'Think of an arrow that reports left, still, or right without reporting distance. The sign function returns −1 for negative numbers, 0 for zero, and 1 for positive numbers. It discards magnitude.',
    steps: ['Start with −5, 0, and 7.', '−5 is negative, so its sign is −1.', '0 has sign 0.', '7 is positive, so its sign is 1.'],
    example: {
      title: 'Keep direction and discard magnitude',
      code: `const values = [-5, 0, 7];
// Math.sign distinguishes negative, zero, and positive.
const signs = values.map(value => Math.sign(value));
// The sizes 5 and 7 no longer appear in the result.
const result = signs;
console.log(JSON.stringify(result));`,
      output: '[-1,0,1]',
      notes: ['Each output has the same negative, zero, or positive classification as its input.', 'The function applies to real numeric inputs; Math.sign(NaN) returns NaN.'],
    },
    pitfalls: ['x / Math.abs(x) is undefined at zero, so it needs a separate zero case.', 'JavaScript Math.sign can preserve negative zero; ordinary mathematical sign notation usually writes zero.'],
    related: ['piecewise-function', 'absolute-value', 'ordered-comparison'],
    diagram: { nodes: ['inputs: −5, 0, 7', 'classify: negative, zero, positive', 'signs: −1, 0, 1'], caption: 'The sign reports which side of zero a value occupies.' },
  },
  'prime-related-value': {
    readAs: 'x prime.',
    intuition: 'Think of adding a label to distinguish an updated value from the old one. A prime mark can label a related quantity, but its meaning comes from the author’s definition. In calculus f′ commonly means a derivative; in matrix contexts A′ can mean transpose.',
    steps: ['Let the original value be x = 3.', 'Define the update rule x′ = x + 1.', 'Apply it: 3 + 1 = 4.', 'Keep both labels: x is 3 and x′ is 4.'],
    example: {
      title: 'Label an updated value with a prime',
      code: `const x = 3;
// Here a prime is explicitly defined to mean "after adding 1".
const update = value => value + 1;
const xPrime = update(x);
const beforeAndAfter = [x, xPrime];
console.log(JSON.stringify(beforeAndAfter));`,
      output: '[3,4]',
      notes: ['xPrime is a legal JavaScript identifier representing the notation x′.', 'This definition labels an update; it does not differentiate a function.'],
    },
    pitfalls: ['Do not assume every prime mark means derivative.', 'A prime mark does not prescribe an operation until its context or definition supplies one.'],
    related: ['definition', 'derivative', 'transpose'],
    diagram: { nodes: ['original x = 3', 'defined update: add 1', 'x′ = 3 + 1 = 4', 'retain labels: x=3, x′=4'], caption: 'The prime distinguishes a value related by the explicitly stated update.' },
  },
  'rounding': {
    readAs: 'Floor of x; ceiling of x; x rounded to the nearest integer.',
    intuition: 'Imagine standing between two rungs on a number-line ladder. Floor chooses the integer at or below you, while ceiling chooses the integer at or above you. Nearest-integer rounding also needs a rule for halfway ties.',
    steps: ['Place −2.3 between the integers −3 and −2.', 'The integer below is −3, so floor(−2.3) = −3.', 'The integer above is −2, so ceil(−2.3) = −2.', 'For the tie −2.5, JavaScript Math.round chooses −2, toward positive infinity.'],
    example: {
      title: 'Round a negative value carefully',
      code: `const x = -2.3;
const floor = Math.floor(x);
const ceiling = Math.ceil(x);
// JavaScript breaks halfway ties toward +Infinity.
const halfway = Math.round(-2.5);
console.log(JSON.stringify([floor, ceiling, halfway]));`,
      output: '[-3,-2,-2]',
      notes: ['Down means toward negative infinity, so floor of −2.3 is −3.', 'Other languages or mathematical texts may choose a different halfway rule.'],
    },
    pitfalls: ['Floor is not the same as removing the fractional part for negative inputs.', 'Do not assume Math.round implements ties-to-even or ties-away-from-zero.'],
    related: ['integers', 'ordered-comparison', 'approximately-equal'],
    diagram: { nodes: ['−3 < −2.3 < −2', 'floor → −3', 'ceiling → −2', 'JS tie: round(−2.5) → −2'], caption: 'Floor and ceiling follow number-line direction, including for negative numbers.' },
  },
  'finite-change': {
    readAs: 'Delta x; delta f; the change in x or in f.',
    intuition: 'Think of comparing an odometer reading before and after a trip. Delta means the new value minus the old one. An output change and an input change can have different sizes.',
    steps: ['Use f(x) = x², old input 2, and new input 3.', 'The input change is Δx = 3 − 2 = 1.', 'The outputs are f(2) = 4 and f(3) = 9.', 'The output change is Δf = 9 − 4 = 5.'],
    example: {
      title: 'Track an input change and its output change',
      code: `const f = x => x * x;
const oldX = 2, newX = 3;
const oldOutput = f(oldX);
const newOutput = f(newX);
const deltaX = newX - oldX;
const deltaF = newOutput - oldOutput;
console.log(JSON.stringify([deltaX, deltaF]));`,
      output: '[1,5]',
      notes: ['Both deltas use new minus old in the same direction.', 'Δf/Δx = 5 is an average rate across this interval, not the derivative at 2.'],
    },
    pitfalls: ['Reversing new and old changes the sign of the difference.', 'A finite change Δx is not automatically an infinitesimal dx or a derivative.'],
    related: ['derivative', 'limit', 'function-notation'],
    diagram: { nodes: ['x: 2 → 3', 'Δx = 3 − 2 = 1', 'f(x): 4 → 9', 'Δf = 9 − 4 = 5'], caption: 'The same input move can produce a different-sized change in the function value.' },
  },
  'kronecker-delta': {
    readAs: 'Delta i j; the Kronecker delta of i and j.',
    intuition: 'Think of a matching test that lights up only when two index labels agree. The Kronecker delta is 1 for equal indices and 0 otherwise. Used in a grid, it places ones on the diagonal of an identity matrix.',
    steps: ['Use row and column indices 0, 1, and 2.', 'For (0, 0), the indices match, giving 1; (0, 1) and (0, 2) give 0.', 'The same rule gives row 1 as [0, 1, 0].', 'Row 2 is [0, 0, 1], completing the 3 × 3 identity matrix.'],
    example: {
      title: 'Build an identity matrix from index matches',
      code: `const delta = (i, j) => i === j ? 1 : 0;
const indices = [0, 1, 2];
// Each row compares its index with every column index.
const identity = indices.map(i =>
  indices.map(j => delta(i, j))
);
console.log(JSON.stringify(identity));`,
      output: '[[1,0,0],[0,1,0],[0,0,1]]',
      notes: ['The conditional expression returns exactly 1 or 0.', 'The diagonal consists of positions where the row and column indices match.'],
    },
    pitfalls: ['Kronecker delta is a discrete index-matching rule; Dirac delta is a different mathematical object.', 'δᵢⱼ is not the product of i and j.'],
    related: ['dirac-delta', 'matrix-shape', 'equality'],
    diagram: { nodes: ['indices i,j ∈ {0,1,2}', 'i = j → 1; else → 0', 'rows: 100, 010, 001', '3 × 3 identity matrix'], caption: 'Equal index pairs create the diagonal ones.' },
  },
  'dirac-delta': {
    readAs: 'Dirac delta of x minus a.',
    intuition: 'Imagine an ideal selector that picks one value out of a smooth test function inside an integral. The Dirac delta is a distribution, not an ordinary finite-height spike or a function that equals 1 at one point. Its defining sifting identity gives the selected value φ(a).',
    steps: ['Choose the test function φ(x) = x² and selection point a = 3.', 'The identity is ∫ δ(x − 3) φ(x) dx = φ(3), with integration over the whole real line.', 'Evaluate the selected value: φ(3) = 3² = 9.', 'The code computes that right-hand side; it does not approximate the delta distribution itself.'],
    example: {
      title: 'Evaluate the result of the sifting identity',
      code: `const phi = x => x * x;
const a = 3;
// The sifting identity gives ∫ δ(x-a) phi(x) dx = phi(a).
// We evaluate its right-hand side, not a pointwise delta.
const selectedValue = phi(a);
console.log(selectedValue);`,
      output: '9',
      notes: ['For this smooth φ, the distribution selects its value at a.', 'There is deliberately no JavaScript delta(x) pretending to be a finite spike.'],
    },
    pitfalls: ['Returning 1 at x = a and 0 elsewhere does not implement a Dirac delta; its ordinary integral is zero.', 'The sifting formula requires the intended distributional setting and integration domain to include the selection point.'],
    related: ['kronecker-delta', 'definite-integral', 'function-notation'],
    diagram: { nodes: ['φ(x) = x²; a = 3', 'apply delta sifting identity', 'select φ(3)', '3² = 9'], caption: 'The example evaluates the identity’s selected value, not an ordinary delta function.' },
  },
  'limit': {
    readAs: 'The limit as h approaches zero.',
    intuition: 'Imagine walking toward a doorway without needing to stand exactly on its threshold. A limit asks what value an expression approaches as its input gets close to a point. The expression can be undefined at that point.',
    steps: ['For f(x) = x² at x = 3, the difference quotient is ((3 + h)² − 9)/h for h ≠ 0.', 'Algebra simplifies it to 6 + h.', 'At h = 0.1, 0.01, and 0.001, the values are 6.1, 6.01, and 6.001.', 'The formula shows the limit is 6 as h approaches 0 from either side; the samples only illustrate it.'],
    example: {
      title: 'Watch a difference quotient approach six',
      code: `const x = 3;
const steps = [0.1, 0.01, 0.001];
// For h ≠ 0, the x² difference quotient simplifies to 2*x+h.
const quotients = steps.map(h => 2 * x + h);
// Sampling illustrates the limit; algebra establishes it here.
console.log(JSON.stringify(quotients));`,
      output: '[6.1,6.01,6.001]',
      notes: ['Simplifying avoids subtracting nearly equal squares in this demonstration.', 'A few values on one side do not prove a general two-sided limit.'],
    },
    pitfalls: ['Substituting h = 0 into the original quotient causes division by zero.', 'One-sided samples can miss a different limit from the other side.'],
    related: ['derivative', 'finite-change', 'infinity'],
    diagram: { nodes: ['h: 0.1 → 0.01 → 0.001', 'quotient = 6 + h', '6.1 → 6.01 → 6.001', 'limit as h → 0: 6'], caption: 'The explicit formula explains why the illustrated values approach six.' },
  },
  'derivative': {
    readAs: 'f prime of x; d f by d x; f double prime of x.',
    intuition: 'Think of the slope you feel at one spot on a hill. A derivative is the limiting rate of output change per unit of input change. Differentiating again gives the second derivative, which measures how the first derivative changes.',
    steps: ['Use f(x) = x² at x = 3 and a small step h = 0.001.', 'Evaluate f(3.001) = 9.006001 and f(2.999) = 8.994001.', 'The central difference is (9.006001 − 8.994001)/0.002 ≈ 6.', 'Analytically f′(x) = 2x and f″(x) = 2, so the derivative at 3 is exactly 6.'],
    example: {
      title: 'Approximate the slope near x = 3',
      code: `const f = x => x * x;
const x = 3, h = 0.001;
const right = f(x + h);
const left = f(x - h);
// A finite central difference approximates a derivative.
const slope = (right - left) / (2 * h);
console.log(slope.toFixed(6));`,
      output: '6.000000',
      notes: ['The code uses a numerical approximation even though the exact derivative is known here.', 'The second prime means differentiating the first derivative, not squaring it.'],
    },
    pitfalls: ['A derivative at one point is not generally the average slope across a large interval.', 'Making h extremely small can amplify floating-point cancellation instead of improving accuracy.'],
    related: ['limit', 'partial-derivative', 'finite-change'],
    diagram: { nodes: ['x = 3; h = 0.001', 'f(3±h): 9.006001, 8.994001', 'difference / 0.002', 'slope ≈ 6.000000'], caption: 'Nearby function values give a numerical estimate of the local slope.' },
  },
  'partial-derivative': {
    readAs: 'The partial derivative of f with respect to x.',
    intuition: 'Imagine changing one control knob while keeping all the other knobs still. A partial derivative measures a multivariable function’s rate of change with respect to one chosen input. Here y stays fixed while x moves.',
    steps: ['Use f(x, y) = x² + 3y at (3, 4), with h = 0.001.', 'Keep y = 4: f(3.001, 4) = 21.006001 and f(2.999, 4) = 20.994001.', 'Divide the output difference by 2h = 0.002 to get approximately 6.', 'This agrees with the exact x partial, 2x, evaluated at x = 3.'],
    example: {
      title: 'Move x while holding y fixed',
      code: `const f = (x, y) => x * x + 3 * y;
const x = 3, y = 4, h = 0.001;
// Only x changes in these two evaluations.
const right = f(x + h, y);
const left = f(x - h, y);
const partialX = (right - left) / (2 * h);
console.log(partialX.toFixed(6));`,
      output: '6.000000',
      notes: ['The finite central difference is a numerical approximation.', 'The unchanged y contributes the same 12 to both evaluations, so it cancels.'],
    },
    pitfalls: ['Changing x and y together does not isolate the x partial derivative.', 'A partial derivative is one rate; a gradient collects the rates for all input coordinates.'],
    related: ['derivative', 'gradient', 'function-notation'],
    diagram: { nodes: ['(x,y) = (3,4); h = 0.001', 'hold y=4; move x to 3±h', '21.006001 − 20.994001', 'divide by 0.002 → ≈6'], caption: 'Holding the other input fixed isolates sensitivity to x.' },
  },
  'gradient': {
    readAs: 'The gradient of f; nabla f; del f.',
    intuition: 'Think of a list reporting what happens when you nudge each control knob separately. A gradient collects a scalar function’s first partial derivatives in coordinate order. For ordinary Euclidean coordinates, it points toward the steepest local increase when it is nonzero.',
    steps: ['Use f(x, y) = x² + 3y at (3, 4).', 'Differentiate with respect to x while fixing y: ∂f/∂x = 2x = 6.', 'Differentiate with respect to y while fixing x: ∂f/∂y = 3.', 'Put the components in x, y order to get ∇f(3, 4) = [6, 3].'],
    example: {
      title: 'Collect two partial derivatives in order',
      code: `const point = [3, 4];
// These analytic formulas belong to f(x,y) = x² + 3y.
const partialX = (x, y) => 2 * x;
const partialY = (x, y) => 3;
const [x, y] = point;
const gradient = [partialX(x, y), partialY(x, y)];
console.log(JSON.stringify(gradient));`,
      output: '[6,3]',
      notes: ['These derivatives are supplied analytically; the code is not a general symbolic differentiator.', 'The first component describes x sensitivity and the second describes y sensitivity.'],
    },
    pitfalls: ['The gradient is a vector of partial derivatives, not the scalar function value f(3, 4) = 21.', 'Component order must match the input coordinate order.'],
    related: ['partial-derivative', 'vector-component', 'dot-product'],
    diagram: { nodes: ['f(x,y)=x²+3y at (3,4)', 'x partial: 2×3 = 6', 'y partial: 3', 'gradient: [6,3]'], caption: 'The gradient packages each coordinate’s local rate of change into one vector.' },
  },
  'indefinite-integral': {
    readAs: 'The integral of f of x with respect to x, plus a constant C.',
    intuition: 'Imagine finding a height rule when you know its slope everywhere. An indefinite integral gives a family of antiderivatives. Adding a constant changes the height but leaves the slope unchanged.',
    steps: ['Start with f(x) = 2x.', 'An antiderivative is x² because its derivative is 2x.', 'Include every vertical shift: F(x) = x² + C.', 'At x = 3, C = 0 gives 9 and C = 7 gives 16; both antiderivatives still have derivative 2x.'],
    example: {
      title: 'Evaluate two members of an antiderivative family',
      code: `// Every chosen C gives an antiderivative of f(x) = 2x.
const F = (x, C) => x * x + C;
const x = 3;
const unshifted = F(x, 0);
const shifted = F(x, 7);
console.log(JSON.stringify([unshifted, shifted]));`,
      output: '[9,16]',
      notes: ['The antiderivative formula is supplied analytically, not discovered by the code.', 'C is arbitrary; choosing two constants illustrates two members of an entire family.'],
    },
    pitfalls: ['Forgetting + C loses other antiderivatives on the same interval.', 'An indefinite integral is a family of functions, not one numerical area.'],
    related: ['definite-integral', 'derivative', 'function-notation'],
    diagram: { nodes: ['integrand: 2x', 'antiderivatives: x² + C', 'at x=3: 9 + C', 'C=0 → 9; C=7 → 16'], caption: 'Different constants shift an antiderivative without changing its derivative.' },
  },
  'definite-integral': {
    readAs: 'The integral from a to b of f of x with respect to x; F of x evaluated from a to b.',
    intuition: 'Imagine adding many narrow signed strips under a graph. A definite integral is the limiting signed accumulation across an interval. For continuous f with antiderivative F, that accumulation equals F(b) minus F(a).',
    steps: ['Approximate ∫ from 0 to 1 of x² dx with 100 midpoint strips, each of width 0.01.', 'The first midpoint is 0.005, contributing 0.005² × 0.01 = 0.00000025.', 'Adding all 100 midpoint contributions gives approximately 0.333325.', 'The antiderivative x³/3 gives F(1) − F(0) = 1/3, displayed as 0.333333.'],
    example: {
      title: 'Compare midpoint strips with an antiderivative',
      code: `const a = 0, b = 1, count = 100;
const width = (b - a) / count;
let area = 0;
for (let i = 0; i < count; i++) {
  const midpoint = a + (i + 0.5) * width;
  area += midpoint ** 2 * width;
}
// The finite strip sum is approximate; F(x)=x³/3 is known here.
const exactFormula = b ** 3 / 3 - a ** 3 / 3;
console.log(JSON.stringify([Number(area.toFixed(6)), Number(exactFormula.toFixed(6))]));`,
      output: '[0.333325,0.333333]',
      notes: ['The first result is a numerical approximation using 100 strips.', 'The second evaluates the exact antiderivative formula with a rounded decimal display.'],
    },
    pitfalls: ['A definite integral is signed; portions below the x axis contribute negatively.', 'Reversing the integration bounds reverses the sign, and a finite strip sum generally has approximation error.'],
    related: ['indefinite-integral', 'summation', 'limit'],
    diagram: { nodes: ['100 strips; width = 0.01', 'midpoints: 0.005 … 0.995', 'sum midpoint² × 0.01', '≈0.333325; exact value 1/3'], caption: 'More, thinner strips approximate signed accumulation; the antiderivative gives the exact value here.' },
  },
  'infinity': {
    readAs: 'Infinity; negative infinity; increases without bound.',
    intuition: 'Imagine counting upward with no final largest number. Infinity describes unbounded behavior rather than a finite real value. JavaScript provides special Infinity values, but their arithmetic does not replace reasoning about limits.',
    steps: ['Take the positive inputs 10, 100, and 1000.', 'Their reciprocals are 0.1, 0.01, and 0.001.', 'As the positive input grows without bound, its reciprocal approaches 0.', 'JavaScript also returns 0 for 1 / Infinity, while Number.isFinite(Infinity) returns false.'],
    example: {
      title: 'Distinguish an unbounded limit from finite inputs',
      code: `const growingInputs = [10, 100, 1000];
const reciprocals = growingInputs.map(x => 1 / x);
// Infinity is a special machine value, not a finite real.
const infinityIsFinite = Number.isFinite(Infinity);
const reciprocalOfInfinity = 1 / Infinity;
console.log(JSON.stringify([reciprocals, infinityIsFinite, reciprocalOfInfinity]));`,
      output: '[[0.1,0.01,0.001],false,0]',
      notes: ['The sampled reciprocals illustrate the limit as x tends to positive infinity.', 'The final zero follows JavaScript’s special-value arithmetic.'],
    },
    pitfalls: ['Infinity − Infinity produces NaN in JavaScript and does not define the value of an indeterminate limit.', 'A loop with an infinite upper bound will not compute an infinite sum by finishing.'],
    related: ['limit', 'real-numbers', 'definite-integral'],
    diagram: { nodes: ['x: 10 → 100 → 1000', '1/x: 0.1 → 0.01 → 0.001', 'as x → ∞, 1/x → 0', 'Infinity is not finite'], caption: 'The absence of a finite upper bound is different from storing a very large number.' },
  },
  'graphics-directions': {
    readAs: 'Omega sub i; Omega plus; E perpendicular.',
    intuition: 'Imagine tilting a flashlight beam across a tabletop: a slanted beam spreads its energy over more surface. In this graphics convention, ωᵢ points from the surface toward the incoming light and Ω⁺ contains the directions above the surface. Multiplying beam irradiance E⊥ by the positive surface cosine gives its surface contribution.',
    steps: ['Use the unit normal n = (0, 0, 1) and unit light direction ωᵢ = (0, √3/2, 0.5).', 'The dot product is 0 × 0 + 0 × √3/2 + 1 × 0.5 = 0.5.', 'Clamp with max(0, 0.5) to keep only light from the front hemisphere.', 'For E⊥ = 8, the surface irradiance contribution is 8 × 0.5 = 4.'],
    example: {
      title: 'Project a beam onto a surface',
      code: `const normal = [0, 0, 1];
const omega = [0, Math.sqrt(3) / 2, 0.5];
const beamIrradiance = 8;
// Both vectors have unit length in this convention.
const dot = normal.reduce((sum, n, i) => sum + n * omega[i], 0);
const cosine = Math.max(0, dot);
const surfaceContribution = beamIrradiance * cosine;
console.log(JSON.stringify([cosine, surfaceContribution]));`,
      output: '[0.5,4]',
      notes: ['The positive dot product places this direction in the upper hemisphere.', 'A direction behind the surface would clamp to zero.'],
    },
    pitfalls: ['A dot product equals the angle’s cosine only when both direction vectors are normalized.', 'Direction sign conventions vary; a vector pointing along light travel may need its sign reversed here.'],
    related: ['dot-product', 'unit-vector', 'graphics-radiance'],
    diagram: { nodes: ['n=(0,0,1); ωᵢ z=0.5', 'n·ωᵢ = 0.5', 'front cosine = max(0,0.5)', 'E = 8 × 0.5 = 4'], caption: 'The unit direction’s surface cosine converts beam irradiance into a surface contribution.' },
  },
  'graphics-radiance': {
    readAs: 'L sub i; L sub o equals R over pi times E.',
    intuition: 'Imagine a matte surface reflecting part of the light that reaches it. Irradiance E measures incoming power per surface area, while outgoing radiance Lₒ measures light leaving per projected area and direction solid angle. For an ideal Lambertian surface, reflectance R scales E and division by π distributes the reflection over the hemisphere.',
    steps: ['Choose reflectance R = 0.5, meaning the surface reflects half the incident power.', 'Use surface irradiance E = π, with the surface-angle effect already included.', 'Apply Lₒ = (R/π)E = (0.5/π) × π.', 'The outgoing radiance is 0.5 in compatible units.'],
    example: {
      title: 'Compute a Lambertian outgoing radiance',
      code: `const reflectance = 0.5;
// E already measures irradiance on the actual surface.
const surfaceIrradiance = Math.PI;
const lambertianFactor = reflectance / Math.PI;
const outgoingRadiance = lambertianFactor * surfaceIrradiance;
console.log(outgoingRadiance.toFixed(6));`,
      output: '0.500000',
      notes: ['R is dimensionless and lies between 0 and 1 in this simple reflectance model.', 'If E is in W/m², Lₒ is in W/(m²·sr); radiance and irradiance have different units.'],
    },
    pitfalls: ['Do not multiply by the incoming cosine again when E already includes that surface projection.', 'The formula is for ideal diffuse Lambertian reflection, not every material or a direct equality between incoming and outgoing radiance.'],
    related: ['graphics-directions', 'trigonometry', 'definite-integral'],
    diagram: { nodes: ['R = 0.5; surface E = π', 'Lambertian factor: 0.5/π', 'Lₒ = (0.5/π) × π', 'outgoing radiance = 0.5'], caption: 'The simple diffuse model converts surface irradiance to outgoing radiance using R/π.' },
  },
};
