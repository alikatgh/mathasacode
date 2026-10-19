export const languages = ['javascript', 'python', 'c', 'rust'];
export const preferenceKey = 'math-as-code-language-v1';

export function readLanguage(storage, fallback) {
  try {
    const value = storage?.getItem(preferenceKey);
    return languages.includes(value) ? value : fallback;
  } catch { return fallback; }
}

export function saveLanguage(storage, language) {
  if (!languages.includes(language)) return false;
  try { storage?.setItem(preferenceKey, language); return Boolean(storage); }
  catch { return false; }
}

if (typeof document !== 'undefined') {
  const examples = Array.from(document.querySelectorAll('.code-example'));
  let storage;
  try { storage = window.localStorage; } catch { /* Reading and tabs work without storage. */ }

  function selectLanguage(language, anchor) {
    if (!languages.includes(language)) return;
    const top = anchor?.getBoundingClientRect().top;
    for (const example of examples) {
      for (const tab of example.querySelectorAll('[role="tab"]')) {
        const selected = tab.dataset.language === language;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      }
      for (const panel of example.querySelectorAll('[role="tabpanel"]')) {
        panel.hidden = panel.dataset.language !== language;
      }
    }
    document.dispatchEvent(new CustomEvent('code-language-change', { detail: { language } }));
    // Language changes can replace code viewers above this switcher. Adjust
    // only the pane that owns the reading position, never the guide's window.
    if (anchor && Number.isFinite(top)) {
      const adjustment = anchor.getBoundingClientRect().top - top;
      const viewport = anchor.closest('.reader-viewport');
      if (viewport) {
        const limit = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
        viewport.scrollTop = Math.min(limit, Math.max(0, viewport.scrollTop + adjustment));
      } else if (!document.body.classList.contains('has-focused-reader')) {
        window.scrollBy(0, adjustment);
      }
    }
  }

  for (const example of examples) {
    const tablist = example.querySelector('[role="tablist"]');
    tablist.addEventListener('click', event => {
      const tab = event.target.closest('[role="tab"]');
      if (!tab || !tablist.contains(tab)) return;
      selectLanguage(tab.dataset.language, tablist);
      saveLanguage(storage, tab.dataset.language);
    });
    tablist.addEventListener('keydown', event => {
      const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
      const current = tabs.indexOf(event.target);
      if (current < 0) return;
      const next = event.key === 'ArrowRight' ? (current + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (current + tabs.length - 1) % tabs.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
      if (next < 0) return;
      event.preventDefault();
      selectLanguage(tabs[next].dataset.language, tablist);
      tabs[next].focus({ preventScroll: true });
      saveLanguage(storage, tabs[next].dataset.language);
    });
  }
  if (examples.length) selectLanguage(readLanguage(storage, examples[0].dataset.defaultLanguage));
  window.addEventListener('storage', event => {
    if (event.key === preferenceKey && languages.includes(event.newValue)) {
      const visible = examples.find(example => {
        const rect = example.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight;
      });
      selectLanguage(event.newValue, visible);
    }
  });
}
