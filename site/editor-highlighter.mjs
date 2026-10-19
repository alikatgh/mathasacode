// A single, lazy TextMate highlighter serves every editable example. Importing
// this module does not initialize an engine or load the language grammars.
export const MAX_EDITOR_HIGHLIGHT_BYTES = 64 * 1024;
export const EDITOR_HIGHLIGHT_DELAY = 80;

const languages = new Set(['javascript', 'python', 'c', 'rust']);
let highlighterPromise;

export function canHighlightEditorSource(source, language) {
  if (!languages.has(language) || typeof source !== 'string' || source.length > MAX_EDITOR_HIGHLIGHT_BYTES) return false;
  return new TextEncoder().encode(source).byteLength <= MAX_EDITOR_HIGHLIGHT_BYTES;
}

export function getEditorHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = Promise.all([
      import('shiki/core'), import('shiki/engine/javascript'),
      import('@shikijs/themes/light-plus'), import('@shikijs/themes/dark-plus'),
      import('@shikijs/langs/javascript'), import('@shikijs/langs/python'),
      import('@shikijs/langs/c'), import('@shikijs/langs/rust'),
    ]).then(([{ createHighlighterCore }, { createJavaScriptRegexEngine }, light, dark, javascript, python, c, rust]) =>
      createHighlighterCore({
        themes: [light.default, dark.default],
        langs: [javascript.default, python.default, c.default, rust.default],
        engine: createJavaScriptRegexEngine({ target: 'ES2018' }),
      })).catch(error => {
      // A failed load must not poison all future editor mounts.
      highlighterPromise = undefined;
      throw error;
    });
  }
  return highlighterPromise;
}

const color = value => typeof value === 'string' && /^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(value) ? value : undefined;

function tokenStyle(token) {
  const light = token.variants?.light;
  const dark = token.variants?.dark;
  const lightColor = color(light?.color);
  const darkColor = color(dark?.color);
  if (!lightColor || !darkColor) return '';
  const font = Number.isInteger(light?.fontStyle) ? light.fontStyle : 0;
  return `--editor-token-light:${lightColor};--editor-token-dark:${darkColor}`
    + (font & 1 ? ';font-style:italic' : '')
    + (font & 2 ? ';font-weight:600' : '')
    + (font & 4 ? ';text-decoration:underline' : '');
}

/** Convert presentation-only tokens into source offsets, without HTML or text replacement. */
export function editorTokenRanges(source, tokenLines) {
  if (typeof source !== 'string' || !Array.isArray(tokenLines)) return [];
  const lines = source.split('\n');
  // Shiki treats CRLF as a newline. Preserve the CR in the document and leave
  // only that character uncoloured; every token still has its exact offset.
  if (tokenLines.length !== lines.length) return [];
  const ranges = [];
  let offset = 0;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const sourceLine = lines[lineIndex];
    const tokens = tokenLines[lineIndex];
    if (!Array.isArray(tokens) || tokens.some(token => typeof token?.content !== 'string')) return [];
    const text = tokens.map(token => token.content).join('');
    if (text !== sourceLine && text !== sourceLine.replace(/\r$/, '')) return [];
    let column = 0;
    for (const token of tokens) {
      const style = tokenStyle(token);
      if (token.content.length && style) ranges.push({ from: offset + column, to: offset + column + token.content.length, style });
      column += token.content.length;
    }
    offset += sourceLine.length + 1;
  }
  return ranges;
}

export async function highlightEditorSource(source, language) {
  if (!canHighlightEditorSource(source, language)) return [];
  const highlighter = await getEditorHighlighter();
  const tokens = highlighter.codeToTokensWithThemes(source, {
    lang: language, themes: { light: 'light-plus', dark: 'dark-plus' },
    tokenizeMaxLineLength: 4096, tokenizeTimeLimit: 100,
  });
  return editorTokenRanges(source, tokens);
}
