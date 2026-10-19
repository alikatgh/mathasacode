import React, { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { Compartment, EditorState, StateEffect } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, drawSelection, dropCursor, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, redo, undo } from '@codemirror/commands';
import { bracketMatching, foldAll, foldedRanges, foldGutter, foldKeymap, indentOnInput, unfoldAll } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { rust } from '@codemirror/lang-rust';
import { EDITOR_HIGHLIGHT_DELAY, canHighlightEditorSource, highlightEditorSource } from './editor-highlighter.mjs';

const languageSupport = { javascript, python, c: cpp, rust };
const replaceHighlight = StateEffect.define();

function textMateHighlighting(language) {
  return ViewPlugin.fromClass(class {
    constructor(view) {
      this.view = view;
      this.decorations = Decoration.none;
      this.revision = 0;
      this.alive = true;
      this.schedule(0);
    }
    schedule(delay = EDITOR_HIGHLIGHT_DELAY) {
      clearTimeout(this.timer);
      const revision = ++this.revision;
      const source = this.view.state.doc.toString();
      if (!canHighlightEditorSource(source, language)) {
        this.decorations = Decoration.none;
        return;
      }
      this.timer = setTimeout(async () => {
        try {
          const ranges = await highlightEditorSource(source, language);
          if (!this.alive || revision !== this.revision || this.view.state.doc.toString() !== source) return;
          this.view.dispatch({ effects: replaceHighlight.of(ranges) });
        } catch {
          // Editing remains available if a grammar or the optional highlighter
          // cannot load. Never alter or discard the user's source.
        }
      }, delay);
    }
    update(update) {
      if (update.docChanged) {
        this.decorations = this.decorations.map(update.changes);
        this.schedule();
      }
      for (const transaction of update.transactions) {
        for (const effect of transaction.effects) {
          if (effect.is(replaceHighlight)) {
            this.decorations = Decoration.set(effect.value.map(({ from, to, style }) =>
              Decoration.mark({ class: 'editable-code__token', attributes: { style } }).range(from, to)));
          }
        }
      }
    }
    destroy() {
      this.alive = false;
      this.revision++;
      clearTimeout(this.timer);
    }
  }, { decorations: plugin => plugin.decorations });
}

const editorTheme = EditorView.theme({
  '&': { color: 'var(--code-foreground, #d4d4d4)', backgroundColor: 'var(--code-background, #1e1e1e)', fontSize: '13.5px' },
  '&.cm-focused': { outline: '2px solid var(--code-focus, #007fd4)', outlineOffset: '-2px' },
  '.cm-scroller': {
    maxHeight: 'min(430px, 55dvh)', overflow: 'auto', overscrollBehavior: 'contain',
    fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)', lineHeight: '1.8',
  },
  '.cm-content': { padding: '12px 0', caretColor: 'var(--code-cursor, #aeafad)', minHeight: '1.8em' },
  '.cm-line': { padding: '0 14px 0 4px' },
  '.cm-gutters': { color: 'var(--code-number, #858585)', backgroundColor: 'transparent', border: 'none', userSelect: 'none' },
  '.cm-gutterElement': { padding: '0 7px 0 10px' },
  '.cm-foldGutter .cm-gutterElement': { padding: '0 3px', cursor: 'pointer' },
  '.cm-foldPlaceholder': { color: 'var(--code-muted, #a6a6a6)', backgroundColor: 'var(--code-hover, #2a2d2e)', border: 'none', padding: '0 4px' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--code-cursor, #aeafad)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'var(--code-selection, #264f78)' },
  '@media(max-width: 640px)': { '&': { fontSize: '13px' } },
}, { dark: true });
const tokenTheme = EditorView.baseTheme({
  '.editable-code__token': { color: 'var(--editor-token-dark)' },
});

