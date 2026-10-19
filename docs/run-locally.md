# Run the guide locally

Requires Node.js 22 or newer and npm. Python 3 is used by the example tests.

```sh
git clone https://github.com/alikatgh/mathasacode.git
cd mathasacode
npm ci --ignore-scripts
npm start
```

Open <http://127.0.0.1:8000>. The server listens only on this computer. Stop it with Ctrl+C. To use a different port, run `npm start -- --port 8001`.

Each core topic has a live calculation and a short understanding check. Change the inputs to explore the notation, then check an answer to record that topic as practiced. Progress is stored in this browser, shared across the guide versions, and does not require an account. The guide and calculators remain usable when browser storage is unavailable.

Code examples have a single language menu for JavaScript, Python, C and Rust. Selecting a language updates the examples and remembers the choice in this browser. Use Enter, Space or Arrow Down to open the menu, Up/Down to choose, and Enter to select. ReUI Code Block provides source, line numbers, folding, wrapping and exact copying in one quiet toolbar. Choose Edit to change an example in CodeMirror, then Run to see real output. Shiki uses VS Code light and dark syntax themes for both the original examples and edited code. Edits stay while you browse this page; reloading restores the original examples. Code options includes wrapping, folding and Reset. Unedited illustrations that depend on a nearby helper use an explicit execution context, described below the code. Function-only C and Rust illustrations compile with an empty main and produce no output. Editing runs exactly the source you entered. The Python runtime includes the standard library; NumPy-dependent reference examples and illustrative JavaScript set notation are marked as unavailable locally. They remain readable, editable and copyable.

JavaScript uses QuickJS, Python uses CPython/WASI, and C uses Clang/WebAssembly locally in an isolated browser worker. The first run downloads that language’s runtime from this site. Local runs have no network or interactive input, a five-second execution limit, bounded memory and a 32 KB output limit. Only one example runs at a time. Stop tears down the local runtime. Rust sends the edited source to the public Rust Playground; do not send private data. Its Stop control stops waiting and cannot cancel work already accepted by that service. Rust requests have a 20-second wait limit, a 10-second cooldown and no automatic retries.

The React workspace uses ReUI components throughout the guide and resource pages, including the sidebar, resizable layout, mobile sheet, buttons, fields, language menu, progress, calculators, quizzes and feedback. The lesson heading and topic-navigation footer stay in place; the selected topic and topic list scroll independently. The button beside the lesson heading hides or shows the sidebar; on mobile it opens the topic sheet. Press Command/Ctrl+K to search. Guide version, appearance and source controls are in the sidebar. Light/dark appearance, sidebar visibility and practice completion are saved in this browser. Selected topics include locally rendered Pele concept diagrams. Component revisions and licenses are recorded in `site/vendor/THIRD-PARTY.md`.

The sidebar opens one topic at a time. Each topic is one continuous scroll containing its explanations, examples and practice; Previous/Next moves between topics. The Practice button scrolls to that topic's exercise. Formulas stay beside their matching code. Existing topic links, practice links, older step links and browser Back/Forward work with the reader; leaving a topic keeps its scroll position and current practice inputs during this visit. Clicking the current route preserves your position.

`npm start` rebuilds the site from the Markdown sources before serving. After editing a guide, run `npm run build` and reload the browser. `npm run build` generates `dist/`, which is also a standalone static site. All equation rendering, fonts, highlighting, and navigation are local; reading the site does not call an external math service. External reference links still require an internet connection.

```sh
npm test
```

Tests check formulas, heading destinations, generated pages, reader planning and routing, server boundaries, and numerical examples in JavaScript and Python. New content belongs in `README.md`, `PYTHON-README.md`, and `README-zh.md`; shared presentation belongs in `site/`. Executable examples live in `examples/`.

The builder pairs standalone equations with their following code within a section. If the prose switches to a different example before the code, add `<!-- comparison:break -->` at that boundary to keep the examples separate.

Translations live in `site/snippets/`. `scripts/snippet-fingerprints.json` binds each authored source example to its translations. After changing a code example, review the matching translations and update its fingerprint; the build rejects missing translations.

This local edition completes the original guide's explicit missing topics: matrix multiplication, derivatives, tensor products, delta, indefinite and definite integrals, and a worked graphics expression. It also covers averages and a worked full-batch gradient descent update. Matching equations and code appear beside each other on wide screens and stack on smaller screens. It is a practical notation reference, not an exhaustive mathematics textbook. The existing MIT license and original authorship remain in place.
