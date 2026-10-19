export const PROGRESS_KEY = 'math-as-code-progress-v1';
const PREFIX = PROGRESS_KEY + ':';

// Each topic has its own key: unrelated completions cannot overwrite each other.
export function createProgressStore(activityIds, accessStorage = () => globalThis.localStorage) {
  const known = new Set(activityIds);
  const pending = new Set();
  function read() {
    const completed = new Set(pending);
    try {
      const storage = accessStorage();
      const legacy = storage.getItem(PROGRESS_KEY);
      if (typeof legacy === 'string' && legacy.length <= 16000) {
        try {
          const values = JSON.parse(legacy);
          if (Array.isArray(values)) for (const id of values) if (known.has(id)) completed.add(id);
        } catch { /* A corrupt legacy value does not prevent per-topic reads. */ }
      }
      for (const id of known) if (storage.getItem(PREFIX + id) === '1') completed.add(id);
      return { completed, available: pending.size === 0 };
    } catch {
      return { completed, available: false };
    }
  }
  function complete(id) {
    if (!known.has(id)) throw new RangeError('Unknown practice topic');
    pending.add(id);
    const state = read();
    try {
      const storage = accessStorage();
      for (const topic of [...pending]) {
        storage.setItem(PREFIX + topic, '1');
        pending.delete(topic);
      }
      state.available = pending.size === 0;
    } catch {
      state.available = false;
    }
    return state;
  }
  const isProgressKey = key => key === PROGRESS_KEY || (typeof key === 'string' && key.startsWith(PREFIX) && known.has(key.slice(PREFIX.length)));
  return { read, complete, isProgressKey };
}
