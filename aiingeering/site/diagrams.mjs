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

/** Render at readable SVG dimensions; the mounting element owns overflow. */
export async function renderCurriculumDiagram(source, { width = 720, idPrefix = 'curriculum' } = {}) {
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
  if (!await load(type)) throw new TypeError('Unsupported diagram type');
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
  return { ...best, availableWidth, overflow: best.width > availableWidth, adaptedLabels, ignoredConfiguration };
}
