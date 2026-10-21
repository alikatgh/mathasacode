import { traceStep } from './trace-view-model.mjs';

export const TRACE_VISUAL_LIMITS = Object.freeze({
  frames: 500, historyPoints: 64, diagramLabel: 104, visibleChanges: 6, collectionCells: 24, collectionInput: 4096,
});

/** These are already formatted runtime previews, never expressions to evaluate. */
export function traceScalar(preview) {
  if (typeof preview !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(preview.trim())) return null;
  const value = Number(preview);
  if (/^[+-]?\d+$/.test(preview.trim()) && !Number.isSafeInteger(value)) return null;
  return Number.isFinite(value) ? value : null;
}

function locals(frame) {
  return Object.entries(frame?.locals ?? {}).filter(([, value]) => typeof value === 'string');
}

export function traceChanges(previous, current) {
  const before = new Map(locals(previous)), after = new Map(locals(current));
  const names = [...after.keys(), ...[...before.keys()].filter(name => !after.has(name))];
  return names.map(name => ({
    name, before: before.get(name), after: after.get(name),
    kind: !after.has(name) ? 'removed' : !before.has(name) ? 'new' : before.get(name) === after.get(name) ? 'unchanged' : 'changed',
  }));
}

/** Only complete JSON-shaped numeric previews become cells; omitted data stays text. */
export function traceCollection(preview) {
  if (typeof preview !== 'string' || preview.length > TRACE_VISUAL_LIMITS.collectionInput || !preview.startsWith('[')) return null;
  let value;
  try { value = JSON.parse(preview); } catch { return null; }
  if (!Array.isArray(value) || !value.length) return null;
  const scalar = item => typeof item === 'number' && Number.isFinite(item);
  const matrix = value.every(row => Array.isArray(row) && row.length && row.every(scalar))
    && value.every(row => row.length === value[0].length);
  if (!matrix && !value.every(scalar)) return null;
  const rows = matrix ? value : [value];
  const previews = preview.match(/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g) ?? [];
  let total = 0;
  const cells = [];
  rows.forEach((row, r) => row.forEach((number, c) => {
    total++;
    if (cells.length < TRACE_VISUAL_LIMITS.collectionCells) cells.push({ row: r, column: c, value: number, preview: previews[total - 1], label: matrix ? `[${r}, ${c}]` : `[${c}]` });
  }));
  return { kind: matrix ? 'matrix' : 'array', rows: rows.length, columns: rows[0].length, cells, total };
}

function validFrame(frame, lineCount) {
  return frame && Number.isInteger(frame.line) && frame.line > 0 && frame.line <= lineCount && ['line', 'return'].includes(frame.event);
}

/** Model only the selected recorded prefix, with exact source/language identity. */
export function traceVisualization(trace, source, language = trace?.language) {
  if (!trace || typeof source !== 'string' || trace.source !== source || trace.language !== language) return null;
  const frames = Array.isArray(trace.frames) ? trace.frames.slice(0, TRACE_VISUAL_LIMITS.frames) : [];
  const lines = source.split('\n');
  const step = traceStep(trace.step, frames.length);
  const frame = trace.status !== 'running' && validFrame(frames[step], lines.length) ? frames[step] : null;
  const previous = frame && validFrame(frames[step - 1], lines.length) ? frames[step - 1] : null;
  const changes = frame ? traceChanges(previous, frame) : [];
  const numericNames = changes.filter(item => item.after !== undefined && traceScalar(item.after) !== null).map(item => item.name);
  const collections = changes.flatMap(item => {
    const collection = traceCollection(item.after);
    return collection ? [{ name: item.name, ...collection, previous: traceCollection(item.before) }] : [];
  });
  return {
    status: trace.status, step, count: frames.length, frame, previous, changes, numericNames, collections,
    sourceLine: frame ? lines[frame.line - 1] : '', previousSourceLine: previous ? lines[previous.line - 1] : '',
    frames, truncated: Boolean(trace.truncated || (trace.frames?.length > frames.length)),
    mappingUnavailable: Boolean(trace.mappingUnavailable), warnings: Array.isArray(trace.warnings) ? trace.warnings.filter(item => typeof item === 'string') : [],
  };
}

