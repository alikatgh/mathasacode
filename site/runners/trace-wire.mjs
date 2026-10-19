/** Separate compiled guest trace records from normal stdout across any chunking. */
export function traceOutputFilter({ prefix, onFrame, onOutput }) {
  if (typeof prefix !== 'string' || prefix.length < 8 || prefix.length > 100) throw new Error('Invalid trace marker');
  let pending = '';
  const recordLimit = 8192;
  function drain(final = false) {
    while (pending) {
      const at = pending.indexOf(prefix);
      if (at < 0) {
        let keep = 0;
        if (!final) for (let size = 1; size < prefix.length && size <= pending.length; size++) {
          if (pending.endsWith(prefix.slice(0, size))) keep = size;
        }
        const end = pending.length - keep;
        if (end) onOutput(pending.slice(0, end));
        pending = pending.slice(end);
        return;
      }
      if (at > 0) { onOutput(pending.slice(0, at)); pending = pending.slice(at); }
      const end = pending.indexOf('\n', prefix.length);
      if (end < 0) {
        if (pending.length > recordLimit || final) throw new Error('Incomplete or oversized execution trace record.');
        return;
      }
      if (end > recordLimit) throw new Error('Execution trace record exceeds its limit.');
      const text = pending.slice(prefix.length, end);
      pending = pending.slice(end + 1);
      let frame;
      try { frame = JSON.parse(text); } catch { throw new Error('Invalid execution trace record.'); }
      onFrame(frame?.event === 'truncated' ? { truncated: true } : frame);
    }
  }
  return {
    write(chunk) { pending += String(chunk); drain(); },
    flush() { drain(true); },
  };
}
