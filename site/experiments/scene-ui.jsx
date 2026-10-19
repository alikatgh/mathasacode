import React, { useId, useRef } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export function RangeControl({ label, value, min, max, step = 1, onChange, display }) {
  const id = useId();
  return <div className="experiment-range">
    <div className="experiment-range__label"><label htmlFor={id}>{label}</label><output htmlFor={id}>{display ?? value}</output></div>
    <input id={id} type="range" value={value} min={min} max={max} step={step} onChange={event => onChange(Number(event.currentTarget.value))} />
  </div>;
}

export function Metric({ label, value }) {
  return <div className="experiment-metric"><span>{label}</span><strong>{value}</strong></div>;
}

// Pointer coordinates follow the SVG's transform, including its letterboxing
// and responsive scale. The owner maps them into bounded mathematical values.
export function SvgHandle({ x, y, label, onMove, onNudge, color = 'var(--scene-b)' }) {
  const activePointer = useRef(null);
  const move = event => {
    if (activePointer.current !== event.pointerId) return;
    const svg = event.currentTarget.ownerSVGElement;
    const matrix = svg?.getScreenCTM();
    if (!matrix) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    if (Number.isFinite(local.x) && Number.isFinite(local.y)) onMove?.({ x: local.x, y: local.y });
  };
  const release = event => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <g className="experiment-handle" role="button" tabIndex={0} aria-label={label}
    onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.focus();
      activePointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      move(event);
    }} onPointerMove={move} onPointerUp={release} onPointerCancel={release}
    onLostPointerCapture={() => { activePointer.current = null; }}
    onKeyDown={event => {
      const deltas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const delta = deltas[event.key];
      if (!delta || !onNudge) return;
      event.preventDefault();
      onNudge(...delta);
    }}>
    <title>{label}</title>
    <circle cx={x} cy={y} r="16" fill="transparent" />
    <circle className="experiment-handle__ring" cx={x} cy={y} r="11" fill="var(--card)" stroke={color} strokeWidth="1.5" opacity=".75" />
    <circle cx={x} cy={y} r="5" fill={color} stroke="var(--card)" strokeWidth="1.5" />
  </g>;
}

export function ExperimentFrame({ language = 'en', title, description, controls, readout, caption, children, steps = [], step = 0, onStep }) {
  const id = useId();
  const zh = language === 'zh';
  const last = step >= steps.length - 1;
  return <Card className="experiment-frame shadow-none" role="figure" aria-labelledby={`${id}-title`}>
    <CardHeader className="experiment__heading">
      <span className="experiment__eyebrow">{zh ? '看见数学如何发生' : 'See the math happen'}</span>
      <CardTitle id={`${id}-title`} className="experiment__title">{title}</CardTitle>
      {description && <p className="experiment__description">{description}</p>}
    </CardHeader>
    <CardContent className="experiment__body">
      <div className="experiment__workspace">
        <div className="experiment__plot">{children}</div>
        <div className="experiment__details">
          {controls && <div className="experiment__controls">{controls}</div>}
          {readout && <div className="experiment__readout" aria-live="polite" aria-atomic="true">{readout}</div>}
        </div>
      </div>
      {steps.length > 0 && <div className="experiment__walkthrough">
        <div className="experiment__step-copy" aria-live="polite" aria-atomic="true"><span className="experiment__counter">{String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</span><p>{steps[step]}</p></div>
        <div className="experiment__step-controls">
          <Button type="button" variant="outline" size="sm" disabled={step === 0} onClick={() => onStep(step - 1)} aria-label={zh ? '上一步' : 'Previous visual step'}><ArrowLeft aria-hidden="true" /><span>{zh ? '上一步' : 'Back'}</span></Button>
          <Button type="button" size="sm" onClick={() => onStep(last ? 0 : step + 1)} aria-label={zh ? (last ? '重新看一遍' : '下一步') : (last ? 'Replay visual steps' : 'Next visual step')}><span>{zh ? (last ? '重看' : '下一步') : (last ? 'Replay' : 'Next step')}</span>{last ? <RotateCcw aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}</Button>
        </div>
      </div>}
      {caption && <p className="experiment__caption">{caption}</p>}
    </CardContent>
  </Card>;
}
