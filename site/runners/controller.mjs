import { RUN_LIMITS, outputBuffer, validateRun } from './limits.mjs';
import { createTraceCollector } from './trace-runtime.mjs';
import { traceOutputFilter } from './trace-wire.mjs';
export { RUN_LIMITS } from './limits.mjs';

export function runnerInfo(language) {
  if (language === 'rust') return { label: 'Rust Playground', remote: true, note: 'Run or Trace sends this code to the public Rust Playground. Stop stops waiting; the service may finish the run. Do not send private data.' };
  if (language === 'python') return { label: 'Python · CPython', remote: false, note: 'Runs in your browser. First run downloads Python. Standard library and guide helpers only; no network, file writes, or interactive input.' };
  if (language === 'c') return { label: 'C · Clang', remote: false, note: 'Compiles and runs in your browser. First run downloads the C compiler. Standard library only; include main(). No interactive input.' };
  return { label: 'JavaScript · QuickJS', remote: false, note: 'Runs in your browser. Console output and the last expression are shown. No DOM, network, or interactive input.' };
}

let currentTask;
let nextRustRun = 0;
const assetCache = new Map();

async function fetchFile(path, signal) {
  const response = await fetch(path, { credentials: 'omit', signal, ...(path.endsWith('/manifest.json') ? { cache: 'no-cache' } : {}) });
  if (!response.ok) throw new Error(`Could not load the runtime (${response.status}). Try again when your connection is available.`);
  return response;
}

async function getAsset(file, signal) {
  let bytes = assetCache.get(file.path);
  if (!bytes) {
    const response = await fetchFile(file.path, signal);
    const compressed = new Uint8Array(await response.arrayBuffer());
    if (compressed.byteLength !== file.bytes) throw new Error('Runtime download was incomplete. Reload and try again.');
    const digest = await crypto.subtle.digest('SHA-256', compressed);
    const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    if (hex !== file.sha256) throw new Error('Runtime integrity check failed. Reload and try again.');
    bytes = file.gzip ? await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer() : compressed.buffer;
    assetCache.set(file.path, bytes);
  }
  return bytes;
}

async function getAssets(language, signal, onStatus) {
  let manifest = assetCache.get('manifest');
  if (!manifest) {
    manifest = await (await fetchFile('/assets/runners/manifest.json', signal)).json();
    assetCache.set('manifest', manifest);
  }
  const definitions = manifest.languages[language];
  const assets = {};
  for (const file of definitions) {
    if (signal.aborted) throw new DOMException('Stopped', 'AbortError');
    onStatus?.(`Loading ${runnerInfo(language).label}…`);
    const bytes = await getAsset(file, signal);
    assets[file.name] = bytes.slice(0);
  }
  const workerSource = new TextDecoder().decode(await getAsset(manifest.worker, signal));
  return { assets, workerSource };
}

