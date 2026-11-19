import katex from 'katex';
import { symbolGroups } from '../site/symbol-catalog.mjs';
import { renderSymbolDetail } from './symbol-detail.mjs';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const keywordsText = keywords => Array.isArray(keywords) ? keywords.join(' ') : String(keywords ?? '');
const groupAnchor = group => `symbols-${group.id}`;
const entryAnchor = entry => `symbol-${entry.id}`;

function renderNotation(entry) {
  if (!entry.latex?.length) return escapeHTML(entry.symbol);
  return entry.latex.map(tex => `<span class="symbol-sheet__math">${katex.renderToString(tex, {
    displayMode: false, output: 'htmlAndMathml', throwOnError: true,
    strict: 'error', trust: false, maxExpand: 1000,
  })}</span>`).join('');
}

// Lesson links are authored routes. Escaping alone must never permit a script URL.
function lessonHref(value) {
  const href = String(value ?? '').trim();
  if (/^\/(?!\/)/.test(href) || /^#[^\s]*$/.test(href)) return href;
  try {
    const url = new URL(href);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
  } catch { /* Invalid authored routes remain non-executable. */ }
  return '#symbol-cheatsheet';
}

function renderEntry(entry) {
  const anchor = entryAnchor(entry);
  return `<li class="symbol-sheet__row" id="${escapeHTML(anchor)}" data-symbol-entry="${escapeHTML(entry.id)}" data-symbol-keywords="${escapeHTML(keywordsText(entry.keywords))}"${[...entry.symbol].length > 12 ? ' data-symbol-wide' : ''}>
  <div class="symbol-sheet__notation">
    <span class="symbol-sheet__cell-label">Symbol</span>
    <a class="symbol-sheet__symbol" href="#${escapeHTML(anchor)}" aria-label="Link to ${escapeHTML(entry.name)}"><span data-symbol-value data-symbol-plain="${escapeHTML(entry.symbol)}">${renderNotation(entry)}</span></a>
  </div>
  <div class="symbol-sheet__meaning">
    <span class="symbol-sheet__cell-label">Plain meaning</span>
    <h3 class="symbol-sheet__name" data-symbol-name>${escapeHTML(entry.name)}</h3>
    <p class="symbol-sheet__explanation" data-symbol-explanation>${escapeHTML(entry.explanation)}</p>
    <a class="symbol-sheet__lesson" href="${escapeHTML(lessonHref(entry.lesson))}">Full lesson<span class="symbol-sheet__sr-only"> about ${escapeHTML(entry.name)}</span><span aria-hidden="true"> →</span></a>
  </div>
  <div class="symbol-sheet__implementation">
    <span class="symbol-sheet__cell-label">JavaScript</span>
    <pre class="symbol-sheet__code" tabindex="0" aria-label="${escapeHTML(entry.name)}: JavaScript example"><code data-symbol-code>${escapeHTML(entry.code)}</code></pre>
  </div>
  ${renderSymbolDetail(entry)}
</li>`;
}

/** One article keeps every group in the reader's single, continuous topic. */
export function renderSymbolSheet(groups = symbolGroups) {
  const total = groups.reduce((count, group) => count + group.entries.length, 0);
  return `<article class="symbol-sheet" data-symbol-sheet>
  <p class="symbol-sheet__intro">Look up a symbol, read it in plain language, and see the same idea in JavaScript. Open <strong>Detailed</strong> for a slower explanation, worked code and a diagram, or switch the whole page to the detailed view.</p>
  <div class="symbol-sheet__tools" data-symbol-tools hidden>
    <div class="symbol-sheet__search" role="search" aria-label="Symbol reference">
      <label class="symbol-sheet__search-label" for="symbol-sheet-search">Find a symbol</label>
      <div class="symbol-sheet__search-field">
        <input id="symbol-sheet-search" data-symbol-search type="search" placeholder="Try ∑, average, or Math.sqrt" autocomplete="off" spellcheck="false" aria-describedby="symbol-sheet-result-count">
        <button type="button" class="symbol-sheet__clear" data-symbol-clear hidden>Clear</button>
      </div>
    </div>
    <p class="symbol-sheet__count" id="symbol-sheet-result-count" data-symbol-count role="status" aria-live="polite" aria-atomic="true">${total} symbols across ${groups.length} groups</p>
    <div class="symbol-sheet__views" role="group" aria-label="Explanation depth">
      <button type="button" data-symbol-view="compact" aria-pressed="true">Compact</button>
      <button type="button" data-symbol-view="detailed" aria-pressed="false">Detailed</button>
    </div>
    <button type="button" class="symbol-sheet__forget" data-symbol-forget>Forget saved reading state</button>
  </div>
  <nav class="symbol-sheet__jump" aria-label="Symbol groups">
    <span class="symbol-sheet__jump-label">Jump to</span>
    <ul role="list">${groups.map(group => `<li><a href="#${escapeHTML(groupAnchor(group))}">${escapeHTML(group.title)}</a></li>`).join('')}</ul>
  </nav>
  <div class="symbol-sheet__empty" data-symbol-empty hidden>
    <p>No symbols match your search.</p>
    <button type="button" data-symbol-reset>Clear search</button>
  </div>
  ${groups.map(group => `<section class="symbol-sheet__group" id="${escapeHTML(groupAnchor(group))}" data-symbol-group="${escapeHTML(group.id)}" aria-labelledby="${escapeHTML(groupAnchor(group))}-heading">
    <h2 class="symbol-sheet__group-title" id="${escapeHTML(groupAnchor(group))}-heading" data-symbol-group-title>${escapeHTML(group.title)}</h2>
    <div class="symbol-sheet__columns" aria-hidden="true"><span>Symbol</span><span>Plain meaning</span><span>JavaScript</span></div>
    <ul class="symbol-sheet__rows" role="list">${group.entries.map(renderEntry).join('\n')}</ul>
  </section>`).join('\n')}
</article>`;
}
