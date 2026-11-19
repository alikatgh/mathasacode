import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { symbolGroups } from '../site/symbol-catalog.mjs';
import { symbolDetails, referenceForSymbol } from '../site/symbol-details.mjs';
import { renderSymbolDetail } from '../scripts/symbol-detail.mjs';
import { renderSymbolDiagram, renderSymbolPlot, symbolPlots } from '../scripts/symbol-graphs.mjs';

const entries = symbolGroups.flatMap(group => group.entries);
const ids = new Set(entries.map(entry => entry.id));

test('every symbol has a complete, specific detailed explanation and valid related links', () => {
  assert.deepEqual(new Set(Object.keys(symbolDetails)), ids);
  for (const entry of entries) {
    const detail = symbolDetails[entry.id];
    assert.ok(typeof detail.readAs === 'string' && detail.readAs.trim(), `${entry.id}: pronunciation`);
    assert.ok(detail.intuition.length > 70, `${entry.id}: simple explanation`);
    assert.ok(detail.steps.length >= 3, `${entry.id}: worked steps`);
    assert.ok(detail.pitfalls.length >= 1, `${entry.id}: common mistakes`);
    assert.ok(detail.example.notes.length >= 2, `${entry.id}: code explained`);
    assert.ok(detail.example.code.split('\n').length >= 5, `${entry.id}: expanded code`);
    assert.notEqual(detail.example.code, entry.code);
    assert.ok(detail.related.length >= 2, `${entry.id}: related links`);
    for (const id of detail.related) assert.ok(ids.has(id) && id !== entry.id, `${entry.id}: related ${id}`);
    assert.match(referenceForSymbol(entry).href, /^https:\/\/developer\.mozilla\.org\//);
  }
});

test('all expanded examples produce exactly their displayed output in isolated JavaScript contexts', () => {
  for (const entry of entries) {
    const { code, output } = symbolDetails[entry.id].example;
    const logs = [];
    const context = vm.createContext({ console: { log: (...args) => logs.push(args.join(' ')) } }, {codeGeneration:{strings:false,wasm:false}});
    new vm.Script(code, {filename:`${entry.id}.js`}).runInContext(context,{timeout:1000});
    assert.equal(logs.length, 1, `${entry.id}: exactly one result`);
    assert.equal(logs[0], output, `${entry.id}: advertised result`);
  }
});

test('every Pele diagram renders in both directions with local, bounded, readable SVG', () => {
  for (const entry of entries) {
    const diagram = symbolDetails[entry.id].diagram;
    assert.ok(diagram.nodes.length >= 3 && diagram.nodes.length <= 4, entry.id);
    assert.ok(diagram.caption.length > 20, entry.id);
    for (const label of diagram.nodes) assert.ok(label.length <= 34, `${entry.id}: long label ${label}`);
    for (const narrow of [false, true]) {
      const result = renderSymbolDiagram(entry.id, diagram, narrow);
      assert.equal(result.type, 'flowchart');
      assert.match(result.svg, /^<svg\b/);
      assert.ok(result.svg.length < 100000);
      assert.ok(result.width > 0 && result.height > 0);
      if (narrow) assert.ok(result.width <= 284, `${entry.id}: phone drawing is ${result.width}px`);
      assert.doesNotMatch(result.svg, /<script\b|<foreignObject\b|<image\b|\bonclick=|href="https?:/i);
    }
  }
});

test('numerical graphs render with matching, finite, labeled data', () => {
  assert.ok(Object.keys(symbolPlots).length >= 10);
  for (const [id, plot] of Object.entries(symbolPlots)) {
    assert.ok(ids.has(id));
    assert.equal(plot.labels.length, plot.values.length);
    assert.ok(plot.values.every(Number.isFinite));
    assert.ok(plot.values.every(value => value >= plot.min && value <= plot.max));
    for (const narrow of [false,true]) {
      const graph = renderSymbolPlot(id,narrow);
      assert.equal(graph.type,'xychart');
      if (narrow) assert.ok(graph.width <= 284);
    }
  }
  assert.deepEqual(symbolPlots.power.values, [1,2,4,8,16]);
  assert.equal(symbolPlots.entropy.values[2],1);
  assert.ok(Math.abs(symbolPlots['ml-softmax'].values.reduce((a,b)=>a+b,0)-1)<1e-12);
  assert.ok(symbolPlots['ml-cross-entropy'].values.at(-1) === 0);
});

test('native disclosures provide complete content and usable links without JavaScript', () => {
  for (const entry of entries) {
    const html = renderSymbolDetail(entry);
    assert.match(html, /<details class="symbol-detail"/);
    assert.doesNotMatch(html, /<details class="symbol-detail"[^>]*\bopen\b/);
    assert.ok(html.includes(`id="detail-${entry.id}" data-symbol-detail`));
    assert.ok(html.includes(`aria-label="Detailed explanation: `));
    assert.match(html, /In simple terms/);
    assert.match(html, /What the code does/);
    assert.match(html, /See how it works/);
    assert.match(html, /class="pele pele-flowchart"/);
    assert.ok(html.includes('Full lesson →'));
    for (const id of symbolDetails[entry.id].related) assert.ok(html.includes(`href="#detail-${id}"`));
    assert.doesNotMatch(html, /<script\b|href="javascript:/i);
  }
  assert.equal(renderSymbolDetail({id:'unknown'}),'');
});
