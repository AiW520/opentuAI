# Desktop Web 1.1.28 Parity QA

Date: 2026-10-12

- Upstream pin: `3d84bb7c3b24fe6215a2daa945b80227fbd72456` (`develop`, Web 1.1.28).
- Desktop version: `1.2.14`.
- Shared package typecheck: passed.
- Desktop typecheck: passed.
- Drawnix core regressions: 36 files, 890 tests passed.
- Workflow regressions: 46 files, 512 tests passed.
- Native parameter coverage: 117 tests passed.
- Desktop utility regressions: 2 files, 10 tests passed.
- Desktop renderer production build: passed.
- Headless renderer smoke: AI input and resources entry visible; no page errors. The resources announcement opens automatically on a fresh profile. QR assets are exercised by the API key dialog path, not the resources panel.

Remaining acceptance limits: no live provider generation, native Tauri packaged build, OAuth flow, or external-service quota validation was performed. Existing user changes in the image-generation anchor generator were preserved.
