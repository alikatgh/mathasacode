import React, { useId, useState } from 'react';
import { Button } from '../../site/components/ui/button';

const label = value => String(value).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ');
const preStyle = { overflow: 'auto', maxWidth: '100%', padding: 16, background: 'var(--code, var(--muted))', color: 'var(--code-foreground, var(--foreground))', font: '12px/1.7 var(--font-mono)', whiteSpace: 'pre' };
const sectionStyle = { padding: '18px 0', borderBottom: '1px solid var(--border)' };

function Record({ value }) {
  if (value === null || value === undefined) return <span>None</span>;
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  if (typeof value !== 'object') return <span style={{ whiteSpace: 'pre-wrap' }}>{String(value)}</span>;
  if (Array.isArray(value)) return value.length ? <ol>{value.map((item, index) => <li key={index}><Record value={item} /></li>)}</ol> : <span>None</span>;
  return <dl>{Object.entries(value).map(([key, item]) => <div key={key}><dt>{label(key)}</dt><dd><Record value={item} /></dd></div>)}</dl>;
}

function Metrics({ kind, event, result, complete }) {
  if (!event) return null;
  const values = kind === 'decompiler' ? [['Instructions', event.decoded], ['Live blocks', event.live], ['IR statements', event.irCount], ['Typed values', event.typed], ['Pseudocode lines', event.lines]]
    : kind === 'agent' ? [['Model turns', event.turn], ['Tool calls', event.calls], ['Attempts', event.attempts], ['Loop laps', event.laps], ['Simulated time', `${((event.clock || 0) / 1000).toFixed(2)} s`]]
      : [['Input tokens', event.tokens], ['Pool tokens used', event.poolUsed], ['Output tokens', event.out], ['Waiting requests', event.waiting], ['Elapsed model time', event.clock == null ? 'Not reached' : `${event.clock.toLocaleString()} ms`]];
  return <dl style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 28px', margin: '16px 0' }}>{values.map(([name, value]) => <div key={name} style={{ border: 0, padding: 0 }}><dt>{name}</dt><dd style={{ fontVariantNumeric: 'tabular-nums', fontSize: 17 }}>{value ?? '—'}</dd></div>)}{complete && kind === 'gpu' && <div style={{ border: 0, padding: 0 }}><dt>Output throughput</dt><dd style={{ fontVariantNumeric: 'tabular-nums', fontSize: 17 }}>{result.totals.tokS ?? 'Unmeasured'} tok/s</dd></div>}</dl>;
}

