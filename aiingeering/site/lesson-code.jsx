import React, { Component, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Check, Copy } from 'lucide-react';
import {
  CodeBlock, CodeBlockCopyButton, CodeBlockHeader, CodeBlockTitle, CodeBlockWrapToggle,
} from '../../site/components/reui/code-block/code-block';
import { codeBlockLanguages } from '../../site/components/reui/code-block/code-block-highlight';
import { isEnhanceableSource, lessonLanguageLabel, normalizeLessonLanguage, readLessonCode } from './lesson-code-model.mjs';

// Reuse the shared engine's public grammar extension point; esbuild makes this a local lazy chunk.
codeBlockLanguages.julia ||= () => import('shiki/langs/julia.mjs');
const themes = { light: 'dark-plus', dark: 'dark-plus' };
const enhanced = new WeakMap();

function ExactCopy({ source, setStatus }) {
  const [state, setState] = useState('idle');
  const alive = useRef(false);
  const timer = useRef();
  const copying = useRef(false);
  useLayoutEffect(() => {
    alive.current = true;
    return () => { alive.current = false; clearTimeout(timer.current); };
  }, []);
  async function copy() {
    if (copying.current) return;
    copying.current = true;
    clearTimeout(timer.current);
    setState('busy');
    setStatus('Copying…');
    try {
      if (!globalThis.navigator?.clipboard?.writeText) throw new Error('Clipboard unavailable');
      // The default ReUI copy handler strips annotation comments; this override preserves authored text exactly.
      await navigator.clipboard.writeText(source);
      if (!alive.current) return;
      setState('copied');
      setStatus('Copied');
      timer.current = setTimeout(() => {
        if (alive.current) { setState('idle'); setStatus(''); }
      }, 2400);
    } catch {
      if (alive.current) {
        setState('failed');
        setStatus('Copy unavailable. Select the code and copy it with your keyboard.');
      }
    } finally {
      copying.current = false;
      if (alive.current) setState(value => value === 'busy' ? 'idle' : value);
    }
  }
  const copied = state === 'copied';
  return <CodeBlockCopyButton value={source} position="inline" size="sm" onClick={copy}
    disabled={state === 'busy'} aria-label={copied ? 'Copied' : 'Copy code'} title={copied ? 'Copied' : 'Copy code'}
    data-copied={copied || undefined} data-copy-failed={state === 'failed' || undefined}>
    {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
    <span>{copied ? 'Copied' : 'Copy'}</span>
  </CodeBlockCopyButton>;
}

function CodeSurface({ source, language, label }) {
  const [status, setStatus] = useState('');
  const normalized = normalizeLessonLanguage(language);
  return <CodeBlock className="engineering-code-block dark" code={source} language={normalized}
    themes={themes} label={label || `${lessonLanguageLabel(normalized)} code`} showLineNumbers foldable
    highlight={isEnhanceableSource(source)} defaultWrap>
    <CodeBlockHeader className="engineering-code-header">
      <CodeBlockTitle className="engineering-code-title">{label || lessonLanguageLabel(normalized)}</CodeBlockTitle>
      <div className="engineering-code-actions" role="group" aria-label="Code controls">
        <CodeBlockWrapToggle aria-label="Wrap lines" title="Wrap lines">Wrap</CodeBlockWrapToggle>
        <ExactCopy key={source} source={source} setStatus={setStatus} />
      </div>
    </CodeBlockHeader>
    <span className="engineering-code-status sr-only" role="status" aria-live="polite">{status}</span>
  </CodeBlock>;
}

class CodeBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.failed ? this.props.fallback || null : this.props.children; }
}

/** Read-only shared ReUI/Shiki viewer. The source is never evaluated. */
export function LessonCode({ source = '', language, label }) {
  return <CodeBoundary key={language} fallback={<pre tabIndex={0} aria-label={label || 'Source code'}><code>{source}</code></pre>}>
    <CodeSurface source={source} language={language} label={label} />
  </CodeBoundary>;
}

function CommittedCode({ record, isActive }) {
  useLayoutEffect(() => {
    if (isActive() && !record.failed) {
      record.fallback.hidden = true;
      record.host.hidden = false;
    }
  }, [record, isActive]);
  return <CodeSurface source={record.source} language={record.language} />;
}

/** One auxiliary root owns portals; authored nodes remain available until each portal commits. */
export function enhanceLessonCode(element) {
  if (!element) return () => {};
  enhanced.get(element)?.();
  const doc = element.ownerDocument;
  const records = [];
  for (const pre of element.querySelectorAll('pre')) {
    const snapshot = readLessonCode(pre);
    if (!snapshot) continue;
    const wrapper = pre.closest('.code-block');
    const fallback = wrapper && element.contains(wrapper) ? wrapper : pre;
    const host = doc.createElement('div');
    host.className = 'engineering-code-host';
    host.hidden = true;
    fallback.after(host);
    records.push({ ...snapshot, host, fallback, hidden: fallback.hidden, failed: false });
  }
  if (!records.length) return () => {};
  const rootHost = doc.createElement('div');
  rootHost.hidden = true;
  rootHost.dataset.engineeringCodeRoot = 'true';
  element.append(rootHost);
  let root;
  let active = true;
  let observer;
  const visible = new Set();
  const isActive = () => active;
  const restore = record => { record.fallback.hidden = record.hidden; record.host.hidden = true; };
  const render = () => {
    if (!active) return;
    root.render(records.filter(record => visible.has(record)).map(record => createPortal(
      <CodeBoundary onError={() => { if (active) { record.failed = true; restore(record); } }}>
        <CommittedCode record={record} isActive={isActive} />
      </CodeBoundary>, record.host, String(records.indexOf(record)))));
  };
  function dispose() {
    if (!active) return;
    active = false;
    observer?.disconnect();
    records.forEach(restore);
    if (enhanced.get(element) === dispose) enhanced.delete(element);
    // Cleanup may run during the reader's own React commit. Defer only our root's unmount.
    queueMicrotask(() => {
      try { root?.unmount(); } finally { records.forEach(record => record.host.remove()); rootHost.remove(); }
    });
  }
  enhanced.set(element, dispose);
  try {
    root = createRoot(rootHost);
    const Observer = doc.defaultView?.IntersectionObserver;
    if (Observer) {
      const byFallback = new Map(records.map(record => [record.fallback, record]));
      observer = new Observer(entries => {
        if (!active) return;
        for (const entry of entries) if (entry.isIntersecting) {
          visible.add(byFallback.get(entry.target));
          observer.unobserve(entry.target);
        }
        render();
      }, { rootMargin: '400px 0px' });
      records.forEach(record => observer.observe(record.fallback));
    } else {
      records.forEach(record => visible.add(record));
      render();
    }
  } catch { dispose(); }
  return dispose;
}
