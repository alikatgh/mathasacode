import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { conceptMaps, conceptForTopic, renderConcept } from '../site/concept-maps.mjs';
import { documents, renderDocument } from '../scripts/build.mjs';

test('authored concept maps render locally at narrow and wide sizes in both guide languages', () => {
  for (const [kind, definition] of Object.entries(conceptMaps)) {
    for (const language of ['en', 'zh'].filter(language => definition[language])) {
      for (const width of [180, 320, 920]) {
        const result = renderConcept(kind, language, width);
        assert.ok(result.width > 0 && result.width <= Math.max(600, width), `${kind} has an unexpectedly wide layout at ${width}px`);
        assert.ok(result.height > 0 && result.height < 2000);
        assert.match(result.svg, /<svg/);
        assert.doesNotMatch(result.svg, /<script|<image|<foreignObject|(?:href|src)=["']https?:/i);
        assert.ok(result.title.length > 0);
        assert.ok(result.takeaway.length > 0);
        assert.ok(result.steps.length >= 3 && result.steps.length <= 8, `${kind} has a complete short text alternative`);
      }
    }
  }
  assert.throws(() => renderConcept('unknown'), RangeError);
  assert.equal(conceptForTopic('unknown'), null);
});

test('visual explanations resolve to real guide topics, cover every ML lesson and both math languages', async () => {
  const allHeadings = new Set();
  const coverage = new Map();
  for (const document of documents.filter(document => document.guide)) {
    const source = await readFile(new URL(`../${document.source}`, import.meta.url), 'utf8');
    const { headings } = renderDocument(source, document);
    const topics = headings.filter(heading => heading.depth >= 2);
    for (const heading of topics) allHeadings.add(heading.id);
    const mapped = topics.filter(heading => conceptForTopic(heading.id));
    coverage.set(document.output, mapped.length);
    if (document.output === 'machine-learning.html') {
      assert.equal(mapped.length, 10, 'all ten ML lessons have a visual explanation');
    } else {
      assert.ok(mapped.length >= 28, `${document.source} has broad explanation coverage`);
      for (const heading of mapped) assert.ok(conceptMaps[conceptForTopic(heading.id)][document.lang], `${heading.id} has localized content`);
    }
  }
  assert.ok(Object.keys(conceptMaps).length >= 40);
  for (const [kind, definition] of Object.entries(conceptMaps)) {
    for (const topic of definition.topics) {
      assert.ok(allHeadings.has(topic), `${kind} has unreachable topic alias ${topic}`);
      assert.equal(conceptForTopic(topic), kind);
    }
  }
});

test('rendering keeps a bounded finite layout for invalid or oversized width requests', () => {
  for (const width of [NaN, Infinity, -50, 100000]) {
    const result = renderConcept('average', 'en', width);
    assert.ok(Number.isFinite(result.width) && Number.isFinite(result.height));
    assert.ok(result.width > 0 && result.width <= 1600);
  }
});

test('long pipelines change direction rather than shrinking their text on phones', () => {
  const narrow = renderConcept('ml-objective-route', 'en', 248);
  const wide = renderConcept('ml-objective-route', 'en', 920);
  assert.ok(narrow.width <= 248);
  assert.ok(narrow.height > wide.height);
  assert.ok(narrow.width < wide.width);
});

test('every explanation is fully visible in a 320px phone lesson without horizontal scrolling', () => {
  // 320px viewport minus the reader and figure's existing horizontal padding.
  for (const [kind, definition] of Object.entries(conceptMaps)) {
    for (const language of ['en', 'zh'].filter(language => definition[language])) {
      const diagram = renderConcept(kind, language, 248);
      assert.ok(diagram.width <= 248, `${kind}/${language} needs a compact layout (${diagram.width}px)`);
    }
  }
});
