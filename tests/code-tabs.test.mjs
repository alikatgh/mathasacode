import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { Marked } from 'marked';
import { documents, renderDocument } from '../scripts/build.mjs';
import { getCodeExample, codeLanguages } from '../scripts/code-examples.mjs';
import { readLanguage, saveLanguage, preferenceKey } from '../site/code-tabs.mjs';
import { advanced, chineseOverrides } from '../site/snippets/advanced.mjs';

test('every guide code example has four real variants and preserves its authored language', async () => {
  for (const document of documents.slice(0, 3)) {
    const source = await readFile(new URL(`../${document.source}`, import.meta.url), 'utf8');
    const codes = new Marked().lexer(source).filter(token => token.type === 'code');
    for (const [index, token] of codes.entries()) {
      const example = getCodeExample(token.text, document.source);
      assert.ok(example, `${document.source} example ${index + 1}`);
      assert.equal(example.variants[example.nativeLanguage], token.text);
      for (const language of codeLanguages) assert.ok(example.variants[language]?.trim(), `${example.id}: ${language}`);
      assert.ok(new Set(codeLanguages.map(language => example.variants[language])).size > 1, `${example.id} must contain translations`);
    }
    const rendered = renderDocument(source, document);
    assert.equal(rendered.switcherCount, codes.length);
    assert.equal((rendered.html.match(/role="tab"/g) || []).length, codes.length * 4);
    assert.equal((rendered.html.match(/role="tabpanel"/g) || []).length, codes.length * 4);
    const ids = Array.from(rendered.html.matchAll(/\bid="([^"]+)"/g), match => match[1]);
    assert.equal(new Set(ids).size, ids.length, 'tabpanel and tab ids are unique');
    for (const [, target] of rendered.html.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g)) assert.ok(ids.includes(target));
    assert.equal((rendered.html.match(/aria-selected="true"/g) || []).length, codes.length);
    assert.equal((rendered.html.match(/data-language="[^"]+" hidden>/g) || []).length, codes.length * 3);
  }
  assert.equal(getCodeExample('a changed or new source example', 'README.md'), null);
});

test('language preference rejects unknown values and survives unavailable browser storage', () => {
  let saved;
  const storage = { getItem: key => key === preferenceKey ? saved : null, setItem: (key, value) => { assert.equal(key, preferenceKey); saved = value; } };
  assert.equal(readLanguage(storage, 'python'), 'python');
  assert.equal(saveLanguage(storage, 'rust'), true);
  assert.equal(readLanguage(storage, 'python'), 'rust');
  assert.equal(saveLanguage(storage, '<script>'), false);
  saved = 'unknown';
  assert.equal(readLanguage(storage, 'javascript'), 'javascript');
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } };
  assert.equal(readLanguage(blocked, 'python'), 'python');
  assert.equal(saveLanguage(blocked, 'c'), false);
  assert.equal(saveLanguage(undefined, 'c'), false);
});

test('new Python variants are valid Python without requiring extra dependencies', async () => {
  const snippets = [];
  for (const document of [documents[0], documents[2]]) {
    const source = await readFile(new URL(`../${document.source}`, import.meta.url), 'utf8');
    for (const token of new Marked().lexer(source).filter(token => token.type === 'code')) {
      snippets.push(getCodeExample(token.text, document.source).variants.python);
    }
  }
  const result = spawnSync('python3', ['-B', '-c', 'import ast,json,sys\nfor index,source in enumerate(json.load(sys.stdin)):\n try: ast.parse(source)\n except SyntaxError as error: raise SyntaxError(f"translation {index}: {error}")'], { input: JSON.stringify(snippets), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('translated numerical routines retain source edge cases and Chinese matrix inputs', () => {
  const cases = [
    { source: advanced[33].python, check: 'assert scope["is_natural_number"](10**1000) is True\nassert scope["is_natural_number"](True) is False' },
    { source: advanced[57].python, check: 'assert abs(scope["derivative"](lambda x:x*x,2,1e-5)-4)<1e-7\ntry: scope["derivative"](lambda x:x*x,2,1e-20)\nexcept ValueError: pass\nelse: raise AssertionError("unrepresentable step accepted")' },
    ...[advanced[61].python, chineseOverrides[62].python].map(source => ({ source, check: 'assert scope["lambertian_reflection"](.5,10,[0,0,1e300],[0,0,-1e300]) == 0\nassert abs(scope["lambertian_reflection"](.5,10,[0,0,1e300],[0,0,1e300])-5/math.pi)<1e-10' })),
    { source: chineseOverrides[52].python, check: 'assert scope["a"] == [[1,2],[3,4]]\nassert scope["b"] == [[5,6],[7,8]]\nassert scope["multiply_matrices"](scope["a"],scope["b"]) == [[19,22],[43,50]]' }
  ];
  const script = 'import json,sys,math,contextlib,io\nfor case in json.load(sys.stdin):\n scope={}\n with contextlib.redirect_stdout(io.StringIO()): exec(case["source"],scope)\n exec(case["check"],{"scope":scope,"math":math})';
  const result = spawnSync('python3', ['-B', '-c', script], { input: JSON.stringify(cases), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
