import RELEASE_SYNC from '@jitl/quickjs-wasmfile-release-sync';
import { newVariant, newQuickJSWASMModuleFromVariant } from 'quickjs-emscripten-core';
import { RUN_LIMITS } from './limits.mjs';
import { instrumentJavaScript, javascriptTraceBootstrap } from './trace-javascript.mjs';
import { createTraceCollector } from './trace-runtime.mjs';

export async function executeJavaScript(source, assets, emit, started = () => {}, options = {}) {
  const trace = createTraceCollector(options);
  let instrumented;
  try { instrumented = options.trace ? instrumentJavaScript(source) : null; }
  catch (error) { Object.assign(error, trace.status); throw error; }
  const variant = newVariant(RELEASE_SYNC, { wasmBinary: assets['quickjs.wasm'] });
  const engine = await newQuickJSWASMModuleFromVariant(variant);
  const runtime = engine.newRuntime();
  runtime.setMemoryLimit(RUN_LIMITS.javascriptMemoryBytes);
  runtime.setMaxStackSize(1024 * 1024);
  let deadline = Date.now() + RUN_LIMITS.executionMs;
  runtime.setInterruptHandler(() => Date.now() > deadline);
  const context = runtime.newContext();
  try {
    const print = context.newFunction('__macPrint', value => {
      emit(context.getString(value));
      return context.undefined;
    });
    context.setProp(context.global, '__macPrint', print);
    print.dispose();
    context.unwrapResult(context.evalCode(`
      globalThis.console = Object.fromEntries(['log','info','warn','error','debug'].map(name => [name, (...args) => {
        const seen = new WeakSet();
        const text = args.map(value => {
          if (typeof value === 'string') return value;
          if (typeof value === 'undefined') return 'undefined';
          if (typeof value === 'bigint') return value.toString() + 'n';
          try { return JSON.stringify(value, (key, item) => {
            if (typeof item === 'bigint') return item.toString() + 'n';
            if (item && typeof item === 'object') { if (seen.has(item)) return '[Circular]'; seen.add(item); }
            return item;
          }) ?? String(value); } catch { return String(value); }
        }).join(' ');
        __macPrint(text.slice(0, ${RUN_LIMITS.outputChars + 1}) + '\\n');
      }]));
      console.assert = (condition, ...args) => { if (!condition) console.error('Assertion failed:', ...args); };
    `)).dispose();
    if (assets['guest-modules.js']) {
      context.unwrapResult(context.evalCode(new TextDecoder().decode(assets['guest-modules.js']), 'included-modules.js')).dispose();
      context.unwrapResult(context.evalCode('globalThis.require = MACModules.require;')).dispose();
    }
    if (instrumented) {
      const nativeName = `${instrumented.helper}Send`;
      const send = context.newFunction(nativeName, value => {
        const text = context.getString(value);
        if (text.length <= 32768) trace.receive(JSON.parse(text));
        return context.undefined;
      });
      context.setProp(context.global, nativeName, send);
      send.dispose();
      context.unwrapResult(context.evalCode(javascriptTraceBootstrap(instrumented.helper, nativeName), 'trace-bootstrap.js')).dispose();
    }
    deadline = Date.now() + RUN_LIMITS.executionMs;
    started();
    const result = context.evalCode(instrumented?.source ?? source, 'example.js');
    if (result.error) {
      const error = context.dump(result.error);
      result.error.dispose();
      throw new Error(typeof error === 'object' ? `${error.name || 'Error'}: ${error.message || JSON.stringify(error)}${error.stack ? `\n${error.stack}` : ''}` : String(error));
    }
    if (context.typeof(result.value) !== 'undefined') {
      context.setProp(context.global, '__macResult', result.value);
      context.unwrapResult(context.evalCode('console.log(__macResult);')).dispose();
    }
    result.value.dispose();
    while (runtime.hasPendingJob()) {
      const jobs = runtime.executePendingJobs();
      if (jobs.error) {
        const error = context.dump(jobs.error);
        jobs.error.dispose();
        throw new Error(error?.message || String(error));
      }
    }
    return trace.status;
  } catch (error) {
    Object.assign(error, trace.status);
    throw error;
  } finally {
    context.dispose();
    runtime.dispose();
  }
}
