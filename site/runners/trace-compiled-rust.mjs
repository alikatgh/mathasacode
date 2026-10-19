import { rewriteNode, originalText, sourceLine } from './trace-compiled.mjs';

function runtime(prefix, marker, limits) {
  const literal = JSON.stringify(marker).replace('\\u001e', '\\x1e');
  return `\n#[allow(dead_code)] mod ${prefix} {\n` +
`use std::sync::Mutex; struct State{frames:usize,bytes:usize,stopped:bool} static STATE:Mutex<State>=Mutex::new(State{frames:0,bytes:0,stopped:false});\n` +
`fn preview(s:&str)->String{if s.len()<=240{s.to_string()}else{s.chars().take(237).collect::<String>()+"..."}}\n` +
`fn escaped(s:&str)->String{let mut out=String::new();for c in s.chars(){match c{'"'=>out.push_str("\\\\\\\""),'\\\\'=>out.push_str("\\\\\\\\"),'\\n'=>out.push_str("\\\\n"),'\\r'=>out.push_str("\\\\r"),'\\t'=>out.push_str("\\\\t"),c if c<' '=>out.push_str(&format!("\\\\u{:04x}",c as u32)),c=>out.push(c)}}out}\n` +
`fn truncate(state:&mut State,line:usize){if !state.stopped{let text=format!("{}{{\\\"line\\\":{},\\\"event\\\":\\\"truncated\\\",\\\"truncated\\\":true,\\\"locals\\\":{{}}}}\\n",${literal},line);if state.bytes+text.len()<=${limits.traceBytes}{use std::io::Write;let _=std::io::stdout().write_all(text.as_bytes());}state.stopped=true;}}\n` +
`pub fn active(line:usize)->bool{if let Ok(mut s)=STATE.lock(){if s.stopped{return false}if s.frames>=${limits.frames - 1}{truncate(&mut s,line);return false}true}else{false}}\n` +
`pub fn emit(line:usize,event:&str,values:&[(&str,String)]){if let Ok(mut s)=STATE.lock(){if s.stopped{return}if s.frames>=${limits.frames - 1}{truncate(&mut s,line);return}let pairs:Vec<String>=values.iter().map(|(k,v)|format!("\\\"{}\\\":\\\"{}\\\"",escaped(k),escaped(&preview(v)))).collect();let text=format!("{}{{\\\"line\\\":{},\\\"event\\\":\\\"{}\\\",\\\"locals\\\":{{{}}}}}\\n",${literal},line,event,pairs.join(","));if s.bytes+text.len()>${limits.traceBytes - 200}{truncate(&mut s,line);return}use std::io::Write;let _=std::io::stdout().write_all(text.as_bytes());s.frames+=1;s.bytes+=text.len();}}\n}\n`;
}

