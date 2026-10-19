import test from 'node:test';
import assert from 'node:assert/strict';
import { traceOutputFilter } from '../site/runners/trace-wire.mjs';

test('compiled traces preserve every stdout character with arbitrary chunk boundaries', () => {
  const prefix = '\x1eMAC_TRACE_FIXTURE__';
  const frames = [{ line: 2, event: 'line', locals: { x: '3' } }, { truncated: true }];
  const text = `before你${prefix}${JSON.stringify(frames[0])}\nafter${prefix}${JSON.stringify(frames[1])}\n尾`;
  for (let size = 1; size <= text.length; size++) {
    let output = ''; const actual = [];
    const filter = traceOutputFilter({ prefix, onFrame: frame => actual.push(frame), onOutput: text => { output += text; } });
    for (let offset = 0; offset < text.length; offset += size) filter.write(text.slice(offset, offset + size));
    filter.flush();
    assert.equal(output, 'before你after尾');
    assert.deepEqual(actual, frames);
  }
});

test('partial marker-looking stdout survives and oversized or malformed frames fail closed', () => {
  const prefix = '\x1eMAC_TRACE_FIXTURE__';
  let output = '';
  const filter = () => traceOutputFilter({ prefix, onFrame() {}, onOutput: text => { output += text; } });
  const ordinary = filter(); ordinary.write('text\x1eMAC'); ordinary.flush(); assert.equal(output, 'text\x1eMAC');
  assert.throws(() => filter().write(prefix + 'x'.repeat(8200)), /oversized/);
  assert.throws(() => filter().write(prefix + 'not-json\n'), /Invalid execution trace/);
  const incomplete = filter(); incomplete.write(prefix + '{}'); assert.throws(() => incomplete.flush(), /Incomplete/);
});
