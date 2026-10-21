import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { register, render } from 'pele/core';
import xychart from 'pele/diagrams/xychart';
import { TRACE_VISUAL_LIMITS, traceHistory, tracePeleOptions, traceVisualization } from './trace-visualizer-model.mjs';
import { mathTraceScene } from './trace-math-model.mjs';
import { MathTraceScene } from './trace-math-scenes.jsx';

register(xychart);

function PeleGraphic({ source, label, prefix, kind }) {
  const element = useRef(null);
  const [width, setWidth] = useState(320);
  useLayoutEffect(() => {
    const container = element.current;
    if (!container) return;
    const measure = () => {
      const next = Math.max(180, Math.min(640, Math.round(container.getBoundingClientRect().width)));
      setWidth(current => current === next ? current : next);
    };
    measure();
    const Observer = container.ownerDocument.defaultView.ResizeObserver;
    if (!Observer) return;
    const observer = new Observer(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  const svg = useMemo(() => {
    if (!source) return null;
    try { return render(source, tracePeleOptions(prefix, width)).svg; } catch { return null; }
  }, [source, prefix, width]);
  return <div ref={element} className={`trace-visualizer__graphic trace-visualizer__graphic--${kind}`}>
    {svg ? <div role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />
      : <p className="trace-visualizer__note">Diagram unavailable. Recorded values appear below.</p>}
  </div>;
}

const changeLabels = { new: 'First recorded', changed: 'Changed preview', unchanged: 'Unchanged preview', removed: 'No longer recorded' };

function ValueChanges({ changes }) {
  function rows(items) {
    return <dl className="trace-visualizer__changes">{items.map(item => <div key={item.name} data-change={item.kind}>
      <dt><code>{item.name}</code><span>{changeLabels[item.kind]}</span></dt>
      <dd>{item.before !== undefined && <code className="trace-visualizer__before">{item.before}</code>}
        {item.kind !== 'unchanged' && <span className="trace-visualizer__arrow" aria-hidden="true">→</span>}
        {item.kind === 'unchanged' ? null : item.after !== undefined ? <code>{item.after}</code> : <span className="trace-visualizer__absent">Absent from this snapshot</span>}
        {item.kind === 'new' && <span className="trace-visualizer__sr-only">No previous recorded value.</span>}
      </dd>
    </div>)}</dl>;
  }
  // Changed/new/removed values lead; unchanged locals remain available in full.
  const ordered = [...changes.filter(item => item.kind !== 'unchanged'), ...changes.filter(item => item.kind === 'unchanged')];
  return <div className="trace-visualizer__values">
    {ordered.length ? <>{rows(ordered.slice(0, TRACE_VISUAL_LIMITS.visibleChanges))}
      {ordered.length > TRACE_VISUAL_LIMITS.visibleChanges && <details><summary>{ordered.length - TRACE_VISUAL_LIMITS.visibleChanges} more recorded variables</summary>{rows(ordered.slice(TRACE_VISUAL_LIMITS.visibleChanges))}</details>}</>
      : <p className="trace-visualizer__note">No local values were recorded at this step.</p>}
  </div>;
}

function ScalarHistory({ model, prefix }) {
  const [chosen, setChosen] = useState('');
  const name = model.numericNames.includes(chosen) ? chosen : model.numericNames[0];
  const history = useMemo(() => traceHistory(model, name), [model, name]);
  if (!history) return null;
  return <figure className="trace-visualizer__history">
    <div className="trace-visualizer__subheading"><label htmlFor={`${prefix}-variable`}>Value history</label>
      <select id={`${prefix}-variable`} value={name} onChange={event => setChosen(event.target.value)}>{model.numericNames.map(variable => <option key={variable} value={variable}>{variable}</option>)}</select>
    </div>
    <PeleGraphic source={history.source} prefix={`${prefix}-history`} kind="history" label={`${name}, recorded steps ${history.points[0].step} through ${model.step + 1}. Selected value: ${history.points.at(-1).preview}. ${history.sampled ? 'Evenly sampled points. ' : ''}Exact recorded values are available below.`} />
    <figcaption>{history.sampled ? `${history.samples.length} samples of ${history.points.length} snapshots` : `${history.points.length} recorded ${history.points.length === 1 ? 'snapshot' : 'snapshots'}`} through step {model.step + 1}.{history.scale !== 1 && <> The vertical axis divides values by {String(history.scale)}.</>}</figcaption>
    <details><summary>Recorded values for {name}</summary><div className="trace-visualizer__table" tabIndex={0} role="region" aria-label={`Recorded values for ${name}`}><table>
      <thead><tr><th scope="col">Step</th><th scope="col">{name}</th></tr></thead>
      <tbody>{history.points.map(point => <tr key={point.step} aria-current={point.step === model.step + 1 ? 'step' : undefined}><th scope="row">{point.step}</th><td><code>{point.preview}</code></td></tr>)}</tbody>
    </table></div></details>
  </figure>;
}

function CollectionSnapshot({ collections, prefix }) {
  const [chosen, setChosen] = useState('');
  const item = collections.find(collection => collection.name === chosen) ?? collections[0];
  if (!item) return null;
  const previous = item.previous?.kind === item.kind && item.previous.rows === item.rows && item.previous.columns === item.columns ? item.previous : null;
  return <figure className="trace-visualizer__collection">
    <div className="trace-visualizer__subheading"><label htmlFor={`${prefix}-collection`}>Recorded array</label><select id={`${prefix}-collection`} value={item.name} onChange={event => setChosen(event.target.value)}>{collections.map(collection => <option key={collection.name} value={collection.name}>{collection.name}</option>)}</select></div>
    <div className="trace-visualizer__cells" role="list" aria-label={`${item.name}: ${item.kind === 'matrix' ? `${item.rows} rows, ${item.columns} columns` : `${item.total} values`}`}>
      {item.cells.map((cell, index) => <div key={`${cell.row}-${cell.column}`} role="listitem" data-changed={previous && previous.cells[index]?.preview !== cell.preview || undefined}><span>{cell.label}</span><code>{cell.preview}</code>{previous && previous.cells[index]?.preview !== cell.preview && <span className="trace-visualizer__sr-only">Changed from {previous.cells[index]?.preview}.</span>}</div>)}
    </div>
    <figcaption>{item.kind === 'matrix' ? `${item.rows} × ${item.columns} numeric preview` : `${item.total} values in the numeric preview`}.{previous && ' Highlighted cells differ from the previous snapshot.'}{item.cells.length < item.total && ` Showing the first ${item.cells.length} cells; the full preview appears in the variable values.`}</figcaption>
  </figure>;
}

export function TraceVisualizer({ model, scene, onStep }) {
  const prefix = `trace-visual-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const root = useRef(null), expectedStep = useRef(model.step);
  const [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1);
  const replayable = Boolean(model.frame && model.status !== 'running' && typeof onStep === 'function');
  // A manual seek in either panel pauses the same replay. Playback never reruns code.
  useEffect(() => {
    if (model.step !== expectedStep.current) setPlaying(false);
    expectedStep.current = model.step;
  }, [model.step]);
  useEffect(() => {
    const document = root.current?.ownerDocument;
    if (!document) return;
    const pause = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const element = root.current, document = element?.ownerDocument;
    if (!replayable || model.step >= model.count - 1 || document?.hidden || element?.closest('[hidden]') || !element?.getClientRects().length) {
      setPlaying(false); return;
    }
    const timer = setTimeout(() => {
      if (document.hidden || element.closest('[hidden]') || !element.getClientRects().length) { setPlaying(false); return; }
      expectedStep.current = model.step + 1;
      onStep(model.step + 1);
    }, 900 / speed);
    return () => clearTimeout(timer);
  }, [playing, speed, model.step, model.count, replayable, onStep]);
  const seek = step => { setPlaying(false); expectedStep.current = step; onStep?.(step); };
  const togglePlay = () => {
    if (playing) { setPlaying(false); return; }
    if (model.step === model.count - 1) { expectedStep.current = 0; onStep?.(0); }
    else expectedStep.current = model.step;
    setPlaying(true);
  };
  return <section ref={root} className="trace-visualizer" aria-labelledby={`${prefix}-title`} data-trace-visual-step={model.frame ? model.step + 1 : undefined} data-scene-kind={scene?.kind}>
    <div className="trace-visualizer__heading"><h4 id={`${prefix}-title`}>See the math</h4><span role="status" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">{model.status === 'running' ? 'Recording…' : model.frame ? `Step ${model.step + 1} / ${model.count}` : 'No recorded steps'}</span></div>
    {model.status === 'running' ? <p className="trace-visualizer__note">Recording the steps for replay…</p> : model.frame ? <>
      {scene && <>
        <h5 className="trace-visualizer__scene-title">{scene.title}</h5>
        <MathTraceScene scene={scene} />
        <p className="trace-visualizer__explanation">{scene.description}</p>
        {scene.provenance && <p className="trace-visualizer__provenance">{scene.provenance === 'recorded' ? 'Geometry calculated from recorded operands.' : scene.provenance === 'authored' ? 'Mathematical construction from the authored example.' : scene.provenance}</p>}
      </>}
      {typeof onStep === 'function' && <div className="trace-visualizer__player" role="group" aria-label="Visualization replay controls">
        <div className="trace-visualizer__transport">
          <button type="button" aria-label="Restart visualized steps" disabled={!replayable || model.step === 0} onClick={() => seek(0)}><span aria-hidden="true">↤</span></button>
          <button type="button" aria-label="Previous visualized step" disabled={!replayable || model.step === 0} onClick={() => seek(model.step - 1)}><span aria-hidden="true">←</span></button>
          <button type="button" className="trace-visualizer__play" aria-label={playing ? 'Pause visualization' : 'Play visualization'} disabled={!replayable || model.count < 2} onClick={togglePlay}><span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span>{playing ? 'Pause' : 'Play'}</button>
          <button type="button" aria-label="Next visualized step" disabled={!replayable || model.step >= model.count - 1} onClick={() => seek(model.step + 1)}><span aria-hidden="true">→</span></button>
          <label className="trace-visualizer__speed"><span className="trace-visualizer__sr-only">Replay speed</span><select aria-label="Replay speed" value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label>
        </div>
        <input type="range" aria-label="Visualization step" min={1} max={Math.max(1, model.count)} value={model.step + 1} disabled={!replayable || model.count < 2} onChange={event => seek(Number(event.target.value) - 1)} />
        <div className="trace-visualizer__position"><span>{model.frame.event === 'return' ? 'Return recorded' : 'Recorded state'} at line {model.frame.line}</span><span>{model.step + 1} / {model.count}</span></div>
      </div>}
      <details className="trace-visualizer__recorded"><summary>Recorded values &amp; history</summary>
        <ValueChanges changes={model.changes} />
        <ScalarHistory model={model} prefix={prefix} />
        <CollectionSnapshot collections={model.collections} prefix={prefix} />
        <p className="trace-visualizer__note trace-visualizer__preview-note">Runtime previews can omit data. A missing variable means it was not recorded in this snapshot.</p>
      </details>
    </> : <p className="trace-visualizer__note">{model.mappingUnavailable ? 'Recorded steps could not be matched to this source.' : model.status === 'success' ? 'This execution recorded no replayable steps.' : 'No replayable steps were recorded before execution stopped.'}</p>}
    {model.truncated && <p className="trace-visualizer__notice">Recording reached its limit. Only the retained steps are shown.</p>}
    {model.frame && model.status !== 'success' && model.status !== 'running' && <p className="trace-visualizer__notice">Execution stopped early. These are the recorded steps before it stopped.</p>}
    {model.warnings.length > 0 && <details className="trace-visualizer__warnings"><summary>Recording limitations</summary><ul>{model.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
  </section>;
}

/** Add replay below authored mathematical prose, including after comparison relocation. */
export function TraceVisualizerPortal({ example, trace, source, language, onStep }) {
  const model = useMemo(() => traceVisualization(trace, source, language), [trace, source, language]);
  const scene = useMemo(() => model?.frame ? mathTraceScene({ example, model, source, language }) : null, [example, model, source, language]);
  const [host, setHost] = useState(null);
  const element = example?.element;
  const codeHost = example?.host;
  const active = Boolean(model);
  useLayoutEffect(() => {
    if (!active || !element) { setHost(null); return; }
    const comparison = element.closest('.comparison');
    const notation = comparison && [...comparison.querySelectorAll('.comparison__notation')].find(item => item.closest('.comparison') === comparison);
    if (!notation && !codeHost?.parentElement) { setHost(null); return; }
    const mount = element.ownerDocument.createElement('div');
    mount.className = 'trace-visualizer-host';
    let wrapper;
    if (notation) notation.append(mount);
    else {
      // Only the React mount moves. Authored <pre> and source nodes stay intact.
      wrapper = element.ownerDocument.createElement('div');
      wrapper.className = 'trace-standalone-grid';
      mount.classList.add('trace-visualizer-host--standalone');
      codeHost.before(wrapper);
      wrapper.append(mount, codeHost);
    }
    setHost(mount);
    return () => {
      if (wrapper?.parentNode) wrapper.replaceWith(codeHost);
      mount.remove();
    };
  }, [element, codeHost, active, source, language]);
  return active && host ? createPortal(<TraceVisualizer model={model} scene={scene} onStep={onStep} />, host) : null;
}

export default TraceVisualizerPortal;