/** One explicitly requested run per page. Every task owns and tears down its worker/frame. */
export function runCode({ language, source, onOutput, onStatus, trace = false, onTrace } = {}) {
  currentTask?.stop();
  const abort = new AbortController();
  const buffer = outputBuffer();
  const collector = createTraceCollector(frame => { if (!finished) onTrace?.(frame); });
  let frame;
  let port;
  let readyListener;
  let readyResolve;
  let timer;
  let finished = false;
  let traceWarnings = [];
  const readWarnings = value => Array.isArray(value) ? value.filter(item => typeof item === 'string').slice(0, 12).map(item => item.slice(0, 240)) : [];
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  const task = { promise, stop: () => finish('stopped', 'Stopped.') };
  function finish(status, error = '') {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    abort.abort();
    if (readyListener) removeEventListener('message', readyListener);
    readyResolve?.();
    port?.postMessage('stop');
    port?.close();
    frame?.remove();
    if (currentTask === task) currentTask = undefined;
    resolve({ status, output: buffer.text, error, ...(trace ? { traceFrames: collector.frames, traceTruncated: collector.truncated, traceWarnings } : {}) });
  }
  function append(text) {
    if (finished) return;
    const truncated = buffer.append(text);
    onOutput?.(buffer.text);
    if (truncated) finish('error', 'Output stopped at 32 KB.');
  }
  function timeout(ms, message) {
    clearTimeout(timer);
    timer = setTimeout(() => finish('timeout', message), ms);
  }
  currentTask = task;
  queueMicrotask(async () => {
    try {
      validateRun(language, source);
      if (finished) return;
      if (language === 'rust') {
        if (Date.now() < nextRustRun) throw new Error(`Wait ${Math.ceil((nextRustRun - Date.now()) / 1000)} seconds before another Rust run.`);
        let executableSource = source;
        let filter;
        if (trace) {
          timeout(RUN_LIMITS.loadingMs, 'Trace preparation did not finish within 90 seconds.');
          onStatus?.('Preparing Rust execution trace…');
          const { assets } = await getAssets('rust', abort.signal, onStatus);
          if (finished) return;
          const { instrumentCompiledTrace } = await import('./trace-compiled.mjs');
          const prepared = await instrumentCompiledTrace('rust', source, assets);
          if (finished) return;
          executableSource = prepared.source;
          traceWarnings = readWarnings(prepared.warnings);
          filter = traceOutputFilter({ prefix: prepared.markerPrefix, onFrame: frame => collector.push(frame), onOutput: append });
        }
        nextRustRun = Date.now() + RUN_LIMITS.remoteCooldownMs;
        onStatus?.('Running on Rust Playground…');
        timeout(RUN_LIMITS.remoteMs, 'Rust Playground did not respond within 20 seconds. The service may finish the run.');
        const response = await fetch('https://play.rust-lang.org/execute', {
          method: 'POST', credentials: 'omit', signal: abort.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: 'stable', mode: 'debug', edition: '2021', crateType: 'bin', tests: false, backtrace: false, code: executableSource }),
        });
        if (!response.ok) throw new Error(`Rust Playground is unavailable (${response.status}). No automatic retry was made.`);
        // Bound the streamed response before parsing; hostile output cannot grow page memory without limit.
        const reader = response.body.getReader();
        const chunks = [];
        let bytes = 0;
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > 256 * 1024) { await reader.cancel(); throw new Error('Rust Playground output exceeded the response limit.'); }
          chunks.push(chunk.value);
        }
        const result = JSON.parse(await new Blob(chunks).text());
        if (filter) { filter.write(String(result.stdout || '')); filter.flush(); }
        else append(String(result.stdout || ''));
        append(String(result.stderr || ''));
        finish(result.success ? 'success' : 'error', result.success ? '' : 'Rust compilation or execution failed. See the output.');
        return;
      }
      timeout(RUN_LIMITS.loadingMs, 'The runtime did not finish loading within 90 seconds. Try again when your connection is available.');
      const ready = new Promise(done => { readyResolve = done; });
      frame = document.createElement('iframe');
      // Initialize an eager sandbox before large downloads; keep it out of the
      // page layout without relying on display:none navigation timing.
      frame.loading = 'eager';
      frame.width = '1';
      frame.height = '1';
      frame.tabIndex = -1;
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;left:0;bottom:0;border:0;pointer-events:none';
      frame.title = 'Isolated code runtime';
      frame.sandbox = 'allow-scripts';
      frame.src = '/assets/runners/sandbox.html';
      readyListener = event => {
        if (finished || event.source !== frame.contentWindow || event.data?.type !== 'math-as-code-ready') return;
        removeEventListener('message', readyListener);
        readyResolve();
      };
      addEventListener('message', readyListener);
      document.body.append(frame);
      const { assets, workerSource } = await getAssets(language, abort.signal, onStatus);
      if (finished) return;
      onStatus?.('Starting runtime…');
      await ready;
      if (finished) return;
      const channel = new MessageChannel();
      port = channel.port1;
      port.onmessage = ({ data }) => {
          if (finished || !data || typeof data.type !== 'string') return;
          if (data.type === 'output') append(typeof data.text === 'string' ? data.text.slice(0, RUN_LIMITS.outputChars + 1) : '');
          else if (data.type === 'trace' && trace) collector.push(data.frame);
          else if (data.type === 'status') onStatus?.(String(data.text || 'Starting runtime…').slice(0, 100));
          else if (data.type === 'started') {
            onStatus?.(language === 'c' ? 'Compiling and running…' : 'Running…');
            timeout(RUN_LIMITS.executionMs, 'Stopped after the 5 second execution limit.');
          } else if (['done', 'error', 'timeout'].includes(data.type)) {
            if (data.traceTruncated) collector.truncate();
            traceWarnings = readWarnings(data.traceWarnings);
            if (data.type === 'done') finish('success');
            else if (data.type === 'timeout') finish('timeout', 'Stopped after the 5 second execution limit.');
            else finish('error', String(data.error || 'Execution failed.').slice(0, RUN_LIMITS.outputChars));
          }
      };
      port.start();
      const transfer = Object.values(assets);
      frame.contentWindow.postMessage({ type: 'math-as-code-start', workerSource, payload: { language, source, assets, trace }, transfer }, '*', [channel.port2, ...transfer]);
    } catch (error) {
      if (!finished) finish('error', error?.message || String(error));
    }
  });
  return task;
}
