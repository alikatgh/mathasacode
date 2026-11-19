import test from 'node:test';
import assert from 'node:assert/strict';
import { createSymbolRunnable, runnableStatus } from '../site/symbol-runnable-model.mjs';
import { RUN_LIMITS } from '../site/runners/limits.mjs';
import { symbolDetails } from '../site/symbol-details.mjs';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function harness() {
  const calls = [];
  const runner = options => {
    const completion = deferred();
    const call = { options, ...completion, stops: 0 };
    calls.push(call);
    return { promise: completion.promise, stop() { call.stops++; } };
  };
  const model = createSymbolRunnable({ id: 'power', source: 'console.log(2 ** 3)', runner });
  return { model, calls, runner };
}

test('all 89 detailed examples prepare without executing and accept edited JavaScript', () => {
  let runs = 0;
  assert.equal(Object.keys(symbolDetails).length, 89);
  for (const [id, detail] of Object.entries(symbolDetails)) {
    const model = createSymbolRunnable({ id, source: detail.example.code, runner: () => { runs++; } });
    assert.equal(model.getSnapshot().source, detail.example.code, id);
    assert.equal(model.getSnapshot().result, null, id);
    assert.equal(model.changeSource(`${detail.example.code}\n// edited`), true, id);
    model.reset();
    assert.equal(model.getSnapshot().source, detail.example.code, id);
  }
  assert.equal(runs, 0);
});

test('only explicit Run invokes the injected sandbox with the exact edited JavaScript', async () => {
  const { model, calls } = harness();
  model.changeSource('console.log(4 * 9)');
  assert.equal(calls.length, 0);
  const done = model.run();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.language, 'javascript');
  assert.equal(calls[0].options.source, 'console.log(4 * 9)');
  calls[0].options.onStatus('Running…');
  calls[0].options.onOutput('36\n');
  assert.equal(model.getSnapshot().result.output, '36\n');
  calls[0].resolve({ status: 'success', output: '36\n', error: '' });
  await done;
  assert.equal(runnableStatus(model.getSnapshot()), 'Finished.');
  calls[0].options.onOutput('late output');
  calls[0].options.onStatus('late status');
  assert.equal(model.getSnapshot().result.output, '36\n');
  assert.equal(model.getSnapshot().message, '');
});

test('empty and whitespace drafts remain editable and keep the shared no-output Run behavior', async () => {
  const { model, calls } = harness();
  for (const source of ['', '  \n\t  ']) {
    assert.equal(model.changeSource(source), true);
    assert.equal(model.getSnapshot().source, source);
    assert.equal(model.getSnapshot().validationError, '');
    const run = model.run();
    assert.equal(calls.at(-1).options.source, source);
    calls.at(-1).resolve({ status: 'success', output: '' });
    await run;
    assert.equal(model.getSnapshot().source, source);
    assert.equal(model.getSnapshot().result.status, 'success');
    assert.equal(model.getSnapshot().result.output, '');
  }
  assert.equal(calls.length, 2);
  model.reset();
  assert.equal(model.getSnapshot().source, model.originalSource);
  assert.equal(model.getSnapshot().validationError, '');
  assert.equal(model.getSnapshot().result, null);
  const restored = model.run();
  assert.equal(calls.length, 3);
  calls[2].resolve({ status: 'success', output: '8\n' });
  await restored;
  assert.equal(model.getSnapshot().result.output, '8\n');
  assert.equal(model.changeSource(' '.repeat(RUN_LIMITS.sourceBytes + 1)), false);
  assert.equal(model.getSnapshot().source, model.originalSource);
  assert.match(model.getSnapshot().validationError, /64 KB/);
});

test('editing stops execution, retains stale partial output, and rejects late completions', async () => {
  const { model, calls } = harness();
  const first = model.run();
  calls[0].options.onOutput('partial\n');
  model.changeSource('console.log(17)');
  assert.equal(calls[0].stops, 1);
  assert.equal(model.getSnapshot().result.status, 'stopped');
  assert.equal(model.getSnapshot().result.output, 'partial\n');
  assert.match(runnableStatus(model.getSnapshot()), /earlier version/);
  const second = model.run();
  calls[0].options.onOutput('old output');
  calls[0].resolve({ status: 'success', output: 'old completion' });
  await first;
  assert.equal(model.getSnapshot().result.status, 'running');
  assert.equal(model.getSnapshot().result.output, '');
  calls[1].resolve({ status: 'success', output: '17\n' });
  await second;
  assert.equal(model.getSnapshot().result.output, '17\n');
});

