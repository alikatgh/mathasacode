import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import {
  MAX_EDITOR_HIGHLIGHT_BYTES, canHighlightEditorSource, editorTokenRanges,
  getEditorHighlighter, highlightEditorSource,
} from '../site/editor-highlighter.mjs';

// Compile JSX in memory, checking that importing the editor needs no browser
// globals and leaves no generated test files behind.
const bundle = await build({
  entryPoints: [new URL('../site/editable-code.jsx', import.meta.url).pathname],
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external',
  define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent',
});
const compiled = { exports: {} };
const require = createRequire(import.meta.url);
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, compiled, compiled.exports);
const { createEditableState } = compiled.exports;
// Use the same module format as the compiled JSX so state fields and effect
// identities belong to the same CodeMirror module instances.
const { foldAll, foldedRanges, unfoldAll } = require('@codemirror/language');
const { redo, undo } = require('@codemirror/commands');

test('editable documents preserve exact source and implement real undo and redo', () => {
  const source = 'const text = "<img onerror=alert(1)>";\r\n\t// π ≤ 42\n\r\n';
  let state = createEditableState(source);
  assert.equal(state.readOnly, false);
  assert.equal(state.doc.toString(), source);
  const target = { get state() { return state; }, dispatch: transaction => { state = transaction.state || state.update(transaction).state; } };
  target.dispatch({ changes: { from: 0, to: 5, insert: 'let' }, userEvent: 'input' });
  const edited = 'let' + source.slice(5);
  assert.equal(state.doc.toString(), edited);
  assert.equal(undo(target), true);
  assert.equal(state.doc.toString(), source);
  assert.equal(redo(target), true);
  assert.equal(state.doc.toString(), edited);
});

test('native folds hide ranges without changing executable or copied source', () => {
  const source = 'function square(x) {\n  return x * x;\n}\nconsole.log(square(4));';
  let state = createEditableState(source);
  const target = {
    get state() { return state; },
    lineBlockAt: position => state.doc.lineAt(position),
    dispatch: transaction => { state = state.update(transaction).state; },
  };
  assert.equal(foldAll(target), true);
  assert.equal(foldedRanges(state).size, 1);
  assert.equal(state.doc.toString(), source);
  assert.equal(unfoldAll(target), true);
  assert.equal(foldedRanges(state).size, 0);
  assert.equal(state.doc.toString(), source);
});

test('every editor language receives both VS Code theme token colours', async () => {
  const fixtures = {
    javascript: 'const answer = 42;\nconsole.log("<safe>", answer);',
    python: 'def square(x):\n    # keep this comment\n    return x * 42\n',
    c: '#include <stdio.h>\nint main(void) {\n    printf("%d", 42);\n}\n',
    rust: 'fn main() {\n    let answer = 42;\n    println!("{}", answer);\n}\n',
  };
  for (const [language, source] of Object.entries(fixtures)) {
    const ranges = await highlightEditorSource(source, language);
    assert.ok(ranges.length > 3, `${language} has TextMate tokens`);
    assert.ok(new Set(ranges.map(range => range.style)).size > 2, `${language} distinguishes token roles`);
    for (const range of ranges) {
      assert.ok(range.from >= 0 && range.to <= source.length && range.to > range.from);
      assert.match(range.style, /^--editor-token-light:#[\da-f]{6}(?:[\da-f]{2})?;--editor-token-dark:#[\da-f]{6}(?:[\da-f]{2})?(?:;[\w-]+:[\w-]+)*$/i);
    }
  }
  const source = 'const answer = 42;';
  const ranges = await highlightEditorSource(source, 'javascript');
  assert.ok(ranges.some(range => source.slice(range.from, range.to) === '42'
    && range.style.includes('--editor-token-light:#098658') && range.style.includes('--editor-token-dark:#B5CEA8')),
  'numeric literals keep the actual light-plus and dark-plus colours');
  assert.equal(getEditorHighlighter(), getEditorHighlighter(), 'all editors share one highlighter load');
});

test('highlighting accepts exact CRLF offsets and rejects invalid token replacements', async () => {
  const source = 'const answer = 42;\r\nconsole.log(answer);\r\n';
  const ranges = await highlightEditorSource(source, 'javascript');
  assert.ok(ranges.some(range => source.slice(range.from, range.to) === 'console'));
  const token = { content: source, variants: { light: { color: '#000000' }, dark: { color: '#ffffff' } } };
  assert.deepEqual(editorTokenRanges(source, [[token]]), []);
  assert.deepEqual(editorTokenRanges('hello', [[{ ...token, content: 'changed' }]]), []);
  assert.deepEqual(editorTokenRanges('hello', [[{ ...token, content: 'hello', variants: { light: { color: 'red;url(evil)' }, dark: { color: '#ffffff' } } }]]), []);
});

test('the highlighting budget counts UTF-8 bytes and never truncates source', async () => {
  assert.equal(canHighlightEditorSource('a'.repeat(MAX_EDITOR_HIGHLIGHT_BYTES), 'javascript'), true);
  assert.equal(canHighlightEditorSource('a'.repeat(MAX_EDITOR_HIGHLIGHT_BYTES + 1), 'javascript'), false);
  const source = 'π'.repeat(MAX_EDITOR_HIGHLIGHT_BYTES / 2 + 1);
  assert.equal(canHighlightEditorSource(source, 'python'), false);
  assert.deepEqual(await highlightEditorSource(source, 'python'), []);
  assert.equal(createEditableState(source, 'python').doc.toString(), source);
  assert.deepEqual(await highlightEditorSource('plain text', 'text'), []);
});
