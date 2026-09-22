# Code changelog

Covers `src/`, `tools/`, `test/`, `prompt/` and build files. Versions 1.0.0 to 1.4.0 are reconstructed from session history; no file snapshot exists for them. 1.5.0 is the first tagged version.

## 1.5.0 — 2026-09-22

Split the monolithic page into `src/template.html`, `src/style.css`, `src/app.js`. Added `tools/build.py` (validate, render, generate the data changelog), `tools/release.py` (separate semver streams, git tags `code-v*` and `data-v*`), a jsdom smoke test as build gate, Makefile, Dockerfile. Page now shows code, data and schema versions and rejects pasted JSON with an unsupported schema major. Dropped Google Fonts: the output has zero runtime network dependencies and falls back to system fonts.

## 1.4.0 — 2026-09-22 *(reconstructed)*

DeepSWE as default view, Terminal-Bench 4.0 added to the selector, cost per task in ledger and tooltips, revised headline. Prompt: DeepSWE and TB 4.0 promoted, saturation check before ranking.

## 1.3.0 — 2026-09-05 *(reconstructed)*

Copilot table shows release status, promotional expiry, rate confidence and deprecation date; lists models not sold through Copilot.

## 1.2.1 — 2026-09-05 *(reconstructed)*

Ledger labels a budget model that costs more than the flagship it beat as "dearer" instead of a sub-1× "cheaper".

## 1.2.0 — 2026-09-05 *(reconstructed)*

Descent ledger priced at Copilot output rates, vendor rate only as a labelled fallback.

## 1.1.1 — 2026-09-05 *(reconstructed)*

Copilot views report output price only. Prompt: no multipliers, output-only comparison.

## 1.1.0 — 2026-09-05 *(reconstructed)*

xAI vendor, "price vs score" view with value frontier, Copilot rate table, sources section, source links under each ledger score. Prompt: xAI, Copilot pricing, source registry.

## 1.0.0 — 2026-09-05 *(reconstructed)*

First page: release timeline chart with descent connectors, descent ledger, summary cards, release cadence lanes, conflicts list, paste-to-redraw. First collection prompt.
