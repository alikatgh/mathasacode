import React, { Component, useLayoutEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Play, RotateCcw, Square } from 'lucide-react';
import { runCode } from './runners/controller.mjs';
import { RUN_LIMITS } from './runners/limits.mjs';
import { createSymbolRunnable, runnableStatus } from './symbol-runnable-model.mjs';

const prepared = new WeakMap();

/** Capture authored source before React replaces its presentation. No code runs. */
export function prepareSymbolRunnables(main) {
  if (prepared.has(main)) return prepared.get(main);
  const examples = [];
  for (const pre of main.querySelectorAll('pre[data-symbol-runnable]')) {
    const section = pre.closest('section[data-symbol-example]');
    const code = pre.querySelector(':scope > code');
    const host = section?.querySelector('[data-symbol-run-host]');
    const id = section?.dataset.symbolExample;
    if (!id || !code || !host || !main.contains(section)) continue;
    const outputLabel = section.querySelector('.symbol-detail__output > span');
    examples.push({ id, pre, section, host, detail: section.closest('details[data-symbol-detail]'),
      name: section.querySelector('h4')?.textContent || id,
      outputLabel, expectedLabel: outputLabel?.textContent,
      source: code.textContent,
      model: createSymbolRunnable({ id, source: code.textContent, runner: runCode }),
    });
  }
  prepared.set(main, examples);
  return examples;
}

function restoreAuthored(example) {
  example.pre.hidden = false;
  if (example.outputLabel) example.outputLabel.textContent = example.expectedLabel;
}

class RunnableBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { restoreAuthored(this.props.example); this.props.example.model.suspend(); }
  render() {
    return this.state.failed
      ? <p role="status">The editor is unavailable. The original JavaScript and its expected output remain readable.</p>
      : this.props.children;
  }
}

function SymbolRunnable({ example }) {
  const { model, name, id } = example;
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  const running = state.result?.status === 'running';
  const stale = state.result && state.result.source !== state.source;
  const editorId = `symbol-editor-${id}`;
  const statusId = `symbol-run-status-${id}`;
  const helpId = `symbol-run-help-${id}`;

  useLayoutEffect(() => {
    example.pre.hidden = true;
    if (example.outputLabel) example.outputLabel.textContent = 'Expected output · original example';
    const close = () => { if (!example.detail?.open) model.stop(); };
    const replace = event => {
      if (event.target !== example.section || event.detail?.id !== id) return;
      model.changeSource(event.detail.source, { fromControls: true });
    };
    example.detail?.addEventListener('toggle', close);
    example.section.addEventListener('symbol:example-change', replace);
    return () => {
      example.detail?.removeEventListener('toggle', close);
      example.section.removeEventListener('symbol:example-change', replace);
      model.suspend();
      restoreAuthored(example);
    };
  }, [example, model, id]);

  function codeEdited() {
    example.section.dispatchEvent(new CustomEvent('symbol:code-edited', { bubbles: true, detail: { id } }));
  }

  return <div className="symbol-runnable">
    <div className="symbol-runnable__toolbar" role="group" aria-label={`${name}: JavaScript controls`}>
      <span className="symbol-runnable__language">JavaScript</span>
      {running
        ? <button type="button" className="symbol-runnable__run" onClick={model.stop} aria-label={`Stop ${name}`}><Square size={13} aria-hidden="true" />Stop</button>
        : <button type="button" className="symbol-runnable__run" onClick={model.run} aria-label={`Run ${name}`}><Play size={13} aria-hidden="true" />Run</button>}
      <button type="button" onClick={() => { model.reset(); codeEdited(); }} aria-label={`Reset ${name}`}><RotateCcw size={13} aria-hidden="true" />Reset</button>
      <button type="button" disabled={state.copyStatus === 'copying'}
        onClick={() => model.copy(async source => {
          if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
          await navigator.clipboard.writeText(source);
        })}
        aria-label={`Copy JavaScript for ${name}`}><Copy size={13} aria-hidden="true" />{state.copyStatus === 'copied' ? 'Copied' : 'Copy'}</button>
    </div>
    <label className="symbol-sheet__sr-only" htmlFor={editorId}>Editable JavaScript: {name}</label>
    <textarea id={editorId} className="symbol-runnable__editor" value={state.source} rows={Math.min(22, Math.max(6, state.source.split('\n').length + 1))}
      spellCheck={false} autoCapitalize="off" autoCorrect="off" maxLength={RUN_LIMITS.sourceBytes}
      aria-describedby={`${helpId} ${statusId}`} aria-invalid={state.validationError ? 'true' : undefined}
      onChange={event => { if (model.changeSource(event.target.value)) codeEdited(); }} />
    <p id={helpId} className="symbol-runnable__help">Runs in an isolated browser sandbox, with a 5 second limit. No DOM or network. Tab moves to the next control.</p>
    <p id={statusId} className="symbol-runnable__status" role="status" aria-live="polite" aria-atomic="true">{runnableStatus(state)}
      {state.result && !running && !stale && <span className="symbol-sheet__sr-only"> {state.result.output ? `Output: ${state.result.output.slice(0, 240)}${state.result.output.length > 240 ? '… Full output follows.' : ''}` : ''} {state.result.error}</span>}
    </p>
    {state.result && <section className="symbol-runnable__output" aria-label={`Actual run output for ${name}`} aria-busy={running} data-stale={stale || undefined}>
      <span>Actual run output{stale ? ' · earlier code' : ''}</span>
      <pre tabIndex="0" aria-label={`Complete actual output for ${name}`}><code>{state.result.output || (running ? 'Waiting for output…' : state.result.status === 'success' ? 'Finished with no output.' : 'No output.')}{state.result.error ? `\n${state.result.error}` : ''}</code></pre>
    </section>}
  </div>;
}

export function SymbolRunnablePortals({ examples = [] }) {
  return examples.map(example => createPortal(<RunnableBoundary example={example}><SymbolRunnable example={example} /></RunnableBoundary>, example.host, example.id));
}
