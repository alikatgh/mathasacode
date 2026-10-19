export const RUN_LIMITS = Object.freeze({
  sourceBytes: 65536,
  outputChars: 32768,
  executionMs: 5000,
  loadingMs: 90000,
  remoteMs: 20000,
  remoteCooldownMs: 10000,
  javascriptMemoryBytes: 64 * 1024 * 1024,
  pythonMemoryBytes: 128 * 1024 * 1024,
  cMemoryBytes: 64 * 1024 * 1024,
  compilerMemoryBytes: 256 * 1024 * 1024,
});

export function validateRun(language, source) {
  if (!['javascript', 'python', 'c', 'rust'].includes(language)) throw new Error('Choose JavaScript, Python, C, or Rust.');
  if (typeof source !== 'string') throw new Error('Source must be text.');
  if (new TextEncoder().encode(source).length > RUN_LIMITS.sourceBytes) throw new Error('Code is limited to 64 KB.');
}

export function outputBuffer(limit = RUN_LIMITS.outputChars) {
  let text = '';
  return {
    append(chunk) {
      const remaining = limit - text.length;
      const value = String(chunk);
      text += value.slice(0, Math.max(0, remaining));
      return value.length > remaining;
    },
    get text() { return text; },
  };
}

function readUleb(bytes, cursor) {
  let value = 0;
  let shift = 0;
  for (let count = 0; count < 5 && cursor.pos < bytes.length; count++) {
    const next = bytes[cursor.pos++];
    value += (next & 127) * 2 ** shift;
    if (!(next & 128)) return value;
    shift += 7;
  }
  throw new Error('Invalid WebAssembly integer.');
}

function uleb(value) {
  const bytes = [];
  do {
    let next = value & 127;
    value = Math.floor(value / 128);
    if (value) next |= 128;
    bytes.push(next);
  } while (value);
  return bytes;
}

/** Cap internally defined wasm32 memory before compilation, including Pyodide's heap. */
export function boundWasmMemory(input, maxBytes) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 8 || bytes[0] !== 0 || bytes[1] !== 97 || bytes[2] !== 115 || bytes[3] !== 109) throw new Error('Invalid WebAssembly binary.');
  const maxPages = Math.floor(maxBytes / 65536);
  const chunks = [bytes.subarray(0, 8)];
  const cursor = { pos: 8 };
  let bounded = false;
  while (cursor.pos < bytes.length) {
    const sectionStart = cursor.pos;
    const id = bytes[cursor.pos++];
    const length = readUleb(bytes, cursor);
    const end = cursor.pos + length;
    if (end > bytes.length) throw new Error('Invalid WebAssembly section.');
    if (id === 5) {
      const count = readUleb(bytes, cursor);
      if (count !== 1) throw new Error('Only one WebAssembly memory is supported.');
      const flags = readUleb(bytes, cursor);
      if (flags > 1) throw new Error('Shared or 64-bit WebAssembly memory is unavailable.');
      const minimum = readUleb(bytes, cursor);
      const originalMax = flags & 1 ? readUleb(bytes, cursor) : maxPages;
      if (minimum > maxPages || cursor.pos !== end) throw new Error('WebAssembly memory exceeds the runner limit.');
      const body = new Uint8Array([1, 1, ...uleb(minimum), ...uleb(Math.min(originalMax, maxPages))]);
      chunks.push(new Uint8Array([5, ...uleb(body.length)]), body);
      bounded = true;
    } else chunks.push(bytes.subarray(sectionStart, end));
    cursor.pos = end;
  }
  if (!bounded) throw new Error('The runtime must define its own bounded WebAssembly memory.');
  const result = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}
