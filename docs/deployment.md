# Static Cloudflare Pages deployment

The deployment target is the Direct Upload Pages project `math-as-code` in the account pinned by `wrangler.jsonc`. Its intended public origin is `https://mathasacode.aulenor.com`. Associate and verify that custom domain in the Pages project; Pages custom domains are not configured with Workers `routes` in Wrangler.

The project publishes static files only. The release gate allows only the Pages project name, account, pinned compatibility date, and `pages_build_output_dir` configuration. It rejects bindings, schedules, Worker options, `_worker.js`, and `functions` paths, including a project-root `functions` directory that Wrangler would discover separately from `dist`.

With authenticated Wrangler, use:

```sh
npm run deploy
```

This builds the site, runs the release gate, then uploads `dist` with `wrangler pages deploy dist --project-name math-as-code --branch main`. The explicit production branch prevents a task-branch checkout from becoming a preview deployment. For an already prepared artifact, verify that exact directory before uploading:

```sh
node scripts/verify-release.mjs --artifact releases/2026-10-19/site
```

For dashboard Direct Upload, select the verified artifact folder, with `index.html`, `404.html`, and `_headers` at its root; preserve all asset subdirectories. Upload only that folder, not the repository or its enclosing release directory. The gate applies the dashboard's stricter limit of 1,000 files and 25 MiB per file. The complete ZIP is about 33 MB and the dashboard rejects it before extraction; use the folder option. See [Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) and [Wrangler Pages configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/).

The top-level `404.html` prevents Pages from treating missing paths as a single-page application. Pages serves `.html` documents at their extensionless URLs, matching the sitemap and generated links. The gate requires the built 404 page, headers, robots file, and sitemap to match their source files. See [Pages serving behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/).

After an upload, check the deployment status, custom domain, canonical redirects, missing-route HTTP 404, document security headers, and nested runtime assets on the deployed site. A successful local gate does not establish those live states.

## Source and release artifacts

The complete source is published at [alikatgh/mathasacode](https://github.com/alikatgh/mathasacode). The original [Experience-Monks/math-as-code](https://github.com/Experience-Monks/math-as-code) history, authorship and MIT license are retained. This edition also includes the pinned runtime inputs and their redistribution notices.

Release artifacts live in the ignored `releases/` directory. Runtime license texts are included in the site at `/assets/runners/LICENSES/`; their versions and source links are listed in `/assets/runners/THIRD-PARTY.md`.

The account's Free plan was verified in the dashboard before publication. The app requires no Pages Functions, database, paid add-on or scheduled task. GitHub pushes do not publish the Direct Upload project; run the explicit deployment command for an authorized production release.
