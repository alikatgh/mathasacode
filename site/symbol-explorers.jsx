import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { register, render } from 'pele/core';
import xychart from 'pele/diagrams/xychart';
import {
  symbolExplorerDefinitions, initialExplorerParameters, symbolExplorerState,
  boundExplorerControl, explorerNumber as n, explorerPlotSource,
} from './symbol-explorer-model.mjs';

register(xychart);
const preparations = new WeakMap();
let katexPromise;

/** Capture the source nodes before the reader moves them into its pages. */
export function prepareSymbolExplorers(main) {
  if (!main) return [];
  if (preparations.has(main)) return preparations.get(main);
  const explorers = [...main.querySelectorAll('[data-symbol-explorer]')].flatMap(mount => {
    const id = mount.dataset.symbolExplorer;
    const section = mount.closest('section[data-symbol-example]');
    if (!symbolExplorerDefinitions[id] || section?.dataset.symbolExample !== id) return [];
    return [{ id, mount, section, details: mount.closest('details') }];
  });
  preparations.set(main, explorers);
  return explorers;
}

function Formula({ state }) {
  const [katex, setKatex] = useState(null);
  useEffect(() => {
    let active = true;
    katexPromise ??= import('katex');
    katexPromise.then(module => { if (active) setKatex(module.default ?? module); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const html = useMemo(() => {
    if (!katex) return null;
    try {
      return katex.renderToString(state.formulaTex, { displayMode: false, output: 'html', strict: 'error', trust: false, throwOnError: true });
    } catch { return null; }
  }, [katex, state.formulaTex]);
  return <div className="symbol-explorer__formula" role="math" aria-label={state.formulaText}>
    {html ? <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} /> : <span aria-hidden="true">{state.formulaText}</span>}
  </div>;
}

function PelePlot({ state, prefix }) {
  const container = useRef(null);
  const [width, setWidth] = useState(320);
  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => setWidth(current => {
      const next = Math.max(260, Math.min(640, Math.round(element.getBoundingClientRect().width)));
      return current === next ? current : next;
    });
    measure();
    const Observer = element.ownerDocument.defaultView.ResizeObserver;
    if (!Observer) return;
    const observer = new Observer(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const source = explorerPlotSource(state.plot);
  const html = useMemo(() => {
    try {
      return render(source, { maxWidth: width, fontSize: 13, padding: 8, fontFamily: 'system-ui, sans-serif', links: false, images: false, limit: 6000, outputLimit: 100000, idPrefix: prefix }).svg;
    } catch { return null; }
  }, [source, prefix, width]);
  return <figure className="symbol-explorer__chart">
    <div ref={container}>{html ? <div role="img" aria-label={`${state.plot.x}; ${state.plot.y}. ${state.plot.labels.map((label, i) => `${label}: ${n(state.plot.values[i])}`).join('; ')}. Values also appear below.`} dangerouslySetInnerHTML={{ __html: html }} /> : <p>Chart unavailable. The calculated values appear in the table below.</p>}</div>
    <figcaption>{state.plot.type === 'line' ? 'Solid samples show the function; the other line is the selected output.' : `${state.plot.x} · ${state.plot.y}`}</figcaption>
  </figure>;
}

const vectorPlane = { left: 48, right: 422, top: 18, bottom: 392, xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
const derivativePlane = { left: 48, right: 422, top: 22, bottom: 330, xMin: -3.25, xMax: 3.25, yMin: -1, yMax: 10 };
function mapPoint(plane, x, y) {
  return [plane.left + (x - plane.xMin) / (plane.xMax - plane.xMin) * (plane.right - plane.left), plane.bottom - (y - plane.yMin) / (plane.yMax - plane.yMin) * (plane.bottom - plane.top)];
}
function fromPointer(event, plane) {
  const svg = event.currentTarget.ownerSVGElement;
  const transform = svg?.getScreenCTM();
  if (!transform) return null;
  const point = svg.createSVGPoint();
  point.x = event.clientX; point.y = event.clientY;
  const local = point.matrixTransform(transform.inverse());
  return [plane.xMin + (local.x - plane.left) / (plane.right - plane.left) * (plane.xMax - plane.xMin), plane.yMin + (plane.bottom - local.y) / (plane.bottom - plane.top) * (plane.yMax - plane.yMin)];
}
function PlaneAxes({ plane, xTicks, yTicks, yLabel = 'y' }) {
  const [zeroX, zeroY] = mapPoint(plane, 0, 0);
  return <g className="symbol-explorer__axes">
    {xTicks.map(value => {
      const [x] = mapPoint(plane, value, 0);
      return <g key={`x${value}`}><line className="symbol-explorer__grid" x1={x} x2={x} y1={plane.top} y2={plane.bottom} /><text x={x} y={plane.bottom + 21} textAnchor="middle">{value}</text></g>;
    })}
    {yTicks.map(value => {
      const [, y] = mapPoint(plane, 0, value);
      return <g key={`y${value}`}><line className="symbol-explorer__grid" x1={plane.left} x2={plane.right} y1={y} y2={y} /><text x={plane.left - 10} y={y + 4} textAnchor="end">{value}</text></g>;
    })}
    <line x1={plane.left} x2={plane.right} y1={zeroY} y2={zeroY} />
    <line x1={zeroX} x2={zeroX} y1={plane.top} y2={plane.bottom} />
    <text x={plane.right + 14} y={zeroY + 4}>x</text><text x={zeroX + 10} y={plane.top + 12}>{yLabel}</text>
  </g>;
}

/** Pointer capture keeps the drag local; sliders provide an equivalent input. */
function DragPoint({ position, values, label, keys, plane, state, update, secondary = false, instructions }) {
  const move = (event, initial = false) => {
    if (!initial && !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = fromPointer(event, plane);
    if (!point) return;
    update(Object.fromEntries(keys.map((key, i) => [key, boundExplorerControl(state.id, key, point[i])])));
  };
  const end = event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); };
  const keyDown = event => {
    const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [1, 1], ArrowDown: [1, -1] };
    const item = moves[event.key];
    if (!item || !keys[item[0]]) return;
    event.preventDefault();
    const key = keys[item[0]], control = state.controls.find(item => item.key === key);
    update({ [key]: boundExplorerControl(state.id, key, state.parameters[key] + item[1] * control.step * (event.shiftKey ? 5 : 1)) });
  };
  return <circle className={`symbol-explorer__handle${secondary ? ' symbol-explorer__handle--secondary' : ''}`} cx={position[0]} cy={position[1]} r="11" tabIndex="0" role="button"
    aria-label={`${label}: ${values.map(n).join(', ')}. Drag or use arrow keys.`} aria-describedby={instructions} aria-keyshortcuts={keys.length > 1 ? 'ArrowLeft ArrowRight ArrowUp ArrowDown' : 'ArrowLeft ArrowRight'}
    onKeyDown={keyDown} onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); move(event, true); }}
    onPointerMove={move} onPointerUp={end} onPointerCancel={end} />;
}

