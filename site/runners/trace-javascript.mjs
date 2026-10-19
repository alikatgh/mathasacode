import { parse } from 'acorn';
import { validateRun } from './limits.mjs';
import { TRACE_LIMITS } from './trace-runtime.mjs';

const children = node => Object.entries(node).flatMap(([key, value]) => key === 'loc' ? [] :
  Array.isArray(value) ? value.filter(item => item?.type) : value?.type ? [value] : []);
function bindingNames(pattern, add) {
  if (!pattern) return;
  if (pattern.type === 'Identifier') add(pattern.name);
  else if (pattern.type === 'RestElement') bindingNames(pattern.argument, add);
  else if (pattern.type === 'AssignmentPattern') bindingNames(pattern.left, add);
  else if (pattern.type === 'ObjectPattern') for (const property of pattern.properties) bindingNames(property.value ?? property.argument, add);
  else if (pattern.type === 'ArrayPattern') for (const element of pattern.elements) bindingNames(element, add);
}

/** AST-directed insertions keep the exact original source lines and expressions. */
export function instrumentJavaScript(source) {
  validateRun('javascript', source);
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowHashBang: true });
  const nodes = [];
  const scopes = new Map();
  const depths = new Map();
  const parents = new Map();
  let scope;
  function visit(node, parent = null, depth = 0) {
    if (node.type === 'FunctionDeclaration' && parent && !['Program', 'BlockStatement', 'SwitchCase'].includes(parent.type)) {
      throw new Error('Tracing does not yet support function declarations as single-statement branches. Put the declaration in an authored block or use Run without tracing.');
    }
    if (node.type === 'WithStatement' || node.type === 'ClassDeclaration' || node.type === 'ClassExpression' ||
      node.type === 'TryStatement' && node.finalizer ||
      node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'eval' ||
      /Function/.test(node.type) && (node.async || node.generator)) {
      throw new Error(`Tracing does not yet support ${node.type === 'CallExpression' ? 'direct eval' : node.async ? 'async functions' : node.generator ? 'generators' : node.type === 'WithStatement' ? 'with statements' : node.type === 'TryStatement' ? 'try/finally' : 'class syntax'}. Use Run without tracing for this code.`);
    }
    const previous = scope;
    const fn = /^(?:FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type);
    if (node.type === 'FunctionDeclaration' && node.id) scope.names.add(node.id.name);
    if (node.type === 'Program' || fn || node.type === 'BlockStatement' || node.type === 'CatchClause' ||
      node.type === 'SwitchStatement' || /^For(?:Statement|InStatement|OfStatement)$/.test(node.type)) {
      scope = { parent: scope, names: new Set(), fn: node.type === 'Program' || fn };
    }
    nodes.push(node); scopes.set(node, scope); depths.set(node, depth); parents.set(node, parent);
    if (fn) {
      if (node.id) scope.names.add(node.id.name);
      for (const parameter of node.params) bindingNames(parameter, name => scope.names.add(name));
    }
    if (node.type === 'CatchClause') bindingNames(node.param, name => scope.names.add(name));
    if (node.type === 'VariableDeclaration') {
      let target = scope;
      if (node.kind === 'var') while (!target.fn) target = target.parent;
      for (const declaration of node.declarations) bindingNames(declaration.id, name => target.names.add(name));
    }
    for (const child of children(node)) visit(child, node, depth + 1);
    scope = previous;
  }
  visit(ast);
  const identifiers = new Set(nodes.filter(node => node.type === 'Identifier').map(node => node.name));
  let unique = 0;
  while (identifiers.has(`__macTrace${unique}`)) unique++;
  const helper = `__macTrace${unique}`;
  const snapshot = node => {
    const names = new Set();
    for (let current = scopes.get(node); current; current = current.parent) {
      for (const name of current.names) if (names.size < TRACE_LIMITS.locals) names.add(name);
    }
    return `()=>[${[...names].map(name => `[${JSON.stringify(name)},()=>${name}]`).join(',')}]`;
  };
  // An empty binding pattern has an empty completion and introduces no variable.
  const trace = (node, line = node.loc.start.line) => `var {}=${helper}.line(${line},${snapshot(node)});`;
  const edits = new Map();
  const add = (position, text, phase, rank) => {
    const list = edits.get(position) ?? [];
    list.push({ text, phase, rank }); edits.set(position, list);
  };
  const wrap = (node, start, end, rank = depths.get(node)) => {
    add(node.start, start, 2, rank);
    add(node.end, end, 0, -rank);
  };
  for (const node of nodes) {
    const parent = parents.get(node);
    const depth = depths.get(node);
    // Value positions permit a comma expression without changing assignment
    // references, method receivers, directives, or inferred function names.
    const valuePosition = parent && (
      parent.type === 'VariableDeclarator' && parent.init === node ||
      ['ReturnStatement', 'ThrowStatement', 'SpreadElement'].includes(parent.type) && parent.argument === node ||
      ['IfStatement', 'WhileStatement', 'DoWhileStatement'].includes(parent.type) && parent.test === node ||
      parent.type === 'ForStatement' && [parent.init, parent.test, parent.update].includes(node) ||
      ['ForInStatement', 'ForOfStatement', 'AssignmentExpression', 'AssignmentPattern'].includes(parent.type) && parent.right === node ||
      ['CallExpression', 'NewExpression'].includes(parent.type) && parent.arguments.includes(node) ||
      ['BinaryExpression', 'LogicalExpression', 'ConditionalExpression', 'SequenceExpression'].includes(parent.type) ||
      parent.type === 'ArrayExpression' && parent.elements.includes(node) ||
      parent.type === 'Property' && parents.get(parent)?.type === 'ObjectExpression' && !parent.shorthand && parent.value === node ||
      parent.type === 'TemplateLiteral' && parent.expressions.includes(node) ||
      parent.type === 'UnaryExpression' && parent.operator !== 'delete' && !(parent.operator === 'typeof' && node.type === 'Identifier')
    );
    let inChain = false;
    for (let ancestor = parent; ancestor && ancestor.type !== 'Program'; ancestor = parents.get(ancestor)) {
      if (ancestor.type === 'ChainExpression') { inChain = true; break; }
    }
    if (valuePosition && !inChain && !['FunctionExpression', 'ArrowFunctionExpression', 'VariableDeclaration', 'SpreadElement'].includes(node.type) &&
      (node.loc.start.line !== parent.loc.start.line || parent.type === 'ForStatement' && [parent.test, parent.update].includes(node) ||
        ['WhileStatement', 'DoWhileStatement'].includes(parent.type) && parent.test === node)) {
      wrap(node, `(${helper}.line(${node.loc.start.line},${snapshot(node)}),(`, '))', depth - 0.25);
    }
    if (node.type === 'ArrayExpression' || node.type === 'ObjectExpression') {
      const keys = node.type === 'ArrayExpression' ? null : node.properties.filter(property => property.type === 'Property' && !property.computed)
        .slice(0, 8).map(property => property.key.name ?? String(property.key.value));
      wrap(node, `${helper}.mark((`, `),${JSON.stringify(keys)})`);
    }
    if (node.type === 'ArrowFunctionExpression' && node.body.type !== 'BlockStatement') {
      const body = node.body;
      wrap(body, `(${helper}.line(${body.loc.start.line},${snapshot(node)}),${helper}.ret(${body.loc.end.line},(`,
        `),${snapshot(node)}))`, depth + 0.5);
    }
    if (node.type === 'BlockStatement' && parent && /^(?:FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(parent.type)) {
      add(node.end - 1, `;var {}=(${helper}.ret(${node.loc.end.line},void 0,${snapshot(node)}),0);`, 1, depth);
    }
    const isStatement = /Statement$/.test(node.type) || ['VariableDeclaration', 'FunctionDeclaration'].includes(node.type);
    if (!isStatement || ['BlockStatement', 'EmptyStatement'].includes(node.type) || parent?.type === 'LabeledStatement' ||
      node.type === 'VariableDeclaration' && parent && /^For/.test(parent.type)) continue;
    // A directive must remain the first authored statement to retain strict mode.
    if (node.type === 'ExpressionStatement' && node.directive) {
      const body = parent.body;
      const index = body.indexOf(node);
      if (!body[index + 1]?.directive) add(node.end, ';' + body.slice(0, index + 1).map(directive => trace(directive)).join(''), 0, -depth);
      continue;
    }
    const statementList = parent && (parent.type === 'Program' || parent.type === 'BlockStatement' || parent.type === 'SwitchCase');
    if (!statementList) {
      // A single-statement body needs one block so tracing stays inside its branch.
      add(node.start, '{', 1, depth - 0.5);
      add(node.end, '}', 0, -depth + 0.5);
    }
    add(node.start, trace(node), 1, depth);
    if (node.type === 'ReturnStatement') {
      if (node.argument) wrap(node.argument, `${helper}.ret(${node.loc.start.line},(`, `),${snapshot(node)})`, depth + 0.5);
      else add(node.start + 6, ` ${helper}.ret(${node.loc.start.line},void 0,${snapshot(node)})`, 2, depth);
    }
    if (/^(?:ForStatement|ForInStatement|ForOfStatement|WhileStatement|DoWhileStatement)$/.test(node.type)) {
      const body = node.body;
      // Empty loop bodies and loop bindings still produce real iteration frames.
      if (body.type === 'BlockStatement') add(body.start + 1, trace(body, node.loc.start.line), 1, depth + 0.5);
      else if (body.type === 'EmptyStatement') {
        add(body.start, `{${trace(node)}`, 1, depth + 0.5);
        add(body.end, '}', 0, -depth - 0.5);
      }
    }
  }
  let instrumented = '';
  let cursor = 0;
  for (const [position, insertions] of [...edits].sort(([left], [right]) => left - right)) {
    instrumented += source.slice(cursor, position) + insertions.sort((left, right) => left.phase - right.phase || left.rank - right.rank).map(edit => edit.text).join('');
    cursor = position;
  }
  instrumented += source.slice(cursor);
  // Parse our output before executing it, so unsupported transformations fail closed.
  parse(instrumented, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true });
  return { source: instrumented, helper };
}

