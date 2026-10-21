import React, { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { register, render } from 'pele/core';
import flowchart from 'pele/diagrams/flowchart';
import xychart from 'pele/diagrams/xychart';
import { TRACE_VISUAL_LIMITS, traceFlowSource, traceHistory, tracePeleOptions, traceVisualization } from './trace-visualizer-model.mjs';

register(flowchart, xychart);

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

function TraceVisualizer({ model, onStep }) {
  const prefix = `trace-visual-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const flow = useMemo(() => traceFlowSource(model), [model]);
  return <section className="trace-visualizer" aria-labelledby={`${prefix}-title`} data-trace-visual-step={model.frame ? model.step + 1 : undefined}>
    <div className="trace-visualizer__heading"><h4 id={`${prefix}-title`}>Step visualization</h4><span role="status" aria-live="polite" aria-atomic="true">{model.status === 'running' ? 'Recording…' : model.frame ? `${model.step + 1} / ${model.count}` : 'No recorded steps'}</span></div>
    {model.status === 'running' ? <p className="trace-visualizer__note">Recording the program. Use Previous and Next in the code panel to replay its steps.</p> : model.frame ? <>
      <p className="trace-visualizer__note">{model.frame.event === 'return' ? `Recorded return at line ${model.frame.line}.` : `Snapshot before line ${model.frame.line} executes.`} Changes compare this snapshot with the previous recorded step.</p>
      <PeleGraphic source={flow} prefix={`${prefix}-flow`} kind="flow" label={`${model.previous ? `Recorded step ${model.step}, ${model.previous.event === 'return' ? 'return at' : 'before'} line ${model.previous.line}; then ` : ''}selected step ${model.step + 1}, ${model.frame.event === 'return' ? 'return at' : 'before'} line ${model.frame.line}. ${model.sourceLine}`} />
      <pre className="trace-visualizer__line" tabIndex={0} aria-label={`Selected recorded line ${model.frame.line}`}><span>{model.frame.line}</span><code>{model.sourceLine || ' '}</code></pre>
      <ValueChanges changes={model.changes} />
      <ScalarHistory model={model} prefix={prefix} />
      <CollectionSnapshot collections={model.collections} prefix={prefix} />
      <p className="trace-visualizer__note trace-visualizer__preview-note">Values are bounded runtime previews. Equal previews can omit differences; a missing variable means it was not recorded in this snapshot.</p>
    </> : <p className="trace-visualizer__note">{model.mappingUnavailable ? 'Recorded steps could not be matched to this source.' : model.status === 'success' ? 'This execution recorded no replayable steps.' : 'No replayable steps were recorded before execution stopped.'}</p>}
    {model.truncated && <p className="trace-visualizer__notice">Recording reached its limit. Only the retained steps are shown.</p>}
    {model.frame && model.status !== 'success' && model.status !== 'running' && <p className="trace-visualizer__notice">Execution stopped early. These are the recorded steps before it stopped.</p>}
    {model.warnings.length > 0 && <details className="trace-visualizer__warnings"><summary>Recording limitations</summary><ul>{model.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
    {typeof onStep === 'function' && <div className="trace-visualizer__replay" role="group" aria-label="Visualization replay controls">
      <button type="button" aria-label="Previous visualized step" disabled={!model.frame || model.status === 'running' || model.step === 0} onClick={() => onStep(model.step - 1)}><span aria-hidden="true">←</span> Previous</button>
      <span aria-hidden="true">{model.frame ? `${model.step + 1} / ${model.count}` : '—'}</span>
      <button type="button" aria-label="Next visualized step" disabled={!model.frame || model.status === 'running' || model.step >= model.count - 1} onClick={() => onStep(model.step + 1)}>Next <span aria-hidden="true">→</span></button>
    </div>}
  </section>;
}

/** Add replay below authored mathematical prose, including after comparison relocation. */
export function TraceVisualizerPortal({ example, trace, source, language, onStep }) {
  const model = useMemo(() => traceVisualization(trace, source, language), [trace, source, language]);
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
  return active && host ? createPortal(<TraceVisualizer model={model} onStep={onStep} />, host) : null;
}

export default TraceVisualizerPortal;
