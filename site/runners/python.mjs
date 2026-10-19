import { WASI, File, OpenFile, Directory, PreopenDirectory, ConsoleStdout, wasi as defs } from '@bjorn3/browser_wasi_shim';
import { RUN_LIMITS, boundWasmMemory } from './limits.mjs';

const bootstrap = `import ast
_source = open('/example.py', encoding='utf-8').read()
_tree = ast.parse(_source, filename='example.py')
_namespace = {'__name__': '__main__', '__file__': '/example.py'}
if _tree.body and isinstance(_tree.body[-1], ast.Expr):
    _last = _tree.body.pop()
    exec(compile(_tree, 'example.py', 'exec'), _namespace)
    _value = eval(compile(ast.Expression(_last.value), 'example.py', 'eval'), _namespace)
    if _value is not None:
        print(repr(_value))
else:
    exec(compile(_tree, 'example.py', 'exec'), _namespace)
`;

/** CPython compiled to plain WASI: guest code has no JavaScript interoperability. */
export async function executePython(source, assets, emit, started = () => {}) {
  const readonly = bytes => new File(bytes, { readonly: true });
  const text = value => readonly(new TextEncoder().encode(value));
  const directory = entries => new Directory(new Map(entries));
  const root = new PreopenDirectory('/', new Map([
    ['usr', directory([['local', directory([['lib', directory([
      ['python312.zip', readonly(assets['python312.zip'])],
      ['python3.12', directory([['os.py', readonly(assets['os.py'])], ['lib-dynload', directory([])]])],
    ])]])]])],
    ['examples', directory([['__init__.py', text('')], ['notation.py', readonly(assets['notation.py'])]])],
    ['example.py', text(source)],
  ]));
  const engine = new WASI(['python', '-B', '-c', bootstrap], [
    'PYTHONHOME=/usr/local', 'PYTHONPATH=/:/usr/local/lib/python312.zip',
    'PYTHONIOENCODING=utf-8', 'PYTHONDONTWRITEBYTECODE=1',
  ], [new OpenFile(readonly(new Uint8Array())), new ConsoleStdout(() => {}), new ConsoleStdout(() => {}), root], { debug: false });
  const imports = engine.wasiImport;
  // The fixed virtual filesystem cannot grow, allocate, truncate, or create files.
  for (const operation of ['fd_allocate', 'fd_filestat_set_size', 'fd_pwrite', 'path_create_directory',
    'path_filestat_set_times', 'path_link', 'path_remove_directory', 'path_rename', 'path_symlink', 'path_unlink_file']) {
    imports[operation] = () => defs.ERRNO_ROFS;
  }
  const open = imports.path_open;
  imports.path_open = (...args) => {
    // WASI ABI: fd, dirflags, path_ptr, path_len, oflags, rights, ... .
    if ((args[3] >>> 0) > 4096) return defs.ERRNO_NAMETOOLONG;
    if (engine.fds.length >= 256) return defs.ERRNO_MFILE;
    if (args[4] & (defs.OFLAGS_CREAT | defs.OFLAGS_TRUNC)) return defs.ERRNO_ROFS;
    return open(...args);
  };
  const stat = imports.path_filestat_get;
  const readlink = imports.path_readlink;
  // Guard byte lengths before the shim decodes or splits user-supplied paths.
  imports.path_filestat_get = (...args) => (args[3] >>> 0) > 4096 ? defs.ERRNO_NAMETOOLONG : stat(...args);
  imports.path_readlink = (...args) => (args[2] >>> 0) > 4096 ? defs.ERRNO_NAMETOOLONG : readlink(...args);
  const read = imports.fd_read;
  const pread = imports.fd_pread;
  imports.fd_read = (...args) => args[2] > 1024 ? defs.ERRNO_INVAL : read(...args);
  imports.fd_pread = (...args) => args[2] > 1024 ? defs.ERRNO_INVAL : pread(...args);
  const decoders = [null, new TextDecoder(), new TextDecoder()];
  imports.fd_write = (fd, iovs, count, written) => {
    if (fd !== 1 && fd !== 2) return defs.ERRNO_ROFS;
    if (count > 1024) return defs.ERRNO_INVAL;
    const memory = engine.inst.exports.memory.buffer;
    const view = new DataView(memory);
    let total = 0;
    for (let index = 0; index < count; index++) {
      const pointer = view.getUint32(iovs + index * 8, true);
      const length = view.getUint32(iovs + index * 8 + 4, true);
      const limited = Math.min(length, RUN_LIMITS.outputChars + 1);
      emit(decoders[fd].decode(new Uint8Array(memory, pointer, limited), { stream: true }));
      if (length > limited) throw new Error('Output stopped at 32 KB.');
      total += length;
    }
    view.setUint32(written, total, true);
    return 0;
  };
  const binary = boundWasmMemory(assets['python.wasm'], RUN_LIMITS.pythonMemoryBytes);
  const module = await WebAssembly.compile(binary);
  const declared = WebAssembly.Module.imports(module);
  if (declared.some(item => item.module !== 'wasi_snapshot_preview1' || item.kind !== 'function')) throw new Error('Unexpected Python host import.');
  const instance = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: imports });
  started();
  const exitCode = engine.start(instance);
  if (exitCode !== 0) throw new Error(`Python exited with code ${exitCode}. See the output.`);
}