function VectorGeometry({ state, update, prefix, instructions }) {
  const plane = vectorPlane, origin = mapPoint(plane, 0, 0);
  const description = state.vectors.map(vector => `${vector.label} = [${vector.values.map(n).join(', ')}]`).join('; ');
  return <figure className="symbol-explorer__chart">
    <svg viewBox="0 0 460 428" aria-label={`Vector plane with equally scaled x and y axes. ${description}. ${state.formulaText}`}>
      <defs><marker id={`${prefix}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker></defs>
      <PlaneAxes plane={plane} xTicks={[-4, -2, 0, 2, 4]} yTicks={[-4, -2, 0, 2, 4]} />
      {state.id === 'euclidean-norm' && <polyline className="symbol-explorer__triangle" points={[origin, mapPoint(plane, state.parameters.x, 0), mapPoint(plane, state.parameters.x, state.parameters.y)].map(point => point.join(',')).join(' ')} />}
      {state.vectors.map(vector => {
        const end = mapPoint(plane, ...vector.values);
        return <g key={vector.label} className={vector.secondary ? 'symbol-explorer__vector symbol-explorer__vector--secondary' : 'symbol-explorer__vector'}>
          <line x1={origin[0]} y1={origin[1]} x2={end[0]} y2={end[1]} markerEnd={`url(#${prefix}-arrow)`} />
          <text x={end[0] + 13} y={end[1] - 13}>{vector.label}</text>
        </g>;
      })}
      {state.vectors.filter(vector => vector.keys).map(vector => <DragPoint key={vector.label} position={mapPoint(plane, ...vector.values)} values={vector.values} label={`Vector ${vector.label} tip`} keys={vector.keys} plane={plane} state={state} update={update} secondary={vector.secondary} instructions={instructions} />)}
    </svg>
    <figcaption>{description}. Solid line: {state.vectors[0].label}{state.vectors[1] ? `; dashed line: ${state.vectors[1].label}` : ''}. Both axes use the same scale.</figcaption>
  </figure>;
}

