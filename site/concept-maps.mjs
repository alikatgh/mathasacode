import { register, render } from 'pele/core';
import flowchart from 'pele/diagrams/flowchart';
import { mathVisuals } from './math-visuals.mjs';
import { mlVisuals } from './ml-visuals.mjs';

register(flowchart);

// Authored, local diagrams only. No user input, links or remote assets. Register
// just flowcharts rather than shipping Pele's unrelated chart engines.
export const conceptMaps = Object.freeze({ ...mathVisuals, ...mlVisuals });
const byTopic = new Map();
for (const [kind, entry] of Object.entries(conceptMaps)) {
  for (const topic of entry.topics) {
    if (byTopic.has(topic)) throw new Error(`Duplicate visual explanation for ${topic}`);
    byTopic.set(topic, kind);
  }
}

export function conceptForTopic(id) {
  return byTopic.get(id) || null;
}

export function renderConcept(kind, language = 'en', width = 720) {
  const definition = conceptMaps[kind];
  const entry = definition?.[language] || definition?.en;
  if (!entry) throw new RangeError('Unknown concept map');
  const maxWidth = Math.min(1600, Math.max(160, Number.isFinite(width) ? width : 720));
  const options = {
    maxWidth, autoDirection: false, fontFamily: 'system-ui, sans-serif',
    fontSize: 14, padding: 10, links: false, images: false,
    maxEdges: 12, limit: 8000, outputLimit: 200000,
    idPrefix: `concept-${kind}-${language}`
  };
  const sources = [entry.source];
  if (maxWidth < 600 && entry.sourceNarrow) sources.push(entry.sourceNarrow);
  const candidates = [];
  // maxWidth is a hint, not a hard bound in Pele. Compare both reading
  // directions: use the shortest fitting layout, or the narrower one when
  // branches need contained scrolling. Keep the same text size in either case.
  for (const source of sources) {
    candidates.push(render(source, options));
    if (/^flowchart (?:LR|TD)\b/.test(source)) {
      candidates.push(render(source.replace(/^flowchart (LR|TD)\b/, (_, direction) => `flowchart ${direction === 'LR' ? 'TD' : 'LR'}`), options));
    }
  }
  const fitting = candidates.filter(candidate => candidate.width <= maxWidth);
  const diagram = fitting.length
    ? fitting.reduce((best, candidate) => candidate.height < best.height ? candidate : best)
    : candidates.reduce((best, candidate) => candidate.width < best.width ? candidate : best);
  return {
    ...entry,
    ...diagram
  };
}
