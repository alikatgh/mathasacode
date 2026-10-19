import test from 'node:test';
import assert from 'node:assert/strict';
import { conceptMaps, renderConcept } from '../site/concept-maps.mjs';

test('authored concept maps render locally at narrow and wide sizes in both guide languages', () => {
  for (const kind of Object.keys(conceptMaps)) {
    for (const language of ['en', 'zh']) {
      for (const width of [240, 920]) {
        const result = renderConcept(kind, language, width);
        assert.ok(result.width <= width, `${kind} exceeds ${width}px`);
        assert.ok(result.height > 0 && result.height < 2000);
        assert.match(result.svg, /<svg/);
        assert.doesNotMatch(result.svg, /<script|<image|<foreignObject|(?:href|src)=["']https?:/i);
        assert.ok(result.title.length > 0);
      }
    }
  }
  assert.throws(() => renderConcept('unknown'), RangeError);
});
