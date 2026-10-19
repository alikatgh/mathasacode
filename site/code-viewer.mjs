import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import {
  defaultHighlightStyle, foldAll, foldable, foldedRanges, foldGutter,
  foldKeymap, syntaxHighlighting, unfoldAll,
} from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { rust } from '@codemirror/lang-rust';

const languageSupport = {
  javascript: javascript(),
  python: python(),
  c: cpp(),
  rust: rust(),
};

export const supportedLanguages = Object.freeze(Object.keys(languageSupport));

const languageLabels = { javascript: 'JavaScript', python: 'Python', c: 'C', rust: 'Rust' };
const labels = {
  en: {
    toolbar: 'Code example controls', copy: 'Copy', copied: 'Copied',
    copying: 'Copying…', unavailable: 'Copy unavailable',
    unavailableHelp: 'Clipboard access is unavailable. Select the code and copy it with your keyboard.',
    wrap: 'Wrap lines', fold: 'Fold all', expand: 'Expand all',
    example: language => `${language} example, read only`,
    help: 'Read-only code. Use the arrow keys to navigate and Shift to select. Tab moves to the next control. To fold a block, use Control+Shift+[ or Command+Option+[ on a Mac; use ] with the same keys to expand it.',
  },
  zh: {
    toolbar: '代码示例控件', copy: '复制', copied: '已复制',
    copying: '复制中…', unavailable: '无法复制',
    unavailableHelp: '无法访问剪贴板。请选择代码并使用键盘复制。',
    wrap: '自动换行', fold: '全部折叠', expand: '全部展开',
    example: language => `${language} 代码示例，只读`,
    help: '只读代码。使用方向键浏览，按住 Shift 选择文字，使用 Tab 移至下一个控件。按 Control+Shift+[（Mac 上为 Command+Option+[）折叠代码块，使用相同组合键和 ] 展开。',
  },
};

const chinesePhrases = {
  'Fold line': '折叠代码行', 'Unfold line': '展开代码行',
  'Folded lines': '已折叠代码行', 'Unfolded lines': '已展开代码行',
  'folded code': '已折叠的代码', unfold: '展开', to: '至',
};

/** The same read-only state is used for every language and every example. */
export function createExampleState(source, language, {
  wrap = true, locale = 'en', wrapping = new Compartment(), onUpdate,
  descriptionId,
} = {}) {
  if (typeof source !== 'string') throw new TypeError('Example source must be a string.');
  if (!Object.hasOwn(languageSupport, language)) throw new RangeError('Unsupported example language.');
  const text = labels[locale === 'zh' ? 'zh' : 'en'];
  return EditorState.create({
    doc: source,
    extensions: [
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      EditorView.contentAttributes.of({
        tabindex: '0',
        'aria-label': text.example(languageLabels[language]),
        'aria-readonly': 'true',
        ...(descriptionId ? { 'aria-describedby': descriptionId } : {}),
      }),
      EditorState.tabSize.of(2),
      ...(locale === 'zh' ? [EditorState.phrases.of(chinesePhrases)] : []),
      languageSupport[language],
      lineNumbers(),
      foldGutter(),
      syntaxHighlighting(defaultHighlightStyle),
      // Deliberately omit indentWithTab: Tab always leaves the example.
      keymap.of([...foldKeymap, ...defaultKeymap]),
      wrapping.of(wrap ? EditorView.lineWrapping : []),
      ...(onUpdate ? [EditorView.updateListener.of(onUpdate)] : []),
    ],
  });
}

const controllers = new WeakMap();

