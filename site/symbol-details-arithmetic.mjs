// Expanded, executable examples for arithmetic and linear-algebra notation.
export const arithmeticDetails = {
  'arithmetic-operations': {
    readAs: 'a plus b; a minus b; a divided by b',
    intuition: 'Think of splitting a shared bill after adding its charges. Addition combines amounts, subtraction finds what remains, and division splits an amount into equal parts. A fraction bar groups everything above it and everything below it; its denominator must be nonzero.',
    steps: ['Add the meal and delivery: 18 + 6 = 24.', 'Subtract the discount: 24 − 4 = 20.', 'Divide the full remaining bill by 4 people: 20 / 4 = 5.'],
    example: {
      title: 'Split a discounted delivery bill',
      code: `const meal = 18;
const delivery = 6;
const discount = 4;
const people = 4;
// Finish the whole numerator before dividing.
const remaining = meal + delivery - discount;
const perPerson = remaining / people;
console.log(perPerson.toFixed(2));`,
      output: '5.00',
      notes: ['remaining combines all charges and the discount into one amount.', 'Dividing remaining by people splits the entire 20, not just the final term.', 'toFixed(2) prints two decimal places for this money example.'],
    },
    pitfalls: ['Writing 18 + 6 - 4 / 4 divides only the discount because division happens first.', 'Division by zero has no real-number answer; JavaScript may return Infinity or NaN.'],
    related: ['scalar-multiplication', 'equality', 'arithmetic-mean'],
    diagram: { nodes: ['18 + 6 = 24', '24 − 4 = 20', '20 / 4 = 5 each'], caption: 'Combine the charges, apply the discount, then split the remaining bill.' },
  },
  'scalar-multiplication': {
    readAs: 'a times b; three x y means three times x times y',
    intuition: 'Think of buying several identical boxes. Multiplication finds the total when each box holds the same amount. A scalar is one number, and a product such as 3xy multiplies all three numbers.',
    steps: ['Each box holds 6 packets.', 'Buy 4 boxes: 4 × 6 = 24 packets.', 'Each packet holds 2 pencils: 24 × 2 = 48 pencils.'],
    example: {
      title: 'Count pencils across boxes and packets',
      code: `const boxes = 4;
const packetsPerBox = 6;
const pencilsPerPacket = 2;
// Each factor adds another level of equal groups.
const packets = boxes * packetsPerBox;
const pencils = packets * pencilsPerPacket;
console.log(JSON.stringify({ packets, pencils }));`,
      output: '{"packets":24,"pencils":48}',
      notes: ['The first multiplication counts packets across all 4 boxes.', 'The second multiplication converts the 24 packets into 48 pencils.', 'JavaScript needs an explicit * between factors.'],
    },
    pitfalls: ['JavaScript does not understand implicit multiplication such as 3xy or 2(4 + 1).', 'The × symbol between vectors can mean a cross product, so check the kind of values being multiplied.'],
    related: ['arithmetic-operations', 'power', 'vector-scaling'],
    diagram: { nodes: ['4 boxes × 6 packets', '24 packets × 2 pencils', '48 pencils'], caption: 'Multiply the number of equal groups at each packaging level.' },
  },
  equality: {
    readAs: 'equals; is equal to',
    intuition: 'Think of two sides of a balanced scale. An equality says the expressions on both sides have the same value, even when they look different. In JavaScript, === compares values without converting their types; = stores a value.',
    steps: ['Evaluate the left side: 3 × (2 + 4) = 18.', 'Evaluate the right side: 3 × 2 + 3 × 4 = 6 + 12 = 18.', 'Compare 18 with 18: the equality is true.'],
    example: {
      title: 'Check two ways to calculate the same total',
      code: `const groupSize = 3;
const firstAmount = 2;
const secondAmount = 4;
const grouped = groupSize * (firstAmount + secondAmount);
const expanded = groupSize * firstAmount + groupSize * secondAmount;
// Compare the computed values, not their written forms.
const equal = grouped === expanded;
console.log(JSON.stringify({ grouped, expanded, equal }));`,
      output: '{"grouped":18,"expanded":18,"equal":true}',
      notes: ['grouped adds 2 and 4 before multiplying by 3.', 'expanded multiplies each amount by 3 before adding.', '=== checks that the two computed numbers agree.'],
    },
    pitfalls: ['Using = inside code assigns a value instead of testing mathematical equality.', 'Two separately created arrays are different objects in JavaScript; === does not compare all their components.'],
    related: ['not-equal', 'approximately-equal', 'definition'],
    diagram: { nodes: ['3 × (2 + 4) = 18', '3 × 2 + 3 × 4 = 18', '18 === 18 → true'], caption: 'Different expressions can evaluate to the same number.' },
  },
  'not-equal': {
    readAs: 'is not equal to',
    intuition: 'Think of comparing how many seats two rows contain. The crossed-out equals sign says the two values differ. For numbers in JavaScript, !== tests this without changing their types.',
    steps: ['The first row has 3 + 4 = 7 seats.', 'The second row has 2 × 4 = 8 seats.', 'Compare 7 and 8: 7 ≠ 8 is true.'],
    example: {
      title: 'Compare two seating plans',
      code: `const leftSection = 3;
const rightSection = 4;
const firstRow = leftSection + rightSection;
const secondRow = 2 * rightSection;
// Different totals make this comparison true.
const different = firstRow !== secondRow;
console.log(JSON.stringify({ firstRow, secondRow, different }));`,
      output: '{"firstRow":7,"secondRow":8,"different":true}',
      notes: ['firstRow adds the two sections to obtain 7.', 'secondRow doubles the 4-seat section to obtain 8.', '!== returns true because the two numbers differ.'],
    },
    pitfalls: ['A true not-equal comparison tells you the values differ; it does not tell you which is larger.', 'With floating-point calculations, a tiny rounding difference can make !== true; use a chosen tolerance when appropriate.'],
    related: ['equality', 'approximately-equal', 'absolute-value'],
    diagram: { nodes: ['3 + 4 = 7 seats', '2 × 4 = 8 seats', '7 !== 8 → true'], caption: 'The comparison checks whether the two seating totals differ.' },
  },
  'approximately-equal': {
    readAs: 'is approximately equal to',
    intuition: 'Think of checking whether a measurement is close enough to a target. Approximate equality accepts a small difference under a stated rule. Here the rule uses an absolute tolerance, which must be chosen for the units and scale of the problem.',
    steps: ['Measure 10.02 against a target of 10.00.', 'Find the distance between them: |10.02 − 10.00| ≈ 0.02.', 'Choose an allowed difference of 0.05.', 'Since 0.02 ≤ 0.05, accept the measurement.'],
    example: {
      title: 'Check a measurement against an allowed error',
      code: `const measured = 10.02;
const target = 10;
const tolerance = 0.05;
// Distance ignores which value is larger.
const difference = Math.abs(measured - target);
const closeEnough = difference <= tolerance;
const shownDifference = difference.toFixed(2);
console.log(JSON.stringify({ difference: shownDifference, closeEnough }));`,
      output: '{"difference":"0.02","closeEnough":true}',
      notes: ['Math.abs turns the signed difference into a nonnegative distance.', 'The comparison uses the unrounded difference and the explicit 0.05 tolerance.', 'toFixed only formats the displayed difference; it does not decide acceptance.'],
    },
    pitfalls: ['There is no universal tolerance; 0.05 means different things for meters, money, and very large numbers.', 'Rounding both inputs before comparing can hide a difference near the acceptance boundary.'],
    related: ['equality', 'not-equal', 'absolute-value'],
    diagram: { nodes: ['Target 10.00; measured 10.02', '|difference| ≈ 0.02', '0.02 ≤ 0.05 → accepted'], caption: 'The tolerance states exactly what “close enough” means in this example.' },
  },
  definition: {
    readAs: 'is defined as; define f of x to be',
    intuition: 'Think of giving a name to a recipe so you can use it again. A definition introduces the meaning of a symbol or a rule; it is not a claim waiting to be proved. In x =: y the name on the right is being defined, while x := y defines the name on the left.',
    steps: ['Define a fee rule: fee(k) := 3 + 2k.', 'Insert k = 4: fee(4) = 3 + 2 × 4 = 11.', 'Insert k = 6: fee(6) = 3 + 2 × 6 = 15.'],
    example: {
      title: 'Name a reusable price rule',
      code: `const baseFee = 3;
const pricePerItem = 2;
// This function defines the same rule for every item count.
const fee = items => baseFee + pricePerItem * items;
const fourItems = fee(4);
const sixItems = fee(6);
console.log(JSON.stringify({ fourItems, sixItems }));`,
      output: '{"fourItems":11,"sixItems":15}',
      notes: ['fee defines a rule rather than storing just one computed price.', 'fee(4) replaces items with 4 and calculates 3 + 8.', 'The second call reuses the definition with a new input.'],
    },
    pitfalls: ['The symbols := and =: are mathematical notation, not JavaScript operators.', 'A definition needs a clear input range; a fee rule intended for item counts should use nonnegative integers.'],
    related: ['equality', 'scalar-multiplication', 'arithmetic-operations'],
    diagram: { nodes: ['fee(k) := 3 + 2k', 'k = 4 → 3 + 8 = 11', 'k = 6 → 3 + 12 = 15'], caption: 'One definition supplies a calculation for each allowed input.' },
  },
  'square-root': {
    readAs: 'the square root of x',
    intuition: 'Think of finding a square’s side length from its area. For a nonnegative real number x, √x gives the nonnegative number whose square is x. Although both 5 and −5 square to 25, √25 specifically means 5.',
    steps: ['A square has area 25 square units.', 'Find the nonnegative side length: √25 = 5.', 'Check by squaring: 5 × 5 = 25.'],
    example: {
      title: 'Recover a square’s side from its area',
      code: `const area = 25;
// Math.sqrt returns the nonnegative real square root.
const side = Math.sqrt(area);
const reconstructedArea = side * side;
const verified = reconstructedArea === area;
console.log(JSON.stringify({ side, reconstructedArea, verified }));`,
      output: '{"side":5,"reconstructedArea":25,"verified":true}',
      notes: ['Math.sqrt(25) selects the nonnegative root 5.', 'Multiplying side by itself reconstructs the original area.', 'The equality check confirms the result exactly for these integer values.'],
    },
    pitfalls: ['√25 is 5; solving x² = 25 has two real solutions, 5 and −5.', 'A negative input has no real square root; Math.sqrt(-1) returns NaN rather than the imaginary unit.'],
    related: ['power', 'imaginary-unit', 'euclidean-norm'],
    diagram: { nodes: ['Area = 25 square units', '√25 = side 5', 'Check: 5 × 5 = 25'], caption: 'Square root reverses squaring while selecting the nonnegative result.' },
  },
  'imaginary-unit': {
    readAs: 'i squared equals negative one',
    intuition: 'Think of a number with two coordinates: a real part and an imaginary part. The special number i obeys i² = −1, which lets complex numbers describe square roots unavailable on the real number line. JavaScript can store the two parts in an object, but you must implement their arithmetic.',
    steps: ['Represent 2 + 3i by the pair (2, 3).', 'Expand its square: (2 + 3i)² = 4 + 12i + 9i².', 'Replace i² with −1: 4 + 12i − 9 = −5 + 12i.'],
    example: {
      title: 'Square a complex number with two stored parts',
      code: `const z = { re: 2, im: 3 };
// (a + bi)² = (a² - b²) + (2ab)i because i² = -1.
const realPart = z.re * z.re - z.im * z.im;
const imaginaryPart = 2 * z.re * z.im;
const squared = { re: realPart, im: imaginaryPart };
console.log(JSON.stringify(squared));`,
      output: '{"re":-5,"im":12}',
      notes: ['re stores the real part 2 and im stores the coefficient 3 of i.', 'Subtracting the imaginary-part square applies i² = −1.', 'The result object represents −5 + 12i.'],
    },
    pitfalls: ['The imaginary component stores a coefficient such as 3, not a JavaScript value named i.', 'Using * on two complex-number objects does not perform complex multiplication.'],
    related: ['square-root', 'power', 'vector-component'],
    diagram: { nodes: ['z = 2 + 3i', 'z² = 4 + 12i + 9i²', 'i² = −1 → −5 + 12i'], caption: 'The imaginary unit changes the 9i² term into −9.' },
  },
  power: {
    readAs: 'b to the power y; b raised to y',
    intuition: 'Think of doubling a quantity once at each round. A positive integer exponent counts repeated factors of the base. A zero exponent gives 1 for a nonzero base, and a negative integer exponent gives a reciprocal; other exponents need suitable real or complex domains.',
    steps: ['Start with 1 and multiply by 3: the first power is 3.', 'Multiply by 3 again: 3² = 9.', 'Multiply a third time: 3³ = 27.', 'The reciprocal power is 3⁻³ = 1 / 27 ≈ 0.037037.'],
    example: {
      title: 'Build a power one factor at a time',
      code: `const base = 3;
const exponent = 3;
let repeated = 1;
// One multiplication for each positive integer in this example.
for (let count = 0; count < exponent; count++) repeated *= base;
const direct = base ** exponent;
const reciprocal = (base ** -exponent).toFixed(6);
console.log(JSON.stringify({ repeated, direct, reciprocal }));`,
      output: '{"repeated":27,"direct":27,"reciprocal":"0.037037"}',
      notes: ['Starting repeated at 1 supplies the neutral value for multiplication.', 'The loop multiplies by 3 exactly three times; ** computes the same power directly.', 'The negative exponent takes the reciprocal of 27, displayed to six decimal places.'],
    },
    pitfalls: ['JavaScript ^ is a bitwise XOR operator; use ** for exponentiation.', 'Parentheses matter: (-3) ** 2 is 9, while -(3 ** 2) is −9.'],
    related: ['scalar-multiplication', 'logarithm-exponential', 'square-root'],
    diagram: { nodes: ['Start 1', '×3 → 3 → 9 → 27', '3³ = 27', '3⁻³ = 1/27'], caption: 'Three factors of 3 form the cube; a negative exponent takes its reciprocal.' },
  },
  'logarithm-exponential': {
    readAs: 'log base b of x; natural log of x; e to the x',
    intuition: 'Think of asking how many doubling rounds produced a total. A logarithm finds the exponent: log₂32 = 5 because 2⁵ = 32. Natural log uses base e, and eˣ reverses natural log; real logarithms require a positive input and a positive base different from 1.',
    steps: ['Five doubling rounds give 2⁵ = 32.', 'Reverse the question: log₂32 = 5.', 'Compute the same exponent as ln(32) / ln(2).', 'Natural log and exp undo each other: e^(ln 32) ≈ 32.'],
    example: {
      title: 'Recover the number of doubling rounds',
      code: `const base = 2;
const total = 32;
// Change the logarithm base using natural logarithms.
const rounds = Math.log(total) / Math.log(base);
const rebuiltWithPower = base ** Math.round(rounds);
const rebuiltWithExp = Math.exp(Math.log(total));
console.log(JSON.stringify({ rounds: rounds.toFixed(0), rebuiltWithPower, rebuiltWithExp: rebuiltWithExp.toFixed(0) }));`,
      output: '{"rounds":"5","rebuiltWithPower":32,"rebuiltWithExp":"32"}',
      notes: ['Math.log is the natural logarithm, so dividing two logs changes the base to 2.', 'The integer rounding reflects this example’s exact whole number of doubling rounds.', 'Math.exp reverses Math.log up to floating-point rounding.'],
    },
    pitfalls: ['Math.log(x) means ln(x), not automatically log base 10.', 'Zero and negative real inputs are outside the real logarithm’s domain; base 1 is also invalid.'],
    related: ['power', 'approximately-equal', 'definition'],
    diagram: { nodes: ['2⁵ = 32', 'log₂32 = ln32 / ln2 = 5', 'exp(ln32) ≈ 32'], caption: 'Powers build the total; logarithms recover the exponent.' },
  },
  trigonometry: {
    readAs: 'sine theta; cosine theta; tangent theta; pi',
    intuition: 'Think of walking around a circle of radius 1. At angle θ from the positive horizontal direction, cosine gives the horizontal coordinate and sine gives the vertical coordinate. Tangent is sine divided by cosine where cosine is nonzero, and π radians is half a turn.',
    steps: ['Choose a 60° angle on a circle of radius 2.', 'Convert to radians: 60 × π / 180 = π / 3.', 'Horizontal position: 2 cos(π / 3) ≈ 1.000.', 'Vertical position: 2 sin(π / 3) ≈ 1.732; tan(π / 3) ≈ 1.732.'],
    example: {
      title: 'Locate a point on a circle',
      code: `const degrees = 60;
const radius = 2;
// JavaScript trigonometric functions accept radians.
const theta = degrees * Math.PI / 180;
const x = radius * Math.cos(theta);
const y = radius * Math.sin(theta);
const slope = Math.tan(theta);
console.log(JSON.stringify({ x: x.toFixed(3), y: y.toFixed(3), slope: slope.toFixed(3) }));`,
      output: '{"x":"1.000","y":"1.732","slope":"1.732"}',
      notes: ['Multiplying degrees by π / 180 converts the angle into radians.', 'Scaling cosine and sine by radius gives the circle’s coordinates.', 'Tangent equals y / x here because x is nonzero.'],
    },
    pitfalls: ['Passing 60 directly into Math.sin asks for 60 radians, not 60 degrees.', 'Tangent is undefined when cosine is zero; floating-point code near those angles can return huge numbers.'],
    related: ['euclidean-norm', 'approximately-equal', 'arithmetic-operations'],
    diagram: { nodes: ['60° → π/3 radians', 'Radius 2', 'x = 2 cosθ ≈ 1.000', 'y = 2 sinθ ≈ 1.732'], caption: 'Sine and cosine turn one angle and a radius into two coordinates.' },
  },
  modulo: {
    readAs: 'a modulo m; a is congruent to b modulo m',
    intuition: 'Think of positions wrapping around a clock. For a positive integer modulus m, modulo puts an integer into the range from 0 through m − 1. Two integers are congruent modulo m when they land on the same position, equivalently when their difference is divisible by m.',
    steps: ['Use clock positions numbered 0 through 11.', 'Move from position 10 forward 5: 10 + 5 = 15.', 'Wrap 15 modulo 12 to position 3.', 'Move back 4 from position 1: −3 modulo 12 is 9.'],
    example: {
      title: 'Wrap moves around a twelve-position clock',
      code: `const size = 12;
// Normalize JavaScript's possibly negative remainder.
const mod = value => ((value % size) + size) % size;
const forward = mod(10 + 5);
const backward = mod(1 - 4);
const congruent = mod(15) === mod(3);
console.log(JSON.stringify({ forward, backward, congruent }));`,
      output: '{"forward":3,"backward":9,"congruent":true}',
      notes: ['The second % ensures each result lies between 0 and 11.', 'forward wraps 15 to 3, while backward wraps −3 to 9.', 'The comparison checks that 15 and 3 share the same modulo-12 position.'],
    },
    pitfalls: ['JavaScript -3 % 12 is −3; it is not the nonnegative modulo value 9.', 'The modulus must be positive in this convention; a zero modulus is invalid.'],
    related: ['arithmetic-operations', 'equality', 'not-equal'],
    diagram: { nodes: ['10 + 5 = 15', '15 mod 12 = 3', '1 − 4 = −3', '−3 mod 12 = 9'], caption: 'Modulo wraps both forward and backward moves into the allowed clock positions.' },
  },
  factorial: {
    readAs: 'n factorial',
    intuition: 'Think of lining up distinct books on a shelf. With 4 books, there are 4 choices for the first place, then 3, then 2, then 1. Factorial multiplies these decreasing choices for a nonnegative integer n, with 0! = 1 for the one empty arrangement.',
    steps: ['Choose the first of 4 distinct books: 4 options.', 'Choose the next books: 3 options, then 2, then 1.', 'Multiply: 4 × 3 × 2 × 1 = 24 arrangements.', 'For no books, the empty arrangement counts once: 0! = 1.'],
    example: {
      title: 'Count arrangements of four distinct books',
      code: `const factorial = n => {
  if (!Number.isInteger(n) || n < 0) throw new Error('Use a nonnegative integer');
  let result = 1; // Keeps the empty product, 0!, equal to 1.
  for (let factor = 2; factor <= n; factor++) result *= factor;
  return result;
};
const arrangements = factorial(4);
const emptyArrangement = factorial(0);
console.log(JSON.stringify({ arrangements, emptyArrangement }));`,
      output: '{"arrangements":24,"emptyArrangement":1}',
      notes: ['The input guard limits this factorial definition to nonnegative integers.', 'The loop multiplies 2, 3, and 4; multiplying by 1 would not change the result.', 'With input 0, the loop does not run and the initial 1 is returned.'],
    },
    pitfalls: ['Factorials grow quickly; JavaScript Number stops representing every integer exactly for large results.', 'n! is not n multiplied by itself n times; that would be nⁿ.'],
    related: ['sequence-product', 'binomial-coefficient', 'power'],
    diagram: { nodes: ['4 choices', 'then 3, then 2, then 1', '4 × 3 × 2 × 1 = 24', '0 books → 1 empty arrangement'], caption: 'Each placement reduces the number of remaining choices by one.' },
  },
  'binomial-coefficient': {
    readAs: 'n choose k',
    intuition: 'Think of selecting a two-person team from four people. Choosing A with B gives the same team as choosing B with A, so order must not be counted twice. For integers 0 ≤ k ≤ n, n choose k counts unordered selections and equals n! / (k!(n − k)!).',
    steps: ['Name four people A, B, C, and D.', 'List the pairs beginning with A: AB, AC, AD.', 'Add the remaining pairs: BC, BD, CD.', 'There are 6 teams, matching 4! / (2! × 2!) = 6.'],
    example: {
      title: 'List every two-person team without duplicates',
      code: `const people = ['A', 'B', 'C', 'D'];
const teams = [];
// Start j after i, so AB appears once and BA never repeats it.
for (let i = 0; i < people.length; i++) {
  for (let j = i + 1; j < people.length; j++) {
    teams.push(people[i] + people[j]);
  }
}
console.log(JSON.stringify({ teams, count: teams.length }));`,
      output: '{"teams":["AB","AC","AD","BC","BD","CD"],"count":6}',
      notes: ['The outer index chooses the first person in each pair.', 'Starting j at i + 1 prevents selecting a person twice and prevents reversed duplicates.', 'teams.length counts the unordered two-person selections.'],
    },
    pitfalls: ['If order matters, use a permutation count; AB and BA would then be different outcomes.', 'This selection interpretation uses distinct items and integer counts with 0 ≤ k ≤ n.'],
    related: ['factorial', 'sequence-product', 'summation'],
    diagram: { nodes: ['4 people: A B C D', 'With A: AB AC AD', 'Others: BC BD CD', '4 choose 2 = 6 teams'], caption: 'Each distinct pair appears once, regardless of the order of its members.' },
  },
  'vector-component': {
    readAs: 'bold x; x sub i; the i-th component of x',
    intuition: 'Think of a row of numbered storage boxes. A vector keeps an ordered list of components, and a subscript selects one box’s value. The subscript is an index rather than a multiplication, and you must check whether the notation starts counting at 0 or 1.',
    steps: ['Store the vector x = [12, 7, 9].', 'In one-based notation, choose component x₂ = 7.', 'Convert component number 2 to JavaScript index 2 − 1 = 1.', 'Read x[1] and obtain 7.'],
    example: {
      title: 'Translate a mathematical component number into an array index',
      code: `const x = [12, 7, 9];
const componentNumber = 2; // This written convention starts at 1.
const index = componentNumber - 1;
const component = x[index];
const dimensions = x.length;
console.log(JSON.stringify({ index, component, dimensions }));`,
      output: '{"index":1,"component":7,"dimensions":3}',
      notes: ['componentNumber names the second component using a one-based convention.', 'Subtracting 1 translates that number to JavaScript’s zero-based index.', 'x.length counts components; it does not measure the vector’s geometric length.'],
    },
    pitfalls: ['Reading x[2] in JavaScript selects the third component, not the second.', 'xᵢ means a selected component; it does not mean x multiplied by i.'],
    related: ['matrix-shape', 'euclidean-norm', 'vector-scaling'],
    diagram: { nodes: ['x = [12, 7, 9]', 'Written component: x₂', 'JS index: 2 − 1 = 1', 'x[1] = 7'], caption: 'Convert the chosen indexing convention before accessing the array.' },
  },
  'matrix-shape': {
    readAs: 'A is in R m by n; A sub i j; row i, column j of A',
    intuition: 'Think of a table with rows running across and columns running down. An m × n real matrix has m rows, n columns, and a real number at every row-column position. Aᵢⱼ names one entry, using row first and column second.',
    steps: ['Arrange [2, 4, 6] above [8, 10, 12].', 'Count 2 rows and 3 columns, giving shape 2 × 3.', 'Choose written row 2 and column 3.', 'Convert to zero-based indices [1][2] and read 12.'],
    example: {
      title: 'Find a table’s shape and one entry',
      code: `const A = [[2, 4, 6], [8, 10, 12]];
const rows = A.length;
const columns = A[0].length;
// Written row 2, column 3 becomes array indices 1 and 2.
const rowIndex = 2 - 1;
const columnIndex = 3 - 1;
const entry = A[rowIndex][columnIndex];
console.log(JSON.stringify({ rows, columns, entry }));`,
      output: '{"rows":2,"columns":3,"entry":12}',
      notes: ['The outer array stores rows, and each inner array stores one row’s entries.', 'A[0].length gives the number of columns because this matrix is nonempty and rectangular.', 'The first index chooses a row and the second chooses a column.'],
    },
    pitfalls: ['Shape is rows × columns; a 2 × 3 matrix has six entries, not three rows.', 'Nested JavaScript arrays may have uneven row lengths; a mathematical matrix must be rectangular.'],
    related: ['vector-component', 'transpose', 'matrix-product'],
    diagram: { nodes: ['Rows: [2,4,6] and [8,10,12]', 'Shape: 2 rows × 3 columns', 'Row 2, column 3 → A[1][2]', 'Entry = 12'], caption: 'The two indices locate an entry inside a rectangular table.' },
  },
  'vector-scaling': {
    readAs: 's times vector v; scale v by s',
    intuition: 'Think of stretching an arrow while keeping its line. Multiplying a vector by a scalar multiplies every component by the same number. A positive factor keeps direction, a negative factor reverses it, and zero produces the zero vector.',
    steps: ['Start with v = [2, −1].', 'Choose the scalar s = −3.', 'Multiply both components: −3 × 2 = −6 and −3 × (−1) = 3.', 'The result [−6, 3] has three times the length and the opposite direction.'],
    example: {
      title: 'Reverse and stretch a displacement',
      code: `const displacement = [2, -1];
const scale = -3;
// Apply the same factor independently to every coordinate.
const scaled = displacement.map(value => scale * value);
const originalLength = Math.hypot(...displacement);
const newLength = Math.hypot(...scaled);
const lengthRatio = newLength / originalLength;
console.log(JSON.stringify({ scaled, lengthRatio: lengthRatio.toFixed(0) }));`,
      output: '{"scaled":[-6,3],"lengthRatio":"3"}',
      notes: ['map multiplies both components by the single scalar −3.', 'Math.hypot measures geometric length before and after scaling.', 'The length ratio is the absolute value of the scalar, which is 3.'],
    },
    pitfalls: ['A negative scalar changes direction; lengths themselves stay nonnegative.', 'Scaling changes component values, not the number of components.'],
    related: ['scalar-multiplication', 'unit-vector', 'euclidean-norm'],
    diagram: { nodes: ['v = [2, −1]', 'Multiply each by −3', '−3v = [−6, 3]', 'Length ×3; direction reversed'], caption: 'The same scalar acts on every coordinate of the displacement.' },
  },
  'hadamard-product': {
    readAs: 'a Hadamard b; the element-wise product of a and b',
    intuition: 'Think of matching each item’s quantity with its own price. An element-wise product multiplies corresponding positions and keeps all the individual products. Both vectors or matrices must have the same shape, and the symbol depends on the author’s definition.',
    steps: ['Take quantities [2, 3, 4] and prices [5, 2, 1].', 'Match the first entries: 2 × 5 = 10.', 'Match the next entries: 3 × 2 = 6 and 4 × 1 = 4.', 'Keep the separate results as [10, 6, 4].'],
    example: {
      title: 'Compute each shopping line’s cost',
      code: `const quantities = [2, 3, 4];
const prices = [5, 2, 1];
if (quantities.length !== prices.length) throw new Error('Match the shapes');
// Keep one product for each corresponding item.
const lineCosts = quantities.map((quantity, index) => quantity * prices[index]);
console.log(JSON.stringify(lineCosts));`,
      output: '[10,6,4]',
      notes: ['The guard checks that every quantity has a matching price.', 'map preserves the positions while multiplying each matching pair.', 'The result retains three line costs rather than adding them into one total.'],
    },
    pitfalls: ['A dot product adds these component products; the Hadamard product keeps them separate.', 'The symbol ∘ can also mean function composition, so read the author’s definition.'],
    related: ['dot-product', 'vector-scaling', 'matrix-product'],
    diagram: { nodes: ['Quantities [2, 3, 4]', 'Prices [5, 2, 1]', '2×5; 3×2; 4×1', 'Line costs [10, 6, 4]'], caption: 'Each quantity pairs only with the price in the same position.' },
  },
  'dot-product': {
    readAs: 'a dot b; the dot product of a and b',
    intuition: 'Think of finding a shopping total from quantities and prices. A dot product first multiplies matching components, then adds the products into one number. For real vectors it also measures alignment; nonzero vectors with dot product zero are perpendicular.',
    steps: ['Use quantities [2, 3, 4] and prices [5, 2, 1].', 'Multiply corresponding entries: [10, 6, 4].', 'Add the products: 10 + 6 + 4 = 20.', 'The result is the scalar total 20.'],
    example: {
      title: 'Turn quantities and prices into a total cost',
      code: `const quantities = [2, 3, 4];
const prices = [5, 2, 1];
if (quantities.length !== prices.length) throw new Error('Match the dimensions');
const products = quantities.map((quantity, index) => quantity * prices[index]);
// Add all matched products to get one scalar.
const total = products.reduce((sum, product) => sum + product, 0);
console.log(JSON.stringify({ products, total }));`,
      output: '{"products":[10,6,4],"total":20}',
      notes: ['The matching-dimension check ensures each quantity has a price.', 'products holds the element-wise products as an intermediate step.', 'reduce sums them starting from 0, producing a single number.'],
    },
    pitfalls: ['The result of a dot product is a scalar, not another vector.', 'The zero vector has zero dot product with every vector but has no direction; the perpendicular-direction interpretation needs nonzero vectors.'],
    related: ['hadamard-product', 'summation', 'matrix-product'],
    diagram: { nodes: ['[2,3,4] · [5,2,1]', 'Products: [10,6,4]', '10 + 6 + 4', 'Total = 20'], caption: 'Pair components, multiply each pair, and add every product.' },
  },
  'cross-product': {
    readAs: 'a cross b; the cross product of a and b',
    intuition: 'Think of choosing the direction sticking out of a flat surface. For two real 3D vectors, the cross product gives a vector perpendicular to both inputs, with orientation set by the right-hand rule. Its length is the parallelogram area, and reversing the inputs reverses the result.',
    steps: ['Choose a = [2, 0, 0] and b = [0, 3, 0].', 'The first two cross-product components are both 0.', 'The third component is 2 × 3 − 0 × 0 = 6.', 'So a × b = [0, 0, 6], while b × a = [0, 0, −6].'],
    example: {
      title: 'Find the perpendicular to two sides of a rectangle',
      code: `const a = [2, 0, 0];
const b = [0, 3, 0];
const cross = (u, v) => [
  u[1] * v[2] - u[2] * v[1],
  u[2] * v[0] - u[0] * v[2],
  u[0] * v[1] - u[1] * v[0],
];
// Swapping the inputs reverses the oriented perpendicular.
const forward = cross(a, b), reverse = cross(b, a);
console.log(JSON.stringify({ forward, reverse, area: Math.hypot(...forward) }));`,
      output: '{"forward":[0,0,6],"reverse":[0,0,-6],"area":6}',
      notes: ['The three component formulas compute the standard 3D cross product.', 'Swapping a and b changes the signs of the result.', 'The perpendicular’s length is the area 2 × 3 = 6.'],
    },
    pitfalls: ['This formula is for 3D vectors; it is not ordinary scalar multiplication or an element-wise product.', 'Parallel inputs produce the zero vector, which has no unique perpendicular direction.'],
    related: ['dot-product', 'euclidean-norm', 'vector-scaling'],
    diagram: { nodes: ['a = [2,0,0]; b = [0,3,0]', 'Third component: 2 × 3 = 6', 'a × b = [0,0,6]', 'b × a = [0,0,−6]'], caption: 'The input order sets which side of the rectangle the perpendicular points toward.' },
  },
  summation: {
    readAs: 'the sum, for i from one to n, of the terms',
    intuition: 'Think of a running total as you read down a list. Sigma tells you to add one term for every index between its lower and upper bounds, including both endpoints. The expression after sigma determines each term; the index is just a temporary name.',
    steps: ['Use the term rule 2i with i running from 1 through 4.', 'Substitute the indices to get 2, 4, 6, and 8.', 'Build the total: 2 + 4 = 6, then 6 + 6 = 12.', 'Add the final term: 12 + 8 = 20.'],
    example: {
      title: 'Sum four terms generated by an index rule',
      code: `const terms = [];
let total = 0;
// The upper bound is inclusive, so i = 4 contributes too.
for (let i = 1; i <= 4; i++) {
  const term = 2 * i;
  terms.push(term);
  total += term;
}
console.log(JSON.stringify({ terms, total }));`,
      output: '{"terms":[2,4,6,8],"total":20}',
      notes: ['i runs through 1, 2, 3, and 4 because the loop uses <=.', '2 * i supplies the term at the current index.', 'total starts at 0 and adds each generated term once.'],
    },
    pitfalls: ['The index values are not necessarily the terms: summing 2i adds 2, 4, 6, 8 rather than 1, 2, 3, 4.', 'Using i < 4 would omit the upper-bound term.'],
    related: ['sequence-product', 'arithmetic-mean', 'dot-product'],
    diagram: { nodes: ['i = 1, 2, 3, 4', '2i = 2, 4, 6, 8', '2 + 4 + 6 + 8', 'Sum = 20'], caption: 'The bounds choose the indices; the term rule chooses the numbers to add.' },
  },
  'arithmetic-mean': {
    readAs: 'x bar; mu; one over n times the sum of the x values',
    intuition: 'Think of sharing the total equally among all observations. The arithmetic mean is the sum divided by the number of observations, which must be positive. Repeated values each count; x̄ often labels a sample mean and μ often labels a population mean.',
    steps: ['Observe the values 2, 2, and 8.', 'Add every observation, including the repeated 2: 2 + 2 + 8 = 12.', 'Count 3 observations.', 'Share the total evenly: 12 / 3 = 4.'],
    example: {
      title: 'Find an equal share without discarding repeated observations',
      code: `const observations = [2, 2, 8];
if (observations.length === 0) throw new Error('Need at least one observation');
// Repeated observations contribute separately to both sum and count.
const total = observations.reduce((sum, value) => sum + value, 0);
const count = observations.length;
const mean = total / count;
console.log(JSON.stringify({ total, count, mean }));`,
      output: '{"total":12,"count":3,"mean":4}',
      notes: ['The guard prevents division by zero for an empty data set.', 'The two observations equal to 2 each contribute to the total.', 'Dividing 12 by the observation count 3 yields the mean 4.'],
    },
    pitfalls: ['Removing duplicates changes the data; the mean of [2, 2, 8] is 4, not 5.', 'The mean need not be one of the observed values.'],
    related: ['summation', 'arithmetic-operations', 'vector-component'],
    diagram: { nodes: ['Observations: [2, 2, 8]', 'Sum = 12; count = 3', '12 / 3', 'Mean = 4'], caption: 'The mean spreads the total over all three observations equally.' },
  },
  'sequence-product': {
    readAs: 'the product, for i from one to n, of the terms',
    intuition: 'Think of applying several growth factors in sequence. Capital pi tells you to multiply one term for every index between the inclusive bounds. A product starts at 1, and a product with no terms is defined as 1.',
    steps: ['Use the term rule i + 1 for i = 1, 2, 3.', 'Generate factors 2, 3, and 4.', 'Start at 1, then multiply: 1 × 2 = 2 and 2 × 3 = 6.', 'Multiply the final factor: 6 × 4 = 24.'],
    example: {
      title: 'Multiply factors generated from three indices',
      code: `const factors = [];
let product = 1; // The neutral starting value for multiplication.
for (let i = 1; i <= 3; i++) {
  const factor = i + 1;
  factors.push(factor);
  product *= factor;
}
console.log(JSON.stringify({ factors, product }));`,
      output: '{"factors":[2,3,4],"product":24}',
      notes: ['The indices 1, 2, and 3 generate factors 2, 3, and 4.', 'Starting product at 1 allows each factor to contribute normally.', 'product *= factor updates the running product once per index.'],
    },
    pitfalls: ['Starting the accumulator at 0 makes every later product 0.', 'Capital ∏ means multiply; capital ∑ means add.'],
    related: ['summation', 'factorial', 'power'],
    diagram: { nodes: ['i = 1, 2, 3', 'i + 1 → 2, 3, 4', '1 × 2 × 3 × 4', 'Product = 24'], caption: 'The index rule supplies factors, which accumulate by multiplication.' },
  },
  'absolute-value': {
    readAs: 'the absolute value of x',
    intuition: 'Think of the distance from your position to zero on a number line. Absolute value gives that distance and is always nonnegative. More generally, |a − b| measures the distance between two real numbers.',
    steps: ['Start at position −4 and finish at position 3.', 'Find the signed change: 3 − (−4) = 7.', 'Reverse the subtraction: −4 − 3 = −7.', 'Both absolute differences are 7, so the distance is 7.'],
    example: {
      title: 'Measure the same distance in either subtraction order',
      code: `const start = -4;
const finish = 3;
const forwardChange = finish - start;
const reverseChange = start - finish;
// Absolute value removes the directional sign, not the distance.
const forwardDistance = Math.abs(forwardChange);
const reverseDistance = Math.abs(reverseChange);
console.log(JSON.stringify({ forwardChange, reverseChange, forwardDistance, reverseDistance }));`,
      output: '{"forwardChange":7,"reverseChange":-7,"forwardDistance":7,"reverseDistance":7}',
      notes: ['Changing the subtraction order changes the signed change from 7 to −7.', 'Math.abs maps both signed changes to the same distance 7.', 'The original signed changes remain available if direction matters.'],
    },
    pitfalls: ['Absolute value loses the sign, so it cannot tell you a direction by itself.', '|A| may mean a determinant and |v| may mean vector length; the enclosed object determines the meaning.'],
    related: ['approximately-equal', 'euclidean-norm', 'determinant'],
    diagram: { nodes: ['Positions: −4 and 3', '3 − (−4) = 7', '−4 − 3 = −7', '|7| = |−7| = 7'], caption: 'The subtraction order changes direction but leaves the distance unchanged.' },
  },
  'euclidean-norm': {
    readAs: 'the norm of v; the Euclidean length of v',
    intuition: 'Think of measuring the straight-line length of an arrow. The Euclidean norm squares each real component, adds the squares, and takes the nonnegative square root. This geometric length is different from the number of components stored in an array.',
    steps: ['Take the displacement v = [6, −8].', 'Square each component: 6² = 36 and (−8)² = 64.', 'Add the squares: 36 + 64 = 100.', 'Take the square root: √100 = 10.'],
    example: {
      title: 'Measure a two-coordinate displacement',
      code: `const displacement = [6, -8];
const squares = displacement.map(value => value ** 2);
const sumOfSquares = squares.reduce((sum, value) => sum + value, 0);
const length = Math.sqrt(sumOfSquares);
// Math.hypot provides the same Euclidean norm directly.
const directLength = Math.hypot(...displacement);
console.log(JSON.stringify({ squares, sumOfSquares, length, directLength }));`,
      output: '{"squares":[36,64],"sumOfSquares":100,"length":10,"directLength":10}',
      notes: ['Squaring makes both positive and negative components contribute nonnegative amounts.', 'Taking the square root restores the distance units after adding squares.', 'Math.hypot accepts the components and computes their Euclidean norm directly.'],
    },
    pitfalls: ['displacement.length is 2 because there are two components; the geometric length here is 10.', 'Adding absolute component values gives 14, a different norm rather than the Euclidean norm.'],
    related: ['square-root', 'unit-vector', 'absolute-value'],
    diagram: { nodes: ['v = [6, −8]', 'Squares: 36 and 64', '36 + 64 = 100', '‖v‖ = √100 = 10'], caption: 'The straight-line length follows the Pythagorean rule.' },
  },
  determinant: {
    readAs: 'the determinant of A; det A',
    intuition: 'Think of a matrix stretching or flipping a unit square. Its determinant records the signed area scale in 2D, or signed volume scale in higher dimensions. Only square matrices have this determinant; zero means the transformation collapses a dimension and has no inverse.',
    steps: ['Choose A = [[2, 1], [0, 3]].', 'Multiply the main diagonal: 2 × 3 = 6.', 'Multiply the other diagonal: 1 × 0 = 0.', 'Subtract: det A = 6 − 0 = 6, so area grows by a factor of 6.'],
    example: {
      title: 'Compute the signed area scale of a two-dimensional transformation',
      code: `const A = [[2, 1], [0, 3]];
const mainDiagonalProduct = A[0][0] * A[1][1];
const otherDiagonalProduct = A[0][1] * A[1][0];
// For a 2 × 2 matrix, determinant = ad - bc.
const determinant = mainDiagonalProduct - otherDiagonalProduct;
const areaScale = Math.abs(determinant);
console.log(JSON.stringify({ mainDiagonalProduct, otherDiagonalProduct, determinant, areaScale }));`,
      output: '{"mainDiagonalProduct":6,"otherDiagonalProduct":0,"determinant":6,"areaScale":6}',
      notes: ['The two diagonal products are the ad and bc terms in the 2 × 2 formula.', 'Their difference gives the signed determinant 6.', 'The absolute determinant gives the unsigned area scale.'],
    },
    pitfalls: ['The formula ad − bc applies to 2 × 2 matrices, not arbitrary matrix sizes.', 'A negative determinant means orientation flips; area is scaled by its absolute value, not a negative amount.'],
    related: ['matrix-shape', 'matrix-product', 'absolute-value'],
    diagram: { nodes: ['A = [[2,1],[0,3]]', 'ad = 2×3 = 6; bc = 1×0 = 0', 'det A = 6 − 0 = 6', 'Unit area → area 6'], caption: 'The determinant gives the area scaling of this square-matrix transformation.' },
  },
  'unit-vector': {
    readAs: 'v hat; the unit vector in the direction of v',
    intuition: 'Think of keeping an arrow’s direction while giving it a standard length. Divide a nonzero real vector by its Euclidean norm to obtain a unit vector of length 1. The zero vector cannot be normalized because it has no direction and its norm is zero.',
    steps: ['Start with v = [6, 8].', 'Compute its norm: √(36 + 64) = 10.', 'Divide each component by 10: v̂ = [0.6, 0.8].', 'Check its norm: √(0.36 + 0.64) = 1.'],
    example: {
      title: 'Keep a direction while setting its length to one',
      code: `const v = [6, 8];
const length = Math.hypot(...v);
if (length === 0) throw new Error('The zero vector has no unit direction');
// Dividing all components by one positive length preserves direction.
const unit = v.map(value => value / length);
const unitLength = Math.hypot(...unit);
console.log(JSON.stringify({ length, unit, unitLength: unitLength.toFixed(3) }));`,
      output: '{"length":10,"unit":[0.6,0.8],"unitLength":"1.000"}',
      notes: ['Math.hypot computes the original norm 10.', 'The guard makes the zero-vector edge case explicit before any division.', 'Dividing both components by 10 produces a vector whose norm is 1.'],
    },
    pitfalls: ['Dividing by the number of components does not normalize a vector.', 'A hat can have other meanings, such as an estimate; check that the context defines it as a unit vector.'],
    related: ['euclidean-norm', 'vector-scaling', 'vector-component'],
    diagram: { nodes: ['v = [6, 8]', '‖v‖ = 10', 'v / 10 = [0.6, 0.8]', '‖v̂‖ = 1'], caption: 'The norm supplies one common scaling factor for both components.' },
  },
  'matrix-product': {
    readAs: 'A times B; the matrix product A B',
    intuition: 'Think of combining each row of one table with each column of another. Matrix multiplication takes a dot product for every output position: multiply matching row-column entries and add them. If A has shape m × n and B has shape n × p, their product has shape m × p; the matching inner dimension n is required.',
    steps: ['Use A = [[1, 2], [3, 1]] and B = [[4], [5]].', 'First row with the only column: 1 × 4 + 2 × 5 = 14.', 'Second row with that column: 3 × 4 + 1 × 5 = 17.', 'A 2 × 2 matrix times a 2 × 1 matrix gives [[14], [17]], shape 2 × 1.'],
    example: {
      title: 'Apply the same two weights to two rows',
      code: `const A = [[1, 2], [3, 1]];
const B = [[4], [5]];
if (A[0].length !== B.length) throw new Error('Inner dimensions must match');
// Each output entry sums one row-column set of products.
const result = A.map(row => B[0].map((_, column) =>
  row.reduce((sum, value, inner) => sum + value * B[inner][column], 0)
));
console.log(JSON.stringify(result));`,
      output: '[[14],[17]]',
      notes: ['A[0].length and B.length are the inner dimensions, both equal to 2 here.', 'The outer map chooses an A row and the inner map chooses a B column.', 'reduce sums the two matching products into a single matrix entry.'],
    },
    pitfalls: ['Matrix multiplication is not element-wise multiplication; each output entry usually combines multiple products.', 'Order matters: AB and BA may differ, and one order may be undefined even when the other is valid.'],
    related: ['dot-product', 'matrix-shape', 'hadamard-product'],
    diagram: { nodes: ['A: 2×2; B: 2×1', 'Row 1: 1×4 + 2×5 = 14', 'Row 2: 3×4 + 1×5 = 17', 'AB = [[14],[17]]'], caption: 'Both output rows use the same column of B in separate dot products.' },
  },
  transpose: {
    readAs: 'A transpose; A superscript T',
    intuition: 'Think of turning a table so each column becomes a row. Transposing a matrix swaps each entry’s row and column indices without changing its value. An m × n matrix becomes n × m, and transposing twice restores the original matrix.',
    steps: ['Start with rows [2, 4, 6] and [8, 10, 12], shape 2 × 3.', 'Read the first column as a new row: [2, 8].', 'Read the other columns as [4, 10] and [6, 12].', 'The transpose is [[2, 8], [4, 10], [6, 12]], shape 3 × 2.'],
    example: {
      title: 'Turn three table columns into three rows',
      code: `const A = [[2, 4, 6], [8, 10, 12]];
// A row index and column index exchange roles.
const transposed = A[0].map((_, column) => A.map(row => row[column]));
const originalShape = [A.length, A[0].length];
const transposedShape = [transposed.length, transposed[0].length];
console.log(JSON.stringify({ originalShape, transposedShape, transposed }));`,
      output: '{"originalShape":[2,3],"transposedShape":[3,2],"transposed":[[2,8],[4,10],[6,12]]}',
      notes: ['The outer map visits each original column index.', 'A.map collects the value at that column from every original row.', 'The shape changes from 2 × 3 to 3 × 2 while retaining all six entries.'],
    },
    pitfalls: ['The superscript T labels an operation; it is not an exponent or a variable to multiply by.', 'Reversing the order of the rows or the entries is not a transpose.'],
    related: ['matrix-shape', 'matrix-product', 'vector-tensor-product'],
    diagram: { nodes: ['A rows: [2,4,6]; [8,10,12]', 'Column 1 → row [2,8]', 'Other rows: [4,10]; [6,12]', 'Shape 2×3 → 3×2'], caption: 'Each original column becomes one full row of the transpose.' },
  },
  'vector-tensor-product': {
    readAs: 'u tensor v; u outer v; u times v transpose',
    intuition: 'Think of a table containing every pairing between two lists. In chosen bases, the vector tensor product is represented by the outer-product matrix, whose entry in row i and column j is uᵢvⱼ. No products are added together: an m-component vector and an n-component vector produce an m × n table.',
    steps: ['Choose u = [2, 3] and v = [4, 5, 6].', 'Pair u’s first component with all of v: 2 × [4, 5, 6] = [8, 10, 12].', 'Pair u’s second component with all of v: 3 × [4, 5, 6] = [12, 15, 18].', 'Keep both rows to get a 2 × 3 outer-product matrix.'],
    example: {
      title: 'Build a table of every cross-list product',
      code: `const u = [2, 3];
const v = [4, 5, 6];
// One row per u component; one column per v component.
const outer = u.map(left => v.map(right => left * right));
const shape = [outer.length, outer[0].length];
console.log(JSON.stringify({ outer, shape }));`,
      output: '{"outer":[[8,10,12],[12,15,18]],"shape":[2,3]}',
      notes: ['The first map chooses a component from u to set the row.', 'The second map multiplies that component by every component of v.', 'Different vector lengths are allowed because all cross-list pairs are retained.'],
    },
    pitfalls: ['A dot product sums matching pairs into one scalar; an outer product keeps every pair in a matrix.', 'uvᵀ assumes column vectors and an ordinary transpose here; a complex inner product has additional conjugation conventions.'],
    related: ['dot-product', 'transpose', 'kronecker-product'],
    diagram: { nodes: ['u = [2,3]; v = [4,5,6]', '2v = [8,10,12]', '3v = [12,15,18]', 'Stack rows → shape 2×3'], caption: 'Each component of u scales a complete copy of v to create one row.' },
  },
  'kronecker-product': {
    readAs: 'A Kronecker B; the Kronecker product of A and B',
    intuition: 'Think of replacing every number in a table with a small scaled table. The Kronecker product replaces each entry aᵢⱼ of A with the full block aᵢⱼB. If the input shapes are m × n and p × q, the resulting block matrix has shape mp × nq.',
    steps: ['Choose A = [[1, 2]] with shape 1 × 2 and B = [[3, 4], [5, 6]] with shape 2 × 2.', 'Replace A’s first entry with 1B = [[3, 4], [5, 6]].', 'Replace A’s second entry with 2B = [[6, 8], [10, 12]].', 'Place the blocks side by side: [[3, 4, 6, 8], [5, 6, 10, 12]], shape 2 × 4.'],
    example: {
      title: 'Replace two entries with scaled copies of a block',
      code: `const A = [[1, 2]];
const B = [[3, 4], [5, 6]];
// Each A entry contributes a whole scaled B block.
const result = A.flatMap(aRow =>
  B.map(bRow => aRow.flatMap(a => bRow.map(b => a * b)))
);
const shape = [result.length, result[0].length];
console.log(JSON.stringify({ result, shape }));`,
      output: '{"result":[[3,4,6,8],[5,6,10,12]],"shape":[2,4]}',
      notes: ['B.map chooses a row within each scaled block.', 'The inner flatMap places scaled block rows side by side in A’s entry order.', 'The outer flatMap joins block rows, producing 1 × 2 = 2 rows and 2 × 2 = 4 columns.'],
    },
    pitfalls: ['Kronecker multiplication builds a larger block matrix rather than taking row-column dot products.', 'The order of A and B changes block placement and generally changes the result.'],
    related: ['vector-tensor-product', 'matrix-product', 'vector-scaling'],
    diagram: { nodes: ['A = [[1,2]]; B: 2×2', 'Block 1B: [[3,4],[5,6]]', 'Block 2B: [[6,8],[10,12]]', 'Side by side → shape 2×4'], caption: 'Each entry of A becomes a full scaled B block in the same relative position.' },
  },
};
