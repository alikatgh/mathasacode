// Authored companions to docs/ml-deep-learning.md. Keep numerical examples
// aligned with its runnable snippets; these maps explain, rather than replace, them.
export const mlVisuals = {
  'ml-objective-route': {
    topics: ['the-final-boss'],
    en: {
      title: 'Unpack the objective one operation at a time',
      source: `flowchart LR
  D["4 labeled rows"] --> H["Mix, then ReLU"]
  H --> Z["2 class scores"]
  Z --> P["Softmax"]
  P --> L["Mean loss"]
  L --> U["Gradient update"]`,
      steps: [
        'Start with the same four input rows and their correct class labels.',
        'The first weighted sums and biases mix the two features; ReLU produces two hidden values.',
        'The second weighted sums and biases turn those hidden values into two class scores.',
        'Softmax converts the scores into probabilities that sum to one.',
        'For each row, select the correct class probability and take its negative natural logarithm. Average the four losses.',
        'Differentiate that mean loss, then subtract a small multiple of each gradient from its parameter.'
      ],
      takeaway: 'The crowded expression is a sequence of familiar operations, followed by an update to twelve numbers.'
    }
  },
  'ml-shape-route': {
    topics: ['data-and-shapes'],
    en: {
      title: 'Follow the dimensions through both layers',
      source: `flowchart LR
  X["X: 4 rows, 2 features"] --> W["W1: 2 by 2"]
  W --> H["Hidden: 4 by 2"]
  H --> V["W2: 2 by 2"]
  V --> Z["Scores: 4 by 2"]`,
      steps: [
        'X stores four examples down its rows and two features across its columns; its first row is [1, 1], with correct class 0.',
        'W1 connects two input features to two hidden units. Multiply each input row by this 2 by 2 matrix and add the length-two bias b1.',
        'Apply ReLU to each result. Stacking the four hidden rows gives a 4 by 2 collection of hidden values.',
        'W2 connects two hidden units to two classes. Multiply each hidden row by this second 2 by 2 matrix and add the length-two bias b2.',
        'The four output rows each contain two class scores, so the score collection is also 4 by 2.'
      ],
      takeaway: 'The example count stays four; each layer changes what the two columns represent.'
    }
  },
  'ml-weighted-sums': {
    topics: ['weighted-sums-and-bias'],
    en: {
      title: 'One input row feeds two hidden units',
      source: `flowchart LR
  X["x = [1, 1]"] --> A["Unit 0: 0.8"]
  X --> B["Unit 1: -1.2"]
  A --> R["a = [0.8, -1.2]"]
  B --> R`,
      steps: [
        'Send both numbers in x = [1, 1] along each of the two branches.',
        'For hidden unit 0, use the first weight column: 1 times 0.5 plus 1 times 0.5, then add bias -0.2, giving 0.8.',
        'For hidden unit 1, use the second weight column: 1 times -0.5 plus 1 times -0.5, then add bias -0.2, giving -1.2.',
        'Join the two results in hidden-unit order to form a = [0.8, -1.2], before applying any activation.'
      ],
      takeaway: 'Each hidden unit has its own weight column and bias, even though both receive the same input row.'
    }
  },
  'ml-relu-branches': {
    topics: ['nonlinearity'],
    en: {
      title: 'ReLU makes a separate choice for each value',
      source: `flowchart LR
  A["a = [0.8, -1.2]"] --> Q{"Above zero?"}
  Q -->|Yes| K["Keep value"]
  Q -->|No| Z["Use zero"]
  K --> H["h = [0.8, 0]"]
  Z --> H`,
      steps: [
        'Take each entry of a = [0.8, -1.2] through the same decision, one value at a time.',
        'Ask whether the current value is above zero.',
        'The Yes branch keeps 0.8 because it is positive.',
        'The No branch replaces -1.2 with zero. An input equal to zero also follows this branch and remains zero.',
        'Put the results back in their original order: h = [0.8, 0].'
      ],
      takeaway: 'ReLU introduces a bend by allowing different inputs to switch different hidden units on.'
    }
  },
  'ml-forward-composition': {
    topics: ['a-network-is-composition'],
    en: {
      title: 'The output of one operation becomes the next input',
      source: `flowchart LR
  X["x = [1, 1]"] --> A["a = [0.8, -1.2]"]
  A --> H["h = [0.8, 0]"]
  H --> Z["z = [0.3, -0.3]"]`,
      steps: [
        'Begin with the original feature row x = [1, 1].',
        'Multiply by W1 and add b1 to obtain a = [0.8, -1.2].',
        'Pass a through ReLU to obtain the hidden row h = [0.8, 0].',
        'Multiply h by W2 and add b2. The class-0 score is 0.8 times 0.5 plus 0 times 0.5 minus 0.1, giving 0.3; the class-1 score is -0.3.'
      ],
      takeaway: 'The scores are intermediate numbers; softmax still has to turn them into probabilities.'
    }
  },
  'ml-softmax-normalization': {
    topics: ['from-scores-to-probabilities'],
    en: {
      title: 'Turn relative scores into a distribution',
      source: `flowchart LR
  Z["Scores: 0.3, -0.3"] --> S["Shift: 0, -0.6"]
  S --> E["Exponentiate"]
  E --> N["Divide by their total"]
  N --> P["Probabilities sum to 1"]`,
      steps: [
        'Start with the two scores, 0.3 for class 0 and -0.3 for class 1.',
        'Subtract their maximum, 0.3, from both scores to get 0 and -0.6. This shared shift preserves the probabilities and avoids positive exponential overflow.',
        'Exponentiate both shifted scores to make two positive values.',
        'Add those exponentials, then divide each one by that same total.',
        'Read the output in class order: class 0 has probability 0.645656 and class 1 has probability 0.354344. Together the probabilities sum to one.'
      ],
      takeaway: 'Softmax compares scores relative to each other; adding the same amount to both scores leaves this distribution unchanged.'
    }
  },
  'ml-loss-aggregation': {
    topics: ['measuring-the-mistake'],
    en: {
      title: 'Measure the correct answer, then average',
      source: `flowchart LR
  P["Four probability rows"] --> Y["Select each true class"]
  Y --> L["Take negative log"]
  L -->|Rows 0, 3| A["0.437488"]
  L -->|Rows 1, 2| B["0.598139"]
  A --> M["Mean: 0.517813"]
  B --> M`,
      steps: [
        'Compute one probability row for each of the four examples, keeping the dataset order.',
        'Use labels [0, 1, 1, 0] to select one correct-class probability from each row; the first selected probability is 0.645656.',
        'Take the negative natural logarithm of each selected probability. The runnable code combines softmax and log in a stable calculation.',
        'Rows 0 and 3 follow the matching-sign branch; each contributes a loss of 0.437488.',
        'Rows 1 and 2 follow the different-sign branch; each contributes a loss of 0.598139.',
        'Add all four losses and divide by four to obtain the mean loss, 0.517813.'
      ],
      takeaway: 'One example has one loss; the training objective is the average of all four.'
    }
  },
  'ml-reverse-gradients': {
    topics: ['backpropagation'],
    en: {
      title: 'Send sensitivity back along the saved forward path',
      source: `flowchart LR
  L["First example loss"] --> Z["Score gradients"]
  Z --> W["W2, b2"]
  Z --> H["Hidden"]
  H --> A["Gate through ReLU"]
  A --> V["W1, b1"]`,
      steps: [
        'Start at the first example loss, keeping its forward values and the old weights available.',
        'Subtract the class-0 target [1, 0] from the probabilities to get score gradients [-0.354344, 0.354344].',
        'One branch uses the saved hidden row to calculate W2 gradients; the b2 gradients equal the score gradients. W2[0][0] has gradient -0.283475.',
        'The other branch multiplies by the old W2 values and sums all outgoing paths to obtain each hidden gradient.',
        'Pass a hidden gradient through ReLU only where the saved a was positive. The inactive second unit gets zero; the first unit gets -0.354344. At a = 0, this implementation also chooses zero.',
        'Use the input row and gated gradients to calculate W1 gradients; the b1 gradients equal the gated gradients. W1[0][0] has gradient -0.354344.'
      ],
      takeaway: 'Backpropagation calculates sensitivities without changing weights; mean-loss training averages these contributions across examples.'
    }
  },
  'ml-gradient-update': {
    topics: ['gradient-descent'],
    en: {
      title: 'A negative gradient gives a positive step',
      source: `flowchart LR
  W["Old w: 0.5"] --> G["Gradient: -0.283475"]
  G --> D["Step: +0.028347"]
  D --> N["New w: 0.528347"]
  N --> L["Loss: 0.429511"]`,
      steps: [
        'Start with W2[0][0] at 0.5; keep the other eleven parameters fixed for this illustration.',
        'At that old weight, the first example produces gradient -0.283475.',
        'Multiply the gradient by step size 0.1 and reverse its sign. The resulting update is +0.028347.',
        'Add the signed update to the old weight to obtain 0.528347. The displayed numbers are rounded after calculation.',
        'Run the example forward again with that changed weight: its loss falls from 0.437488 to 0.429511.'
      ],
      takeaway: 'The gradient describes sensitivity; the step size turns it into an update whose effect must be checked.'
    }
  },
  'ml-bounded-training-loop': {
    topics: ['train-the-tiny-network'],
    en: {
      title: 'Repeat a measured full-batch update',
      source: `flowchart LR
  F["Forward: 4 rows"] --> L["Mean loss"]
  L --> G["Mean gradients"]
  G --> U["Update 12 numbers"]
  U --> C{"Step 120?"}
  C -->|No| F
  C -->|Yes| R["Check predictions"]`,
      steps: [
        'Run all four fixed input rows through the current network and compute their scores and probabilities.',
        'Measure the mean loss over the four correct labels. Its initial value is 0.517813.',
        'Compute every parameter gradient from the same old parameters. Divide each score gradient by four once, then accumulate; do not divide the accumulated gradients again.',
        'Subtract 0.1 times each mean-loss gradient from all twelve weights and biases.',
        'After the update, check the step count. The No branch repeats the forward pass with the new parameters until exactly 120 updates have run.',
        'The Yes branch evaluates the final network after the last update: mean loss 0.098281, predictions [0, 1, 1, 0], and four correct training labels.'
      ],
      takeaway: 'This bounded loop improves confidence on four training examples; it does not establish generalization to new data.'
    }
  }
};
