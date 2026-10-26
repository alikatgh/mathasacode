import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import { renderCurriculumDiagram, CURRICULUM_DIAGRAM_LIMITS as limits } from '../site/diagrams.mjs';

const contentRoot = fileURLToPath(new URL('../content/', import.meta.url));
const marked = new Marked();

function mermaidBlocks(markdown) {
  const sources = [];
  marked.walkTokens(marked.lexer(markdown), token => {
    if (token.type === 'code' && token.lang?.trim().split(/\s/)[0].toLowerCase() === 'mermaid') sources.push(token.text);
  });
  return sources;
}

function inventory(directory = contentRoot) {
  const entries = [];
  for (const file of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, file.name);
    if (file.isDirectory()) entries.push(...inventory(path));
    else if (/\.md$/i.test(file.name)) {
      mermaidBlocks(readFileSync(path, 'utf8')).forEach((source, index) => entries.push({ path: relative(contentRoot, path), index, source }));
    }
  }
  return entries;
}

function textInSVG(svg) {
  return svg.replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

function readableSVG(result) {
  assert.ok(result.width > 0 && result.height > 0);
  assert.match(result.svg, new RegExp(`viewBox="0 0 ${result.width} ${result.height}"`));
  assert.match(result.svg, new RegExp(`width="${result.width}" height="${result.height}"`));
  assert.match(result.svg, /font:14px /);
  assert.match(result.svg, /var\(--pele-(?:fg|bg)/);
  assert.doesNotMatch(result.svg, /(?:width|max-width):100%|<foreignObject\b|<image\b|<a\b/i);
  assert.deepEqual(result.links, []);
}

test('Markdown inventory includes nested Mermaid fences without mistaking other code for diagrams', () => {
  const nested = '> ```mermaid\n> graph LR\n> A --> B\n> ```\n\n- item\n\n  ```mermaid\n  graph TD\n  B --> C\n  ```\n\n```text\ngraph LR\nC --> D\n```';
  assert.deepEqual(mermaidBlocks(nested), ['graph LR\nA --> B', 'graph TD\nB --> C']);
});

test('Newton versus gradient descent keeps every authored label readable at desktop and narrow widths', async () => {
  const path = join(contentRoot, 'phases/01-math-foundations/18-convex-optimization/docs/en.md');
  const source = mermaidBlocks(readFileSync(path, 'utf8')).find(source => source.includes('GD_note'));
  assert.ok(source, 'the reported diagram must come from the imported lesson');
  const original = source;
  for (const width of [720, 320]) {
    const result = await renderCurriculumDiagram(source, { width, idPrefix: `newton-${width}` });
    readableSVG(result);
    assert.equal(result.type, 'flowchart');
    assert.ok(result.width <= width, `${result.width}px diagram should fit ${width}px`);
    assert.ok(result.height < 1600);
    assert.equal(result.overflow, false);
    assert.equal(result.adaptedLabels, false);
    const text = textInSVG(result.svg);
    for (const label of ['Gradient Descent', "Newton's Method", 'Step ~500: Converged', 'Step ~5: Converged', 'Follows gradient blindly — many small steps', 'Uses curvature for optimal steps']) {
      assert.ok(text.includes(label), `${width}px: missing label ${label}`);
    }
    assert.equal((result.svg.match(/class="pele-edge"/g) || []).length, 7);
  }
  assert.equal(source, original);
});

test('graph nodes, edges and literal HTML-like label formatting become local SVG', async () => {
  const result = await renderCurriculumDiagram('graph LR\nA["Input<br/><sub>raw observations</sub>"] -->|transform| B{"Ready?"}\nB --> C["Output"]');
  readableSVG(result);
  assert.equal(result.type, 'flowchart');
  assert.match(textInSVG(result.svg), /Input raw observations.*transform|transform.*Input raw observations/);
  assert.ok(textInSVG(result.svg).includes('Ready?'));
  assert.doesNotMatch(result.svg, /<br\b|<sub\b/i);
  assert.equal((result.svg.match(/class="pele-edge"/g) || []).length, 2);
});

test('all imported diagram families, and a type outside the current corpus, load lazily', async () => {
  const sources = {
    sequence: 'sequenceDiagram\nparticipant A as Learner\nparticipant B as Tutor\nA->>B: Question\nB-->>A: Explanation',
    state: 'stateDiagram-v2\n[*] --> Ready\nReady --> Complete: submit\nComplete --> [*]',
    class: 'classDiagram\nclass Artifact {\n+validate()\n}\nArtifact <|-- Report',
    timeline: 'timeline\ntitle Learning route\nSetup : Environment\nBuild : Artifact',
    pie: 'pie title Verification\n"Passed" : 8\n"Pending" : 2',
  };
  for (const [type, source] of Object.entries(sources)) {
    const result = await renderCurriculumDiagram(source, { width: 320 });
    assert.equal(result.type, type);
    readableSVG(result);
  }
});

test('literal @ parser compatibility changes only simple unquoted labels after the specific parse failure', async () => {
  const source = 'flowchart LR\nA["Preserve B[Recall@k]"] --> B[Recall@k vs Gold Spans]\n%% C[Do not rewrite this@k]\nB --> C["Done"]';
  const adapted = await renderCurriculumDiagram(source);
  const quoted = await renderCurriculumDiagram(source.replace('B[Recall@k vs Gold Spans]', 'B["Recall@k vs Gold Spans"]'));
  assert.equal(adapted.adaptedLabels, true);
  assert.equal(quoted.adaptedLabels, false);
  assert.equal(adapted.svg, quoted.svg);
  assert.ok(textInSVG(adapted.svg).includes('Preserve B[Recall@k]'));
  assert.ok(textInSVG(adapted.svg).includes('Recall@k vs Gold Spans'));
  await assert.rejects(renderCurriculumDiagram('flowchart LR\nA --> B[Recall@k\nC --> D'), /Parse error/);
});

test('presentation init metadata cannot override site colors, font size or rendering limits', async () => {
  const plain = 'flowchart LR\nA[Input] --> B[Output]';
  const source = "%%{init: {'theme':'base','themeVariables':{'primaryColor':'red','fontSize':'2px'}}}%%\n" + plain;
  const [actual, expected] = await Promise.all([renderCurriculumDiagram(source), renderCurriculumDiagram(plain)]);
  assert.equal(actual.ignoredConfiguration, true);
  assert.equal(expected.ignoredConfiguration, false);
  assert.equal(actual.svg, expected.svg);
  readableSVG(actual);
  assert.doesNotMatch(actual.svg, /font:2px|primaryColor/);
});

test('unsafe directives, navigation, images, icons and executable markup reject for source fallback', async () => {
  const unsafe = [
    '%%{init: {"securityLevel":"loose"}}%%\ngraph LR\nA --> B',
    '%%{init: {"flowchart":{"htmlLabels":true}}}%%\ngraph LR\nA --> B',
    '%%{config: {"theme":"dark"}}%%\ngraph LR\nA --> B',
    '%%{init: {"theme":"dark"}\ngraph LR\nA --> B',
    '---\nconfig:\n  htmlLabels: true\n---\ngraph LR\nA --> B',
    'graph LR\nA --> B\nclick A "https://outside.test"',
    'graph LR\nA --> B; click A call callback()',
    'sequenceDiagram\nparticipant A\nlink A: Docs @ https://outside.test',
    'classDiagram\nclass A\nlink A "https://outside.test"',
    'graph LR\nA@{ img: "https://outside.test/image.png" }',
    'graph LR\nA@{ icon: "logos:github" }',
    'mindmap\n  root((Learning))\n    Child\n    ::icon(fa fa-book)',
    'graph LR\nA["![asset](https://outside.test/image.png)"]',
    'graph LR\nA["<img src=\"https://outside.test/image.png\" onerror=\"run()\">"]',
    'graph LR\nA["<a href=\"javascript:run()\">click</a>"]',
    'graph LR\nA["<script>run()</script>"]',
    'graph LR\nA --> B\nstyle A fill:url(https://outside.test/image.svg)',
  ];
  for (const source of unsafe) await assert.rejects(renderCurriculumDiagram(source), { name: 'TypeError' }, source);
});

test('ordinary protocol data remains literal text and cannot be mistaken for an asset URL', async () => {
  const result = await renderCurriculumDiagram('sequenceDiagram\nparticipant S as Server\nparticipant C as Client\nS-->>C: SSE: data: {"token":"Hello"}');
  readableSVG(result);
  assert.ok(textInSVG(result.svg).includes('SSE: data: {"token":"Hello"}'));
});

test('prefixes and requested widths are bounded without shrinking diagram labels', async () => {
  const source = 'graph LR\nA --> B';
  for (const [width, expected] of [[0, limits.minWidth], [-100, limits.minWidth], [1000000, limits.maxWidth], [NaN, 720], [Infinity, 720]]) {
    const result = await renderCurriculumDiagram(source, { width, idPrefix: '9 <unsafe>"/\\'.repeat(20) });
    assert.equal(result.availableWidth, expected);
    readableSVG(result);
    assert.doesNotMatch(result.svg, /<unsafe>|&lt;unsafe&gt;|9 <unsafe>/);
    for (const match of result.svg.matchAll(/\bid="([^"]*)"/g)) assert.match(match[1], /^[a-zA-Z][\w:.-]*$/);
  }
});

test('source, edge count, output dimensions and invalid syntax have explicit rejection paths', async () => {
  await assert.rejects(renderCurriculumDiagram('graph LR\n' + ' '.repeat(limits.source)), /source.*size limit/);
  await assert.rejects(renderCurriculumDiagram('graph LR\n' + Array.from({ length: limits.edges + 1 }, (_, index) => `a${index} --> a${index + 1}`).join('\n')), /edge|limit/i);
  await assert.rejects(renderCurriculumDiagram('graph TD\nA["' + 'W'.repeat(12000) + '"]'), /output.*size limit/);
  await assert.rejects(renderCurriculumDiagram('graph LR\nA\u0000 --> B'), /control character/);
  for (const source of ['', null, 'not a diagram', 'graph LR\nA[Unclosed', 'sequenceDiagram\nparticipant']) {
    await assert.rejects(renderCurriculumDiagram(source));
  }
});

test('every imported Mermaid fence renders with Pele at 720px and 320px', { timeout: 15000 }, async context => {
  const diagrams = inventory();
  assert.ok(diagrams.length >= 515, `Unexpectedly small inventory: ${diagrams.length}`);
  const types = {}; const failures = []; const adapted = []; const themed = [];
  let renders = 0; let overflowing = 0;
  for (const { path, index, source } of diagrams) {
    for (const width of [720, 320]) {
      try {
        const result = await renderCurriculumDiagram(source, { width, idPrefix: `corpus-${renders}` });
        readableSVG(result);
        renders++; overflowing += Number(result.overflow);
        if (width === 720) {
          types[result.type] = (types[result.type] || 0) + 1;
          if (result.adaptedLabels) adapted.push(`${path}#${index}`);
          if (result.ignoredConfiguration) themed.push(`${path}#${index}`);
        }
      } catch (error) { failures.push({ path, index, width, error: error.message }); }
    }
  }
  context.diagnostic(JSON.stringify({ diagrams: diagrams.length, renders, types, adaptedLabels: adapted.length, ignoredThemes: themed.length, overflowing, failures }));
  assert.deepEqual(failures, [], 'Every failure is reported with source path, block index and width');
  assert.equal(renders, diagrams.length * 2);
  assert.deepEqual(types, { flowchart: 479, state: 7, sequence: 27, class: 1, timeline: 1 });
  assert.deepEqual(adapted, [
    'phases/19-capstone-projects/27-eval-harness-fixture-tasks/docs/en.md#0',
    'phases/19-capstone-projects/64-chunking-strategies-advanced/docs/en.md#0',
  ]);
  assert.equal(themed.length, 68);
});