/** Native reader controls over precomputed traces; no source-page script runs. */
export function Explainer({ data }) {
  const inputId = useId();
  const [selection, setSelection] = useState(data.scenarios[0]?.id);
  const [position, setPosition] = useState(0);
  const scenario = data.scenarios.find(item => item.id === selection) || data.scenarios[0];
  if (!scenario) return <p role="alert">No authored simulation scenarios are available.</p>;
  const { result } = scenario;
  const events = result.events;
  const shown = events.slice(0, position);
  const current = shown.at(-1);
  const complete = position === events.length;
  const part = current && data.parts[current.station];
  const timing = current && scenario.timings?.[position - 1];
  const output = current?.outcome || (complete ? result.outcome : null);
  return <section className="engineering-record" aria-label={`${data.title} interactive simulation`} style={{ marginBottom: 36, borderBlock: '1px solid var(--border)' }}>
    <div style={sectionStyle}>
      <div className="engineering-eyebrow">Interactive simulation</div>
      <h2 style={{ fontSize: 23, margin: '6px 0 12px', lineHeight: 1.3 }}>{data.title}</h2>
      <p style={{ color: 'var(--muted-foreground)', marginBottom: 18 }}>{data.description}</p>
      <label htmlFor={inputId} style={{ display: 'block', fontWeight: 500, marginBottom: 7 }}>Scenario</label>
      <select id={inputId} value={scenario.id} onChange={event => { setSelection(event.target.value); setPosition(0); }} style={{ display: 'block', width: '100%', minHeight: 44, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--foreground)', background: 'var(--background)', font: 'inherit' }}>{data.scenarios.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
      <p style={{ margin: '10px 0 18px' }}>{scenario.description}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Button type="button" onClick={() => setPosition(value => Math.min(events.length, value + 1))} disabled={complete}>Step</Button>
        <Button type="button" variant="outline" onClick={() => setPosition(events.length)} disabled={complete}>Run to end</Button>
        <Button type="button" variant="outline" onClick={() => setPosition(0)} disabled={position === 0}>Reset</Button>
        <span style={{ marginLeft: 6, color: 'var(--muted-foreground)', fontSize: 12 }}>{position} / {events.length} events</span>
      </div>
      <details style={{ marginTop: 18 }}><summary>Effective scenario settings</summary><Record value={scenario.config} /></details>
    </div>
    <div style={sectionStyle}>
      <p role="status" aria-live="polite" style={{ fontWeight: 500 }}>{current ? `${position}. ${current.trace}` : 'Ready. Press Step to follow the first event.'}</p>
      <Metrics kind={data.kind} event={current} result={result} complete={complete} />
      {part && <p style={{ color: 'var(--muted-foreground)' }}>{typeof part.is === 'string' ? part.is : part.is?.[scenario.config.gpu]} <a href={`#part-${current.station}`}>Inspect this part</a></p>}
      {timing && <p style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>Original lesson-tool measurement: {(timing.seconds * 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })} µs.{timing.shared ? ` Shared measurement: ${timing.shared}.` : ''}</p>}
      {output && <div style={{ marginTop: 20 }}><h3 style={{ fontWeight: 600 }}>Outcome · {output.status}</h3>{output.lines ? <pre style={preStyle}><code>{output.text}</code></pre> : <p style={{ marginTop: 8 }}>{output.text}</p>}{output.measured !== undefined && <p style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>{output.measured ? 'Measured source configuration.' : 'This configuration was not measured; inspect the source assumptions and flags.'}</p>}{output.correct !== undefined && <p style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>Arithmetic correctness: {output.correct ? 'correct' : 'incorrect'}. Status: {output.status}.</p>}</div>}
      {current?.verdict && <p><strong>Verifier:</strong> {current.verdict.note}</p>}
      {current?.ir && <details open><summary>Intermediate representation</summary><pre style={preStyle}><code>{current.ir.join('\n')}</code></pre></details>}
      {current?.insns && <details open><summary>Decoded instructions</summary><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', textAlign: 'left', font: '12px/1.8 var(--font-mono)' }}><thead><tr><th>Address</th><th>Bytes</th><th>Instruction</th></tr></thead><tbody>{current.insns.map((instruction, index) => <tr key={index}><td style={{ paddingRight: 14 }}>0x{instruction.a.toString(16)}</td><td style={{ paddingRight: 14, whiteSpace: 'nowrap' }}>{instruction.hex}</td><td style={{ whiteSpace: 'nowrap' }}>{instruction.text}</td></tr>)}</tbody></table></div></details>}
      {current?.context && <details><summary>Context cards · {current.context.length}</summary><ol>{current.context.map(id => { const card = data.cards?.find(item => item.id === id); return <li key={id}><strong>{id}</strong>{card && <> — {card.text || card.title}{card.total != null ? ` · $${card.total.toLocaleString()}` : ''}</>}</li>; })}</ol></details>}
      {current?.ledger && <details open><summary>Evidence ledger · {current.ledger.length} claims</summary><ol>{current.ledger.map(claim => <li key={claim.id}><strong>{claim.id} · {claim.confidence}</strong> — {claim.claim}</li>)}</ol></details>}
      {current && <details style={{ marginTop: 16 }}><summary>All fields in this event</summary><Record value={current} /></details>}
    </div>
    <div style={sectionStyle}><h3 style={{ fontWeight: 600, marginBottom: 12 }}>Execution trace</h3>{shown.length ? <ol>{shown.map((event, index) => <li key={index} aria-current={index === position - 1 ? 'step' : undefined}><span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>{label(event.station)}{event.clock != null ? ` · ${event.clock.toLocaleString()} ms` : ''}</span><br />{event.trace}</li>)}</ol> : <p style={{ color: 'var(--muted-foreground)' }}>Events appear as you step through the scenario.</p>}
      <details style={{ marginTop: 18 }}><summary>Complete scenario data</summary><p style={{ color: 'var(--muted-foreground)' }}>Includes all event fields, output, totals, and the model's evidence or measurement details.</p><pre style={preStyle}><code>{JSON.stringify(scenario, null, 2)}</code></pre></details>
    </div>
  </section>;
}
