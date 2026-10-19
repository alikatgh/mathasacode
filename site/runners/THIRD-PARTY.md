# Browser runtimes

JavaScript uses QuickJS through quickjs-emscripten 0.31.0 (MIT), with its included
QuickJS interpreter (MIT), inside a Web Worker. The guest has console output and
the explicitly included modules only; no browser APIs are exposed. QuickJS heap
is limited to 64 MiB, stack to 1 MiB, and execution to 5 seconds.
Full wrapper and interpreter notices are retained in
[LICENSES/](LICENSES/README.md), including the exact installed QuickJS WASM
package's combined license. Its interpreter source is
[QuickJS revision 36911f0d](https://github.com/bellard/quickjs/tree/36911f0d3ab1a4c190a4d5cbe7c2db225a455389).

Python uses CPython 3.12.0 (Python Software Foundation License), compiled to
plain WASI by VMware's WebAssembly Language Runtimes (Apache 2.0 build scripts),
release python/3.12.0+20231211-040d5a6. Original distribution and build sources:
https://github.com/vmware-labs/webassembly-language-runtimes . Its WebAssembly
memory maximum is bounded to 128 MiB before compilation. The only guest imports
are WASI preview1 functions supplied by @bjorn3/browser_wasi_shim 0.4.2 (MIT or
Apache 2.0), with a fixed read-only virtual filesystem, 256 lifetime file
descriptors, 4096-byte WASI path limits and bounded output. No JavaScript interoperability exists in this
Python build. Optional external packages, file writes and interactive standard
input are unavailable. The guide helper examples/notation.py is included.
The last expression, when not None, is evaluated by CPython and repr-printed.
The complete [CPython 3.12.0 license](LICENSES/CPython-3.12.0-LICENSE.txt),
[incorporated-software notices](LICENSES/CPython-3.12.0-THIRD-PARTY.rst),
[VMware license](LICENSES/VMware-WLR-LICENSE.txt),
[VMware NOTICE](LICENSES/VMware-WLR-NOTICE.txt), WASI SDK 20 / wasi-libc
notices and both browser_wasi_shim license options are retained in
[LICENSES/](LICENSES/README.md).

C uses Ben Smith's wasm-clang/Clang 8.0.1 and LLD WebAssembly demonstration
(Apache 2.0 demonstration code, with separately licensed LLVM and standard
library components). Distribution and source:
https://github.com/binji/wasm-clang . The original Apache-licensed shared.js is
retained unchanged; the build applies the host adapter described below and
exports API as self.MACClangAPI. It receives a real C11
translation unit, compiles it with Clang, links with LLD, then runs the resulting
WebAssembly with an in-memory WASI filesystem. Compiler memory is capped at
256 MiB per module; program memory is capped at 64 MiB. This is an older compiler
and does not implement every native operating-system feature.
The distributor's complete [Apache license](LICENSES/wasm-clang-LICENSE.txt)
and [LLVM license/legacy notices](LICENSES/wasm-clang-LLVM-LICENSE.txt) accompany
the exact LLVM/Clang/LLD 8.0.1 license texts in [LICENSES/](LICENSES/README.md).
The 8.0.1 texts retain the University of Illinois/NCSA license, with MIT as an
option for libc++, libc++abi and compiler-rt; they must not be described solely
by the licensing used in newer LLVM releases.

Original downloaded runtime bytes, URLs, and SHA-256 digests are recorded in
runtime-lock.json. Build verifies them, compresses static runtime assets, and
records the deployed bytes in manifest.json. Runtime files and the worker use
content-hashed names; the parent verifies their lengths and SHA-256 digests before
execution. Runtime bytes are fetched by the
parent page and transferred into an opaque sandbox/worker with network disabled.
No edited source is sent to a server for JavaScript, Python, or C. Each run starts
a new worker and filesystem. Time/output/source limits and Stop tear down the
worker. The limits bound runtime heaps, not the whole browser tab or host browser.

Earlier Pyodide 0.27.7 downloads are retained as unused original inputs in
vendor/pyodide; they are excluded from the deployed manifest. Their JavaScript
interoperability allowed native allocations beyond the Python linear heap, so
the released runner uses plain WASI CPython instead.
Pyodide 0.27.7 is covered by [MPL 2.0](LICENSES/Pyodide-0.27.7-LICENSE.txt).
These retained files have no project modifications. The corresponding source
form, including its build recipes, is available at no charge from
[the Pyodide 0.27.7 source tree](https://github.com/pyodide/pyodide/tree/0.27.7).
Its pinned CPython 3.12.7, Emscripten 3.1.58, libffi, hiwire, stackframe,
zlib, bzip2 and MiniLZ4 notices are also retained in [LICENSES/](LICENSES/README.md).

The JavaScript guest bundles mathjs 15.2.0 (Apache 2.0), gl-mat2 1.0.1 (zlib),
nextafter 1.0.0 (MIT), interval-arithmetic 1.1.3 (Boost Software License 1.0),
their dependencies, and the project's examples/notation.cjs. The bundler retains
source notices, and complete package license files plus mathjs NOTICE are
retained in [LICENSES/](LICENSES/README.md). Python receives the project's
examples/notation.py.

Rust is compiled/executed by the existing public Rust Playground service:
https://play.rust-lang.org . A manual Run sends the editor's current source
there with credentials omitted, no automatic retry, a 10 second request cooldown,
a 20 second client timeout, and bounded responses. Source must not include private
data. Stop cancels the browser's request and waiting; it cannot guarantee server
cancellation. The service documents network isolation and container memory/time
limits, without a guaranteed availability contract or published deployed numeric
caps: https://github.com/rust-lang/rust-playground#resource-limits .

The build applies a checked host adapter to the original Clang shared.js: bounded string reads, at most 1,024 stdout buffers and 32 KiB copied per call, and streamed UTF-8 output. The pinned downloaded source remains intact.
