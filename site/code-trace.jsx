import React, { useId, useLayoutEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './components/ui/button';
import { useCodeBlockFolding } from './components/reui/code-block/code-block';
import { foldsCoveringTraceLine, traceStep } from './trace-view-model.mjs';

/** Reveal and mark the recorded line without changing source or page scroll. */
export function TraceLineFocus({ line, editing, onReveal }) {
  const marker = useRef(null);
  const previous = useRef(null);
  const folding = useCodeBlockFolding();
  useLayoutEffect(() => {
    previous.current?.removeAttribute('data-code-trace-active');
    previous.current = null;
    if (!line || editing) return;
    const covering = foldsCoveringTraceLine(folding.regions, folding.foldedStarts, line);
    if (covering.length) {
      // Reveal all containing regions in one controlled update; unrelated and
      // nested folds elsewhere keep their existing choices.
      onReveal(covering);
      return;
    }
    const block = marker.current?.closest('[data-slot="code-block"]');
    const row = block?.querySelector(`[data-code-line="${line}"]`);
    if (!row) return;
    row.setAttribute('data-code-trace-active', 'true');
    previous.current = row;
    const viewport = row.closest('[data-slot="code-block-viewport"]');
    if (viewport) {
      const bounds = viewport.getBoundingClientRect();
      const target = row.getBoundingClientRect();
      // scrollIntoView can move the entire lesson. Only this code viewport may
      // move, and only when the selected line is outside its visible bounds.
      if (target.top < bounds.top) viewport.scrollTop += target.top - bounds.top;
      else if (target.bottom > bounds.bottom) viewport.scrollTop += target.bottom - bounds.bottom;
    }
    return () => row.removeAttribute('data-code-trace-active');
  });
  return <span ref={marker} hidden />;
}

export default function CodeTrace({ trace, source, text, onStep }) {
  const headingId = useId();
  const step = traceStep(trace.step, trace.frames.length);
  const frame = trace.frames[step];
  const running = trace.status === 'running';
  const lineSource = frame ? source.split('\n')[frame.line - 1] : '';
  return <section className="code-trace" aria-labelledby={headingId} data-trace-status={trace.status}>
    <div className="code-trace__heading">
      <span id={headingId}>{text.title}</span>
      <span className="code-trace__counter" role="status" aria-live="polite" aria-atomic="true">
        {running ? text.recording : frame ? text.counter(step + 1, trace.frames.length) : text.noSteps}
      </span>
    </div>
    <p className="code-trace__note">{text.replay}</p>
    <div className="code-trace__body">
      {running ? <p className="code-trace__message">{text.recordingNote}</p> : frame ? <>
        <div className="code-trace__toolbar">
          <span className="code-trace__event">{frame.event === 'return' ? text.returnLine(frame.line) : text.line(frame.line)}</span>
          <div className="code-trace__steps" role="group" aria-label={text.steps}>
            <Button type="button" variant="ghost" size="sm" disabled={step === 0} onClick={() => onStep(step - 1)} aria-label={text.previous}>
              <ChevronLeft size={14} aria-hidden="true" /><span>{text.previous}</span>
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={step === trace.frames.length - 1} onClick={() => onStep(step + 1)} aria-label={text.next}>
              <span>{text.next}</span><ChevronRight size={14} aria-hidden="true" />
            </Button>
          </div>
        </div>
        <pre className="code-trace__line" tabIndex={0} aria-label={text.activeLine}>{lineSource || ' '}</pre>
        <div className="code-trace__values" tabIndex={0} role="region" aria-label={text.values}>
          {Object.keys(frame.locals).length ? <dl>{Object.entries(frame.locals).map(([name, value]) =>
            <div className="code-trace__value" key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
            : <p className="code-trace__message">{text.noValues}</p>}
        </div>
      </> : <p className="code-trace__message">{trace.mappingUnavailable ? text.mappingUnavailable
        : trace.status === 'success' ? text.empty : text.failed}</p>}
    </div>
    {trace.truncated && <p className="code-trace__limit">{text.truncated}</p>}
    {trace.warnings?.length > 0 && <ul className="code-trace__limit">{trace.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
    {!running && trace.status !== 'success' && frame && <p className="code-trace__limit">{text.partial}</p>}
  </section>;
}
