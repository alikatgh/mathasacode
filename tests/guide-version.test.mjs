import test from 'node:test';
import assert from 'node:assert/strict';
import { guideVersionValue, guideVersionTarget } from '../site/guide-version.mjs';

test('C and Rust change the English reference and ML examples in place across canonical routes', () => {
  for (const value of ['c', 'rust']) {
    for (const pathname of ['/', '/index', '/index.html', '/index/', '/machine-learning', '/machine-learning.html', '/machine-learning.html/']) {
      assert.deepEqual(guideVersionTarget(pathname, value), { path: null, language: value });
      assert.equal(guideVersionValue(pathname, value), value);
    }
  }
});

test('the authored Python and Chinese guides keep their routes while C and Rust use the English reference', () => {
  for (const suffix of ['', '.html', '/', '.html/']) {
    for (const value of ['c', 'rust']) {
      for (const pathname of [`/PYTHON-README${suffix}`, `/README-zh${suffix}`]) {
        assert.deepEqual(guideVersionTarget(pathname, value), { path: '/', language: value });
      }
    }
    assert.deepEqual(guideVersionTarget(`/PYTHON-README${suffix}`, 'python'), { path: null, language: 'python' });
    assert.equal(guideVersionValue(`/README-zh${suffix}`, 'rust'), 'zh', 'code choices do not relabel Chinese prose');
  }
  assert.deepEqual(guideVersionTarget('/', 'python'), { path: '/PYTHON-README.html', language: 'python' });
  assert.deepEqual(guideVersionTarget('/', 'zh'), { path: '/README-zh.html', language: null });
  assert.deepEqual(guideVersionTarget('/PYTHON-README', 'javascript'), { path: '/', language: 'javascript' });
  assert.deepEqual(guideVersionTarget('/machine-learning', 'python'), { path: null, language: 'python' });
});

test('the JavaScript-only symbol sheet and project pages cannot be labelled as C or Rust guides', () => {
  for (const pathname of ['/cheatsheet', '/cheatsheet.html/', '/blog', '/changelog.html']) {
    for (const value of ['c', 'rust']) {
      assert.equal(guideVersionValue(pathname, value), 'javascript');
      assert.deepEqual(guideVersionTarget(pathname, value), { path: '/', language: value });
    }
  }
  assert.equal(guideVersionTarget('/', 'unknown'), null);
  assert.equal(guideVersionValue('/', 'unknown'), 'javascript');
});
