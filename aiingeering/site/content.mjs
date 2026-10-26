import { Marked } from 'marked';
import GithubSlugger from 'github-slugger';
import katex from 'katex';
import hljs from 'highlight.js/lib/common';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const escapeText = value => String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SOURCE_HOST = /^(?:www\.)?aiengineeringfromscratch\.com$/i;
const REPOSITORY = /^\/rohitg00\/ai-engineering-from-scratch\/(?:blob|tree|raw)\/[^/]+\/(.*)$/;
const ASSETS = /\.(?:avif|gif|ico|jpe?g|png|svg|webp|pdf|woff2?|ttf|mp[34]|webm|ogg|wav|zip|gz|tar|bz2|xz|7z|h5|safetensors|npy|npz)$/i;
const aliases = { py: 'python', ts: 'typescript', js: 'javascript', rs: 'rust', jl: 'julia', shell: 'bash', console: 'bash', sh: 'bash', jsonl: 'json', yml: 'yaml' };

function decodeEntities(value) {
  const entities = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', colon: ':', tab: '\t', newline: '\n', nbsp: ' ' };
  return String(value).replace(/&(#x[\da-f]+|#\d+|[a-z]+);?/gi, (entity, name) => {
    if (name[0] !== '#') return entities[name.toLowerCase()] ?? entity;
    const number = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : '\uFFFD';
  });
}

