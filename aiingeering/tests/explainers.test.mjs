import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { buildExplainers, semanticProse } from '../scripts/explainers.mjs';

const contentRoot = process.env.AIINGEERING_CONTENT_ROOT || resolve(import.meta.dirname, '../content');
const pages = buildExplainers(contentRoot);
const [decompiler, agent, gpu] = pages;
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function withMutatedSource(change, check) {
  const root = mkdtempSync(join(tmpdir(), 'aiingeering-explainer-test-'));
  try {
    mkdirSync(join(root, 'site'));
    for (const page of pages) {
      const original = readFileSync(join(contentRoot, page.path), 'utf8');
      writeFileSync(join(root, page.path), change(original, page));
    }
    check(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test('imports all three authored explainers and every named scenario', () => {
  assert.deepEqual(pages.map(page => page.path), ['site/inside-a-decompiler.html', 'site/inside-an-ai-agent.html', 'site/inside-an-llm-serving-gpu.html']);
  assert.deepEqual(pages.map(page => page.simulation.scenarios.length), [7, 8, 11]);
  assert.deepEqual(pages.map(page => Object.keys(page.simulation.parts).length), [10, 10, 11]);
  assert.equal(agent.simulation.chapters.length, 6);
  assert.deepEqual(decompiler.simulation.scenarios.map(item => item.title), ['Healthy run', 'Unoptimized build', 'Strip the symbols', 'Linear sweep at -O0', 'Linear sweep, no symbols', 'Data in code, linear sweep', 'Data in code, descent']);
  for (const page of pages) {
    assert.match(page.html, new RegExp(`<h1>${page.title}</h1>`));
    assert.match(page.html, /What the machine shows/);
    assert.match(page.html, /This is a simulation\./);
    assert.match(page.html, /All authored model data/);
    assert.match(page.html, /Original pure simulation and data declarations/);
    assert.match(page.html, new RegExp(`src="\\./content/site/anatomy/${page.simulation.id}-poster\\.png"`));
    assert.doesNotMatch(page.html, /<(?:script|iframe|button|select|input)\b|\[object Object\]|<a href="#">|<li>empty/);
  }
});

test('renders every part explanation and all tour chapters as semantic sections', () => {
  for (const page of pages) for (const [id, part] of Object.entries(page.simulation.parts)) {
    const section = new RegExp(`<section id="part-${id}">([\\s\\S]*?)</section>`).exec(page.html)?.[1];
    assert.ok(section, `${page.path} ${id}`);
    const visit = value => {
      if (typeof value === 'string') assert.ok(section.includes(escape(value)), `${page.path} ${id}: ${value.slice(0, 40)}`);
      else if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) if (key !== 'lesson') visit(item);
    };
    for (const [key, value] of Object.entries(part)) if (key !== 'lesson') visit(value);
  }
  for (const chapter of agent.simulation.chapters) {
    assert.ok(agent.html.includes(`<p>${escape(chapter.text)}</p>`));
    assert.ok(agent.html.includes(escape(chapter.title)));
  }
  assert.match(gpu.html, /SM count not published/);
  assert.match(gpu.html, /not to measure/);
  assert.match(gpu.html, /NVIDIA Ada GPU architecture whitepaper/);
  assert.match(gpu.html, /manuals%2Fsglang-101%2Fsections%2F1-3-what-the-server-does-with-your-request.md/);
});

test('decompiler scenarios preserve bytes, complete evidence ledgers, and refusal paths', () => {
  const healthy = decompiler.simulation.scenarios[0];
  assert.equal(healthy.result.outcome.status, 'decompiled');
  assert.match(healthy.result.outcome.text, /return \(param_2 - param_1\) \* 100 \/ param_1/);
  assert.ok(healthy.fixture.bytes);
  assert.equal(healthy.timings.length, healthy.result.events.length);
  assert.ok(healthy.timings.some(item => item?.shared));
  assert.ok(healthy.result.events.at(-1).ledger.some(item => item.confidence === 'unknown'));
  const stripped = decompiler.simulation.scenarios[2];
  assert.equal(stripped.config.symbols, false);
  assert.ok(stripped.result.events.at(-1).ledger.some(item => item.confidence === 'unknown' && /function name/.test(item.claim)));
  for (const scenario of decompiler.simulation.scenarios.slice(-2)) {
    assert.equal(scenario.result.outcome.status, 'stopped');
    assert.ok(scenario.result.events.some(event => event.type === 'refuse'));
  }
});

test('agent scenarios distinguish missing grounding, recovered timeouts, and unchecked errors', () => {
  const scenarios = agent.simulation.scenarios;
  assert.equal(scenarios[0].result.outcome.status, 'verified');
  assert.equal(scenarios[1].result.outcome.status, 'declined');
  assert.equal(scenarios[2].result.outcome.status, 'unchecked');
  assert.equal(scenarios[3].result.outcome.status, 'verified');
  assert.ok(scenarios[3].result.totals.attempts > scenarios[0].result.totals.attempts);
  assert.equal(scenarios[5].result.outcome.status, 'unchecked');
  assert.equal(scenarios[5].result.outcome.correct, false);
  assert.equal(scenarios[4].result.outcome.correct, true);
  assert.ok(agent.simulation.cards.some(card => card.total === 12400));
  assert.ok(agent.simulation.cards.some(card => card.total === 15500));
});

test('GPU traces retain measured values, queuing, cache failure and thermal flags', () => {
  const [healthy, single, full, fp8, small, smallFp8, radix, graphs, hot, gb10, gb10fp8] = gpu.simulation.scenarios;
  assert.equal(healthy.result.totals.tokS, 112.62);
  assert.equal(single.result.totals.tpot, 60.16);
  assert.equal(full.result.admission.running, 37);
  assert.equal(full.result.admission.queued, 27);
  assert.equal(fp8.result.pool, 142369);
  assert.equal(small.result.outcome.status, 'recomputed');
  assert.equal(smallFp8.result.outcome.status, 'served');
  assert.equal(radix.config.radix, false);
  assert.equal(graphs.config.graphs, false);
  assert.equal(hot.result.outcome.status, 'throttled');
  assert.equal(hot.result.totals.tpot, 103.38);
  assert.equal(gb10.result.totals.tpot, 32.52);
  assert.equal(gb10fp8.result.totals.tpot, 18.41);
  for (const scenario of gpu.simulation.scenarios) for (const key of ['point', 'run', 'memory', 'admission', 'decode', 'launch', 'totals', 'serve']) assert.ok(key in scenario.result, key);
});

test('complete traces are deterministic JSON and preserve the final outcome', () => {
  assert.deepEqual(buildExplainers(contentRoot), pages);
  for (const page of pages) for (const scenario of page.simulation.scenarios) {
    assert.deepEqual(JSON.parse(JSON.stringify(scenario.result)), scenario.result);
    assert.deepEqual(scenario.config, scenario.result.config);
    assert.deepEqual(scenario.result.events.at(-1).outcome, scenario.result.outcome);
    assert.ok(scenario.result.events.every((event, index) => event.index === index && event.trace && event.station));
  }
});

test('does not execute any surrounding page behavior', () => {
  withMutatedSource(html => html.replace('const M =', 'throw new Error("original UI script must never execute");\nconst M ='), root => {
    assert.deepEqual(buildExplainers(root).map(page => page.simulation.scenarios), pages.map(page => page.simulation.scenarios));
  });
});

test('rejects a selected declaration that accesses a runtime capability', () => {
  withMutatedSource((html, page) => page.simulation.kind === 'decompiler' ? html.replace('const M = (() => {', 'const M = (() => { process.exit(0);') : html, root => {
    assert.throws(() => buildExplainers(root), /Unexpected capability.*process/);
  });
});

test('the shared prose extractor preserves readable content while dropping page controls', () => {
  const html = semanticProse('<main><h1>Title</h1><div><p>Full <strong>explanation</strong> here.</p><button>Old control</button><script>throw new Error()</script><iframe>frame</iframe></div></main>', contentRoot);
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /Full <strong>explanation<\/strong>  here/);
  assert.doesNotMatch(html, /button|script|iframe|Old control|frame|throw new/);
});