/** Mount only the selected language on the current reader page. */
export function initializeCodeViewers(doc = document) {
  if (controllers.has(doc)) return controllers.get(doc);
  const active = new Map();
  const preferences = new WeakMap();
  const browserWindow = doc.defaultView;
  const locale = doc.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
  const text = labels[locale];
  let nextId = 0;

  function makeButton(label, className) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = `code-viewer__button ${className}`;
    button.textContent = label;
    return button;
  }

  function hasFoldableCode(state) {
    for (let number = 1; number <= state.doc.lines; number++) {
      const line = state.doc.line(number);
      if (foldable(state, line.from, line.to)) return true;
    }
    return false;
  }

  function mount(panel) {
    const pre = panel.querySelector('pre');
    const code = pre?.querySelector('code');
    const language = panel.dataset.language;
    if (!code || !supportedLanguages.includes(language)) return;
    const example = panel.closest('.code-example');
    const source = code.textContent;
    const wrapping = new Compartment();
    const wrap = preferences.get(example)?.wrap ?? true;
    const originalTabindex = panel.getAttribute('tabindex');
    const originalHidden = pre.hidden;
    const shell = doc.createElement('div');
    shell.className = 'code-viewer';
    const toolbar = doc.createElement('div');
    toolbar.className = 'code-viewer__toolbar';
    toolbar.setAttribute('role', 'group');
    toolbar.setAttribute('aria-label', text.toolbar);
    const copyButton = makeButton(text.copy, 'code-viewer__copy');
    const wrapButton = makeButton(text.wrap, 'code-viewer__wrap');
    wrapButton.setAttribute('aria-pressed', String(wrap));
    const foldButton = makeButton(text.fold, 'code-viewer__fold');
    const status = doc.createElement('span');
    status.className = 'code-viewer__status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    const help = doc.createElement('p');
    help.className = 'code-viewer__help';
    help.id = `code-viewer-help-${++nextId}`;
    help.textContent = text.help;
    const editorHost = doc.createElement('div');
    editorHost.className = 'code-viewer__editor';
    editorHost.id = `${help.id}-editor`;
    for (const button of [wrapButton, foldButton]) {
      button.setAttribute('aria-controls', editorHost.id);
    }
    toolbar.append(copyButton, wrapButton, foldButton, status);
    shell.append(toolbar, help, editorHost);
    panel.append(shell);
    let record;

    function updateFolding(state) {
      const folded = foldedRanges(state).size > 0;
      foldButton.textContent = folded ? text.expand : text.fold;
      foldButton.setAttribute('aria-pressed', String(folded));
      foldButton.disabled = !folded && !hasFoldableCode(state);
    }

    let view;
    try {
      view = new EditorView({
        state: createExampleState(source, language, {
          wrap, locale, wrapping, descriptionId: help.id,
          onUpdate: update => updateFolding(update.state),
        }),
        parent: editorHost,
      });
      updateFolding(view.state);
    } catch (error) {
      view?.destroy();
      shell.remove();
      console.warn('Code viewer could not be initialized; the original example remains available.', error);
      return;
    }

    const handlers = {
      copy: async () => {
        if (!record.alive || copyButton.disabled) return;
        browserWindow?.clearTimeout(record.feedbackTimer);
        copyButton.disabled = true;
        status.textContent = text.copying;
        status.removeAttribute('title');
        status.removeAttribute('aria-label');
        try {
          const clipboard = browserWindow?.navigator.clipboard;
          if (!clipboard?.writeText) throw new Error('Clipboard unavailable');
          // Copy the preserved source, including whitespace and folded lines.
          await clipboard.writeText(source);
          if (!record.alive) return;
          status.textContent = text.copied;
          record.feedbackTimer = browserWindow?.setTimeout(() => {
            if (record.alive) status.textContent = '';
          }, 2400);
        } catch {
          if (!record.alive) return;
          status.textContent = text.unavailable;
          status.title = text.unavailableHelp;
          // The actionable explanation is announced without requiring hover.
          status.setAttribute('aria-label', text.unavailableHelp);
        } finally {
          if (record.alive) copyButton.disabled = false;
        }
      },
      wrap: () => {
        record.wrap = !record.wrap;
        preferences.set(example, { wrap: record.wrap });
        wrapButton.setAttribute('aria-pressed', String(record.wrap));
        view.dispatch({ effects: wrapping.reconfigure(record.wrap ? EditorView.lineWrapping : []) });
      },
      fold: () => {
        if (foldedRanges(view.state).size) unfoldAll(view);
        else foldAll(view);
      },
    };
    copyButton.addEventListener('click', handlers.copy);
    wrapButton.addEventListener('click', handlers.wrap);
    foldButton.addEventListener('click', handlers.fold);
    record = {
      view, pre, shell, panel, originalTabindex, originalHidden, alive: true,
      wrap, feedbackTimer: undefined, copyButton, wrapButton, foldButton, handlers,
    };
    active.set(panel, record);
    pre.hidden = true;
    panel.tabIndex = -1;
    panel.classList.add('code-example__panel--enhanced');
  }

  function unmount(record) {
    record.alive = false;
    browserWindow?.clearTimeout(record.feedbackTimer);
    record.copyButton.removeEventListener('click', record.handlers.copy);
    record.wrapButton.removeEventListener('click', record.handlers.wrap);
    record.foldButton.removeEventListener('click', record.handlers.fold);
    record.view.destroy();
    record.shell.remove();
    record.pre.hidden = record.originalHidden;
    if (record.originalTabindex === null) record.panel.removeAttribute('tabindex');
    else record.panel.setAttribute('tabindex', record.originalTabindex);
    record.panel.classList.remove('code-example__panel--enhanced');
    active.delete(record.panel);
  }

  function clearViews() {
    for (const record of active.values()) unmount(record);
  }

  function reconcile() {
    // Reader initialization is asynchronous. Never briefly mount the whole book.
    if (doc.body.dataset.guide === 'true' && doc.querySelector('main')?.dataset.readerReady !== 'true') {
      clearViews();
      return;
    }
    const visible = new Set(Array.from(doc.querySelectorAll('.code-example__panel')).filter(panel =>
      !panel.closest('[hidden], [inert]') && panel.getClientRects().length > 0));
    for (const [panel, record] of active) {
      if (!visible.has(panel)) unmount(record);
    }
    for (const panel of visible) {
      if (!active.has(panel)) mount(panel);
    }
  }

  const controller = {
    reconcile,
    destroy() {
      clearViews();
      doc.removeEventListener('reader:change', reconcile);
      doc.removeEventListener('reader:layout', reconcile);
      doc.removeEventListener('code-language-change', reconcile);
      browserWindow?.removeEventListener('pagehide', clearViews);
      browserWindow?.removeEventListener('pageshow', reconcile);
      controllers.delete(doc);
    },
  };
  controllers.set(doc, controller);
  doc.addEventListener('reader:change', reconcile);
  doc.addEventListener('reader:layout', reconcile);
  doc.addEventListener('code-language-change', reconcile);
  browserWindow?.addEventListener('pagehide', clearViews);
  browserWindow?.addEventListener('pageshow', reconcile);
  reconcile();
  return controller;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeCodeViewers(document), { once: true });
  } else initializeCodeViewers(document);
}
