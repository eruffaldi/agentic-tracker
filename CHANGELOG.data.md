# Data changelog

Generated from `data/agentic-model-timeline.json` by `tools/build.py`. Do not edit.

Versions marked *reconstructed* were rebuilt from session history; no file snapshot exists for them.

## 1.2.1 — 2026-09-22

Added data_version and per-entry versions to the changelog. No model, score or price changed. Versions 1.0.0 to 1.2.0 are reconstructed from the session history; 1.2.1 is the first version with a file snapshot.

## 1.2.0 — 2026-09-22 *(reconstructed)*

Added Grok 4.7 (2026-09-21, in Copilot). Added Terminal-Bench 4.0 (13 models, official board plus vals.ai cross-check) and DeepSWE v1.1 (13 models, single harness, cost per task). Marked TB 2.1 as saturating. Refreshed the Copilot table: Grok 4.7 added, MAI-Code-1-Flash dropped.

## 1.1.5 — 2026-09-05 *(reconstructed)*

Rebuilt the Copilot block from the canonical pricing page. Restored GPT-5.6 Luna $0.20/$1.20, Sol $4/$20, Terra $2/$12. Added GPT-6 Astra, Grok 4.6, Fable 5.1 and Gemini 3.7/3.8 Flash as available with confirmed rates. Removed Opus 4.6, Gemini 3.1 Pro and Gemini 3 Flash, retired 2026-09-01.

## 1.1.4 — 2026-09-05 *(reconstructed)*

Reverted GPT-5.6 Luna to $1.00/$6.00. The reported 2026-07-30 price cut is contradicted by the Copilot rate card and has no primary source.

## 1.1.3 — 2026-09-05 *(reconstructed)*

Corrected Copilot availability from the changelog: Gemini 3.7 Flash, Gemini 3.8 Flash and Claude Fable 5.1 are in Copilot despite being absent from the docs pricing table. Added Copilot deprecation dates for 2026-09-01 and 2026-10-02.

## 1.1.2 — 2026-09-05 *(reconstructed)*

Refetched the GitHub Copilot pricing table. Corrected GPT-5.6 Sol ($2.50/$15 to $5.00/$30, promo expired 2026-09-03), Terra ($2/$12 to $2.50/$15), Luna ($0.20/$1.20 to $1.00/$6.00) and Gemini 3.6 Flash ($0.75/$3.75 to $1.50/$7.50). Marked GPT-6 Astra, Fable 5.1, Gemini 3.7/3.8 Flash, Grok 4.3 and Grok 4.6 as not sold through Copilot. Rebuilt copilot_catalog_extra from the live table.

## 1.1.1 — 2026-09-05 *(reconstructed)*

Copilot billing recorded as per-million-token only; multiplier fields dropped. HTML reports output price only.

## 1.1.0 — 2026-09-05 *(reconstructed)*

Added xAI (Grok 4.3, 4.5, 4.6). Added GitHub Copilot per-token rates and catalogue metadata to every model. Added a top-level source registry.

## 1.0.0 — 2026-09-05 *(reconstructed)*

Initial build. 24 records, 2026-01-01 to 2026-09-05, plus 2 pre-window anchors.
