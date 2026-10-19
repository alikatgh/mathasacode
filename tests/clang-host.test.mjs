import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { prepareClangHost } from '../scripts/clang-host.mjs';

const original = await readFile(new URL('../site/runners/vendor/clang/shared.js', import.meta.url), 'utf8');
const scope = { self: {}, Map, TextDecoder };
vm.runInNewContext(prepareClangHost(original).replace('return API;', 'self.OutputHost = MemFS; return API;') + '\nself.readString = readStr;', scope);
function host(bytes, write) {
  const view = new DataView(bytes.buffer);
  return {
    hostMem_: { u8: bytes, check() {}, read32: offset => view.getUint32(offset, true), write32: (offset, value) => view.setUint32(offset, value, true) },
    hostWrite: write,
  };
}
const write = (receiver, count = 1) => scope.self.OutputHost.prototype.host_write.call(receiver, 1, 0, count, 24);

test('Clang host strings reject invalid ranges and excessive copies', () => {
  assert.equal(scope.self.readString(new Uint8Array([65, 0]), 0), 'A');
  assert.throws(() => scope.self.readString(new Uint8Array([65]), 0, 100000), /outside its memory/);
  assert.throws(() => scope.self.readString(new Uint8Array(40000), 0, 33000), /exceeds 32 KB/);
  assert.throws(() => scope.self.readString(new Uint8Array(1), -1), /Invalid runtime string range/);
  assert.throws(() => prepareClangHost('unrecognized upstream source'), /layout changed/);
});

test('Clang output limits count buffers and aggregate bytes before copying', () => {
  const bytes = new Uint8Array(40000).fill(65);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 32, true); view.setUint32(4, 17000, true);
  view.setUint32(8, 17032, true); view.setUint32(12, 17000, true);
  const chunks = [];
  const receiver = host(bytes, text => chunks.push(text));
  assert.throws(() => write(receiver, 2), /Output stopped at 32 KB/);
  assert.equal(chunks.join('').length, 32769);
  chunks.length = 0;
  assert.throws(() => write(receiver, 1025), /Invalid standard-output request/);
  assert.equal(chunks.length, 0);
  view.setUint32(4, 100000, true);
  assert.throws(() => write(receiver), /outside runtime memory/);
  assert.equal(chunks.length, 0);
});

test('C output decodes UTF-8 across separate writes', () => {
  const bytes = new Uint8Array(128);
  const text = new TextEncoder().encode('你好 ∇');
  bytes.set(text, 32);
  const view = new DataView(bytes.buffer);
  const chunks = [];
  const receiver = host(bytes, value => chunks.push(value));
  view.setUint32(0, 32, true); view.setUint32(4, 2, true);
  write(receiver);
  view.setUint32(0, 34, true); view.setUint32(4, text.length - 2, true);
  write(receiver);
  assert.equal(chunks.join(''), '你好 ∇');
});