/** Escape every syntax-bearing character before placing untrusted text in quotes. */
export function traceDiagramLabel(text, limit = TRACE_VISUAL_LIMITS.diagramLabel) {
  const compact = String(text).replace(/\s+/g, ' ').trim();
  const clipped = compact.length > limit ? `${compact.slice(0, limit - 1)}…` : compact;
  // Pele/Mermaid uses #34; entities; HTML's &#34; would leave a visible '&'.
  return clipped.replace(/[^\p{L}\p{N} .,:=+−→()_\-]/gu, character => `#${character.codePointAt(0)};`);
}

export function traceFlowSource(model) {
  if (!model?.frame) return null;
  const event = frame => frame.event === 'return' ? `Return at line ${frame.line}` : `Before line ${frame.line}`;
  const label = (frame, step, source) => traceDiagramLabel(`Step ${step} · ${event(frame)}: ${source.trim() || '(blank line)'}`);
  const current = `current["${label(model.frame, model.step + 1, model.sourceLine)}"]`;
  return `flowchart TD\n${model.previous ? `previous["${label(model.previous, model.step, model.previousSourceLine)}"]\nprevious --> current\n` : ''}${current}\nclass current selected`;
}

/** Gaps end a series: never draw a line through an unrecorded or nonnumeric value. */
export function traceHistory(model, name) {
  if (!model?.frame || !model.numericNames.includes(name)) return null;
  const points = [];
  for (let index = model.step; index >= 0; index--) {
    const preview = new Map(locals(model.frames[index])).get(name);
    const value = traceScalar(preview);
    if (value === null) break;
    points.push({ step: index + 1, value, preview });
  }
  points.reverse();
  if (!points.length) return null;
  const stride = Math.ceil((points.length - 1) / (TRACE_VISUAL_LIMITS.historyPoints - 1)) || 1;
  // Exact equal step spacing lets Pele's numeric x-axis retain actual positions.
  // Align the sample window to the selected frame, never to a future endpoint.
  const samples = points.filter((_, index) => (points.length - 1 - index) % stride === 0);
  const magnitude = Math.max(...samples.map(point => Math.abs(point.value)));
  // Scale extreme finite values to keep axis arithmetic and Pele coordinates finite.
  const scale = magnitude && (magnitude > 1e6 || magnitude < 1e-4) ? magnitude : 1;
  const values = samples.map(point => point.value / scale);
  let min = Math.min(...values), max = Math.max(...values);
  const padding = Math.max(
    (max - min || Math.max(Math.abs(max), 1)) * 0.1,
    // Keep tick arithmetic above the local floating-point spacing, including
    // adjacent doubles; padding changes the viewport, never recorded values.
    Math.max(Math.abs(min), Math.abs(max), 1) * Number.EPSILON * 8,
  );
  min -= padding; max += padding;
  const axis = scale === 1 ? name : `${name} / ${scale}`;
  // Number's shortest round-trip serialization preserves distinct recorded
  // doubles. Fixed significant digits can flatten both a series and its axis.
  const number = value => String(value);
  const xAxis = samples.length === 1 ? `["${samples[0].step}"]` : `${samples[0].step} --> ${samples.at(-1).step}`;
  const source = `xychart\nx-axis "Recorded step" ${xAxis}\ny-axis "${traceDiagramLabel(axis, 60)}" ${number(min)} --> ${number(max)}\n${samples.length === 1 ? 'bar' : 'line'} [${values.map(number).join(', ')}]`;
  return { name, points, samples, sampled: samples.length !== points.length, scale, source };
}

export function tracePeleOptions(prefix, width = 360) {
  return {
    idPrefix: String(prefix).replace(/[^a-zA-Z0-9_-]/g, ''), maxWidth: Math.max(180, Math.min(640, width)),
    autoDirection: false, responsive: true, fontFamily: 'system-ui, sans-serif', fontSize: 12, padding: 8,
    links: false, images: false, icons: () => null, maxEdges: 4, limit: 12000, outputLimit: 160000,
    config: { htmlLabels: false, flowchart: { htmlLabels: false } },
  };
}
