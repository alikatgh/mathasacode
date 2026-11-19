import { RUN_LIMITS, validateRun } from './runners/limits.mjs';

const resultStatuses = new Set(['success', 'error', 'stopped', 'timeout']);
const boundedText = value => typeof value === 'string' ? value.slice(0, RUN_LIMITS.outputChars) : '';

// Editing includes intermediate empty drafts; execution has separate validation.
function validateDraft(source) {
  if (typeof source !== 'string') throw new Error('Source must be text.');
  if (new TextEncoder().encode(source).length > RUN_LIMITS.sourceBytes) throw new Error('Code is limited to 64 KB.');
}

/** State for one editor. The injected runner remains the only execution path. */
export function createSymbolRunnable({ id, source, runner }) {
  validateRun('javascript', source);
  if (typeof runner !== 'function') throw new Error('A sandbox runner is required.');
  const originalSource = source;
  let state = { source, result: null, message: '', validationError: '', copyStatus: 'idle' };
  let task;
  let generation = 0;
  let copyGeneration = 0;
  const listeners = new Set();
  const publish = patch => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };

  function stop() {
    if (!task) return;
    const previous = task;
    task = undefined;
    generation++;
    // Invalidate callbacks before telling the sandbox to tear down its worker.
    previous.stop();
    publish({ result: { ...state.result, status: 'stopped', error: 'Stopped.' }, message: 'Stopped.' });
  }

  function changeSource(nextSource, { fromControls = false } = {}) {
    try {
      if (fromControls) validateRun('javascript', nextSource);
      else validateDraft(nextSource);
    }
    catch (error) {
      publish({ validationError: error.message });
      return false;
    }
    if (nextSource === state.source && !fromControls) return true;
    stop();
    copyGeneration++;
    publish({ source: nextSource, validationError: '', copyStatus: 'idle',
      ...(fromControls ? { result: null, message: 'Code updated from the graph controls. Choose Run to see its output.' } : { message: '' }),
    });
    return true;
  }

  function reset() {
    stop();
    copyGeneration++;
    publish({ source: originalSource, result: null, validationError: '', copyStatus: 'idle', message: 'Example reset. Choose Run to see its output.' });
  }

  async function run() {
    stop();
    copyGeneration++;
    const runGeneration = ++generation;
    const runSource = state.source;
    try { validateRun('javascript', runSource); }
    catch (error) {
      publish({ validationError: error.message });
      return;
    }
    publish({ result: { status: 'running', source: runSource, output: '', error: '' }, message: 'Starting…', validationError: '', copyStatus: 'idle' });
    const active = () => generation === runGeneration;
    let nextTask;
    try {
      nextTask = runner({ language: 'javascript', source: runSource,
        onOutput: output => { if (active()) publish({ result: { ...state.result, output: boundedText(output) } }); },
        onStatus: message => { if (active()) publish({ message: typeof message === 'string' ? message.slice(0, 200) : 'Running…' }); },
      });
      task = nextTask;
      const result = await nextTask.promise;
      if (!active()) return;
      task = undefined;
      generation++;
      const status = resultStatuses.has(result?.status) ? result.status : 'error';
      publish({ result: { status, source: runSource, output: boundedText(result?.output), error: boundedText(result?.error) }, message: '' });
    } catch (error) {
      if (!active()) return;
      task = undefined;
      generation++;
      // The real controller resolves errors; retain a useful bounded failure if
      // the integration itself cannot create or complete a task.
      nextTask?.stop?.();
      publish({ result: { ...state.result, status: 'error', error: boundedText(error?.message || 'The sandbox could not start.') }, message: '' });
    }
  }

  async function copy(writeClipboard) {
    if (state.copyStatus === 'copying') return false;
    const copyId = ++copyGeneration;
    const copiedSource = state.source;
    publish({ copyStatus: 'copying' });
    try {
      if (typeof writeClipboard !== 'function') throw new Error('Clipboard unavailable');
      await writeClipboard(copiedSource);
      if (copyId !== copyGeneration) return false;
      publish({ copyStatus: 'copied' });
      return true;
    } catch {
      if (copyId === copyGeneration) publish({ copyStatus: 'error' });
      return false;
    }
  }

  return {
    id, originalSource,
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    changeSource, reset, run, stop, copy,
    // Retain drafts/results for an in-page remount while preventing late work.
    suspend() {
      copyGeneration++;
      stop();
      if (state.copyStatus === 'copying') publish({ copyStatus: 'idle' });
    },
  };
}

export function runnableStatus(state) {
  if (state.validationError) return state.validationError;
  if (state.copyStatus === 'copying') return 'Copying code…';
  if (state.copyStatus === 'copied') return 'Code copied.';
  if (state.copyStatus === 'error') return 'Copy unavailable. Select the code and copy it with your keyboard.';
  if (!state.result) return state.message || 'Edit this JavaScript, then choose Run. The expected output below is a reference.';
  if (state.result.source !== state.source) return 'Output from an earlier version of this code. Run again to update it.';
  if (state.result.status === 'running') return state.message || 'Running…';
  return { success: 'Finished.', error: 'Error.', stopped: 'Stopped.', timeout: 'Time limit reached.' }[state.result.status] || 'Error.';
}
