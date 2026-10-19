import { rewriteNode, originalText, sourceLine } from './trace-compiled.mjs';

const integerType = text => /\b(?:char|short|int|long|signed|unsigned|_Bool|bool|size_t|ptrdiff_t)\b/.test(text);
const numericType = text => text.trim().split(/\s+/).every(token => /^(?:char|short|int|long|signed|unsigned|_Bool|bool|size_t|ptrdiff_t|float|double)$/.test(token));

function runtime(prefix, marker, limits) {
  const literal = JSON.stringify(marker).replace('\\u001e', '\\036');
  return `#include <stdio.h>\n#include <stdarg.h>\n#include <string.h>\n` +
`static unsigned ${prefix}_frames,${prefix}_bytes,${prefix}_stopped;\n` +
`static char ${prefix}_buf[2048]; static unsigned ${prefix}_pos,${prefix}_fields;\n` +
`static void ${prefix}_truncate(int line){if(!${prefix}_stopped){char b[180];int n=snprintf(b,sizeof b,"%s{\\"line\\":%d,\\"event\\":\\"truncated\\",\\"truncated\\":true,\\"locals\\":{}}\\n",${literal},line);if(n>0&&${prefix}_bytes+(unsigned)n<=${limits.traceBytes})fwrite(b,1,(size_t)n,stdout);${prefix}_stopped=1;}}\n` +
`static int ${prefix}_begin(int line,int ret){if(${prefix}_stopped)return 0;if(${prefix}_frames>=${limits.frames - 1}){${prefix}_truncate(line);return 0;}${prefix}_fields=0;${prefix}_pos=(unsigned)snprintf(${prefix}_buf,sizeof ${prefix}_buf,"%s{\\"line\\":%d,\\"event\\":\\"%s\\",\\"locals\\":{",${literal},line,ret?"return":"line");return 1;}\n` +
`static void ${prefix}_key(const char*name,char*out){unsigned pos=0;const char hex[]="0123456789abcdef";for(const unsigned char*p=(const unsigned char*)name;*p&&pos<1530;p++){unsigned c=*p;if(c==34||c==92){out[pos++]=92;out[pos++]=(char)c;}else if(c<32){out[pos++]=92;out[pos++]='u';out[pos++]='0';out[pos++]='0';out[pos++]=hex[c>>4];out[pos++]=hex[c&15];}else out[pos++]=(char)c;}out[pos]=0;}\n` +
`static void ${prefix}_add(const char*name,const char*value){if(${prefix}_pos>=sizeof ${prefix}_buf-1)return;char bounded[241],key[1537];${prefix}_key(name,key);if(strlen(value)>240){memcpy(bounded,value,237);memcpy(bounded+237,"...",4);value=bounded;}int n=snprintf(${prefix}_buf+${prefix}_pos,sizeof ${prefix}_buf-${prefix}_pos,"%s\\"%s\\":\\"%s\\"",${prefix}_fields++?",":"",key,value);if(n>0)${prefix}_pos+=(unsigned)n;}\n` +
`static void ${prefix}_n(const char*n,double v){char b[64];snprintf(b,sizeof b,"%.17g",v);${prefix}_add(n,b);}\n` +
`static void ${prefix}_i(const char*n,long long v){char b[64];snprintf(b,sizeof b,"%lld",v);${prefix}_add(n,b);}\n` +
`static void ${prefix}_u(const char*n,unsigned long long v){char b[64];snprintf(b,sizeof b,"%llu",v);${prefix}_add(n,b);}\n` +
`static void ${prefix}_a(const char*n,unsigned count,...){char b[640];unsigned pos=0;va_list ap;va_start(ap,count);b[pos++]='[';for(unsigned i=0;i<count&&pos<sizeof b-40;i++){int z=snprintf(b+pos,sizeof b-pos,"%s%.17g",i?", ":"",va_arg(ap,double));if(z>0)pos+=(unsigned)z;}va_end(ap);b[pos++]=']';b[pos]=0;${prefix}_add(n,b);}\n` +
`static void ${prefix}_end(int line){if(${prefix}_pos>=sizeof ${prefix}_buf-4){${prefix}_truncate(line);return;}memcpy(${prefix}_buf+${prefix}_pos,"}}\\n",4);${prefix}_pos+=3;if(${prefix}_bytes+${prefix}_pos>${limits.traceBytes - 200}){${prefix}_truncate(line);return;}fwrite(${prefix}_buf,1,${prefix}_pos,stdout);${prefix}_bytes+=${prefix}_pos;${prefix}_frames++;}\n`;
}