/** Also usable without a DOM for exact-source/history verification. */
export function createEditableState(source, language = 'javascript', extensions = []) {
  return EditorState.create({
    doc: source,
    extensions: [
      // CodeMirror normally normalizes CRLF/mixed endings. Pin LF splitting so
      // copy and execution always receive the original string, including CRs.
      EditorState.lineSeparator.of('\n'), EditorState.readOnly.of(false),
      history(), keymap.of([...historyKeymap, ...defaultKeymap, ...foldKeymap]),
      lineNumbers(), foldGutter(), bracketMatching(), indentOnInput(), drawSelection(), dropCursor(),
      languageSupport[language]?.() || [], editorTheme, tokenTheme, textMateHighlighting(language), ...extensions,
      // Deliberately no indentWithTab binding: Tab and Shift+Tab leave the
      // editor through the browser's normal keyboard focus order.
    ],
  });
}

/**
 * Mount on Edit only. `source` is controlled; onChange receives the exact doc.
 * Ref: getSource, setSource, reset, focus, toggleFold, isFolded, undo, redo.
 */
export const EditableCode = forwardRef(function EditableCode({
  source, language = 'javascript', wrap = false, onChange, onFoldChange,
  className = '', ariaLabel = 'Editable code example',
}, forwardedRef) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const latest = useRef({ source, wrap, onChange, onFoldChange, ariaLabel });
  latest.current = { source, wrap, onChange, onFoldChange, ariaLabel };
  const initialSource = useRef(source);
  const wrapConfig = useRef(new Compartment());
  const labelConfig = useRef(new Compartment());
  const silentChange = useRef(false);

  function setSource(next) {
    const view = viewRef.current;
    if (!view || typeof next !== 'string' || next === view.state.doc.toString()) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
  }

  useImperativeHandle(forwardedRef, () => ({
    getSource: () => viewRef.current?.state.doc.toString() ?? latest.current.source,
    setSource,
    reset: (next = initialSource.current) => setSource(next),
    focus: () => viewRef.current?.focus(),
    toggleFold() {
      const view = viewRef.current;
      if (!view) return false;
      if (foldedRanges(view.state).size) unfoldAll(view);
      else foldAll(view);
      return foldedRanges(view.state).size > 0;
    },
    isFolded: () => Boolean(viewRef.current && foldedRanges(viewRef.current.state).size),
    undo: () => viewRef.current ? undo(viewRef.current) : false,
    redo: () => viewRef.current ? redo(viewRef.current) : false,
  }), []);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let folded = false;
    initialSource.current = latest.current.source;
    const view = new EditorView({
      parent: host,
      state: createEditableState(latest.current.source, language, [
        wrapConfig.current.of(latest.current.wrap ? EditorView.lineWrapping : []),
        labelConfig.current.of(EditorView.contentAttributes.of({ 'aria-label': latest.current.ariaLabel, spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' })),
        EditorView.updateListener.of(update => {
          if (update.docChanged && !silentChange.current) latest.current.onChange?.(update.state.doc.toString());
          const nextFolded = foldedRanges(update.state).size > 0;
          if (nextFolded !== folded) {
            folded = nextFolded;
            latest.current.onFoldChange?.(folded);
          }
        }),
      ]),
    });
    viewRef.current = view;
    latest.current.onFoldChange?.(false);
    return () => {
      viewRef.current = null;
      view.destroy();
    };
  }, [language]);

  useLayoutEffect(() => {
    silentChange.current = true;
    try { setSource(source); } finally { silentChange.current = false; }
  }, [source, language]);

  useLayoutEffect(() => {
    viewRef.current?.dispatch({ effects: wrapConfig.current.reconfigure(wrap ? EditorView.lineWrapping : []) });
  }, [wrap, language]);

  useLayoutEffect(() => {
    viewRef.current?.dispatch({ effects: labelConfig.current.reconfigure(EditorView.contentAttributes.of({
      'aria-label': ariaLabel, spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off',
    })) });
  }, [ariaLabel, language]);

  return <div ref={hostRef} className={`editable-code${className ? ` ${className}` : ''}`} data-language={language} />;
});

export default EditableCode;
