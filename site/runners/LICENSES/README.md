# Runtime licenses and notices

These notices accompany the original runtime inputs and the browser runtime
assets. They do not change the project's MIT license or the terms of third-party
components. Keep this directory with redistributed runtime assets.

The [upstream provenance record](upstream-provenance.json) maps each fetched text
to its official, versioned source URL. It identifies the few notices extracted
from source-file comment blocks. The [npm provenance record](npm-provenance.json)
maps notices copied from the installed, lockfile-pinned packages to their package
archive and original member path. Both records include byte lengths and SHA-256
digests of the retained texts.

| Runtime or component | Retained notices |
| --- | --- |
| WASI CPython 3.12.0 | [PSF and historical licenses](CPython-3.12.0-LICENSE.txt), [incorporated-software notices](CPython-3.12.0-THIRD-PARTY.rst) |
| VMware WebAssembly Language Runtimes, release `python/3.12.0+20231211-040d5a6` | [Apache 2.0](VMware-WLR-LICENSE.txt), [NOTICE](VMware-WLR-NOTICE.txt) |
| WASI SDK 20 and wasi-libc tag `wasi-sdk-20` | [SDK license](WASI-SDK-20-LICENSE.txt), [wasi-libc license map](wasi-libc-sdk20-LICENSE.txt), its Apache/LLVM, Apache and MIT texts, cloudlibc, musl and allocator notices |
| Ben Smith's wasm-clang distribution | [Apache 2.0](wasm-clang-LICENSE.txt), [complete distributed LLVM notice](wasm-clang-LLVM-LICENSE.txt), [stb_sprintf notice](wasm-clang-stb_sprintf-LICENSE.txt) |
| LLVM, Clang and LLD 8.0.1 | [LLVM](LLVM-8.0.1-LICENSE.txt), [Clang](Clang-8.0.1-LICENSE.txt), [LLD](LLD-8.0.1-LICENSE.txt), separate libc++, libc++abi, compiler-rt and libunwind licenses, OpenBSD regex, MD5 and ARM notices |
| Retained, unused Pyodide 0.27.7 | [MPL 2.0](Pyodide-0.27.7-LICENSE.txt), [vendored stackframe/error-stack-parser notice](Pyodide-0.27.7-stackframe-LICENSE.txt), CPython 3.12.7 licenses and incorporated-software notices |
| Pyodide's pinned build dependencies | Emscripten 3.1.58 and its authors, musl, libc++, libc++abi, compiler-rt and MiniLZ4 notices; exact pinned libffi and hiwire licenses; zlib 1.2.13 and bzip2 1.0.6 licenses |
| QuickJS browser runner | quickjs-emscripten 0.31.0 license and the combined wrapper/QuickJS interpreter license from `@jitl/quickjs-wasmfile-release-sync@0.31.0` |
| WASI browser adapter | Both license options supplied by `@bjorn3/browser_wasi_shim@0.4.2` |
| JavaScript guest modules | mathjs 15.2.0 license and NOTICE; gl-mat2 1.0.1 zlib license; nextafter 1.0.0 MIT license; interval-arithmetic 1.1.3 Boost license; notices from their installed dependency closure |

Pyodide's matching source form and build recipes are available without charge
at <https://github.com/pyodide/pyodide/tree/0.27.7>. The retained Pyodide inputs are
unmodified, unused by the released runner, and excluded from its runtime manifest.
Its versioned `Makefile.envs` pins CPython 3.12.7 and Emscripten 3.1.58;
`cpython/Makefile` pins the libffi and hiwire revisions recorded in the provenance
record. Emscripten 3.1.58's port recipes pin the zlib and bzip2 versions above.

The wasm-clang distribution notices were obtained from its official repository
at revision `648c4a89997a351eef75cdaec3ef5b89d4937dec`. Original runtime bytes,
download URLs and integrity hashes are separately recorded in
`../runtime-lock.json`. The download does not identify an exact source revision
for every object in its 2019 sysroot. The distributor's full notice and LLVM
8.0.1 component notices are retained without asserting a complete reconstruction
of that binary's component provenance. The WASI SDK 20 notices correspond to the
named Python distribution, not a claim that the older Clang sysroot used SDK 20.

The upstream CPython incorporated-software documents describe their own list as
incomplete. Retaining these official notices is not a claim that every optional
library in every upstream build has been independently inventoried.