export function instrumentRust(context) {
  const { source, root, nodes, prefix, markerPrefix, limits } = context;
  const warnings = new Set();
  const lines = new Set();
  const text = node => originalText(context, node);
  const unsupported = new Set(['async_block', 'await_expression', 'unsafe_block', 'macro_definition', 'yield_expression']);
  for (const node of nodes) if (unsupported.has(node.type)) throw new Error(`Rust Trace does not yet support ${node.type.replaceAll('_', ' ')}; use Run for this edited source.`);
  function typeKind(node) {
    if (!node) return null;
    if (node.type === 'primitive_type' && /^(?:[iu](?:8|16|32|64|128|size)|f(?:32|64)|bool)$/.test(text(node))) return { type: 'number', size: 1 };
    if (node.type === 'array_type') {
      const element = typeKind(node.childForFieldName('element'));
      const length = node.childForFieldName('length');
      const size = length?.type === 'integer_literal' ? Number(text(length)) : NaN;
      return element && Number.isSafeInteger(size) && size >= 0 && element.size * size <= limits.arrayElements ? { type: 'array', element, size: element.size * size } : null;
    }
    if (node.type === 'tuple_type') {
      const elements = node.namedChildren.map(typeKind);
      return elements.every(Boolean) && elements.reduce((sum, kind) => sum + kind.size, 0) <= limits.arrayElements ? { type: 'tuple', elements, size: elements.reduce((sum, kind) => sum + kind.size, 0) } : null;
    }
    return null;
  }
  function infer(node, env) {
    if (!node) return null;
    if (['integer_literal', 'float_literal', 'boolean_literal'].includes(node.type)) return { type: 'number', size: 1 };
    if (node.type === 'identifier') return env.get(text(node)) || null;
    if (node.type === 'type_cast_expression') return typeKind(node.childForFieldName('type'));
    if (['parenthesized_expression', 'unary_expression'].includes(node.type)) return infer(node.namedChildren.at(-1), env);
    if (node.type === 'binary_expression') return node.namedChildren.every(child => infer(child, env)?.type === 'number') ? { type: 'number', size: 1 } : null;
    if (node.type === 'array_expression') {
      const length = node.childForFieldName('length');
      const children = node.namedChildren.filter(child => child.id !== length?.id);
      const kinds = children.map(child => infer(child, env));
      const count = length ? Number(text(length)) : children.length;
      const element = kinds[0];
      return element && kinds.every(Boolean) && Number.isSafeInteger(count) && count >= 0 && count * element.size <= limits.arrayElements ? { type: 'array', element, size: count * element.size } : null;
    }
    if (node.type === 'tuple_expression') {
      const elements = node.namedChildren.map(child => infer(child, env));
      const size = elements.reduce((sum, value) => sum + (value?.size || 0), 0);
      return elements.every(Boolean) && size <= limits.arrayElements ? { type: 'tuple', elements, size } : null;
    }
    if (node.type === 'index_expression') return infer(node.namedChildren[0], env)?.element || null;
    if (node.type === 'field_expression') {
      const target = infer(node.childForFieldName('value'), env);
      const field = node.childForFieldName('field');
      return field?.type === 'integer_literal' ? target?.elements?.[Number(text(field))] || null : null;
    }
    if (node.type === 'call_expression') {
      // Name resolution can select a local closure, nested function, or trait
      // method whose return type is custom, even for a primitive receiver. A
      // spelling such as `sqrt` is no type guarantee. Only an explicit checked
      // annotation may make an otherwise-unknown call result snapshot-safe.
      return null;
    }
    if (node.type === 'scoped_identifier' && /^(?:std::)?(?:f32|f64)::(?:consts::)?[A-Z_0-9]+$/.test(text(node))) return { type: 'number', size: 1 };
    return null;
  }
  function bind(pattern, kind, env) {
    if (!pattern) return;
    if (pattern.type === 'identifier') { env.delete(text(pattern)); if (kind) env.set(text(pattern), kind); else warnings.add('Rust snapshots omit custom/borrowed types and values whose numeric shape is not statically known.'); return; }
    if (['mut_pattern', 'reference_pattern'].includes(pattern.type)) { bind(pattern.namedChildren.at(-1), kind, env); return; }
    if (['tuple_pattern', 'slice_pattern'].includes(pattern.type)) pattern.namedChildren.filter(child => child.type !== 'mutable_specifier').forEach((child, i) => bind(child, kind?.elements?.[i] || (kind?.type === 'array' ? kind.element : null), env));
  }
  function hook(node, env, event = 'line', extra = []) {
    const line = sourceLine(node); lines.add(line);
    const values = [...env.keys()].filter(name => name.length <= 256).slice(-limits.locals).map(name => [name, name]);
    values.push(...extra);
    return `if ${prefix}::active(${line}){${prefix}::emit(${line},"${event}",&[${values.map(([key, value]) => `(${JSON.stringify(key)},format!("{:?}",&(${value})))`).join(',')}]);}`;
  }
  function eraseMutableBorrows(node, env) {
    const pending = [node];
    while (pending.length) {
      const current = pending.pop();
      if (current.type === 'closure_expression') continue;
      if (current.type === 'reference_expression' && current.namedChildren.some(child => child.type === 'mutable_specifier')) {
        const value = current.namedChildren.at(-1);
        let base = value;
        while (base && ['index_expression', 'field_expression'].includes(base.type)) base = base.namedChildren[0];
        if (base?.type === 'identifier') { env.delete(text(base)); warnings.add('A mutably borrowed local is omitted to preserve Rust borrow semantics.'); }
      }
      pending.push(...current.namedChildren);
    }
  }
  function parameters(node) {
    const env = new Map();
    for (const parameter of node?.namedChildren || []) if (parameter.type === 'parameter') bind(parameter.childForFieldName('pattern'), typeKind(parameter.childForFieldName('type')), env);
    return env;
  }
  function expression(node, env) {
    if (node.type === 'closure_expression') {
      const body = node.childForFieldName('body');
      const local = parameters(node.childForFieldName('parameters'));
      warnings.add('Closure snapshots include their own known numeric locals; outer captures are omitted to preserve borrowing.');
      return rewriteNode(source, node, [[body, body.type === 'block' ? block(body, local) : `{${hook(body, local)}${expression(body, local)}}`]]);
    }
    if (node.type === 'block') return block(node, new Map(env));
    if (node.type === 'return_expression') {
      const value = node.namedChildren[0];
      const kind = infer(value, env);
      if (value && kind) {
        const temporary = `${prefix}_return_${node.startIndex}`;
        return `return {let ${temporary}=${expression(value, env)};${hook(node, env, 'return', [['(return)', temporary]])}${temporary}}`;
      }
      return `{${hook(node, env, 'return')}${rewriteNode(source, node, node.namedChildren.map(child => [child, expression(child, env)]))}}`;
    }
    if (['for_expression', 'while_expression', 'loop_expression'].includes(node.type)) {
      const local = new Map(env);
      if (node.type === 'for_expression') {
        const value = node.childForFieldName('value');
        let kind = value?.type === 'range_expression' ? { type: 'number', size: 1 } : null;
        // Iterator method names can also resolve to custom traits; do not infer
        // their item type from the receiver or invoke an unknown item's Debug.
        bind(node.childForFieldName('pattern'), kind, local);
      }
      return rewriteNode(source, node, node.namedChildren.map(child => [child, child.type === 'block' ? block(child, new Map(local), node) : expression(child, env)]));
    }
    if (node.type === 'function_item') {
      const body = node.childForFieldName('body');
      return rewriteNode(source, node, [[body, block(body, parameters(node.childForFieldName('parameters')))]]);
    }
    if (node.type === 'macro_invocation' || node.type === 'token_tree') return text(node);
    return rewriteNode(source, node, node.namedChildren.map(child => [child, expression(child, env)]));
  }
  function block(node, env, loopNode) {
    // Conservatively exclude a local throughout a block when an explicit mutable
    // reference may outlive a statement. Formatting may not add conflicting borrows.
    eraseMutableBorrows(node, env);
    const entryEnv = new Map(env);
    const children = node.namedChildren;
    const replacements = [];
    for (let index = 0; index < children.length; index++) {
      const child = children[index];
      if (['line_comment', 'block_comment', 'attribute_item', 'use_declaration', 'struct_item', 'impl_item', 'type_item', 'const_item', 'static_item'].includes(child.type)) {
        replacements.push([child, expression(child, env)]); continue;
      }
      if (child.type === 'let_declaration') {
        const value = child.childForFieldName('value');
        const kind = value ? typeKind(child.childForFieldName('type')) || infer(value, env) : null;
        const rewritten = expression(child, env);
        bind(child.childForFieldName('pattern'), kind, env);
        eraseMutableBorrows(child, env);
        replacements.push([child, `${rewritten}${hook(child, env)}`]);
      } else if (child.type === 'function_item') replacements.push([child, expression(child, env)]);
      else if (child.type === 'expression_statement') {
        const value = child.namedChildren[0];
        const returns = value?.type === 'return_expression';
        const controls = value && ['if_expression', 'for_expression', 'while_expression', 'loop_expression', 'match_expression', 'break_expression', 'continue_expression'].includes(value.type);
        const rewritten = expression(child, env);
        eraseMutableBorrows(child, env);
        replacements.push([child, returns ? rewritten : controls ? `${hook(child, env)}${rewritten}` : `${rewritten}${hook(child, env)}`]);
      } else {
        const kind = infer(child, env);
        const rewritten = expression(child, env);
        if (kind && index === children.length - 1) {
          const temporary = `${prefix}_tail_${child.startIndex}`;
          replacements.push([child, `{let ${temporary}=${rewritten};${hook(child, env, 'return', [['(return)', temporary]])}${temporary}}`]);
        } else replacements.push([child, `${hook(child, env)}${rewritten}`]);
      }
    }
    let result = rewriteNode(source, node, replacements);
    if (loopNode) result = `{${hook(loopNode, entryEnv)}${result.slice(1)}`;
    return result;
  }
  const rewritten = expression(root, new Map());
  return { source: rewritten + runtime(prefix, markerPrefix, limits), warnings: [...warnings], instrumentedLines: [...lines].sort((a, b) => a - b) };
}
