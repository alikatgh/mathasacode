export const TRACE_LIMITS = Object.freeze({ frames: 500, bytes: 32768, locals: 24, valueChars: 240 });

/** Treat guest trace messages as untrusted, bounded data, never executable values. */
export function createTraceCollector(options = {}) {
  const onTrace = typeof options === 'function' ? options : options.onTrace;
  const frames = [];
  let traceFrames = 0;
  let traceBytes = 0;
  let traceTruncated = false;
  const encoder = new TextEncoder();
  const collector = {
    frames,
    push(record) {
      if (record?.truncated === true) { traceTruncated = true; return false; }
      if (traceTruncated || !record || !Number.isSafeInteger(record.line) || record.line < 1 ||
        !['line', 'return'].includes(record.event) || !record.locals || typeof record.locals !== 'object' || Array.isArray(record.locals)) return false;
      const locals = Object.create(null);
      const entries = Object.entries(record.locals);
      if (entries.length > TRACE_LIMITS.locals + 1 || entries.some(([name, value]) => name.length > 256 || typeof value !== 'string' || value.length > TRACE_LIMITS.valueChars + 20)) return false;
      for (const [name, value] of entries) locals[name] = value;
      const frame = { line: record.line, event: record.event, locals };
      const bytes = encoder.encode(JSON.stringify(frame)).length;
      if (traceFrames >= TRACE_LIMITS.frames || traceBytes + bytes > TRACE_LIMITS.bytes) { traceTruncated = true; return false; }
      traceFrames++;
      traceBytes += bytes;
      frames.push(frame);
      onTrace?.(frame);
      return true;
    },
    get truncated() { return traceTruncated; },
    get bytes() { return traceBytes; },
    truncate() { traceTruncated = true; },
    get status() { return { traceFrames, traceBytes, traceTruncated }; },
  };
  collector.receive = record => collector.push(record);
  return collector;
}