/** Accept only a canonical, repository-relative path, never a URL or traversal. */
function canonicalPath(value) {
  if (typeof value !== 'string' || !value || /[\u0000-\u001f\u007f\\?#:]/.test(value) || value.startsWith('/')) throw new TypeError('Unsafe content path');
  const segments = value.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..')) throw new TypeError('Unsafe content path');
  for (const segment of segments) {
    let decoded;
    try { decoded = decodeURIComponent(segment); } catch { throw new TypeError('Unsafe content path'); }
    if (decoded === '.' || decoded === '..' || /[\u0000-\u001f\u007f\\/:%?#]/.test(decoded)) throw new TypeError('Unsafe content path');
  }
  return segments.join('/');
}

export function contentURL(path) {
  return './content/' + canonicalPath(path).split('/').map(encodeURIComponent).join('/');
}

export function routeURL(path) {
  return '?path=' + encodeURIComponent(canonicalPath(path));
}

const indexes = new WeakMap();
function indexFor(catalog = {}) {
  if (indexes.has(catalog)) return indexes.get(catalog);
  const files = new Set((catalog.files || []).map(file => typeof file === 'string' ? file : file.path));
  const directories = new Set();
  for (const file of files) {
    const segments = file.split('/');
    for (let length = 1; length < segments.length; length++) directories.add(segments.slice(0, length).join('/'));
  }
  const entries = catalog.entries || [];
  const byPath = new Map(entries.map(entry => [entry.path, entry]));
  const result = { files, directories, entries, byPath };
  indexes.set(catalog, result);
  return result;
}

function normalizeRelative(target, source) {
  const parts = target.startsWith('/') ? [] : source.split('/').slice(0, -1);
  for (const rawPart of target.replace(/^\/+/, '').split('/')) {
    let part;
    try { part = decodeURIComponent(rawPart); } catch { return null; }
    if (!part || part === '.') continue;
    if (part === '..') { if (!parts.length) return null; parts.pop(); }
    else {
      if (/[\u0000-\u001f\u007f\\/:%?#]/.test(part)) return null;
      parts.push(part);
    }
  }
  try { return canonicalPath(parts.join('/')); } catch { return null; }
}

function documentTarget(path, catalog) {
  const { files, byPath, entries } = indexFor(catalog);
  const trimmed = path.replace(/\/$/, '');
  if (byPath.has(trimmed) || files.has(trimmed)) return trimmed;
  for (const suffix of ['/docs/en.md', '/README.md', '/readme.md', '/en.md', '/index.md']) {
    if (byPath.has(trimmed + suffix) || files.has(trimmed + suffix)) return trimmed + suffix;
  }
  const entry = entries.find(item => item.directory === trimmed || item.sourcePath === trimmed || item.root === trimmed);
  return entry?.path || trimmed;
}

function legacyRoute(url, catalog) {
  const pathname = url.pathname.replace(/\.html$/, '').replace(/^\/+|\/+$/g, '');
  if (pathname === 'lesson' && url.searchParams.get('path')) return documentTarget(normalizeRelative('/' + url.searchParams.get('path'), '') || '', catalog);
  if (pathname === 'glossary') return 'glossary/terms.md';
  if (pathname === 'roadmap') return 'ROADMAP.md';
  if (pathname === '' || pathname === 'index' || pathname === 'catalog') return 'README.md';
  const { entries } = indexFor(catalog);
  const authoredPage = entries.find(entry => entry.path === 'site/' + pathname + '.html');
  if (authoredPage) return authoredPage.path;
  const manual = /^manual-([^/]+)(?:\/(.+))?$/.exec(pathname);
  if (manual) {
    const available = entries.filter(entry => entry.path.startsWith('manuals/' + manual[1] + '/'));
    if (!manual[2]) return available.find(entry => entry.path.endsWith('/front.md'))?.path || available[0]?.path;
    return available.find(entry => entry.path.split('/').at(-1).replace(/\.md$/, '') === manual[2])?.path;
  }
  const sheet = /^(?:cheatsheet|cheatsheets)[-/](.+)$/.exec(pathname);
  if (sheet) return entries.find(entry => entry.path.startsWith('cheatsheets/') && (entry.id === sheet[1] || entry.path.endsWith('/' + sheet[1] + '.md') || entry.path.endsWith('/' + sheet[1] + '/en.md')))?.path;
  return undefined;
}

/** Rewrite source links to this reader; images and downloadable assets use the snapshot. */
function rewriteURL(value, source, catalog, image = false, origin) {
  let href = decodeEntities(value).trim();
  if (!href || /[\u0000-\u001f\u007f\\]/.test(href)) return null;
  if (href.startsWith('#')) return image ? null : href;
  // Entity/control obfuscation must never turn an executable scheme into a local link.
  if (/^[a-z][a-z\d+.-]*:/i.test(href) && !/^(?:https?:|mailto:)/i.test(href)) return null;
  if (/^mailto:/i.test(href)) return image ? null : href;
  if (origin && !/^[a-z][a-z\d+.-]*:/i.test(href)) {
    try { href = new URL(href, origin).href; } catch { return null; }
  }
  if (href.startsWith('//')) href = 'https:' + href;
  let target;
  let folder = false;
  let fragment = '';
  if (/^https?:/i.test(href)) {
    let url;
    try { url = new URL(href); } catch { return null; }
    if (url.username || url.password || !/^https?:$/.test(url.protocol)) return null;
    fragment = url.hash;
    if (SOURCE_HOST.test(url.hostname)) {
      if (url.pathname.startsWith('/manual-assets/')) target = url.pathname.replace(/^\/manual-assets\//, 'manuals/');
      else if (!image) target = legacyRoute(url, catalog);
      if (!target) return href;
    } else if (/^(?:www\.)?github\.com$/i.test(url.hostname) && REPOSITORY.test(url.pathname)) {
      target = normalizeRelative('/' + url.pathname.match(REPOSITORY)[1], '');
      if (!target || !indexFor(catalog).files.has(target) && !indexFor(catalog).entries.some(entry => entry.path.startsWith(target + '/'))) return href;
    } else if (url.hostname === 'raw.githubusercontent.com' && url.pathname.startsWith('/rohitg00/ai-engineering-from-scratch/')) {
      target = normalizeRelative('/' + url.pathname.split('/').slice(4).join('/'), '');
      if (!target || !indexFor(catalog).files.has(target)) return href;
    } else return href;
  } else {
    let url;
    try { url = new URL(href, 'https://aiengineeringfromscratch.com/'); } catch { return null; }
    fragment = url.hash;
    if (href.startsWith('?') && url.searchParams.has('path')) {
      try { target = canonicalPath(url.searchParams.get('path')); } catch { return null; }
    }
    if (href.startsWith('?') && url.searchParams.has('folder')) {
      try { target = canonicalPath(url.searchParams.get('folder')); folder = true; } catch { return null; }
    }
    if (href.startsWith('/') || /^\/?(?:lesson|manual-[^/]+|glossary|roadmap|catalog|index)(?:[?./#]|$)/.test(href)) target = legacyRoute(url, catalog);
    if (!target) {
      const pathname = href.split(/[?#]/, 1)[0];
      if (pathname.startsWith('/manual-assets/')) target = normalizeRelative(pathname.replace(/^\/manual-assets\//, '/manuals/'), '');
      else if (pathname.startsWith('./content/') || pathname.startsWith('content/')) target = normalizeRelative('/' + pathname.replace(/^(?:\.\/)?content\//, ''), '');
      else target = normalizeRelative(pathname, source);
    }
  }
  if (!target) return null;
  try {
    const index = indexFor(catalog);
    if (image && index.files.size && !index.files.has(target)) return null;
    if (image || ASSETS.test(target)) return index.files.size && !index.files.has(target) ? null : contentURL(target) + fragment;
    const document = documentTarget(target, catalog);
    if (folder) return index.files.size && !index.directories.has(document) ? null : '?folder=' + encodeURIComponent(document) + fragment;
    if (!index.files.has(document) && index.directories.has(document)) return '?folder=' + encodeURIComponent(document) + fragment;
    if (index.files.size && !index.files.has(document) && !index.byPath.has(document)) return null;
    return routeURL(document) + fragment;
  } catch { return null; }
}

const allowedTags = new Set(('a abbr article aside b blockquote br caption code col colgroup dd del details dfn div dl dt em figcaption figure footer h1 h2 h3 h4 h5 h6 header hr i img kbd li main mark nav ol p picture pre q s samp section small source span strong sub summary sup table tbody td th thead time tr u ul var wbr input button label select option output ' +
  'svg g path rect circle ellipse line polyline polygon text tspan defs marker clippath mask pattern lineargradient radialgradient stop symbol use image title desc ' +
  'math semantics annotation mrow mi mn mo ms mtext mspace mfrac msqrt mroot mstyle merror mpadded mphantom mfenced menclose msub msup msubsup munder mover munderover mmultiscripts mprescripts none mtable mtr mtd').split(/\s+/));
const forbiddenContents = new Set(['script', 'style', 'iframe', 'object', 'embed', 'foreignobject', 'template', 'noscript', 'textarea', 'xmp']);
const voidTags = new Set(['br', 'hr', 'img', 'input', 'source', 'col', 'wbr']);
const allowedAttributes = new Set(('id class title role lang dir open start reversed colspan rowspan scope alt width height loading decoding type checked disabled value min max step for selected multiple tabindex encoding xmlns viewbox preserveaspectratio d x y x1 y1 x2 y2 cx cy r rx ry points transform fill fill-opacity stroke stroke-width stroke-opacity stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin opacity text-anchor dominant-baseline font-family font-size font-weight font-style letter-spacing dx dy marker-start marker-mid marker-end offset stop-color stop-opacity gradientunits gradienttransform patternunits patterntransform clippathunits maskunits refx refy markerwidth markerheight orient vector-effect focusable display visibility clip-path mask').split(/\s+/));
const styleProperties = new Set(('color background-color border-color border-width border-style display visibility opacity width height min-width max-width min-height max-height padding padding-top padding-right padding-bottom padding-left margin margin-top margin-right margin-bottom margin-left font-family font-size font-style font-weight line-height letter-spacing text-align text-decoration vertical-align white-space overflow overflow-x overflow-y fill fill-opacity stroke stroke-width stroke-opacity stroke-dasharray stroke-linecap stroke-linejoin text-anchor dominant-baseline transform transform-origin position top right bottom left grid-template-columns gap flex flex-direction align-items justify-content border-radius').split(/\s+/));

function safeStyle(value) {
  return decodeEntities(value).split(';').map(declaration => {
    const colon = declaration.indexOf(':');
    if (colon < 0) return '';
    const name = declaration.slice(0, colon).trim().toLowerCase();
    const contents = declaration.slice(colon + 1).trim();
    if (!styleProperties.has(name) || /[\\<>@]|(?:url|expression|import|javascript|behavior)\s*[:(]/i.test(contents)) return '';
    return name + ':' + contents;
  }).filter(Boolean).join(';');
}

// The imported manual renderer emits HTML and SVG. Rebuild every tag and attribute
// against an allowlist rather than handing its markup directly to innerHTML.
function sanitizeHTML(html, source, catalog, origin) {
  let output = '';
  let cursor = 0;
  const blocked = [];
  while (cursor < html.length) {
    const next = html.indexOf('<', cursor);
    if (next < 0) { if (!blocked.length) output += escapeText(html.slice(cursor)); break; }
    if (!blocked.length) output += escapeText(html.slice(cursor, next));
    if (html.startsWith('<!--', next)) {
      const end = html.indexOf('-->', next + 4);
      cursor = end < 0 ? html.length : end + 3;
      continue;
    }
    let quote = '';
    let end = next + 1;
    for (; end < html.length; end++) {
      const character = html[end];
      if (quote) { if (character === quote) quote = ''; }
      else if (character === '"' || character === "'") quote = character;
      else if (character === '>') break;
    }
    if (end === html.length) { if (!blocked.length) output += escapeText(html.slice(next)); break; }
    const raw = html.slice(next, end + 1);
    cursor = end + 1;
    const match = /^<\s*(\/?)\s*([a-z][a-z\d:-]*)([\s\S]*?)>$/i.exec(raw);
    if (!match) { if (!blocked.length && !/^<!|^<\?/.test(raw)) output += escapeText(raw); continue; }
    const closing = Boolean(match[1]);
    const tag = match[2].toLowerCase();
    if (blocked.length) {
      if (tag === blocked.at(-1) && closing) blocked.pop();
      else if (forbiddenContents.has(tag) && !closing && !/\/\s*>$/.test(raw)) blocked.push(tag);
      continue;
    }
    if (forbiddenContents.has(tag)) { if (!closing && !/\/\s*>$/.test(raw)) blocked.push(tag); continue; }
    if (!allowedTags.has(tag)) continue;
    if (closing) { if (!voidTags.has(tag)) output += '</' + tag + '>'; continue; }
    let attributes = '';
    let missingImage = false;
    let imageAlt = '';
    let unavailableLink = false;
    const seen = new Set();
    const pattern = /\s+([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gy;
    const attrSource = match[3].replace(/\/\s*$/, '');
    let position = 0;
    let invalid = false;
    while (position < attrSource.length) {
      if (!attrSource.slice(position).trim()) break;
      pattern.lastIndex = position;
      const attribute = pattern.exec(attrSource);
      if (!attribute) { invalid = true; break; }
      position = pattern.lastIndex;
      const name = attribute[1].toLowerCase();
      let value = decodeEntities(attribute[2] ?? attribute[3] ?? attribute[4] ?? '');
      if (seen.has(name) || /^on/i.test(name)) continue;
      seen.add(name);
      if (name === 'href' || name === 'src' || name === 'xlink:href') {
        if (tag === 'use') value = /^#[\w:.-]+$/.test(value) ? value : null;
        else value = rewriteURL(value, source, catalog, name === 'src' || tag === 'image', origin);
        if (tag === 'img' && name === 'src' && value == null) missingImage = true;
        if (tag === 'a' && name === 'href' && value == null) unavailableLink = true;
        if (value != null) attributes += ' ' + (name === 'xlink:href' ? 'href' : name) + '="' + escapeHTML(value) + '"';
      } else if (name === 'style') {
        const style = safeStyle(value);
        if (style) attributes += ' style="' + escapeHTML(style) + '"';
      } else if (allowedAttributes.has(name) || /^(?:aria-|data-)[a-z\d_-]+$/.test(name)) {
        if (name === 'alt') imageAlt = value;
        if (/url\s*\(/i.test(value) && !/^url\(#[\w:.-]+\)$/.test(value)) continue;
        if (name === 'type' && tag === 'input' && !/^(?:checkbox|range|number)$/.test(value)) continue;
        if (name === 'tabindex' && !/^-?[01]$/.test(value)) continue;
        attributes += ' ' + name + '="' + escapeHTML(value) + '"';
      }
    }
    if (unavailableLink && !seen.has('title')) attributes += ' title="Reference not included in the source snapshot"';
    if (invalid) { output += escapeText(raw); continue; }
    if (tag === 'img' && (missingImage || !seen.has('src'))) {
      output += '<span class="image-unavailable">Image unavailable in the source snapshot' + (imageAlt ? ': ' + escapeHTML(imageAlt) : '') + '</span>';
      continue;
    }
    if (tag === 'a') attributes += ' rel="noopener noreferrer"';
    if (tag === 'img' && !seen.has('loading')) attributes += ' loading="lazy"';
    if (tag === 'button' && !seen.has('type')) attributes += ' type="button"';
    output += '<' + tag + attributes + '>';
  }
  return output;
}

function renderMath(tex, displayMode) {
  try {
    return katex.renderToString(tex, { displayMode, throwOnError: false, strict: 'warn', trust: false, maxExpand: 1000, maxSize: 30, output: 'htmlAndMathml' });
  } catch {
    return '<code class="math-error">' + escapeHTML(tex) + '</code>';
  }
}

function renderStoredMath(html) {
  return html.replace(/<(div|span)\b([^>]*\bdata-math="(display|inline)"[^>]*)>([^<]*)<\/\1>/gi, (whole, tag, attributes, mode, tex) => {
    if (/\bdata-math-rendered(?:=|\s|$)/.test(attributes)) return whole;
    return '<' + tag + attributes + ' data-math-rendered="true">' + renderMath(decodeEntities(tex), mode === 'display') + '</' + tag + '>';
  });
}

function inlineMathAt(source) {
  if (source[0] !== '$' || source[1] === '$' || !source[1] || /\s/.test(source[1])) return null;
  for (let end = 1; end < source.length; end++) {
    if (source[end] === '\\') { end++; continue; }
    if (source[end] === '\n') return null;
    if (source[end] !== '$') continue;
    if (/\s/.test(source[end - 1]) || /[\w$]/.test(source[end + 1] || '')) return null;
    const tex = source.slice(1, end);
    if (/^[\d.,]+[kmb]?$/i.test(tex)) return null;
    return { type: 'inlineMath', raw: source.slice(0, end + 1), text: tex };
  }
  return null;
}

function sourceCode(text, language) {
  const normalized = aliases[language] || language;
  let code = escapeHTML(text);
  if (normalized && hljs.getLanguage(normalized)) {
    try { code = hljs.highlight(text, { language: normalized, ignoreIllegals: true }).value; } catch { /* Preserve the source if a grammar cannot parse it. */ }
  }
  return '<div class="code-block"><div class="code-label"><span>' + escapeHTML(language || 'text') + '</span><button class="copy-code" type="button" aria-label="Copy code">Copy</button></div><pre><code class="hljs language-' + escapeHTML(normalized || 'plaintext') + '">' + code + '</code></pre></div>\n';
}

function tokenText(tokens = []) {
  return tokens.map(token => token.tokens ? tokenText(token.tokens) : token.type === 'html' ? '' : decodeEntities(token.text ?? token.raw ?? '')).join('');
}

function outline(html) {
  const slugger = new GithubSlugger();
  const headings = [];
  const result = html.replace(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi, (_, depth, attributes, contents) => {
    const existing = /\sid="([^"]*)"/i.exec(attributes);
    const text = decodeEntities(contents.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
    const id = slugger.slug((existing ? decodeEntities(existing[1]) : text) || 'section');
    headings.push({ id, text, depth: Number(depth) });
    return '<h' + depth + attributes.replace(/\sid="[^"]*"/gi, '') + ' id="' + escapeHTML(id) + '">' + contents + '</h' + depth + '>';
  });
  return { html: result, headings };
}

export function renderContent(text, path, catalog = {}) {
  canonicalPath(path);
  const prebuilt = catalog.rendered?.[path];
  if (prebuilt != null) return outline(renderStoredMath(sanitizeHTML(typeof prebuilt === 'string' ? prebuilt : prebuilt.html || '', path, catalog)));
  if (!/\.(?:md|markdown)$/i.test(path)) {
    if (/\.svg$/i.test(path)) return { html: '<figure class="source-svg">' + sanitizeHTML(text, path, catalog) + '</figure>' + sourceCode(text, 'xml'), headings: [] };
    const extension = path.split('.').at(-1).toLowerCase();
    return { html: sourceCode(text, extension === path.toLowerCase() ? 'text' : extension), headings: [] };
  }
  const headingTexts = new Map();
  let headingNumber = 0;
  let capturedOrigin;
  const parser = new Marked({ gfm: true, breaks: false });
  parser.use({
    extensions: [
      {
        name: 'displayMath', level: 'block',
        start(source) { const position = source.search(/^\s*\$\$/m); return position < 0 ? undefined : position; },
        tokenizer(source) {
          const match = /^ {0,3}\$\$([^\n]*?)\$\$[ \t]*(?:\n|$)/.exec(source) || /^ {0,3}\$\$[ \t]*\n([\s\S]*?)\n {0,3}\$\$[ \t]*(?:\n|$)/.exec(source);
          if (match) return { type: 'displayMath', raw: match[0], text: match[1].trim() };
        },
        renderer(token) { return '<div class="math-display">' + renderMath(token.text, true) + '</div>\n'; }
      },
      {
        name: 'inlineMath', level: 'inline',
        start(source) {
          for (let at = 0; at < source.length; at++) {
            if (source[at] === '\\') { at++; continue; }
            if (source[at] === '$' && !/[\w$]/.test(source[at - 1] || '') && inlineMathAt(source.slice(at))) return at;
          }
        },
        tokenizer(source, tokens) {
          const preceding = tokens.at(-1)?.raw || '';
          if (/[\w$]$/.test(preceding)) return;
          return inlineMathAt(source) || undefined;
        },
        renderer(token) { return '<span class="math-inline">' + renderMath(token.text, false) + '</span>'; }
      }
    ],
    renderer: {
      html({ text: raw }) {
        if (/\/research\/sources\//.test(path)) {
          const pages = [...raw.matchAll(/<!--\s*page:\s*(https?:\/\/[^\s>]+)[\s\S]*?-->/g)];
          if (pages.length) {
            try {
              const url = new URL(pages.at(-1)[1]);
              if (!url.username && !url.password && /^https?:$/.test(url.protocol)) capturedOrigin = url.href;
            } catch { /* A malformed provenance comment cannot change the URL base. */ }
          }
        }
        return sanitizeHTML(raw, path, catalog, capturedOrigin);
      },
      heading({ tokens, depth }) {
        const key = 'aifs-heading-' + headingNumber++;
        headingTexts.set(key, tokenText(tokens));
        return '<h' + depth + ' data-heading-key="' + key + '">' + this.parser.parseInline(tokens) + '</h' + depth + '>\n';
      },
      link({ href, title, tokens }) {
        const target = rewriteURL(href, path, catalog, false, capturedOrigin);
        const label = this.parser.parseInline(tokens);
        if (!target) return '<span class="reference-unavailable" title="Reference not included in the source snapshot">' + label + '</span>';
        return '<a href="' + escapeHTML(target) + '"' + (title ? ' title="' + escapeHTML(title) + '"' : '') + (/^https?:\/\//.test(target) ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + label + '</a>';
      },
      image({ href, title, text: alt }) {
        const target = rewriteURL(href, path, catalog, true, capturedOrigin);
        return target ? '<img src="' + escapeHTML(target) + '" alt="' + escapeHTML(decodeEntities(alt)) + '"' + (title ? ' title="' + escapeHTML(title) + '"' : '') + ' loading="lazy" decoding="async">' : '<span class="image-unavailable">Image unavailable in the source snapshot' + (alt ? ': ' + escapeHTML(alt) : '') + '</span>';
      },
      code({ text: code, lang }) {
        const language = (lang || '').split(/\s+/)[0].toLowerCase();
        if (language === 'math') return '<div class="math-display">' + renderMath(code, true) + '</div>\n';
        if (language === 'figure') return '<div class="lesson-figure" data-figure="' + escapeHTML(code.trim()) + '"><p class="figure-status">Loading interactive figure: ' + escapeHTML(code.trim().split(/\s+/)[0]) + '…</p></div>\n';
        if (language === 'mermaid') return '<figure class="curriculum-diagram"><div class="curriculum-diagram-viewport" role="region" aria-label="Scrollable diagram" tabindex="0"><div class="diagram-output" aria-label="Diagram"></div></div><p class="diagram-status" role="status" hidden></p><details class="diagram-source" open><summary>Diagram source</summary><pre><code class="language-mermaid">' + escapeHTML(code) + '</code></pre></details></figure>\n';
        return sourceCode(code, language);
      }
    }
  });
  const html = parser.parse(String(text));
  const slugger = new GithubSlugger();
  const headings = [];
  const outlined = html.replace(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi, (_, depth, attributes, contents) => {
    const key = /\sdata-heading-key="([^"]*)"/.exec(attributes)?.[1];
    const existing = /\sid="([^"]*)"/.exec(attributes)?.[1];
    const headingText = headingTexts.get(key) ?? decodeEntities(contents.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
    const id = slugger.slug(existing || headingText || 'section');
    headings.push({ id, text: headingText, depth: Number(depth) });
    return '<h' + depth + attributes.replace(/\s(?:data-heading-key|id)="[^"]*"/g, '') + ' id="' + escapeHTML(id) + '">' + contents + '</h' + depth + '>';
  });
  return { html: outlined, headings };
}

const scripts = new Map();
function loadScript(url) {
  if (scripts.has(url)) return scripts.get(url);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { script.remove(); scripts.delete(url); reject(new Error('Could not load ' + url)); };
    document.head.appendChild(script);
  });
  scripts.set(url, promise);
  return promise;
}

const roots = new WeakMap();

/** Mount imported widgets in this article; release timers/listeners on navigation. */
export async function hydrateContent(element) {
  if (!element || typeof window === 'undefined') return () => {};
  roots.get(element)?.();
  let disposed = false;
  let cleanupDiagrams;
  const timers = new Set();
  const copyLabels = new WeakMap();
  const copyTimers = new WeakMap();
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    cleanupDiagrams?.();
    element.removeEventListener('click', action);
    element.removeEventListener('keydown', keyboardAction);
    timers.forEach(timer => clearTimeout(timer));
    window.AIFSFigureRuntime?.disposeRoot(element);
    if (roots.get(element) === cleanup) roots.delete(element);
  };
  roots.set(element, cleanup);
  const active = () => !disposed && element.isConnected;
  async function action(event) {
    const control = event.target.closest?.('[data-print], [data-copy], .copy-code, .cs-cmd');
    if (!control || !element.contains(control)) return;
    if (control.hasAttribute('data-print')) { window.print?.(); return; }
    const command = control.classList.contains('cs-cmd');
    const code = control.closest('.code-block')?.querySelector('pre code');
    const text = control.getAttribute('data-copy') ?? (command ? control.textContent : code?.textContent);
    if (text == null) return;
    if (!copyLabels.has(control)) copyLabels.set(control, control.textContent);
    const label = copyLabels.get(control);
    try {
      await navigator.clipboard.writeText(text);
      if (active()) {
        control.classList.add('is-copied');
        control.setAttribute('aria-label', 'Copied to clipboard');
        if (!command) control.textContent = 'Copied';
        const priorTimer = copyTimers.get(control);
        if (priorTimer) { clearTimeout(priorTimer); timers.delete(priorTimer); }
        const timer = setTimeout(() => {
          timers.delete(timer);
          copyTimers.delete(control);
          if (!active()) return;
          control.classList.remove('is-copied');
          control.setAttribute('aria-label', command ? 'Copy command' : 'Copy code');
          if (!command) control.textContent = label;
        }, 1400);
        copyTimers.set(control, timer);
        timers.add(timer);
      }
    } catch {
      if (active() && !command) control.textContent = 'Select code to copy';
    }
  }
  function keyboardAction(event) {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.closest?.('.cs-cmd')) {
      event.preventDefault();
      void action(event);
    }
  }
  element.querySelectorAll('.cs-cmd').forEach(command => {
    command.setAttribute('role', 'button');
    command.setAttribute('tabindex', '0');
    command.setAttribute('aria-label', 'Copy command');
  });
  element.addEventListener('click', action);
  element.addEventListener('keydown', keyboardAction);
  const tasks = [];
  if (element.querySelector('.lesson-figure[data-figure]')) tasks.push((async () => {
    try {
      await loadScript('./assets/figure-manifest.js');
      if (!active()) return;
      if (!window.mountLessonFigures) await loadScript(contentURL('site/lesson-figures.js'));
      if (!active()) return;
      await window.AIFS_loadFigureProviders(element);
      if (!active()) return;
      element.querySelectorAll('.lesson-figure .figure-status').forEach(status => status.remove());
      window.mountLessonFigures(element);
      element.querySelectorAll('.lesson-figure').forEach(host => {
        if (!host.dataset.lfMounted && !host.querySelector('.figure-status')) {
          const status = document.createElement('p');
          status.className = 'figure-status';
          status.textContent = 'Interactive figure unavailable: ' + host.dataset.figure.split(/\s+/)[0] + '. The lesson and source remain available.';
          host.appendChild(status);
        }
      });
    } catch {
      if (active()) element.querySelectorAll('.figure-status').forEach(status => { status.textContent = 'The interactive figure could not load. Reload to try again.'; });
    }
  })());
  const diagrams = [...element.querySelectorAll('.curriculum-diagram')];
  if (diagrams.length) tasks.push((async () => {
    try {
      const { mountCurriculumDiagrams } = await import('./diagram-mount.mjs');
      if (!active()) return;
      cleanupDiagrams = mountCurriculumDiagrams(element);
    } catch { /* Diagram source is the accessible offline fallback. */ }
  })());
  await Promise.allSettled(tasks);
  return cleanup;
}
