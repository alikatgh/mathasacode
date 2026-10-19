import React, { Component, lazy, Suspense, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Check, Copy, MoreHorizontal, Pencil, Play, RotateCcw, Square } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Button } from './components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuSeparator } from './components/ui/dropdown-menu';
import { runCode, runnerInfo } from './runners/controller.mjs';
import { prepareRunnableExample } from '../scripts/run-context.mjs';
const EditableCode = lazy(() => import('./editable-code.jsx'));
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
import {
  CodeBlock, CodeBlockContent, CodeBlockCopyButton, CodeBlockHeader, CodeBlockTitle,
  useCodeBlockFolding,
} from './components/reui/code-block/code-block';
import {
  detectExampleLanguage, exampleLanguageLabels, exampleLanguages, exampleLines,
  languagePreferenceKey, readExampleLanguage, saveExampleLanguage,
} from './example-model.mjs';

const prepared = new WeakMap();
const subscribeToNothing = () => () => {};
const emptySnapshot = () => null;
const labels = {
  en: {
    languages: 'Code language', controls: 'Code example controls', copy: 'Copy code', copied: 'Copied',
    copying: 'Copying…', unavailable: 'Copy unavailable. Select the code and copy it with your keyboard.',
    wrap: 'Wrap lines', fold: 'Fold all', unfold: 'Expand all', more: 'Code options',
    edit: 'Edit code', done: 'Done editing', reset: 'Reset example', run: 'Run', stop: 'Stop',
    output: 'Output', noOutput: 'Finished with no output.', previous: 'Output from an earlier version of this code.', loading: 'Opening editor…',
    state: { success: 'Finished', error: 'Error', stopped: 'Stopped', timeout: 'Time limit' },
    example: language => `${language} code example`,
    help: 'Choose Edit to change the code, then Run to see its output. Tab moves between controls. Copy includes every line, including folded code. Edits stay while you browse this page.',
  },
  zh: {
    languages: '代码语言', controls: '代码示例控件', copy: '复制代码', copied: '已复制',
    copying: '复制中…', unavailable: '无法复制。请选择代码并使用键盘复制。',
    wrap: '自动换行', fold: '全部折叠', unfold: '全部展开', more: '代码选项',
    edit: '编辑代码', done: '完成编辑', reset: '重置示例', run: '运行', stop: '停止',
    output: '输出', noOutput: '运行完成，无输出。', previous: '此输出来自修改前的代码。', loading: '正在打开编辑器…',
    state: { success: '已完成', error: '错误', stopped: '已停止', timeout: '超时' },
    example: language => `${language} 代码示例`,
    help: '选择编辑来修改代码，然后运行以查看输出。使用 Tab 在控件间移动。复制包含全部代码，包括折叠内容。在本页浏览时保留修改。',
  },
};

function browserStorage(browser) {
  try { return browser?.localStorage; } catch { return undefined; }
}

function readTokens(node, source) {
  try { return exampleLines(source, JSON.parse(node?.textContent || 'null')); }
  catch { return exampleLines(source); }
}

