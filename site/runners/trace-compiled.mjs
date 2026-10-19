import { Parser, Language } from 'web-tree-sitter';
import { instrumentC } from './trace-compiled-c.mjs';
import { instrumentRust } from './trace-compiled-rust.mjs';

export const COMPILED_TRACE_LIMITS = Object.freeze({
  sourceBytes: 65536, outputBytes: 262144, astNodes: 16000, nesting: 100,
  frames: 500, traceBytes: 32768, locals: 12, arrayElements: 16, parserMemoryBytes: 64 * 1024 * 1024,
});

let initialization;
const grammars = new Map();
const bytes = value => value instanceof Uint8Array ? value : value instanceof ArrayBuffer ? new Uint8Array(value) : null;

function boundedNodes(root) {
  const nodes = [];
  const pending = [[root, 0]];
  while (pending.length) {
    const [node, depth] = pending.pop();
    if (depth > COMPILED_TRACE_LIMITS.nesting || nodes.length >= COMPILED_TRACE_LIMITS.astNodes) throw new Error('Trace syntax exceeds the bounded AST work limit.');
    nodes.push(node);
    for (const child of node.children) pending.push([child, depth + 1]);
  }
  return nodes;
}

export async function instrumentCompiledTrace(language, source, assets = {}) {
  if (!['c', 'rust'].includes(language)) throw new Error('Compiled tracing supports C and Rust.');
  if (typeof source !== 'string' || new TextEncoder().encode(source).length > COMPILED_TRACE_LIMITS.sourceBytes) throw new Error('Trace source is limited to 64 KB.');
  if (!initialization) {
    const binary = bytes(assets['trace-parser.wasm']);
    if (!binary) throw new Error('The local trace-parser.wasm asset is required.');
    const wasmMemory = new WebAssembly.Memory({ initial: 512, maximum: COMPILED_TRACE_LIMITS.parserMemoryBytes / 65536 });
    initialization = Parser.init({ wasmBinary: binary, wasmMemory }).catch(error => { initialization = undefined; throw error; });
  }
  await initialization;
  if (!grammars.has(language)) {
    const binary = bytes(assets[`trace-${language}.wasm`]);
    if (!binary) throw new Error(`The local trace-${language}.wasm asset is required.`);
    grammars.set(language, Language.load(binary).catch(error => { grammars.delete(language); throw error; }));
  }
  const parser = new Parser();
  parser.setLanguage(await grammars.get(language));
  let tree;
  try {
    let parseWork = 0;
    const parse = input => parser.parse(input, null, { progressCallback: () => { if (++parseWork > 2500) throw new Error('Trace parsing exceeded its work limit.'); } });
    tree = parse(source);
    if (!tree) throw new Error('The trace parser could not finish this source.');
    let nodes = boundedNodes(tree.rootNode);
    const masked = [];
    // complex.h defines `complex` as a type keyword. Tree-sitter does not run a
    // preprocessor; remove that keyword only in the parser view, not the source.
    if (language === 'c' && (nodes.some(node => node.type === 'system_lib_string' && node.text === '<complex.h>') || nodes.some(node => node.text === '_Complex'))) {
      for (const node of nodes) if (!node.childCount && ['complex', '_Complex'].includes(node.text)) masked.push([node.startIndex, node.endIndex]);
      if (masked.length) {
        let parserSource = source;
        for (const [start, end] of masked.sort((a, b) => b[0] - a[0])) parserSource = parserSource.slice(0, start) + ' '.repeat(end - start) + parserSource.slice(end);
        tree.delete();
        tree = parse(parserSource);
        if (!tree) throw new Error('The trace parser could not finish this source.');
        nodes = boundedNodes(tree.rootNode);
      }
    }
    if (tree.rootNode.hasError) throw new Error('Trace requires syntactically valid source supported by the C/Rust grammar. Run normally for compiler diagnostics.');
    const identifiers = new Set(nodes.filter(node => ['identifier', 'type_identifier', 'field_identifier'].includes(node.type)).map(node => node.text));
    let suffix = 0;
    let prefix;
    do { prefix = `mac_trace_${suffix++}`; } while ([...identifiers].some(name => name.startsWith(prefix)) || source.includes(`MAC_TRACE_${prefix}__`));
    const markerPrefix = `\u001eMAC_TRACE_${prefix}__`;
    const context = { source, root: tree.rootNode, nodes, prefix, markerPrefix, masked, limits: COMPILED_TRACE_LIMITS };
    const result = language === 'c' ? instrumentC(context) : instrumentRust(context);
    if (new TextEncoder().encode(result.source).length > COMPILED_TRACE_LIMITS.outputBytes) throw new Error('Instrumented source exceeds the 256 KB trace limit.');
    return { ...result, markerPrefix, limits: COMPILED_TRACE_LIMITS, originalLineCount: source.split('\n').length };
  } finally {
    tree?.delete();
    parser.delete();
  }
}

export function rewriteNode(source, node, replacements) {
  let result = '';
  let offset = node.startIndex;
  for (const [child, text] of replacements.sort((a, b) => a[0].startIndex - b[0].startIndex)) {
    if (child.startIndex < offset) throw new Error('Overlapping trace instrumentation.');
    result += source.slice(offset, child.startIndex) + text;
    offset = child.endIndex;
  }
  return result + source.slice(offset, node.endIndex);
}

export const originalText = (context, node) => context.source.slice(node.startIndex, node.endIndex);
export const sourceLine = node => node.startPosition.row + 1;
