# Vendored UI components

These source copies ship locally; the application does not fetch component code at runtime.

## Arc: Resizable panels

- Upstream: https://github.com/kuratlielia/arc-library
- Revision: `b40c8906e8cc55cba920113be856b2e6d964885a`
- Source registry: https://github.com/kuratlielia/arc-library/blob/b40c8906e8cc55cba920113be856b2e6d964885a/public/r/resizable-panels.json
- Shared motion registry: https://github.com/kuratlielia/arc-library/blob/b40c8906e8cc55cba920113be856b2e6d964885a/public/r/arc-motion-tokens.json
- Component documentation: https://uiarc.dev/components/resizable-panels
- License: MIT, copyright 2026 Elia Kuratli. Full notice: [arc/LICENSE](arc/LICENSE).
- Files preserve the registry target layout beneath `arc/`. Component and shared token source are unchanged.
- Runtime packages: React, Motion (`motion/react`), and `lucide-react`. Styles use CSS modules and semantic CSS custom properties; Tailwind is not required.
- The parent needs a definite height. Pane children and IDs must remain stable while the group is mounted. Horizontal splits only; mobile adaptation belongs to the application.

## Gauge UI

- Upstream: https://github.com/thordursk/gauge-ui
- Revision: `bace7dc5ae5513850e2e960ed543abe7548b79c3`
- Source directory: https://github.com/thordursk/gauge-ui/tree/bace7dc5ae5513850e2e960ed543abe7548b79c3/components/gauge
- Registry definition: https://github.com/thordursk/gauge-ui/blob/bace7dc5ae5513850e2e960ed543abe7548b79c3/registry.json
- Component documentation: https://gauge-ui.dev
- License: MIT, copyright 2026 Thordur. Full notice: [gauge/LICENSE](gauge/LICENSE).
- Files preserve the upstream `components/gauge/` layout beneath `gauge/`.
- Local change: imports of the upstream shadcn `@/lib/utils` class-name helper point to `./cn`. The local adapter joins optional class-name strings. It does not merge conflicting Tailwind utilities; use application CSS to size and style this integration.
- Runtime packages: React; the optional tooltip also uses React DOM. No animation package is required.
- For practice completion, derive `value` from actual completed exercises and use a positive domain maximum. Omit `transition` and `initialValue` for immediate updates without a counter animation.
- Upstream uses Tailwind utility class names for SVG dimensions and text font/weight. The application must supply equivalent CSS for rendered gauge/text classes when Tailwind is absent.

## Retrieval

Sources were fetched through the GitHub Contents API at the exact revisions above. For example:

```sh
gh api -H 'Accept: application/vnd.github.raw+json' 'repos/kuratlielia/arc-library/contents/public/r/resizable-panels.json?ref=b40c8906e8cc55cba920113be856b2e6d964885a'
gh api -H 'Accept: application/vnd.github.raw+json' 'repos/thordursk/gauge-ui/contents/components/gauge/gauge.tsx?ref=bace7dc5ae5513850e2e960ed543abe7548b79c3'
```

## ReUI: active component system

- Upstream: https://github.com/keenthemes/reui
- Revision: `067aa0dc7f8bbfec1cd76fc5ad31f842be5f569a`.
- Standard Radix source: `registry/bases/radix/ui/`, copied to `site/components/ui/`; the dependency hook is in `site/hooks/use-mobile.ts`.
- In-house source: `registry-reui/bases/radix/reui/`, copied to `site/components/reui/` (Alert, Badge, Frame, Stepper, and both Code Block modules).
- License: MIT, copyright 2025 Keenthemes Inc. Full notice: [ReUI license](../components/reui/LICENSE.md).
- Source adaptations: registry aliases resolve to local relative imports; the source `cn` package imports point to `site/lib/utils.ts` using `clsx` and `tailwind-merge`; icon authoring placeholders expand to the source-selected Lucide icon, retaining other icon props. Component behavior and classes remain upstream.
- Correctness fix: the Progress wrapper forwards its destructured `value` to the Radix root, so the accessible value and state match its visible indicator.
- `site/styles/reui-vega.css` is the full upstream `registry/styles/style-vega.css` without changes.
- ReUI Vega SHA-256: `10fa07bd61b429ae2c14c572ba9975f6e991d68a04f8fec7e354a062597e0d4e`.
- `site/styles/reui-theme.css` excerpts the upstream `styles/globals.css` theme mappings, light/dark tokens, base border/selection styles and font rendering. It adds a local system fallback for the font token previously supplied by Next fonts. Documentation-site layout utilities and other seven style sheets are excluded.
- CSS entry: `site/styles/reui.css`. The document needs the `style-vega` class; add `dark` for the dark theme.
- Runtime dependencies used by these copies: React, React DOM, `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `react-resizable-panels`, `lucide-react`, and `shiki`. Tailwind CSS v4 and `tw-animate-css` compile the styles.
- Code Block accepts pre-highlighted `lines` with `highlight={false}`; that path does not invoke its lazy Shiki highlighter. No component or source is fetched at runtime.

## shadcn Tailwind helpers

- Published package: `shadcn@4.18.0`.
- Source artifact: https://unpkg.com/shadcn@4.18.0/dist/tailwind.css, copied unchanged to `site/styles/shadcn-tailwind.css`.
- Stylesheet SHA-256: `bc7d83425702955b4cb67cb14ede9d603f9d912376d57a2d81d661094d2a782a`.
- License artifact: https://unpkg.com/shadcn@4.18.0/LICENSE.md.
- License: MIT, copyright 2023 shadcn. Full notice: [shadcn license](../styles/SHADCN-LICENSE.md).
- This small source stylesheet supplies Radix/Base data-state variants and related CSS helpers without installing the shadcn CLI.


The dropdown-menu primitive also comes from the same pinned ReUI Radix registry revision (`registry/bases/radix/ui/dropdown-menu.tsx`); local changes resolve utility and Lucide icon imports.
