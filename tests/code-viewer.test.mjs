import test from 'node:test';
import assert from 'node:assert/strict';
import { EditorView } from '@codemirror/view';
import { ensureSyntaxTree, foldable } from '@codemirror/language';
import { createExampleState, supportedLanguages } from '../site/code-viewer.mjs';

test('CodeMirror preserves source and provides read-only, focusable language-aware views', () => {
  const sources = {
    javascript: 'function square(x) {\n  return x * x;\n}\n',
    python: 'def square(x):\n    return x * x\n',
    c: 'double square(double x) {\n  return x * x;\n}\n',
    rust: 'fn square(x: f64) -> f64 {\n    x * x\n}\n'
  };
  assert.deepEqual([...supportedLanguages].sort(), Object.keys(sources).sort());
  for (const [language, source] of Object.entries(sources)) {
    const state = createExampleState(source, language);
    assert.equal(state.doc.toString(), source);
    assert.equal(state.readOnly, true);
    assert.equal(state.facet(EditorView.editable), false);
    assert.ok(state.facet(EditorView.contentAttributes).some(attributes => attributes.tabindex === '0' && attributes['aria-readonly'] === 'true'));
    const tree = ensureSyntaxTree(state, state.doc.length, 100);
    assert.ok(tree, `${language} has a loaded grammar`);
    let errors = 0;
    tree.iterate({ enter(node) { if (node.type.isError) errors++; } });
    assert.equal(errors, 0, `${language} parses its example`);
    const firstLine = state.doc.line(1);
    assert.ok(foldable(state, firstLine.from, firstLine.to), `${language} function can fold`);
  }
  assert.throws(() => createExampleState('code', 'unknown'), /Unsupported/);
  assert.throws(() => createExampleState(null, 'python'), /string/);
});
