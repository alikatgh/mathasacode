import { renderCurriculumDiagram } from './diagrams.mjs';

const mounted = new WeakMap();
let diagramID = 0;

/** Keep diagram sizing, async work and resize listeners inside the current article. */
export function mountCurriculumDiagrams(element, { renderDiagram = renderCurriculumDiagram } = {}) {
  if (!element) return () => {};
  mounted.get(element)?.();
  let active = true;
  const records = [...element.querySelectorAll('.curriculum-diagram')].map(figure => ({
    figure,
    viewport: figure.querySelector('.curriculum-diagram-viewport'),
    output: figure.querySelector('.diagram-output'),
    details: figure.querySelector('.diagram-source'),
    status: figure.querySelector('.diagram-status'),
    source: figure.querySelector('code.language-mermaid')?.textContent,
    idPrefix: `curriculum-${++diagramID}`,
    revision: 0,
    rendered: false,
  })).filter(record => record.viewport && record.output && record.details && record.source);
  const current = (record, revision) => active && element.isConnected && element.contains(record.figure) && revision === record.revision;
  async function update(record) {
    if (!active || !element.contains(record.figure)) return;
    const width = Math.floor(record.viewport.clientWidth) || 720;
    if (record.width === width) return;
    record.width = width;
    const revision = ++record.revision;
    try {
      const result = await renderDiagram(record.source, { width, idPrefix: record.idPrefix });
      if (!current(record, revision)) return;
      record.output.innerHTML = result.svg;
      record.output.style.width = `${result.width}px`;
      record.output.style.height = `${result.height}px`;
      record.figure.dataset.diagramRenderer = 'pele';
      if (!record.rendered) record.details.open = false;
      record.rendered = true;
      if (record.status) { record.status.hidden = true; record.status.textContent = ''; }
    } catch {
      if (!current(record, revision)) return;
      record.details.open = true;
      if (record.status) {
        record.status.textContent = 'Diagram unavailable. The original source is shown below.';
        record.status.hidden = false;
      }
    }
  }
  const view = element.ownerDocument?.defaultView;
  const resize = () => { records.forEach(record => { void update(record); }); };
  const Observer = view?.ResizeObserver;
  let observer;
  if (Observer) {
    observer = new Observer(entries => {
      for (const entry of entries) {
        const record = records.find(record => record.viewport === entry.target);
        if (record) void update(record);
      }
    });
    records.forEach(record => observer.observe(record.viewport));
  } else view?.addEventListener('resize', resize);
  function cleanup() {
    if (!active) return;
    active = false;
    observer?.disconnect();
    if (!Observer) view?.removeEventListener('resize', resize);
    if (mounted.get(element) === cleanup) mounted.delete(element);
  }
  mounted.set(element, cleanup);
  resize();
  return cleanup;
}
