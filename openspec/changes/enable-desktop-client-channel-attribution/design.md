## Context and decision
One desktop analytics product uses ch=3. The existing production/preview signing workflows remain packaging mechanisms; both resolve to the same desktop channel. Only build mode with a recognized profile, updater enabled, and a signing-key input produces proof 3. Local/development/unsigned/invalid builds resolve to 0. This build assertion is analytics metadata, never authenticated identity or billing authority.

## Request boundaries
Apply attribution at the final trusted/configured Tuzi model request boundary, before wrapping local proxy targets. Replace duplicate/encoded ch keys while preserving other query bytes, fragments, body, headers and abort behavior. Keep metadata, signed asset URLs, and custom providers unchanged. Native metadata commands are not billable model execution and do not receive a synthetic channel parameter. Do not claim unsupported native model paths are covered.

## Analysis contract
Tuzi accepts 3, rejects analysis filter 4, and normalizes request ch=4 to 0. The selector contains all/1/2/3 and defaults/resets to all. All is the registered OpenTu product set (1/2/3), applied consistently to summary, distinct users, trend, channel/model rows and update time. Explicit API ch=0 remains available for diagnostics but absent from the selector. Historical 4 logs are not relabeled.

## Release and rollback
Verify backend and client tests and build artifacts, inspect the exact current shared test image before overlaying changes, preserve other shared functionality, back up Compose/database and verify health. Compare APIs to independent raw logs using the API's actual closed-day range. New current-day desktop requests appear after normal daily aggregation; do not move timestamps or rebuild an artificial cutoff. Roll back the image on new deployment failures, retaining raw logs and existing schema. Production release is not authorized by local acceptance.
