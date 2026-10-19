import { executeJavaScript } from './javascript.mjs';
import { executePython } from './python.mjs';
import { RUN_LIMITS, boundWasmMemory } from './limits.mjs';

const send = self.postMessage.bind(self);
let outputLength = 0;
function emit(value) {
  const text = String(value);
  const remaining = RUN_LIMITS.outputChars - outputLength;
  if (remaining > 0) send({ type: 'output', text: text.slice(0, remaining) });
  outputLength += text.length;
  if (outputLength > RUN_LIMITS.outputChars) throw new Error('Output stopped at 32 KB.');
}
function started() { send({ type: 'started' }); }
function loadClassic(bytes) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }));
  try { importScripts(url); } finally { URL.revokeObjectURL(url); }
}

async function executeC(source, assets) {
  send({ type: 'status', text: 'Preparing C filesystem…' });
  // Upstream's real Clang/LLD WASI implementation; only in-memory files and stdout.
  loadClassic(assets['shared.js']);
  const api = new self.MACClangAPI({
    readBuffer: async name => assets[name],
    compileStreaming: async name => WebAssembly.compile(boundWasmMemory(assets[name], RUN_LIMITS.compilerMemoryBytes)),
    hostWrite: text => { if (!api.quiet) emit(text.replace(/\u001b\[[0-9;]*m/g, '')); },
  });
  api.quiet = true;
  api.hostLog = () => {};
  await api.ready;
  send({ type: 'status', text: 'Loading C compiler…' });
  const input = 'example.c';
  const object = 'example.o';
  const output = 'example.wasm';
  api.memfs.addFile(input, new TextEncoder().encode(source));
  const clang = await api.getModule('clang');
  send({ type: 'status', text: 'Loading C linker…' });
  const lld = await api.getModule('lld');
  api.quiet = false;
  started();
  await api.run(clang, 'clang', '-cc1', '-emit-obj', '-triple', 'wasm32-unknown-wasi',
    '-isysroot', '/', '-internal-isystem', '/include', '-internal-isystem', '/lib/clang/8.0.1/include',
    '-ferror-limit', '8', '-fmessage-length', '80', '-O0', '-std=c11', '-o', object, '-x', 'c', input);
  await api.run(lld, 'wasm-ld', '--no-threads', '-z', 'stack-size=1048576',
    '--max-memory=' + RUN_LIMITS.cMemoryBytes, '-Llib/wasm32-wasi',
    'lib/wasm32-wasi/crt1.o', object, '-lc', '-lm', 'lib/clang/8.0.1/lib/wasi/libclang_rt.builtins-wasm32.a', '-o', output);
  const binary = boundWasmMemory(api.memfs.getFileContents(output), RUN_LIMITS.cMemoryBytes);
  await api.run(await WebAssembly.compile(binary), output);
}

self.onmessage = async event => {
  self.onmessage = null;
  const { language, source, assets } = event.data;
  try {
    if (language === 'javascript') await executeJavaScript(source, assets, emit, started);
    else if (language === 'python') await executePython(source, assets, emit, started);
    else if (language === 'c') await executeC(source, assets);
    else throw new Error('Unknown browser runtime.');
    send({ type: 'done' });
  } catch (error) {
    const message = String(error?.message || error).slice(0, RUN_LIMITS.outputChars);
    send({ type: /interrupted/.test(message) ? 'timeout' : 'error', error: message });
  }
};
