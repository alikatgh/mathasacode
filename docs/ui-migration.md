# ReUI migration

The React workspace uses public MIT ReUI sources pinned to revision `067aa0dc7f8bbfec1cd76fc5ad31f842be5f569a`. Source provenance and local adaptations are recorded in `site/vendor/THIRD-PARTY.md`.

| Surface | Implementation |
| --- | --- |
| English, Python and Chinese guides | Shared React workspace and source-preserving reader controller |
| Contributing, Run locally and License | Same workspace, including a generated License heading |
| Topic navigation | ReUI Sidebar, Input, ScrollArea, Badge and Progress; compact rows and persistent hide/show |
| Desktop layout | ReUI Resizable panels; independent sidebar and lesson scroll |
| Mobile navigation | ReUI Sheet with search, route-selection focus and Escape focus return |
| Reading | One continuous scroll per topic; ReUI previous/next topic buttons and a Practice anchor; older step URLs remain valid |
| All 186 four-language examples | ReUI Select and CodeBlock; 744 source variants with local build-time Shiki tokens |
| Code actions | One toolbar for language, wrapping, folding and exact-source copy; accessible icon actions on small screens |
| Math/code comparisons | ReUI Card with retained original notation and implementation nodes |
| Practice | ReUI Card, Input, NativeSelect, Label, Accordion, RadioGroup, Button, Badge, Progress and Alert |
| Appearance and resources | ReUI buttons, Tooltip and NativeSelect within the sidebar; no global brand bar |

KaTeX renders mathematical content and Pele renders authored concept diagrams inside ReUI Cards. These are specialized content renderers. The Markdown source remains available as a static, readable no-JavaScript fallback. Fallback styles are generated and checked in source tests; JavaScript-disabled rendering has not been independently exercised in a browser.

The production HTML loads only the React/ReUI entry point, its stylesheet and local KaTeX assets. Previous Arc, Gauge and CodeMirror files remain in the source history/workspace but are not part of the active application import graph. CodeMirror's retained unit tests do not establish ReUI browser behavior.

Verification includes source preservation, all four translations, exact highlighting lines, routing/history, scroll restoration, blocked-storage progress, numeric examples, local server boundaries, browser checks of the shared shell and independent review. Browser evidence and the exact checks run are reported with each delivered change.
