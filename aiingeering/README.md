# AI Engineering · Math as Code

The full AI Engineering from Scratch curriculum, imported into the Math as Code
React reader. The project directory is intentionally named `aiingeering`.

```bash
cd aiingeering
npm run build
npm test
npm run check:content
npm run secrets
npm start
```

Open http://127.0.0.1:8026. Dependencies and the ReUI components/design tokens are
reused from the parent Math as Code checkout; no separate install is required
when the parent's dependencies are present.

The reader includes phase lessons, certification lessons and assessments,
projects and their stages, manuals, cheatsheets, practice, learning paths,
glossary, research, skills, translations, and a browser for every imported file.
All source text, code, tests, outputs, fixtures, captured evidence, and licenses
are preserved in `content/`. Reading, quiz grading, figures, and Mermaid work
from local static assets. Code is displayed and downloaded; the reader does not
execute lesson programs or call AI providers. Progress stays in this browser.

`import-manifest.json` pins source revision
`3f9715c62a3bedcffb68a260f1a65ee2dd9cc10a` and records every imported path, byte
length and SHA-256. It also lists excluded dotfiles/private repository metadata.
The import contains 9,364 files / 127,224,376 bytes. `check:content` compares both
the preserved snapshot and the built artifact with that inventory.

There are 542 phase lessons, 67 certification lessons, 78 ready projects,
6 manuals and 154 cheatsheets. Existing source gaps are preserved honestly:
150 phase lessons have no quiz; 52 have no `main.*` entrypoint (some have other
named runnable files). Available phase quizzes have 5–8 questions. The reader
accepts both historical quiz arrays and current objects, plus multiple-answer
certification assessments. Certification preparation is independent community
material; the source disclaimers, dated facts and scoring policy remain intact.

`content/package.json` is an added CommonJS module boundary for the imported
build helpers, not an upstream curriculum file. Builds adapt the existing
manual/cheatsheet parsers and figure providers and use Marked/KaTeX for lessons.
The custom code is the curriculum catalogue, URL/resource integration and
reader state; the styling and reusable controls come from Math as Code.

The reader styles are pinned from Math as Code revision `68346ce` in
`site/mathascode.css`; shared ReUI controls and theme definitions are imported
from the parent checkout. This keeps the new curriculum independent of unrelated
guide-branch changes. The three machine explainers retain all 26 authored
scenarios, 31 part explanations and six agent-tour chapters. Builds extract only
their named pure model declarations with a 500 ms execution limit; the source
pages' UI scripts never run. The browser steps through precomputed traces.

This is a local project and static build. No domain, cloud service, provider,
scheduled task, deployment or paid usage is activated by these commands.
Publishing must use a dedicated reviewed static target; do not deploy this
directory with the parent Math site's Wrangler configuration.

## Attribution

Curriculum: Copyright (c) 2026 Rohit Ghumare, MIT — see `content/LICENSE`.
Math as Code: see `../LICENSE.md`. ReUI/shadcn notices remain with the reused
parent components. Mermaid 11.12.0 is vendored under MIT; see
`vendor/MERMAID-LICENSE`. Additional upstream notices are preserved at their
original paths in the imported snapshot.

## Updating the snapshot

`node scripts/import.mjs /absolute/path/to/ai-engineering-from-scratch` imports a
clean Git revision into a new project directory. It intentionally refuses to
overwrite an existing snapshot. Review upstream changes and update the pinned
counts in `scripts/verify.mjs` when intentionally importing a newer revision.
The build never executes imported exercises, fixture binaries, capture scripts,
or provider integrations.

## Verification

Verified on 2026-10-26 against the pinned curriculum revision:

- 30 tests passed, including all 2,904 catalog entries and all 471 quiz/assessment files.
- All 9,364 snapshot files and their built copies match their recorded byte lengths and SHA-256 hashes.
- The built artifact's secret scan passed. Exact documented Docker proxy sentinels and the public AWS example identifier are recognized as teaching fixtures.
- Desktop and 390 px browser checks covered lesson rendering, search/navigation, manual and cheatsheet figures, interactive calculations, theme, quiz scoring, completion persistence and explainer scenario/reset controls.
- A fresh independent review found no remaining correctness or security defects.

The output is a static local build; no hosting target is configured by this
project. The repository merge and any later deployment are separate states.