test('Stop and Reset prevent pending work from overwriting the current source or result', async () => {
  const { model, calls } = harness();
  const first = model.run();
  calls[0].options.onOutput('partial');
  model.stop();
  assert.equal(calls[0].stops, 1);
  assert.equal(model.getSnapshot().result.status, 'stopped');
  calls[0].resolve({ status: 'success', output: 'late' });
  await first;
  assert.equal(model.getSnapshot().result.output, 'partial');
  model.changeSource('console.log(99)');
  const next = model.run();
  model.reset();
  calls[1].resolve({ status: 'error', output: 'late reset output' });
  await next;
  assert.equal(model.getSnapshot().source, model.originalSource);
  assert.equal(model.getSnapshot().result, null);
  assert.equal(calls.length, 2);
});

test('graph source updates are bounded, clear old output, and never execute', async () => {
  const { model, calls } = harness();
  const done = model.run();
  calls[0].resolve({ status: 'success', output: '8\n' });
  await done;
  assert.equal(model.changeSource('console.log(3 ** 4)', { fromControls: true }), true);
  assert.equal(model.getSnapshot().result, null);
  assert.match(runnableStatus(model.getSnapshot()), /graph controls/);
  assert.equal(calls.length, 1);
  assert.equal(model.changeSource('é'.repeat(RUN_LIMITS.sourceBytes / 2 + 1), { fromControls: true }), false);
  assert.equal(model.getSnapshot().source, 'console.log(3 ** 4)');
  assert.match(runnableStatus(model.getSnapshot()), /64 KB/);
  assert.equal(model.changeSource({ malicious: true }, { fromControls: true }), false);
  assert.equal(calls.length, 1);
});

test('starting another example propagates the shared sandbox stopped result', async () => {
  let previous;
  const runner = () => {
    previous?.stop();
    const completion = deferred();
    const task = { promise: completion.promise, stop: () => completion.resolve({ status: 'stopped', output: '', error: 'Stopped.' }) };
    previous = task;
    return task;
  };
  const first = createSymbolRunnable({ id: 'first', source: '1', runner });
  const second = createSymbolRunnable({ id: 'second', source: '2', runner });
  const firstRun = first.run();
  const secondRun = second.run();
  await firstRun;
  assert.equal(first.getSnapshot().result.status, 'stopped');
  second.stop();
  await secondRun;
});

test('copy preserves every source character, reports failure, and ignores late replies after edits', async () => {
  const { model } = harness();
  const source = '  const π = "✓";\nconsole.log(π);\n';
  model.changeSource(source);
  let copied;
  assert.equal(await model.copy(async text => { copied = text; }), true);
  assert.equal(copied, source);
  assert.equal(runnableStatus(model.getSnapshot()), 'Code copied.');
  assert.equal(await model.copy(undefined), false);
  assert.match(runnableStatus(model.getSnapshot()), /copy it with your keyboard/);
  const pending = deferred();
  const copying = model.copy(() => pending.promise);
  model.changeSource('console.log("new")');
  pending.resolve();
  await copying;
  assert.equal(model.getSnapshot().copyStatus, 'idle');
});

test('suspending stops a run and pending clipboard work while retaining the draft', async () => {
  const { model, calls } = harness();
  model.changeSource('console.log("retained")');
  const running = model.run();
  const pending = deferred();
  const copying = model.copy(() => pending.promise);
  model.suspend();
  assert.equal(calls[0].stops, 1);
  pending.resolve();
  calls[0].resolve({ status: 'success', output: 'late' });
  await Promise.all([running, copying]);
  assert.equal(model.getSnapshot().source, 'console.log("retained")');
  assert.equal(model.getSnapshot().copyStatus, 'idle');
  assert.equal(model.getSnapshot().result.status, 'stopped');
});

test('bounded results and runtime failures remain readable', async () => {
  const { model, calls } = harness();
  const running = model.run();
  calls[0].options.onOutput('x'.repeat(RUN_LIMITS.outputChars + 100));
  assert.equal(model.getSnapshot().result.output.length, RUN_LIMITS.outputChars);
  calls[0].resolve({ status: 'timeout', output: 'x'.repeat(RUN_LIMITS.outputChars + 100), error: 'Time limit.' });
  await running;
  assert.equal(model.getSnapshot().result.output.length, RUN_LIMITS.outputChars);
  assert.equal(runnableStatus(model.getSnapshot()), 'Time limit reached.');
  const rejection = model.run();
  calls[1].reject(new Error('sandbox unavailable'));
  await rejection;
  assert.equal(model.getSnapshot().result.status, 'error');
  assert.equal(model.getSnapshot().result.error, 'sandbox unavailable');
});