export function instrumentC(context) {
  const { source, root, nodes, prefix, markerPrefix, limits, masked } = context;
  const warnings = new Set();
  const lines = new Set();
  const text = node => originalText(context, node);
  const unsupported = new Set(['goto_statement', 'labeled_statement', 'case_statement', 'switch_statement', 'asm_statement', 'preproc_if', 'preproc_ifdef', 'preproc_function_def', 'preproc_def']);
  for (const node of nodes) if (unsupported.has(node.type)) throw new Error(`C Trace does not yet support ${node.type.replaceAll('_', ' ')}; use Run for this edited source.`);
  const aliases = new Map([['size_t', 'unsigned long'], ['ptrdiff_t', 'long'], ['bool', 'int']]);
  for (const node of nodes.filter(node => node.type === 'type_definition')) {
    const type = node.childForFieldName('type');
    const name = node.childForFieldName('declarator');
    if (type && name?.type === 'type_identifier' && numericType(text(type))) aliases.set(text(name), text(type));
  }
  function typeOf(declaration) {
    // Pointer/function-pointer return declarators wrap the function declarator;
    // their leading primitive token is the pointee type, not the return type.
    if (declaration.type === 'function_definition' && declaration.childForFieldName('declarator')?.type !== 'function_declarator') return null;
    const type = declaration.childForFieldName('type');
    const raw = type ? text(type) : '';
    if (declaration.namedChildren.some(child => child.type === 'type_qualifier' && ['volatile', '_Atomic'].includes(text(child)))) return null;
    if (masked.some(([start]) => start >= declaration.startIndex && start < declaration.endIndex)) return null;
    const resolved = aliases.get(raw) || raw;
    return numericType(resolved) ? resolved : null;
  }
  function declarator(node, type, initialized) {
    if (!node) return null;
    if (node.type === 'init_declarator') return declarator(node.childForFieldName('declarator'), type, true);
    if (node.type === 'identifier') return { name: text(node), expression: text(node), type, initialized, dimensions: [] };
    if (node.type === 'array_declarator') {
      const inner = declarator(node.childForFieldName('declarator'), type, initialized);
      const size = node.childForFieldName('size');
      const count = size?.type === 'number_literal' && /^\d+$/.test(text(size)) ? Number(text(size)) : null;
      if (!inner || !count || count > limits.arrayElements) return null;
      inner.dimensions.push(count);
      return inner;
    }
    return null;
  }
  function declare(node, env, parameter = false) {
    const type = typeOf(node);
    for (const item of node.childrenForFieldName('declarator')) {
      let base = item;
      while (base && !['identifier', 'type_identifier'].includes(base.type)) base = base.childForFieldName('declarator');
      const name = base ? text(base) : null;
      if (name) env.delete(name); // Shadowing an unsupported object must hide the outer scalar too.
      const value = type && declarator(item, type, parameter || node.namedChildren.some(child => child.type === 'storage_class_specifier' && text(child) === 'static'));
      if (value && (!parameter || !value.dimensions.length) && value.dimensions.reduce((a, b) => a * b, 1) <= limits.arrayElements) env.set(value.name, value);
      else if (name) warnings.add('C snapshots omit pointers, volatile/complex/custom types, and arrays larger than 16 elements.');
    }
  }
  function values(env) { return [...env.values()].filter(value => value.initialized && value.name.length <= 256).slice(-limits.locals); }
  function capture(value) {
    const name = JSON.stringify(value.name);
    if (!value.dimensions.length) return `${prefix}_${/\bunsigned\b/.test(value.type) ? 'u' : integerType(value.type) ? 'i' : 'n'}(${name},(${value.type})(${value.expression}));`;
    const args = [];
    const unsigned = /\bunsigned\b/.test(value.type);
    const integer = integerType(value.type);
    function arrayFormat(depth, suffix) {
      if (depth === value.dimensions.length) {
        args.push(`(${integer ? unsigned ? 'unsigned long long' : 'long long' : 'double'})(${value.expression}${suffix})`);
        return integer ? unsigned ? '%llu' : '%lld' : '%.17g';
      }
      return `[${Array.from({ length: value.dimensions[depth] }, (_, i) => arrayFormat(depth + 1, `${suffix}[${i}]`)).join(', ')}]`;
    }
    const format = arrayFormat(0, '');
    return `{char ${prefix}_array[1024];snprintf(${prefix}_array,sizeof ${prefix}_array,${JSON.stringify(format)},${args.join(',')});${prefix}_add(${name},${prefix}_array);}`;
  }
  function hook(node, env, event = 'line', extra = []) {
    const line = sourceLine(node); lines.add(line);
    return `if(${prefix}_begin(${line},${event === 'return' ? 1 : 0})){${[...values(env), ...extra].map(capture).join('')}${prefix}_end(${line});}`;
  }
  function expressionChildren(node, env) {
    // C has no closures. The explicit supported statement recursion below is
    // enough; nested function definitions and statement expressions are refused.
    if (node.namedChildren.some(child => child.type === 'compound_statement')) throw new Error('C Trace does not support statement expressions or nested function definitions.');
    return text(node);
  }
  function statement(node, env, returnType) {
    if (node.type === 'compound_statement') return block(node, new Map(env), returnType);
    if (node.type === 'declaration') { declare(node, env); return `${text(node)}${hook(node, env)}`; }
    if (node.type === 'return_statement') {
      const expression = node.namedChildren.find(child => child.type !== 'comment');
      if (expression && returnType && !/\bvoid\b/.test(returnType)) {
        const temporary = `${prefix}_return_${node.startIndex}`;
        return `{${returnType} ${temporary}=(${text(expression)});${hook(node, env, 'return', [{ name: '(return)', expression: temporary, type: returnType, initialized: true, dimensions: [] }])}return ${temporary};}`;
      }
      return `{${hook(node, env, 'return')}${text(node)}}`;
    }
    if (['if_statement', 'for_statement', 'while_statement', 'do_statement'].includes(node.type)) {
      const inside = new Map(env);
      if (node.type === 'for_statement') {
        const initializer = node.childForFieldName('initializer');
        if (initializer?.type === 'declaration') declare(initializer, inside);
      }
      const replacements = [];
      for (const field of ['body', 'consequence', 'alternative']) {
        const child = node.childForFieldName(field);
        if (!child) continue;
        if (child.type === 'else_clause') {
          const branch = child.namedChildren.find(item => item.type !== 'comment');
          if (branch) replacements.push([child, rewriteNode(source, child, [[branch, `{${statement(branch, new Map(inside), returnType)}}`]])]);
        } else {
          const body = statement(child, new Map(inside), returnType);
          replacements.push([child, `{${hook(node, inside)}${body}}`]);
        }
      }
      return `${hook(node, env)}${rewriteNode(source, node, replacements)}`;
    }
    if (node.type === 'expression_statement') {
      const expression = node.namedChildren[0];
      const extras = [];
      if (expression?.type === 'assignment_expression') {
        const left = expression.childForFieldName('left');
        if (left?.type === 'identifier' && env.has(text(left))) env.set(text(left), { ...env.get(text(left)), initialized: true });
        // An uninitialized array is never read wholesale. A simple element just
        // assigned by the program is safe to display, without dereferencing any
        // arbitrary pointer or evaluating an index with side effects twice.
        if (left?.type === 'subscript_expression') {
          let base = left;
          const safeIndex = candidate => candidate && (['identifier', 'number_literal'].includes(candidate.type) || candidate.type === 'binary_expression' && candidate.namedChildren.every(safeIndex));
          let safe = true;
          while (base?.type === 'subscript_expression') { safe &&= safeIndex(base.childForFieldName('index')); base = base.childForFieldName('argument'); }
          const value = base?.type === 'identifier' ? env.get(text(base)) : null;
          const pure = candidate => candidate && !['call_expression', 'assignment_expression', 'update_expression', 'pointer_expression'].includes(candidate.type) && candidate.namedChildren.every(pure);
          const label = text(left).replace(/\s+/g, '');
          if (safe && value && !value.initialized && label.length <= 256 && pure(expression.childForFieldName('right'))) extras.push({ ...value, name: label, expression: text(left), dimensions: [] });
        }
      }
      return `${expressionChildren(node, env)}${hook(node, env, 'line', extras)}`;
    }
    if (['break_statement', 'continue_statement'].includes(node.type)) return `{${hook(node, env)}${text(node)}}`;
    if (['comment', 'preproc_include', 'type_definition'].includes(node.type)) return text(node);
    if (node.type === 'function_definition') throw new Error('Nested C functions cannot be traced safely.');
    throw new Error(`C Trace does not yet support ${node.type.replaceAll('_', ' ')}; use Run for this edited source.`);
  }
  function block(node, env, returnType) {
    return rewriteNode(source, node, node.namedChildren.map(child => [child, statement(child, env, returnType)]));
  }
  const replacements = [];
  for (const node of root.namedChildren) {
    if (node.type !== 'function_definition') continue;
    const body = node.childForFieldName('body');
    const parameters = node.childForFieldName('declarator')?.childForFieldName('parameters');
    const env = new Map();
    for (const parameter of parameters?.namedChildren || []) if (parameter.type === 'parameter_declaration') declare(parameter, env, true);
    replacements.push([body, block(body, env, typeOf(node))]);
  }
  if (masked.length) warnings.add('Complex values execute unchanged; complex-number snapshots are omitted.');
  return { source: `${runtime(prefix, markerPrefix, limits)}\n#line 1 "example.c"\n${rewriteNode(source, root, replacements)}`, warnings: [...warnings], instrumentedLines: [...lines].sort((a, b) => a - b) };
}