/** Snapshot authored code before mounting React, keeping the original DOM intact. */
export function prepareCodeExamples(main) {
  if (prepared.has(main)) return prepared.get(main);
  const doc = main.ownerDocument;
  const examples = [];
  for (const [index, element] of Array.from(main.querySelectorAll('.code-example')).entries()) {
    const variants = {};
    const panels = Array.from(element.querySelectorAll('.code-example__panel[data-language]'));
    for (const panel of panels) {
      const code = panel.querySelector('pre > code');
      if (!code || !exampleLanguages.includes(panel.dataset.language)) continue;
      const source = code.textContent;
      variants[panel.dataset.language] = {
        source, lines: readTokens(panel.querySelector('script.code-example__tokens'), source), panel,
      };
    }
    if (!Object.keys(variants).length) continue;
    const host = doc.createElement('div');
    host.className = 'reui-example';
    element.append(host);
    examples.push({
      host, element, exampleId: `${element.dataset.codeExample || 'example'}-${index + 1}`,
      defaultLanguage: Object.hasOwn(variants, element.dataset.defaultLanguage)
        ? element.dataset.defaultLanguage : Object.keys(variants)[0],
      variants, tabs: element.querySelector('.code-example__tabs'),
      preferences: { wrap: true, folded: Object.create(null) },
    });
  }
  for (const [index, pre] of Array.from(main.querySelectorAll('pre')).entries()) {
    if (pre.closest('.code-example') || !pre.querySelector(':scope > code')) continue;
    const code = pre.querySelector(':scope > code');
    const language = detectExampleLanguage(code);
    const source = code.textContent;
    const tokenNode = pre.nextElementSibling?.matches('script.code-example__tokens') ? pre.nextElementSibling : null;
    const host = doc.createElement('div');
    host.className = 'reui-example reui-example--standalone';
    pre.after(host);
    examples.push({
      host, element: pre, exampleId: `standalone-${index + 1}`, defaultLanguage: language,
      variants: { [language]: { source, lines: readTokens(tokenNode, source), panel: pre } },
      preferences: { wrap: true, folded: Object.create(null) },
      standalone: true,
    });
  }
  prepared.set(main, examples);
  return examples;
}

function showFallback(example, language) {
  if (example.standalone) {
    example.element.hidden = false;
    return;
  }
  const selectedLanguage = Object.hasOwn(example.variants, language) ? language : example.defaultLanguage;
  if (example.tabs) example.tabs.hidden = false;
  for (const [name, variant] of Object.entries(example.variants)) variant.panel.hidden = name !== selectedLanguage;
  for (const tab of example.tabs?.querySelectorAll('[role="tab"]') || []) {
    const selected = tab.dataset.language === selectedLanguage;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
}

class ExampleBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) {
    showFallback(this.props.example, this.props.language);
    console.warn('The enhanced code block is unavailable; the original example is still readable.', error);
  }
  render() { return this.state.failed ? null : this.props.children; }
}

function ControlHint({ label, slot, children }) {
  return <Tooltip><TooltipTrigger asChild data-slot={slot}>{children}</TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}

function CodeOptions({ text, wrap, onWrapChange, editing, editor, editorFolded, reset }) {
  const folding = useCodeBlockFolding();
  const folded = editing ? editorFolded : folding.foldedStarts.length > 0;
  const label = folded ? text.unfold : text.fold;
  const trigger = useRef();
  return <DropdownMenu modal={false}><DropdownMenuTrigger asChild>
    <Button ref={trigger} type="button" variant="ghost" size="sm" aria-label={text.more} title={text.more}><MoreHorizontal size={14} aria-hidden="true" /></Button>
  </DropdownMenuTrigger><DropdownMenuContent align="end" className="code-options"
    onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
    <DropdownMenuCheckboxItem checked={wrap} onCheckedChange={onWrapChange}>{text.wrap}</DropdownMenuCheckboxItem>
    <DropdownMenuItem disabled={!editing && !folding.regions.length} onSelect={() => {
      if (editing) editor.current?.toggleFold();
      else if (folded) folding.unfoldAll();
      else folding.foldAll();
    }}>{label}</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={reset}><RotateCcw size={13} aria-hidden="true" />{text.reset}</DropdownMenuItem>
  </DropdownMenuContent></DropdownMenu>;
}