/** All previews stay in the guest; only bounded JSON strings cross to the host. */
export function javascriptTraceBootstrap(helper, nativeName) {
  return `const ${helper}=(()=>{
    const send=globalThis[${JSON.stringify(nativeName)}]; delete globalThis[${JSON.stringify(nativeName)}];
    const apply=Reflect.apply, descriptor=Object.getOwnPropertyDescriptor, create=Object.create, is=Object.is;
    const stringify=JSON.stringify, string=String, charCode=String.prototype.charCodeAt, slice=String.prototype.slice;
    const weakGet=WeakMap.prototype.get, weakSet=WeakMap.prototype.set, known=new WeakMap();
    let count=0,bytes=0,enabled=true;
    const cut=text=>text.length>${TRACE_LIMITS.valueChars}?apply(slice,text,[0,${TRACE_LIMITS.valueChars - 1}])+'…':text;
    function preview(value,depth=0){
      if(value===null)return 'null';
      const kind=typeof value;
      if(kind==='string')return cut(stringify(value));
      if(kind==='number')return is(value,-0)?'-0':string(value);
      if(kind==='bigint')return cut(string(value)+'n');
      if(kind==='undefined'||kind==='boolean')return string(value);
      if(kind==='symbol')return '[Symbol; preview omitted]';
      if(kind==='function')return '[Function; preview omitted]';
      const metadata=apply(weakGet,known,[value]);
      if(metadata===undefined)return '[Object; preview omitted]';
      // Literal keys are only selected fields, never proof of the current shape:
      // computed keys, spreads, and later additions can introduce other fields.
      if(metadata!==null&&metadata.length===0)return '[Object; properties not inspected]';
      if(depth>=2)return metadata===null?'[…]':'{…}';
      let result=metadata===null?'[':'[Object; selected properties: {',length=metadata===null?descriptor(value,'length').value:metadata.length;
      for(let index=0;index<length&&index<8;index++){
        const key=metadata===null?string(index):metadata[index],property=descriptor(value,key);
        if(index)result+=', ';
        if(metadata!==null)result+=stringify(key)+': ';
        result+=property?('value'in property?preview(property.value,depth+1):'[Getter; not evaluated]'):'<empty>';
        if(result.length>${TRACE_LIMITS.valueChars})break;
      }
      if(length>8)result+=', …';
      return cut(result+(metadata===null?']':'}]'));
    }
    function record(line,event,bindings,value){
      if(!enabled)return;
      if(count>=${TRACE_LIMITS.frames}){enabled=false;send('{"truncated":true}');return;}
      const locals=create(null),pairs=bindings();
      for(let index=0;index<pairs.length&&index<${TRACE_LIMITS.locals};index++){
        try{locals[pairs[index][0]]=preview(pairs[index][1]());}catch{}
      }
      if(event==='return')locals['(return)']=preview(value);
      const frame=create(null);frame.line=line;frame.event=event;frame.locals=locals;
      const text=stringify(frame);let size=0;
      for(let index=0;index<text.length;index++){
        const unit=apply(charCode,text,[index]);
        if(unit<128)size++;else if(unit<2048)size+=2;else if(unit>=55296&&unit<=56319){size+=4;index++;}else size+=3;
      }
      if(bytes+size>${TRACE_LIMITS.bytes}){enabled=false;send('{"truncated":true}');return;}
      count++;bytes+=size;send(text);
    }
    return {
      line:(line,bindings)=>{record(line,'line',bindings);return 0;},
      ret:(line,value,bindings)=>{record(line,'return',bindings,value);return value;},
      mark:(value,keys)=>{if(enabled)apply(weakSet,known,[value,keys]);return value;}
    };
  })();`;
}