function DerivativeGeometry({ state, update, prefix, instructions }) {
  const plane = derivativePlane, { x, h } = state.parameters;
  const base = mapPoint(plane, x, x * x), next = mapPoint(plane, x + h, (x + h) ** 2), corner = mapPoint(plane, x + h, x * x);
  const secant = 2 * x + h;
  const line = slope => [-3.25, 3.25].map(value => mapPoint(plane, value, x * x + slope * (value - x)).join(',')).join(' ');
  const curve = Array.from({ length: 101 }, (_, i) => -3.15 + i * 6.3 / 100).map(value => mapPoint(plane, value, value * value).join(',')).join(' ');
  return <figure className="symbol-explorer__chart">
    <svg viewBox="0 0 460 370" aria-label={`Curve f(x) = x squared. Tangent at x = ${n(x)} has slope ${n(2 * x)}. Forward secant for h = ${n(h)} has slope ${n(secant)}.`}>
      <defs><clipPath id={`${prefix}-clip`}><rect x={plane.left} y={plane.top} width={plane.right - plane.left} height={plane.bottom - plane.top} /></clipPath></defs>
      <PlaneAxes plane={plane} xTicks={[-3, -2, -1, 0, 1, 2, 3]} yTicks={[0, 2, 4, 6, 8, 10]} yLabel="f(x)" />
      <g clipPath={`url(#${prefix}-clip)`}>
        <polyline className="symbol-explorer__curve" points={curve} />
        <polyline className="symbol-explorer__tangent" points={line(2 * x)} />
        <polyline className="symbol-explorer__secant" points={line(secant)} />
        <polyline className="symbol-explorer__triangle" points={[base, corner, next].map(point => point.join(',')).join(' ')} />
      </g>
      <circle className="symbol-explorer__nearby" cx={next[0]} cy={next[1]} r="5" /><text className="symbol-explorer__point-label" x={next[0] + 9} y={next[1] - 10}>x + h</text>
      <DragPoint position={base} values={[x, x * x]} label="Point on f(x) = x squared" keys={['x']} plane={plane} state={state} update={update} instructions={instructions} />
    </svg>
    <figcaption>Curve: f(x) = x² · solid straight line: exact tangent · dashed line: forward secant. Drag the large point horizontally.</figcaption>
  </figure>;
}