function ExactCopyControl({ source, text, setStatus }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const timer = useRef();
  useLayoutEffect(() => {
    alive.current = true;
    return () => { alive.current = false; clearTimeout(timer.current); };
  }, []);
  async function copy() {
    if (busy) return;
    clearTimeout(timer.current);
    setBusy(true);
    setCopied(false);
    setStatus(text.copying);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      // ReUI's default handler strips notation comments. Override that public
      // Button prop so copy preserves the original source byte for byte.
      await navigator.clipboard.writeText(source);
      if (!alive.current) return;
      setCopied(true);
      setStatus(text.copied);
      timer.current = setTimeout(() => {
        if (alive.current) { setCopied(false); setStatus(''); }
      }, 2400);
    } catch {
      if (alive.current) setStatus(text.unavailable);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return <ControlHint label={copied ? text.copied : text.copy} slot="code-block-copy"><CodeBlockCopyButton value={source} position="inline" size="sm"
    onClick={copy} disabled={busy} aria-label={copied ? text.copied : text.copy}
    title={copied ? text.copied : text.copy} data-copied={copied || undefined}>
    {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
    <span className="reui-example__control-label">{copied ? text.copied : text.copy}</span>
  </CodeBlockCopyButton></ControlHint>;
}

function RunnableExample({ example, language, onLanguageChange, onLanguageMenuAnchor, text }) {
  const variant = example.variants[language];
  const preferences = example.preferences;
  preferences.drafts ||= Object.create(null);
  preferences.runs ||= Object.create(null);
  const [drafts, setDrafts] = useState(preferences.drafts);
  const source = drafts[language] ?? variant.source;
  const [editing, setEditing] = useState(false);
  const [editorFolded, setEditorFolded] = useState(false);
  const [wrap, setWrap] = useState(preferences.wrap);
  const [foldedByLanguage, setFoldedByLanguage] = useState(preferences.folded);
  const folded = foldedByLanguage[language] || [];
  const [runs, setRuns] = useState(preferences.runs);
  const result = runs[language];
  const busy = result?.status === 'running';
  const [status, setStatus] = useState('');
  const languageTrigger = useRef(null);
  const openingAnchor = useRef(null);
  const editor = useRef(null);
  const taskRef = useRef(null);
  const helpId = useId();
  const noteId = useId();
  const languageLabel = exampleLanguageLabels[language] || language;
  const info = runnerInfo(language);
  const supported = exampleLanguages.includes(language);
  const executable = source === variant.source
    ? prepareRunnableExample({ exampleId: example.exampleId, language, source })
    : { source, runnable: true };
  useLayoutEffect(() => {
    setStatus('');
    setRuns(preferences.runs);
    setEditorFolded(false);
    return () => {
      taskRef.current?.stop();
      taskRef.current = null;
      const previous = preferences.runs[language];
      if (previous?.status === 'running') preferences.runs = { ...preferences.runs, [language]: { ...previous, status: 'stopped', error: 'Stopped.' } };
    };
  }, [language]);
  function updateRun(value) {
    preferences.runs = { ...preferences.runs, [language]: value };
    setRuns(preferences.runs);
  }
  function updateSource(value) {
    const next = { ...preferences.drafts, [language]: value };
    preferences.drafts = next;
    setDrafts(next);
  }
  function updateFolded(value) {
    setFoldedByLanguage(current => {
      const updated = { ...current, [language]: value };
      preferences.folded = updated;
      return updated;
    });
  }
  function updateWrap(value) { preferences.wrap = value; setWrap(value); }
  function rememberOpeningAnchor() {
    openingAnchor.current = readLanguageAnchor(languageTrigger.current);
  }
  function run() {
    if (busy) { taskRef.current?.stop(); return; }
    if (!supported || !executable.runnable) return;
    const snapshot = { source, status: 'running', output: '', message: '', error: '' };
    updateRun(snapshot);
    const task = runCode({ language, source: executable.source,
      onOutput: output => { if (taskRef.current === task) updateRun({ ...preferences.runs[language], output }); },
      onStatus: message => { if (taskRef.current === task) updateRun({ ...preferences.runs[language], message }); },
    });
    taskRef.current = task;
    task.promise.then(value => {
      if (taskRef.current !== task) return;
      taskRef.current = null;
      updateRun({ source, ...value });
    });
  }
  function reset() {
    taskRef.current?.stop();
    taskRef.current = null;
    updateSource(variant.source);
    updateFolded([]);
    updateRun(undefined);
    setEditorFolded(false);
  }
  return <>
    <p className="reui-example__help sr-only" id={helpId}>{text.help}</p>
    <CodeBlock className="reui-example__code" code={source} language={language}
      variant={example.element.closest('.comparison') ? 'ghost' : 'default'}
      lines={source === variant.source ? variant.lines : undefined}
      highlight={!editing && source !== variant.source && new TextEncoder().encode(source).length <= 65536}
      themes={{ light: 'light-plus', dark: 'dark-plus' }} showLineNumbers foldable
      label={text.example(languageLabel)} aria-describedby={helpId}
      wrap={wrap} onWrapChange={updateWrap} folded={folded} onFoldedChange={updateFolded}>
      <CodeBlockHeader className="reui-example__header">
        {example.standalone ? <CodeBlockTitle className="reui-example__title">{languageLabel}</CodeBlockTitle>
          : <Select value={language}
            onValueChange={value => onLanguageChange(value, openingAnchor.current || languageTrigger.current)}
            onOpenChange={open => {
              if (!open) return;
              if (!openingAnchor.current) rememberOpeningAnchor();
              onLanguageMenuAnchor(openingAnchor.current);
            }}>
            <SelectTrigger ref={languageTrigger} size="sm" className="reui-example__language"
              onPointerDownCapture={event => { if (event.button === 0 && !event.ctrlKey) rememberOpeningAnchor(); }}
              onKeyDownCapture={event => { if ([' ', 'Enter', 'ArrowDown', 'ArrowUp'].includes(event.key)) rememberOpeningAnchor(); }}
              onClickCapture={() => {
                if (languageTrigger.current?.getAttribute('aria-expanded') !== 'true') rememberOpeningAnchor();
              }}
              aria-label={`${text.languages}: ${languageLabel}`}><SelectValue /></SelectTrigger>
            <SelectContent position="popper" align="start" className="reui-example__language-menu"
              onPointerDownOutside={() => { openingAnchor.current = null; }}
              onCloseAutoFocus={event => {
                event.preventDefault();
                languageTrigger.current?.focus({ preventScroll: true });
                onLanguageMenuAnchor(openingAnchor.current);
                openingAnchor.current = null;
              }}>
              <SelectGroup>{exampleLanguages.filter(value => example.variants[value]).map(value =>
                <SelectItem value={value} key={value}>{exampleLanguageLabels[value]}</SelectItem>)}</SelectGroup>
            </SelectContent>
          </Select>}
        <div className="reui-example__actions" role="group" aria-label={text.controls}>
          {supported && <Button type="button" variant="ghost" size="sm" className="reui-example__run" onClick={run}
            disabled={!busy && !executable.runnable} aria-label={busy ? text.stop : text.run} aria-describedby={noteId}>
            {busy ? <Square size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}<span>{busy ? text.stop : text.run}</span>
          </Button>}
          {supported && <ControlHint label={editing ? text.done : text.edit} slot="button"><Button type="button" variant="ghost" size="sm"
            aria-label={editing ? text.done : text.edit} aria-pressed={editing} onClick={() => setEditing(value => !value)}>
            {editing ? <Check size={14} aria-hidden="true" /> : <Pencil size={14} aria-hidden="true" />}
          </Button></ControlHint>}
          <ExactCopyControl key={language} source={source} text={text} setStatus={setStatus} />
          <CodeOptions text={text} wrap={wrap} onWrapChange={updateWrap} editing={editing}
            editor={editor} editorFolded={editorFolded} reset={reset} />
        </div>
      </CodeBlockHeader>
      <div hidden={editing}><CodeBlockContent /></div>
      {editing && <Suspense fallback={<p className="reui-example__loading">{text.loading}</p>}>
        <EditableCode key={language} ref={editor} source={source} language={language} wrap={wrap}
          onChange={updateSource} onFoldChange={setEditorFolded} ariaLabel={text.example(languageLabel)} />
      </Suspense>}
      {supported && <p id={noteId} className={`reui-example__runner-note${info.remote ? ' reui-example__runner-note--remote' : !editing && !result && !executable.note ? ' sr-only' : ''}`}>
        {executable.note && <span>{executable.note} </span>}{(editing || result || info.remote) && info.note}
      </p>}
      {result && <div className="reui-example__output" data-run-status={result.status}>
        <div className="reui-example__output-heading"><span>{text.output}</span><span role="status">{busy ? result.message || 'Starting…' : text.state[result.status]}</span></div>
        {result.source !== source && <p className="reui-example__previous">{text.previous}</p>}
        <pre tabIndex={0} aria-label={text.output}>{result.output || (!busy && !result.error ? text.noOutput : '')}{result.error ? `${result.output ? '\n' : ''}${result.error}` : ''}</pre>
      </div>}
    </CodeBlock>
    <span className="reui-example__status sr-only" role="status" aria-live="polite" aria-atomic="true">{status}</span>
  </>;
}

function Example({ example, selectedLanguage, onLanguageChange, onLanguageMenuAnchor, text }) {
  const language = Object.hasOwn(example.variants, selectedLanguage) ? selectedLanguage : example.defaultLanguage;
  const activeLanguage = useRef(language);
  activeLanguage.current = language;
  useLayoutEffect(() => {
    if (example.tabs) example.tabs.hidden = true;
    for (const variant of Object.values(example.variants)) variant.panel.hidden = true;
    example.element.dataset.reuiEnhanced = 'true';
    return () => {
      delete example.element.dataset.reuiEnhanced;
      showFallback(example, activeLanguage.current);
    };
  }, [example]);
  return <div className="reui-example__panel">
    <RunnableExample example={example} language={language} onLanguageChange={onLanguageChange}
      onLanguageMenuAnchor={onLanguageMenuAnchor} text={text} />
  </div>;
}

function currentVisibleExamples(examples) {
  return examples.filter(example => {
    const page = example.host.closest('.reader-page');
    return page ? !page.hidden && !page.closest('.reader-topic')?.hidden
      : !example.host.closest('[hidden], [inert]');
  });
}

function readLanguageAnchor(anchor) {
  const viewport = anchor?.closest('.reader-viewport');
  return viewport ? { anchor, viewport, top: anchor.getBoundingClientRect().top } : null;
}

/** Settle a language-change layout, then relinquish the reader immediately. */
export function preserveLanguageAnchor({ anchor, viewport, top }, browser) {
  if (!anchor?.isConnected || !viewport || !Number.isFinite(top)) return () => {};
  const inputSurface = viewport.closest?.('.reader-scroll') || viewport;
  const inputEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
  const now = () => browser?.performance?.now?.() ?? Date.now();
  const started = now();
  let frame;
  let remainingFrames = 3;
  let stopped = false;

  function stop() {
    if (stopped) return;
    stopped = true;
    if (frame !== undefined) browser?.cancelAnimationFrame(frame);
    for (const type of inputEvents) inputSurface.removeEventListener(type, stop, true);
    browser?.removeEventListener('resize', stop);
  }
  function correct() {
    if (stopped || !anchor.isConnected || viewport.isConnected === false
      || anchor.closest?.('[hidden], [inert]')) return false;
    const delta = anchor.getBoundingClientRect().top - top;
    if (Math.abs(delta) >= 0.5) {
      const limit = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      viewport.scrollTop = Math.min(limit, Math.max(0, viewport.scrollTop + delta));
    }
    return true;
  }
  function afterLayout() {
    frame = undefined;
    // Never revive a correction after a background tab or a long main-thread
    // stall. User input and route changes also cancel the remaining frames.
    if (now() - started > 160 || !correct()) { stop(); return; }
    remainingFrames -= 1;
    if (remainingFrames > 0) frame = browser.requestAnimationFrame(afterLayout);
    else stop();
  }
  for (const type of inputEvents) inputSurface.addEventListener(type, stop, { capture: true, passive: true });
  browser?.addEventListener('resize', stop);
  if (correct() && browser?.requestAnimationFrame) frame = browser.requestAnimationFrame(afterLayout);
  else stop();
  return stop;
}

/** Only selected-language code surfaces in the visible topic are mounted. */
export function CodeExamplePortals({ examples, controller }) {
  const snapshot = useSyncExternalStore(controller?.subscribe || subscribeToNothing, controller?.getSnapshot || emptySnapshot);
  const doc = examples[0]?.host.ownerDocument || globalThis.document;
  const browser = doc?.defaultView;
  const text = labels[doc?.documentElement.lang.startsWith('zh') ? 'zh' : 'en'];
  const storage = useRef(browserStorage(browser));
  const [language, setLanguage] = useState(() => readExampleLanguage(storage.current,
    examples.find(example => !example.standalone)?.defaultLanguage || 'javascript'));
  const selectedLanguage = useRef(language);
  selectedLanguage.current = language;
  const pendingAnchor = useRef(null);
  const cancelCorrection = useRef(null);

  function restoreMenuAnchor(record) {
    if (!record?.anchor.isConnected || record.anchor.closest('[hidden], [inert]')) return;
    cancelCorrection.current?.();
    cancelCorrection.current = preserveLanguageAnchor(record, browser);
  }
  function selectLanguage(value, anchor, persist = true) {
    if (!exampleLanguages.includes(value) || value === selectedLanguage.current) return;
    cancelCorrection.current?.();
    const recorded = anchor?.anchor ? anchor : readLanguageAnchor(anchor);
    pendingAnchor.current = recorded;
    selectedLanguage.current = value;
    if (persist) saveExampleLanguage(storage.current, value);
    setLanguage(value);
  }
  useLayoutEffect(() => {
    for (const example of examples) {
      if (!example.element.dataset.reuiEnhanced) showFallback(example,
        Object.hasOwn(example.variants, language) ? language : example.defaultLanguage);
    }
    const recorded = pendingAnchor.current;
    pendingAnchor.current = null;
    if (recorded) cancelCorrection.current = preserveLanguageAnchor(recorded, browser);
    return () => {
      cancelCorrection.current?.();
      cancelCorrection.current = null;
    };
  }, [language, examples, snapshot, browser]);
  useEffect(() => {
    const handleStorage = event => {
      if (event.key !== languagePreferenceKey || !exampleLanguages.includes(event.newValue)) return;
      const anchor = currentVisibleExamples(examples).map(example => example.host.querySelector('.reui-example__language'))
        .find(node => {
          const viewport = node?.closest('.reader-viewport');
          if (!viewport) return false;
          const rect = node.getBoundingClientRect();
          const bounds = viewport.getBoundingClientRect();
          return rect.bottom > bounds.top && rect.top < bounds.bottom;
        });
      selectLanguage(event.newValue, anchor, false);
    };
    browser?.addEventListener('storage', handleStorage);
    return () => browser?.removeEventListener('storage', handleStorage);
  }, [browser, examples]);
  return currentVisibleExamples(examples).map(example => createPortal(
    <ExampleBoundary example={example} language={language}>
      <Example example={example} selectedLanguage={language} onLanguageChange={selectLanguage}
        onLanguageMenuAnchor={restoreMenuAnchor} text={text} />
    </ExampleBoundary>, example.host, example.exampleId));
}

export function mountStandaloneCodeExamples(main) {
  const examples = prepareCodeExamples(main);
  if (!examples.length) return () => {};
  const host = main.ownerDocument.createElement('div');
  host.hidden = true;
  host.dataset.reuiCodeRoot = 'true';
  main.append(host);
  const root = createRoot(host);
  root.render(<TooltipProvider><CodeExamplePortals examples={examples} /></TooltipProvider>);
  return () => { root.unmount(); host.remove(); };
}
