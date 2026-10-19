// The replay surface shows only frames belonging to the visible, original
// source. Helper preludes and an appended empty main remain execution-only.
export const TRACE_VIEW_LIMITS = Object.freeze({ frames: 500, bytes: 32768 });

export function traceSourceWindow(source, executableSource) {
  if (typeof source !== 'string' || typeof executableSource !== 'string') return null;
  if (!source) return { startLine: 1, endLine: 0 };
  const offset = executableSource.indexOf(source);
  if (offset < 0) return null;
  const startLine = executableSource.slice(0, offset).split('\n').length;
  return { startLine, endLine: startLine + source.split('\n').length - 1 };
}

export function mapTraceFrames(frames, source, executableSource) {
  const window = traceSourceWindow(source, executableSource);
  const mapped = [];
  let bytes = 2; // Include the enclosing JSON array in the retained-data bound.
  let truncated = false;
  if (!window) return { frames: mapped, truncated, mapped: false };
  for (const frame of Array.isArray(frames) ? frames : []) {
    if (!Number.isInteger(frame?.line) || frame.line < window.startLine || frame.line > window.endLine
      || !['line', 'return'].includes(frame.event)) continue;
    const locals = Object.create(null);
    if (frame.locals && typeof frame.locals === 'object' && !Array.isArray(frame.locals)) {
      for (const [name, value] of Object.entries(frame.locals)) {
        if (typeof value === 'string') locals[name] = value;
      }
    }
    const next = { line: frame.line - window.startLine + 1, event: frame.event, locals };
    const size = new TextEncoder().encode(JSON.stringify(next)).length + (mapped.length ? 1 : 0);
    if (mapped.length >= TRACE_VIEW_LIMITS.frames || bytes + size > TRACE_VIEW_LIMITS.bytes) {
      truncated = true;
      break;
    }
    mapped.push(next);
    bytes += size;
  }
  return { frames: mapped, truncated, mapped: true };
}

export function currentTrace(trace, language, source) {
  return trace?.language === language && trace.source === source ? trace : undefined;
}

export function traceStep(step, length) {
  return Math.min(Math.max(0, Number.isFinite(step) ? Math.floor(step) : 0), Math.max(0, length - 1));
}

export function foldsCoveringTraceLine(regions, foldedStarts, line) {
  return foldedStarts.filter(start => regions.some(region => region.start === start && line > start && line <= region.end));
}