function Explorer({ entry }) {
  const { id, section } = entry;
  const prefix = `symbol-explorer-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [parameters, setParameters] = useState(() => initialExplorerParameters(id));
  const [codeEdited, setCodeEdited] = useState(false);
  const [linked, setLinked] = useState(false);
  const state = useMemo(() => symbolExplorerState(id, parameters), [id, parameters]);
  useEffect(() => {
    const edited = event => { if (event.detail?.id === id) setCodeEdited(true); };
    section.addEventListener('symbol:code-edited', edited);
    return () => section.removeEventListener('symbol:code-edited', edited);
  }, [section, id]);
  const change = (partial, force = false) => {
    const next = { ...parameters, ...partial };
    if (!force && Object.keys(next).every(key => next[key] === parameters[key])) return;
    const nextState = symbolExplorerState(id, next);
    setParameters(next); setCodeEdited(false); setLinked(true);
    const Event = section.ownerDocument.defaultView.CustomEvent;
    section.dispatchEvent(new Event('symbol:example-change', { bubbles: true, detail: { id, source: nextState.source } }));
  };
  return <section className="symbol-explorer" data-symbol-explorer-panel={id} aria-labelledby={`${prefix}-title`}>
    <div className="symbol-explorer__heading"><h4 id={`${prefix}-title`}>{state.title}</h4><button type="button" onClick={() => change(initialExplorerParameters(id), true)}>Reset graph</button></div>
    <p className="symbol-explorer__instructions" id={`${prefix}-instructions`}>{state.kind === 'vectors' ? 'Drag a vector tip, use its arrow keys, or move the sliders. Shift + arrow moves five steps.' : state.kind === 'derivative' ? 'Drag the curve point horizontally, use Left / Right, or move the sliders.' : 'Move a slider to update the chart, formula and runnable code.'}</p>
    <div className="symbol-explorer__layout">
      <div className="symbol-explorer__visual">
        {state.kind === 'vectors' ? <VectorGeometry state={state} update={change} prefix={prefix} instructions={`${prefix}-instructions`} /> : state.kind === 'derivative' ? <DerivativeGeometry state={state} update={change} prefix={prefix} instructions={`${prefix}-instructions`} /> : <PelePlot state={state} prefix={prefix} />}
      </div>
      <div className="symbol-explorer__controls">
        {state.controls.map(item => <label className="symbol-explorer__control" key={item.key} htmlFor={`${prefix}-${item.key}`}><span>{item.label}<output htmlFor={`${prefix}-${item.key}`}>{n(parameters[item.key])}</output></span><input id={`${prefix}-${item.key}`} type="range" min={item.min} max={item.max} step={item.step} value={parameters[item.key]} onChange={event => change({ [item.key]: boundExplorerControl(id, item.key, Number(event.target.value)) })} /></label>)}
        <div className="symbol-explorer__result"><span>Result</span><output aria-label={`Result: ${state.output}`}>{state.output}</output></div>
      </div>
    </div>
    <Formula state={state} />
    <p className="symbol-explorer__explanation">{state.explanation}</p>
    <p className="symbol-explorer__link-status" role="status">{codeEdited ? 'Code edited. The graph still follows these controls; moving a control replaces your edits.' : linked ? 'The code below now matches these controls. Choose Run to execute it.' : 'Move a control to put this graph’s example in the code editor below. Choose Run to execute it.'}</p>
    <details className="symbol-explorer__data"><summary>Calculated values</summary><table><caption className="symbol-explorer__sr-only">Current graph values</caption><tbody>{state.rows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody></table></details>
  </section>;
}

function OnOpenExplorer({ entry }) {
  const [started, setStarted] = useState(() => !entry.details || entry.details.open);
  useEffect(() => {
    if (!entry.details || started) return;
    const open = () => { if (entry.details.open) setStarted(true); };
    entry.details.addEventListener('toggle', open);
    // Catch a details element opened between initial render and effect setup.
    open();
    return () => entry.details.removeEventListener('toggle', open);
  }, [entry, started]);
  return started ? <Explorer entry={entry} /> : null;
}

export function SymbolExplorerPortals({ explorers = [] }) {
  return <>{explorers.map(entry => createPortal(<OnOpenExplorer entry={entry} />, entry.mount, `symbol-explorer-${entry.id}`))}</>;
}
