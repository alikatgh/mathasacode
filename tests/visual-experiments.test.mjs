import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { conceptMaps, conceptForTopic } from '../site/concept-maps.mjs';

const compiled = await build({
  entryPoints: [new URL('../site/experiments/index.jsx', import.meta.url).pathname],
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
});
const compiledModule = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), compiledModule, compiledModule.exports);
const { experimentForConcept } = compiledModule.exports;

test('interactive experiments integrate with real topics and render readable localized geometry', () => {
  const kinds = ['dot', 'normalization', 'matrix', 'determinant', 'trigonometry', 'bayes', 'gradient',
    'ml-weighted-sums', 'ml-softmax-normalization', 'derivative', 'integral', 'correlation',
    'ml-relu-branches', 'ml-reverse-gradients', 'ml-bounded-training-loop'];
  for (const kind of kinds) {
    const entry = conceptMaps[kind];
    assert.ok(entry, `${kind} has an authored lesson`);
    for (const topic of entry.topics) assert.equal(conceptForTopic(topic), kind);
    const scene = experimentForConcept(kind);
    assert.equal(typeof scene?.Component, 'function', kind);
    for (const language of ['en', 'zh']) {
      const html = renderToStaticMarkup(React.createElement(scene.Component, { language }));
      assert.match(html, /role="figure"/, `${kind}/${language} has a labelled figure`);
      assert.match(html, /<svg\b/, `${kind}/${language} renders actual geometry`);
      assert.match(html, /viewBox="[\d .-]+"/, `${kind}/${language} uses scalable coordinates`);
      assert.doesNotMatch(html, /(?:="(?:NaN|Infinity|-Infinity)"|\bNaN\b)/, kind);
      assert.match(html, language === 'zh' ? /看见数学如何发生/ : /See the math happen/);
      assert.match(html, language === 'zh' ? /aria-label="下一步"/ : /aria-label="Next visual step"/);
    }
  }
  assert.equal(experimentForConcept('determinant'), experimentForConcept('matrix'));
  assert.equal(experimentForConcept('not-a-concept'), null);
});
