import { TRACE_LIMITS } from './trace-runtime.mjs';

/** Capture CPython's real line/return events in its WASI guest, never custom repr. */
export function pythonTraceBootstrap(marker) {
  return `import sys as _trace_sys, json as _trace_json
def _make_tracer():
    _write = _trace_sys.stdout.write
    _flush = _trace_sys.stdout.flush
    _dumps = _trace_json.dumps
    _type, _repr, _id, _len = type, repr, id, len
    _dict_items = dict.items
    _bool, _float, _int, _str, _bytes_type = bool, float, int, str, bytes
    _list, _tuple, _dict, _enumerate, _int_bits = list, tuple, dict, enumerate, int.bit_length
    _count = 0
    _bytes = 0
    _enabled = True
    def _preview(value, depth=0, seen=()):
        kind = _type(value)
        if value is None:
            return 'None'
        if kind is _bool or kind is _float:
            return _repr(value)
        if kind is _int:
            return _repr(value) if _int_bits(value) < 1024 else '<integer; more than 1024 bits>'
        if kind is _str or kind is _bytes_type:
            text = _repr(value[:${Math.floor(TRACE_LIMITS.valueChars / 2)}])
            return text[:${TRACE_LIMITS.valueChars - 1}] + '…' if _len(text) > ${TRACE_LIMITS.valueChars} or _len(value) > ${Math.floor(TRACE_LIMITS.valueChars / 2)} else text
        if kind is not _list and kind is not _tuple and kind is not _dict:
            return '<object; preview omitted>'
        identity = _id(value)
        if identity in seen:
            return '<cycle>'
        if depth >= 2:
            return '[…]' if kind is _list else '(…)' if kind is _tuple else '{…}'
        opening, closing = ('[', ']') if kind is _list else ('(', ')') if kind is _tuple else ('{', '}')
        text = opening
        items = _dict_items(value) if kind is _dict else value
        for index, item in _enumerate(items):
            if index >= 8:
                text += ', …'
                break
            if index:
                text += ', '
            if kind is _dict:
                text += _preview(item[0], depth + 1, seen + (identity,)) + ': ' + _preview(item[1], depth + 1, seen + (identity,))
            else:
                text += _preview(item, depth + 1, seen + (identity,))
            if _len(text) > ${TRACE_LIMITS.valueChars}:
                break
        text += closing
        return text[:${TRACE_LIMITS.valueChars - 1}] + '…' if _len(text) > ${TRACE_LIMITS.valueChars} else text
    def _trace(frame, event, argument):
        nonlocal _count, _bytes, _enabled
        if not _enabled or frame.f_code.co_filename != 'example.py':
            return None
        if event != 'line' and event != 'return':
            return _trace
        if _count >= ${TRACE_LIMITS.frames}:
            _enabled = False
            _write(${JSON.stringify(marker)} + '{"truncated":true}\\n')
            _flush()
            return None
        values = {}
        for name, value in _dict_items(frame.f_locals):
            if _type(name) is not _str or name.startswith('__'):
                continue
            if _len(values) >= ${TRACE_LIMITS.locals}:
                break
            values[name] = _preview(value)
        if event == 'return':
            values['(return)'] = _preview(argument)
        record = _dumps({'line': frame.f_lineno, 'event': event, 'locals': values}, ensure_ascii=True, separators=(',', ':'))
        if _bytes + _len(record) > ${TRACE_LIMITS.bytes}:
            _enabled = False
            _write(${JSON.stringify(marker)} + '{"truncated":true}\\n')
            _flush()
            return None
        _count += 1
        _bytes += _len(record)
        _write(${JSON.stringify(marker)} + record + '\\n')
        _flush()
        return _trace
    return _trace
`;
}

/** Demultiplex bounded reserved records even across writes and partial prefixes. */
export function createPythonTraceOutput(marker, collector, emit) {
  const pending = new Map();
  return {
    append(fd, chunk) {
      let text = (pending.get(fd) ?? '') + chunk;
      while (text) {
        const start = text.indexOf(marker);
        if (start < 0) {
          let keep = 0;
          for (let size = Math.min(marker.length - 1, text.length); size > 0; size--) {
            if (text.endsWith(marker.slice(0, size))) { keep = size; break; }
          }
          emit(text.slice(0, text.length - keep));
          text = keep ? text.slice(-keep) : '';
          break;
        }
        if (start) { emit(text.slice(0, start)); text = text.slice(start); }
        const end = text.indexOf('\n', marker.length);
        if (end < 0) {
          if (text.length > marker.length + TRACE_LIMITS.bytes) { emit(text); text = ''; }
          break;
        }
        const record = text.slice(marker.length, end);
        try { collector.receive(JSON.parse(record)); }
        catch { emit(text.slice(0, end + 1)); }
        text = text.slice(end + 1);
      }
      pending.set(fd, text);
    },
    flush() {
      for (const text of pending.values()) if (text) emit(text);
      pending.clear();
    },
  };
}
