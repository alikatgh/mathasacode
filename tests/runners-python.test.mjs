import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { executePython } from '../site/runners/python.mjs';
import { RUN_LIMITS, outputBuffer } from '../site/runners/limits.mjs';

const paths = { 'python.wasm': 'bin/python-3.12.0.wasm', 'python312.zip': 'usr/local/lib/python312.zip', 'os.py': 'usr/local/lib/python3.12/os.py' };
const assets = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([name, path]) =>
  [name, await readFile(new URL('../site/runners/vendor/python-wasi/' + path, import.meta.url))])));
assets['notation.py'] = await readFile(new URL('../examples/notation.py', import.meta.url));

async function python(source) {
  const output = outputBuffer();
  try {
    await executePython(source, assets, text => { if (output.append(text)) throw new Error('Output stopped at 32 KB.'); });
    return { success: true, output: output.text };
  } catch (error) { return { success: false, output: output.text, error }; }
}

test('real WASI CPython executes math, cmath, helpers and the edited last expression', async () => {
  const result = await python('import math, cmath\nfrom examples.notation import mean\nprint(cmath.sqrt(-1))\nprint(mean([2, 4, 12]))\nmath.sqrt(81)');
  assert.equal(result.success, true);
  assert.equal(result.output, '1j\n6.0\n9.0\n');
});

test('Python syntax and runtime errors retain the edited source filename', async () => {
  const syntax = await python('broken = ;');
  assert.equal(syntax.success, false);
  assert.match(syntax.output, /example.py.*line 1/s);
  assert.match(syntax.output, /SyntaxError/);
  const runtime = await python('raise ValueError("edited Python error")');
  assert.equal(runtime.success, false);
  assert.match(runtime.output, /ValueError: edited Python error/);
});

test('plain WASI Python has no Pyodide/JavaScript bridge and cannot exceed its 128 MiB memory', async () => {
  for (const source of ['import pyodide_js', 'from pyodide.ffi import to_js', 'import js']) {
    const bridge = await python(source);
    assert.equal(bridge.success, false);
    assert.match(bridge.output, /ModuleNotFoundError/);
  }
  const memory = await python(`bytearray(${RUN_LIMITS.pythonMemoryBytes + 65536})`);
  assert.equal(memory.success, false);
  assert.match(memory.output, /MemoryError/);
});

test('WASI filesystem cannot create, grow, truncate or read host files', async () => {
  for (const source of ['open("/new-file", "w")', 'import os\nos.truncate("/example.py", 2**40)', 'open("/etc/passwd").read()']) {
    const result = await python(source);
    assert.equal(result.success, false);
    assert.match(result.output, /OSError|FileNotFoundError|PermissionError/);
  }
  const descriptors = await python('handles = [open("/example.py") for _ in range(1000)]');
  assert.equal(descriptors.success, false);
  assert.match(descriptors.output, /No file descriptors available|Too many open files/);
});

test('Python output is bounded before large host copies can accumulate', async () => {
  const result = await python('print("a" * 1000000)');
  assert.equal(result.success, false);
  assert.match(result.error.message, /Output stopped/);
  assert.ok(result.output.length <= RUN_LIMITS.outputChars);
});

test('long WASI paths fail before host decoding and path splitting', async () => {
  for (const operation of ['os.stat(path)', 'open(path)', 'os.readlink(path)']) {
    const result = await python(`import os, errno\npath = 'a/' * 100000 + 'b'\ntry:\n    ${operation}\nexcept OSError as error:\n    print(error.errno == errno.ENAMETOOLONG)`);
    assert.equal(result.success, true);
    assert.equal(result.output, 'True\n');
  }
});
