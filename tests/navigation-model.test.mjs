import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { documents, renderDocument } from '../scripts/build.mjs';
import { navigationGroups, filterNavigation, sectionForPath } from '../site/navigation-model.mjs';

test('navigation exposes every actual heading once, across all guide versions', async () => {
  for (const document of documents.filter(document => document.guide)) {
    const { headings } = renderDocument(await readFile(new URL(`../${document.source}`, import.meta.url), 'utf8'), document);
    const topics = headings.filter(heading => !/^(contents|table of contents|目录)$/i.test(heading.text)).map(heading => ({ id: heading.id, title: heading.text, heading: { tagName: `H${heading.depth}` } }));
    const groups = navigationGroups(topics, new Map(), { section: document.output === 'machine-learning.html' ? 'ml' : 'reference', zh: document.lang === 'zh' });
    assert.deepEqual(groups.flatMap(group => group.items.map(item => item.topic.id)), topics.map(topic => topic.id), `${document.source} loses or duplicates headings`);
    assert.equal(new Set(groups.map(group => group.id)).size, groups.length);
    if (document.output !== 'machine-learning.html') {
      assert.deepEqual(groups.map(group => group.id), ['start', 'basics', 'vectors', 'sums', 'sets', 'functions', 'matrices', 'calculus', 'graphics', 'arithmetic', 'statistics', 'about']);
      assert.ok(groups.some(group => group.items.some(item => item.nested)), 'subtopics remain discoverable');
    }
  }
});

test('search matches notation, plain names and parent context without losing rows on reset', () => {
  const topics = [
    { id: 'math-as-code', title: 'Math as Code', heading: { tagName: 'H1' } },
    { id: 'dot--cross', title: 'dot & cross', heading: { tagName: 'H2' } },
    { id: 'dot-product', title: 'dot product', heading: { tagName: 'H4' } },
    { id: 'sigma', title: 'sigma', heading: { tagName: 'H2' } }
  ];
  const groups = navigationGroups(topics);
  assert.ok(filterNavigation(groups, '∑').flatMap(group => group.items).some(item => item.topic.id === 'sigma'));
  assert.ok(filterNavigation(groups, 'dot product').flatMap(group => group.items).some(item => item.topic.id === 'dot-product'));
  assert.equal(filterNavigation(groups, 'Vectors products').flatMap(group => group.items).length, 2);
  assert.deepEqual(filterNavigation(groups, 'no-such-symbol'), []);
  assert.deepEqual(filterNavigation(groups, '  '), groups);
});

test('every route identifies its learning section, including canonical URLs', () => {
  for (const suffix of ['', '.html', '/', '.html/']) {
    assert.equal(sectionForPath(`/cheatsheet${suffix}`), 'cheatsheet');
    assert.equal(sectionForPath(`/machine-learning${suffix}`), 'ml');
    assert.equal(sectionForPath(`/README-zh${suffix}`), 'reference');
    assert.equal(sectionForPath(`/PYTHON-README${suffix}`), 'reference');
  }
  assert.equal(sectionForPath('/'), 'reference');
  assert.equal(sectionForPath('/index.html'), 'reference');
  assert.equal(sectionForPath('/blog'), 'project');
});

test('Chinese navigation finds taught symbols through its own translated anchors', async () => {
  const document = documents.find(document => document.lang === 'zh');
  const { headings } = renderDocument(await readFile(new URL(`../${document.source}`, import.meta.url), 'utf8'), document);
  const topics = headings.filter(heading => heading.id !== '目录').map(heading => ({ id: heading.id, title: heading.text, heading: { tagName: `H${heading.depth}` } }));
  const groups = navigationGroups(topics, new Map(), { section: 'reference', zh: true });
  for (const [symbol, target] of [['∑', '西格玛sigma'], ['∏', '大写-pi'], ['∇', '梯度与梯度下降'], ['∂', '梯度与梯度下降'], ['≤', '等式equality'], ['≈', '等号'], ['∈', '属于'], ['∩', '区间intervals'], ['∪', '区间intervals'], ['σ', '方差与标准差']]) {
    assert.ok(filterNavigation(groups, symbol).flatMap(group => group.items).some(item => item.topic.id === target), `${symbol} must find ${target}`);
  }
});
