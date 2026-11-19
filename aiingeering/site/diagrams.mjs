import { detectType, load, parse, render } from 'pele/lazy';

export const CURRICULUM_DIAGRAM_LIMITS = Object.freeze({
  source: 16000, edges: 128, output: 200000, dimension: 16384,
  area: 32000000, minWidth: 160, maxWidth: 1600,
});

function prepareSource(source) {
  if (typeof source !== 'string' || !source.trim()) throw new TypeError('A diagram source is required');
  if (source.length > CURRICULUM_DIAGRAM_LIMITS.source) throw new RangeError('Diagram source exceeds the size limit');
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(source)) throw new TypeError('Unsupported diagram control character');
  let ignoredConfiguration = false;
  // Imported READMEs set their old site's theme here. Discard presentation
  // metadata, rather than allowing source config to override our safe config.
  const text = source.replace(/(^|\n)[\t ]*%%\{([\s\S]*?)\}%%[\t ]*(?=\n|$)/g, (_, newline, body) => {
    if (!/^\s*init\s*:/.test(body) || /\b(?:securityLevel|startOnLoad|htmlLabels|secure|maxEdges|limit|outputLimit|links|images|icons)\b/i.test(body)) {
      throw new TypeError('Unsupported diagram configuration');
    }
    ignoredConfiguration = true;
    return newline;
  });
  if (/%%\{|^\s*---(?:\r?\n|$)/.test(text)) throw new TypeError('Unsupported diagram configuration');
  // Diagrams are local illustrations, never navigation, callbacks or assets.
  // Benign <br>/<sub> labels remain text rendered by Pele, without HTML labels.
  if (/(?:^|[\n;])\s*(?:click|links?|href)\b/i.test(text)
    || /@\{[^}]*\b(?:img|image|icon)\s*:/i.test(text)
    || /::icon\s*\(|\b(?:fa[bslrd]?|mdi|logos):/i.test(text)
    || /!\[[^\]]*\]\s*\(/.test(text)
    || /<\/?(?:a|script|style|iframe|object|embed|foreignobject|image|img|svg|use|link)\b/i.test(text)
    || /<[^>]*\bon\w+\s*=/i.test(text)
    || /\b(?:javascript|vbscript)\s*:/i.test(text)
    || /url\s*\(/i.test(text)) throw new TypeError('Diagram links, assets and executable markup are disabled');
  return { text, ignoredConfiguration };
}

/** Quote only simple, unquoted square-node labels that contain a literal @. */
function quoteAtLabels(source) {
  let result = '';
  for (let index = 0; index < source.length;) {
    // A label or comment containing something that resembles node syntax is
    // not a node declaration. Leave it byte-for-byte unchanged.
    if (source.startsWith('%%', index)) {
      const end = source.indexOf('\n', index);
      if (end === -1) return result + source.slice(index);
      result += source.slice(index, end + 1); index = end + 1; continue;
    }
    if (source[index] === '"' || source[index] === '`') {
      const quote = source[index]; let end = index + 1;
      while (end < source.length && (source[end] !== quote || source[end - 1] === '\\')) end++;
      result += source.slice(index, end + 1); index = end + 1; continue;
    }
    if (source[index] === '[' && /[\w-]/.test(source[index - 1] || '') && source[index - 2] !== '[') {
      const end = source.indexOf(']', index + 1);
      const label = end === -1 ? '' : source.slice(index + 1, end);
      if (label.includes('@') && !/[\[\]"'`\\\r\n]/.test(label)) {
        result += `["${label}"]`; index = end + 1; continue;
      }
    }
    result += source[index++];
  }
  return result;
}

function checkedResult(result) {
  const { svg, width, height } = result;
  const limits = CURRICULUM_DIAGRAM_LIMITS;
  if (typeof svg !== 'string' || svg.length > limits.output
    || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0
    || width > limits.dimension || height > limits.dimension || width * height > limits.area) {
    throw new RangeError('Diagram output exceeds the size limit');
  }
  if (!svg.startsWith('<svg ') || /<(?:a|script|style|foreignobject|image|img|iframe|object|embed)\b/i.test(svg)
    || /\son[a-z]+\s*=/i.test(svg)
    || /\s(?:href|xlink:href|src)\s*=\s*["'](?!#)/i.test(svg)
    || result.links?.length) throw new TypeError('Unsafe diagram output');
  for (const match of svg.matchAll(/url\(\s*([^)]*)\)/gi)) {
    if (!/^#[\w:.-]+$/.test(match[1].trim().replace(/^["']|["']$/g, ''))) throw new TypeError('Unsafe diagram output');
  }
  return result;
}

function inheritedDirections(model, direction) {
  const groups = new Map(model.subgraphs.map(group => [group.id, group]));
  const parents = new Map();
  for (const group of model.subgraphs) for (const id of group.nodes) if (groups.has(id)) parents.set(id, group);
  return model.subgraphs.map(group => {
    let current = group;
    const visited = new Set();
    while (current && !visited.has(current.id)) {
      if (current.dir) return current.dir;
      visited.add(current.id); current = parents.get(current.id);
    }
    return direction;
  });
}

// CSS named sRGB values: https://www.w3.org/TR/css-color-4/#named-colors
// Pele 1.6 accepts hex/keyword style values; functional rgb()/hsl() syntax is
// rejected by its flowchart parser before this presentation adjustment runs.
const namedColors = new Map(`
aliceblue:f0f8ff antiquewhite:faebd7 aqua:00ffff aquamarine:7fffd4 azure:f0ffff beige:f5f5dc bisque:ffe4c4 black:000000
blanchedalmond:ffebcd blue:0000ff blueviolet:8a2be2 brown:a52a2a burlywood:deb887 cadetblue:5f9ea0 chartreuse:7fff00 chocolate:d2691e
coral:ff7f50 cornflowerblue:6495ed cornsilk:fff8dc crimson:dc143c cyan:00ffff darkblue:00008b darkcyan:008b8b darkgoldenrod:b8860b
darkgray:a9a9a9 darkgreen:006400 darkgrey:a9a9a9 darkkhaki:bdb76b darkmagenta:8b008b darkolivegreen:556b2f darkorange:ff8c00 darkorchid:9932cc
darkred:8b0000 darksalmon:e9967a darkseagreen:8fbc8f darkslateblue:483d8b darkslategray:2f4f4f darkslategrey:2f4f4f darkturquoise:00ced1 darkviolet:9400d3
deeppink:ff1493 deepskyblue:00bfff dimgray:696969 dimgrey:696969 dodgerblue:1e90ff firebrick:b22222 floralwhite:fffaf0 forestgreen:228b22
fuchsia:ff00ff gainsboro:dcdcdc ghostwhite:f8f8ff gold:ffd700 goldenrod:daa520 gray:808080 green:008000 greenyellow:adff2f grey:808080
honeydew:f0fff0 hotpink:ff69b4 indianred:cd5c5c indigo:4b0082 ivory:fffff0 khaki:f0e68c lavender:e6e6fa lavenderblush:fff0f5
lawngreen:7cfc00 lemonchiffon:fffacd lightblue:add8e6 lightcoral:f08080 lightcyan:e0ffff lightgoldenrodyellow:fafad2 lightgray:d3d3d3 lightgreen:90ee90
lightgrey:d3d3d3 lightpink:ffb6c1 lightsalmon:ffa07a lightseagreen:20b2aa lightskyblue:87cefa lightslategray:778899 lightslategrey:778899 lightsteelblue:b0c4de
lightyellow:ffffe0 lime:00ff00 limegreen:32cd32 linen:faf0e6 magenta:ff00ff maroon:800000 mediumaquamarine:66cdaa mediumblue:0000cd
mediumorchid:ba55d3 mediumpurple:9370db mediumseagreen:3cb371 mediumslateblue:7b68ee mediumspringgreen:00fa9a mediumturquoise:48d1cc mediumvioletred:c71585 midnightblue:191970
mintcream:f5fffa mistyrose:ffe4e1 moccasin:ffe4b5 navajowhite:ffdead navy:000080 oldlace:fdf5e6 olive:808000 olivedrab:6b8e23
orange:ffa500 orangered:ff4500 orchid:da70d6 palegoldenrod:eee8aa palegreen:98fb98 paleturquoise:afeeee palevioletred:db7093 papayawhip:ffefd5
peachpuff:ffdab9 peru:cd853f pink:ffc0cb plum:dda0dd powderblue:b0e0e6 purple:800080 rebeccapurple:663399 red:ff0000
rosybrown:bc8f8f royalblue:4169e1 saddlebrown:8b4513 salmon:fa8072 sandybrown:f4a460 seagreen:2e8b57 seashell:fff5ee sienna:a0522d
silver:c0c0c0 skyblue:87ceeb slateblue:6a5acd slategray:708090 slategrey:708090 snow:fffafa springgreen:00ff7f steelblue:4682b4
tan:d2b48c teal:008080 thistle:d8bfd8 tomato:ff6347 turquoise:40e0d0 violet:ee82ee wheat:f5deb3 white:ffffff whitesmoke:f5f5f5 yellow:ffff00 yellowgreen:9acd32
`.trim().split(/\s+/).map(entry => entry.split(':')));

function literalColor(value) {
  const named = namedColors.get(value.toLowerCase());
  let hex = named || value.match(/^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i)?.[1];
  if (!hex) return null;
  if (hex.length < 5) hex = [...hex].map(digit => digit + digit).join('');
  return { rgb: [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16)), alpha: hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1 };
}

function authoredStyle(declarations) {
  const style = new Map();
  // Match Pele's safe-declaration handling and last-declaration precedence.
  for (const declaration of declarations) {
    const colon = declaration.indexOf(':');
    if (colon < 1) continue;
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1).replace(/!important/gi, '').trim();
    if (value && !/url\s*\(|expression\s*\(|javascript:|[<>{};\\]|@import|image-set|\/\*/i.test(value)) style.set(property, value);
  }
  return style;
}

function opaque(value) {
  if (value === undefined) return true;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)%?$/.test(value)) return false;
  return Number.parseFloat(value) / (value.endsWith('%') ? 100 : 1) >= 1;
}

function contrastFlowLabels(model) {
  const groups = new Map(model.subgraphs.map(group => [group.id, group]));
  const objects = new Map([...model.nodes, ...model.subgraphs.filter(group => !model.nodes.has(group.id)).map(group => [group.id, group])]);
  let contrastAdjustments = 0;
  const unresolvedFills = [];
  for (const [id, object] of objects) {
    const group = groups.has(id);
    const classes = group ? object.classes : ['default', 'node', ...object.classes];
    const declarations = classes.flatMap(name => {
      const definition = model.classes.get(name);
      return [...definition?.styles || [], ...definition?.textStyles || []];
    }).concat(object.styles || []);
    const style = authoredStyle(declarations);
    const fill = style.get('fill');
    if (!fill || fill === 'none' || style.has('color')) continue;
    const color = literalColor(fill);
    const styledNode = () => {
      let node = model.nodes.get(id);
      if (!node) {
        node = { id, labelType: object.labelType, styles: [], classes: [...object.classes] };
        model.nodes.set(id, node);
      }
      return node;
    };
    if (!color || color.alpha !== 1 || !opaque(style.get('fill-opacity')) || !opaque(style.get('opacity'))) {
      unresolvedFills.push({ id, fill, reason: !color ? 'context-dependent-or-unsupported-color' : 'authored-transparency' });
      // Transparent clusters retain the authored overlay. Use the reader's
      // foreground (ordinary nodes already inherit it), not a guessed opaque
      // black/white pair or Pele's lower-contrast muted cluster-title color.
      if (group && color?.alpha < 1) styledNode().styles.push('color:var(--_fg)');
      continue;
    }
    // WCAG sRGB relative luminance, rather than a brightness approximation:
    // https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
    const linear = color.rgb.map(channel => channel / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    const foreground = (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000' : '#fff';
    const node = styledNode();
    node.styles.push(`color:${foreground}`);
    // Pele gives clusters an implicit half-transparent fill. Use the authored
    // opaque color for its paired title; preserve any authored opacity instead.
    if (group && !style.has('fill-opacity')) node.styles.push('fill-opacity:1');
    contrastAdjustments++;
  }
  return { contrastAdjustments, unresolvedFills };
}

/** Render at readable SVG dimensions; the mounting element owns overflow. */
export async function renderCurriculumDiagram(source, { width = 720, idPrefix = 'curriculum', signal } = {}) {
  signal?.throwIfAborted();
  const { text, ignoredConfiguration } = prepareSource(source);
  const limits = CURRICULUM_DIAGRAM_LIMITS;
  const availableWidth = Math.min(limits.maxWidth, Math.max(limits.minWidth, Number.isFinite(width) ? width : 720));
  const prefix = String(idPrefix).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'curriculum';
  const options = {
    idPrefix: /^[a-zA-Z]/.test(prefix) ? prefix : `curriculum-${prefix}`,
    maxWidth: availableWidth, responsive: false, autoDirection: true, directionBreakpoint: limits.maxWidth + 1,
    fontFamily: 'system-ui, sans-serif', fontSize: 14, padding: 12,
    links: false, images: false, icons: () => null,
    maxEdges: limits.edges, limit: limits.source, outputLimit: limits.output,
    config: { htmlLabels: false, flowchart: {
      htmlLabels: false, wrappingWidth: Math.min(160, Math.max(100, (availableWidth - 112) / 2)),
      nodeSpacing: 32, rankSpacing: 44,
    } },
  };
  const type = detectType(text);
  const supported = await load(type);
  signal?.throwIfAborted();
  if (!supported) throw new TypeError('Unsupported diagram type');
  let model; let adaptedLabels = false;
  try { model = parse(text, options); }
  catch (error) {
    // Pele 1.6 treats @ in a few unquoted labels as an edge-id token. Quoting
    // that literal text is lossless; never repair other syntax or change labels.
    if (type !== 'flowchart' || error.code !== 'syntax' || !error.message.includes("got 'LINK_ID'")) throw error;
    const compatible = quoteAtLabels(text);
    if (compatible === text) throw error;
    model = parse(compatible, options); adaptedLabels = true;
  }
  const contrast = type === 'flowchart' ? contrastFlowLabels(model) : { contrastAdjustments: 0, unresolvedFills: [] };
  const candidates = []; const errors = [];
  const attempt = () => {
    try { candidates.push(checkedResult(render(model, options))); }
    catch (error) { errors.push(error); }
  };
  if (type === 'flowchart') {
    options.autoDirection = false;
    const direction = model.direction;
    const groupDirections = model.subgraphs.map(group => group.dir);
    const inherited = inheritedDirections(model, direction || 'TD');
    try {
      attempt();
      if (['TD', 'TB', 'LR', undefined].includes(direction)) {
        model.direction = direction === 'LR' ? 'TD' : 'LR'; attempt();
        if (model.subgraphs.some(group => !group.dir)) {
          // Swapping the outer layout can stack independent subgraphs. Preserve
          // their authored internal direction instead of rotating their chains.
          model.subgraphs.forEach((group, index) => { group.dir = inherited[index]; }); attempt();
        }
      }
    } finally {
      model.direction = direction;
      model.subgraphs.forEach((group, index) => { group.dir = groupDirections[index]; });
    }
  } else attempt();
  if (!candidates.length) throw errors[0] || new TypeError('Diagram could not be rendered');
  const fitting = candidates.filter(candidate => candidate.width <= availableWidth);
  const best = (fitting.length ? fitting : candidates).reduce((best, candidate) => {
    const score = fitting.length ? candidate.height - best.height : candidate.width - best.width;
    return score < 0 || score === 0 && candidate.width * candidate.height < best.width * best.height ? candidate : best;
  });
  return { ...best, availableWidth, overflow: best.width > availableWidth, adaptedLabels, ignoredConfiguration, ...contrast };
}
