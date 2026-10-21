import { symbolGroups } from '../site/symbol-catalog.mjs';
import { symbolDetails, referenceForSymbol } from '../site/symbol-details.mjs';
import { renderSymbolDiagram, renderSymbolPlot, symbolPlots } from './symbol-graphs.mjs';
import { renderExplanation } from './symbol-inline-math.mjs';
import { symbolExplorerIds } from '../site/symbol-explorer-model.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const entries = new Map(symbolGroups.flatMap(group => group.entries.map(entry => [entry.id, entry])));
const list = (items, tag = 'ul') => `<${tag}>${items.map(item => `<li>${renderExplanation(item)}</li>`).join('')}</${tag}>`;
const cache = new Map();

function drawing(diagram, className) {
  return `<div class="symbol-detail__drawing ${className}" aria-hidden="true">${diagram.svg}</div>`;
}

function plotMarkup(id) {
  const plot = symbolPlots[id];
  if (!plot) return '';
  return `<figure class="symbol-detail__plot" aria-labelledby="plot-${id}-title">
    <h4 id="plot-${id}-title">${escape(plot.title)}</h4>
    ${drawing(renderSymbolPlot(id), 'symbol-detail__wide')}${drawing(renderSymbolPlot(id, true), 'symbol-detail__narrow')}
    <figcaption>${renderExplanation(plot.caption)} ${plot.type === 'bar' ? '' : 'The graph shows sampled points joined by straight lines.'}</figcaption>
    <details class="symbol-detail__data"><summary>Graph values</summary><table><thead><tr><th scope="col">${escape(plot.x)}</th><th scope="col">${escape(plot.y)}</th></tr></thead><tbody>${plot.labels.map((label,i)=>`<tr><th scope="row">${escape(label)}</th><td>${escape(Number(plot.values[i].toFixed(6)))}</td></tr>`).join('')}</tbody></table></details>
  </figure>`;
}

export function renderSymbolDetail(entry) {
  entry = entries.get(entry.id);
  if (!entry) return '';
  const detail = symbolDetails[entry.id];
  if (!detail) return '';
  if (cache.has(entry.id)) return cache.get(entry.id);
  const reference = referenceForSymbol(entry);
  const html = `<details class="symbol-detail" id="detail-${entry.id}" data-symbol-detail>
  <summary aria-label="Detailed explanation: ${escape(entry.name)}"><span class="symbol-detail__closed-label">Detailed</span><span class="symbol-detail__open-label">Hide details · ${escape(entry.name)}</span><span class="symbol-detail__summary-hint">Explanation, worked example & diagram</span></summary>
  <div class="symbol-detail__body">
    <div class="symbol-detail__grid">
      <section class="symbol-detail__plain" aria-labelledby="detail-${entry.id}-plain">
        <h4 id="detail-${entry.id}-plain">In simple terms</h4>
        <p>${renderExplanation(detail.intuition)}</p>
        <p class="symbol-detail__read"><span>Read it as</span> “${renderExplanation(detail.readAs)}”</p>
        <h4>A small example, step by step</h4>
        ${list(detail.steps, 'ol')}
        <h4>Easy mistakes to avoid</h4>
        ${list(detail.pitfalls)}
      </section>
      <section class="symbol-detail__example" data-symbol-example="${entry.id}" aria-labelledby="detail-${entry.id}-code">
        <span class="symbol-detail__eyebrow">Worked JavaScript</span>
        <h4 id="detail-${entry.id}-code">${escape(detail.example.title)}</h4>
        ${symbolExplorerIds.includes(entry.id) ? `<div data-symbol-explorer="${entry.id}"></div>` : ''}
        <pre class="symbol-sheet__code" data-symbol-runnable tabindex="0" aria-label="${escape(entry.name)}: detailed JavaScript example"><code>${escape(detail.example.code)}</code></pre>
        <div data-symbol-run-host></div>
        <div class="symbol-detail__output"><span>Output</span><pre tabindex="0"><code>${escape(detail.example.output)}</code></pre></div>
        <h4>What the code does</h4>
        ${list(detail.example.notes, 'ol')}
      </section>
    </div>
    <figure class="symbol-detail__flow" aria-labelledby="flow-${entry.id}-title">
      <h4 id="flow-${entry.id}-title">See how it works</h4>
      ${drawing(renderSymbolDiagram(entry.id, detail.diagram), 'symbol-detail__wide')}${drawing(renderSymbolDiagram(entry.id, detail.diagram, true), 'symbol-detail__narrow')}
      <p class="symbol-sheet__sr-only">${detail.diagram.nodes.map(escape).join(' → ')}</p>
      <figcaption>${renderExplanation(detail.diagram.caption)}</figcaption>
    </figure>
    ${plotMarkup(entry.id)}
    <nav class="symbol-detail__links" aria-label="More about ${escape(entry.name)}">
      <span>Keep learning</span>
      <a href="${escape(entry.lesson)}">Full lesson →</a>
      ${detail.related.map(id=>`<a href="#detail-${escape(id)}">${escape(entries.get(id)?.name || id)} →</a>`).join('')}
      <a href="${escape(reference.href)}">${escape(reference.title)} ↗</a>
      <a class="symbol-detail__permalink" href="#detail-${entry.id}">Link to this explanation</a>
    </nav>
  </div>
</details>`;
  cache.set(entry.id, html);
  return html;
}
