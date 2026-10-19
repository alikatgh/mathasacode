import React, { useId } from 'react';
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
