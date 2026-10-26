## 1. Contract
- [x] 1.1 User confirmed one desktop channel, default all, no desktop testing product.
- [x] 1.2 Revise the prior dual-desktop proposal and cross-repository contract.

## 2. Implementation
- [x] 2.1 Tuzi accepts 3 and normalizes request 4 to 0 using existing fields.
- [x] 2.2 Default/reset all/1/2/3 selector; all aggregates only registered products.
- [x] 2.3 Signed production and preview packaging both resolve to 3; local/unsigned resolve to 0.
- [x] 2.4 Exact desktop proof, eligible model paths and preserved Request/query semantics.
- [x] 2.5 Update affected resolver/renderer tests and workflow artifact expectations.

## 3. Verification
- [x] 3.1 Finish affected target builds and artifact checks; record platform gaps. Web production build and macOS QA artifact/updater integrity passed. Desktop app typecheck passed. All five preview targets were built and verified in workflow 40296271391; this verifies artifacts, not manual runtime execution on every OS.
- [x] 3.2 Deploy the exact shared test site after version/backup checks and verify fresh requests, logs and charging. Both native canvas text paths passed; logs 957/2191 have ch=3 and 4 quota each, tokens disabled.
- [x] 3.3 Verify all/1/2/3 API/UI and closed-day product-only totals against independent logs. Fifteen API combinations and sixteen real UI checks passed.
- [x] 3.4 Publish sanitized acceptance records and the authorized desktop release. Preview v1.2.16-preview.1 is public; docs/qa-desktop-channel-release-1.2.16.md records package gates, live checks and broad-CI failures. Earlier backend/web PRs are merged; desktop source is published directly under the user-authorized release.
- [ ] 3.5 Real asynchronous terminal/refund/adjustment acceptance (must not be implied by synchronous text tests). Read-only preflight found no native QA tasks; no asynchronous provider task was submitted.
