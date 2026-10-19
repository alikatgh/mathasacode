# Static Cloudflare deployment

The deployment target is the static-assets Worker `math-as-code` in the account pinned by `wrangler.jsonc`, at `https://mathasacode.aulenor.com`. Wrangler attaches the custom domain through the configuration's exact `routes` entry. The default workers.dev hostname and version preview URLs are disabled.

The project publishes static files only, with no Worker entry point or application server. The release gate allows only the pinned name, account, compatibility date, hostname controls, static asset directory and exact custom domain. It rejects executable server code, bindings, schedules, extra routes, `_worker.js` and `functions` paths.

With authenticated Wrangler, use:

```sh
npm run deploy
```

This builds the site, runs the release gate, then uploads `dist` with `wrangler deploy`. The account and production domain are pinned independently of the checkout's branch name. For an already prepared artifact, verify that exact directory before uploading:

```sh
node scripts/verify-release.mjs --artifact releases/2026-10-19/site
npx wrangler deploy --assets releases/2026-10-19/site
```

The built directory contains `index.html`, `404.html`, `_headers` and nested asset directories. Publish only those built files. See [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) and [custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

The configuration explicitly uses `404-page` handling for missing paths. HTML documents are served at their extensionless URLs, matching the sitemap and generated links. The gate requires the built 404 page, headers, robots file and sitemap to match their source files.

After an upload, check the deployment status, custom domain, canonical redirects, missing-route HTTP 404, document security headers, and nested runtime assets on the deployed site. A successful local gate does not establish those live states.

## Source and release artifacts

The complete source is published at [alikatgh/mathasacode](https://github.com/alikatgh/mathasacode). The original [Experience-Monks/math-as-code](https://github.com/Experience-Monks/math-as-code) history, authorship and MIT license are retained. This edition also includes the pinned runtime inputs and their redistribution notices.

Release artifacts live in the ignored `releases/` directory. Runtime license texts are included in the site at `/assets/runners/LICENSES/`; their versions and source links are listed in `/assets/runners/THIRD-PARTY.md`.

The account's Free plan was verified in the dashboard before publication. The app requires no server execution, database, paid add-on or scheduled task. GitHub pushes do not deploy this Worker; run the explicit deployment command for an authorized production release. Keep a verified release artifact and its source revision so it can be redeployed if recovery is needed.
