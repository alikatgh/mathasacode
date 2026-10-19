import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

// Exercise the production DOM movement without mounting the React reader.
const source = await readFile(new URL('../site/comparison-frames.jsx', import.meta.url), 'utf8');
const { code } = await transform(source, { loader: 'jsx', format: 'cjs', target: 'es2022' });
const compiled = { exports: {} };
new Function('require', 'module', 'exports', code)(() => ({}), compiled, compiled.exports);
const { moveComparisonProse } = compiled.exports;

class Node {
  constructor(tag, text = '', className = '') {
    Object.assign(this, { tag, text, className, children: [], parent: null, ownerDocument: document });
  }
  append(...nodes) {
    for (const node of nodes) {
      node.remove();
      node.parent = this;
      this.children.push(node);
    }
  }
  remove() {
    if (!this.parent) return;
    this.parent.children.splice(this.parent.children.indexOf(this), 1);
    this.parent = null;
  }
  before(node) {
    node.remove();
    node.parent = this.parent;
    this.parent.children.splice(this.parent.children.indexOf(this), 0, node);
  }
  replaceWith(node) { this.before(node); this.remove(); }
  querySelectorAll(selector) {
    assert.equal(selector, ':scope > p:not(.comparison__label)');
    return this.children.filter(node => node.tag === 'p' && !node.className.split(' ').includes('comparison__label'));
  }
  get textContent() { return this.text + this.children.map(node => node.textContent).join(''); }
}
const document = {
  createElement: tag => new Node(tag),
  createComment: text => new Node('#comment', text),
};

test('comparison explanation keeps its authored nodes and order outside the code pane', () => {
  const notation = new Node('div');
  const formula = new Node('span', '√x', 'formula');
  notation.append(formula);
  const implementation = new Node('div');
  const label = new Node('p', 'JavaScript', 'comparison__label');
  const lead = new Node('p', 'In programming we use ');
  const inlineCode = new Node('code', 'sqrt');
  const link = new Node('a', ' function');
  lead.append(inlineCode, link, new Node('#text', ', like so:'));
  const secondLead = new Node('p', 'Compute both hidden units before the output.');
  const whitespace = new Node('#text', '\n');
  const comment = new Node('#comment', 'authored source boundary');
  const example = new Node('div', '', 'code-example');
  const codeComment = new Node('code', '// Keep this comment inside the source.\nMath.sqrt(9);');
  example.append(codeComment);
  implementation.append(label, whitespace, lead, comment, secondLead, example);
  const originalNotation = [...notation.children];
  const originalImplementation = [...implementation.children];
  const exactProse = lead.textContent + secondLead.textContent;

  const restore = moveComparisonProse(notation, implementation);
  const context = notation.children.at(-1);
  assert.equal(context.className, 'comparison-context');
  assert.deepEqual(context.children, [lead, secondLead]);
  assert.equal(context.textContent, exactProse);
  assert.equal(lead.children[0], inlineCode);
  assert.equal(lead.children[1], link);
  assert.equal(notation.children[0], formula);
  assert.deepEqual(implementation.querySelectorAll(':scope > p:not(.comparison__label)'), []);
  assert.equal(implementation.children[0], label);
  assert.equal(implementation.children.at(-1), example, 'the editor mount retains its exact node');
  assert.equal(example.children[0], codeComment, 'source comments remain code');

  restore();
  assert.deepEqual(notation.children, originalNotation);
  assert.deepEqual(implementation.children, originalImplementation, 'cleanup restores exact source positions');
  assert.equal(context.parent, null);
  moveComparisonProse(notation, implementation)();
  assert.deepEqual(implementation.children, originalImplementation, 'a mount-cleanup-remount cycle loses no prose');
});

test('a code-only comparison leaves authored DOM untouched', () => {
  const notation = new Node('div');
  const implementation = new Node('div');
  const label = new Node('p', 'Python', 'comparison__label');
  const source = new Node('pre', '# Source comment\nsqrt(9)');
  implementation.append(label, source);
  const restore = moveComparisonProse(notation, implementation);
  assert.equal(notation.children.length, 0);
  assert.deepEqual(implementation.children, [label, source]);
  restore();
  assert.deepEqual(implementation.children, [label, source]);
});
