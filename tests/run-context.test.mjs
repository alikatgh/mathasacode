import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { Marked } from 'marked';
import { getCodeExample } from '../scripts/code-examples.mjs';
import { prepareRunnableExample } from '../scripts/run-context.mjs';

const require = createRequire(import.meta.url);
const examples = [];
for (const filename of ['README.md', 'PYTHON-README.md', 'README-zh.md']) {
  const markdown = await readFile(new URL(`../${filename}`, import.meta.url), 'utf8');
  for (const token of new Marked().lexer(markdown)) {
    if (token.type === 'code') examples.push(getCodeExample(token.text, filename));
  }
}
const prepare = (id, language) => {
  const example = examples.find(example => example.id === id);
  return prepareRunnableExample({ exampleId: id, language, source: example.variants[language] });
};

test('known JavaScript contexts run independently with actual helper modules', () => {
  const guestModules = require('../site/runners/guest-modules.cjs');
  const failures = [];
  for (const example of examples) {
    const prepared = prepare(example.id, 'javascript');
    if (!prepared.runnable) continue;
    try {
      const scope = {
        require: guestModules.require,
        console: { log() {}, assert: condition => assert.ok(condition) },
      };
      vm.runInNewContext(prepared.source, scope, { timeout: 1000, filename: `${example.id}.js` });
      assert.notEqual(example.id, 'py-36', 'the deliberate assertion must still fail');
      const expected = {
        'en-2': ['x', 12], 'en-9': ['result', 18], 'en-10': ['result', [6, 18]],
        'en-12': ['d', 0], 'en-14': ['result', [0, 0, -1]], 'en-26': ['a', [0, 0.8, -0.6]],
      }[example.id];
      if (expected) assert.deepEqual(JSON.parse(JSON.stringify(scope[expected[0]])), expected[1]);
    } catch (error) {
      if (example.id === 'py-36' && /GO DIRECTLY TO JAIL/.test(error.message)) continue;
      failures.push(`${example.id}: ${error.message}`);
    }
  }
  assert.deepEqual(failures, []);
});

test('known Python contexts run independently without NumPy or shared globals', () => {
  const cases = examples.map(example => ({ id: example.id, ...prepare(example.id, 'python') })).filter(item => item.runnable);
  const script = `import json, sys, contextlib, io
for item in json.load(sys.stdin):
    expected = {"py-6": TypeError, "py-36": AssertionError}.get(item["id"])
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            exec(compile(item["source"], item["id"] + ".py", "exec"), {})
    except Exception as error:
        if expected and isinstance(error, expected):
            continue
        raise RuntimeError(item["id"] + ": " + repr(error)) from error
    if expected:
        raise AssertionError(item["id"] + " should retain its deliberate error")
`;
  const result = spawnSync('python3', ['-B', '-c', script], {
    input: JSON.stringify(cases), encoding: 'utf8', cwd: new URL('..', import.meta.url), timeout: 10_000,
  });
  assert.equal(result.status, 0, result.stderr);
});

test('NumPy and set-notation illustrations remain readable with explicit run limitations', () => {
  const numpyIds = [1, 5, 7, 12, 13, 23, 27, 28, 29, 32, 35, 37, 45, 52].map(index => `py-${index}`);
  for (const id of numpyIds) {
    const result = prepare(id, 'python');
    assert.equal(result.runnable, false, id);
    assert.match(result.note, /requires NumPy.*not available/);
    assert.equal(result.source, examples.find(example => example.id === id).variants.python);
  }
  for (const id of ['en-32', 'zh-32']) {
    const result = prepare(id, 'javascript');
    assert.equal(result.runnable, false);
    assert.match(result.note, /illustrative set notation/);
    assert.equal(result.source, examples.find(example => example.id === id).variants.javascript);
  }
});

test('function-only C and Rust illustrations receive only an empty entry point', () => {
  for (const [language, expectedCount] of [['c', 78], ['rust', 66]]) {
    let appended = 0;
    const pattern = language === 'c' ? /\bmain\s*\(/g : /\bfn\s+main\s*\(/g;
    for (const example of examples) {
      const source = example.variants[language];
      const result = prepare(example.id, language);
      if (source.match(pattern)) {
        assert.equal(result.source, source, `${example.id} already has an entry point`);
      } else {
        appended++;
        assert.ok(result.source.startsWith(source + '\n\n'), `${example.id} retains its exact illustration`);
        assert.equal([...result.source.matchAll(pattern)].length, 1, `${example.id} receives one entry point`);
        assert.match(result.note, /no example function is called/);
      }
    }
    assert.equal(appended, expectedCount, language);
  }
});

test('contexts are scoped to explicit IDs and never rewrite the authored source', () => {
  const source = 'const unchanged = "<safe>";\r\n';
  assert.deepEqual(prepareRunnableExample({ exampleId: 'standalone-1', language: 'javascript', source }), { source, runnable: true });
  const original = examples.find(example => example.id === 'en-12').variants.javascript;
  const result = prepareRunnableExample({ exampleId: 'en-12-12', language: 'javascript', source: original });
  assert.ok(result.source.endsWith('\n\n' + original));
  assert.match(result.note, /dot helper/);
  const fixture = prepare('en-2', 'javascript');
  assert.match(fixture.note, /k = 2, j = 3/);
  assert.throws(() => prepareRunnableExample({ source: null }), /source must be a string/);
});
