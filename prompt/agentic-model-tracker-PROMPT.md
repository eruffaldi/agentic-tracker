# Agentic-coding model tracker — collection & update prompt

Give this whole file to a model that has web search. It either **creates**
`agentic-model-timeline.json` from scratch or **updates** an existing copy.
It is written to be re-run every few weeks; the release cadence in 2026 is
roughly one relevant model every 9 days across the three labs.

---

## Role

You are maintaining a decision-support dataset for an engineering team choosing
models for **agentic programming**: long-horizon, tool-using, terminal-and-repo
work run under an agent harness (Claude Code, Codex, Antigravity, or in-house).
You are not tracking chat quality, multimodality, or reasoning benchmarks except
where they bear on agentic coding.

## Task

1. If existing JSON is supplied below the marker `=== CURRENT DATA ===`, load it.
   Otherwise start from the empty skeleton in §Schema.
2. Search for every model release from **Anthropic, OpenAI, Google DeepMind and
   xAI** with a release date in the window `window.from` .. today.
3. For each model, fill the record in §Schema. Add pre-window `anchor: true`
   records only where they are needed as a comparison baseline.
3b. Fetch the GitHub Copilot pricing page (§Copilot) and attach the resale rate
   card to every model Copilot offers.
4. Re-check scores for models already in the file — vendors and leaderboards
   revise numbers, and a model can gain a standardized score months after launch.
5. Emit the complete JSON. Then emit a short changelog of what moved.

## Search plan

Run these, then follow the strongest links:

- `<vendor> model releases <year> timeline` — run this for Anthropic, OpenAI,
  Google and xAI separately; xAI is the one most often missed by aggregators
- `<model name> release date pricing benchmarks`
- `Terminal-Bench <current major.minor> leaderboard`
- `SWE-bench Pro leaderboard <year>`
- `<model name> "per 1M tokens"` for the current rate card
- One independent evaluator page per benchmark (see §Source ranking)

Do not stop at the first leaderboard. Cross-vendor benchmark numbers disagree
by 5–15 points depending on harness; the disagreement is the signal, not noise.

## Metric selection

Prefer, in order:

1. **DeepSWE (current version)** — long-horizon SWE, one harness (mini-swe-agent)
   for every model, with measured cost per task. The cleanest cross-vendor view;
   record `cost_per_task` alongside the score.
2. **Terminal-Bench (current major version)** — as of September 2026 that is 4.0
   (66 multi-hour tasks, mostly outside classic software). Record the version;
   2.x, 3.0 and 4.0 are different task sets and are **not** comparable. The
   official board lets each vendor use its own harness; also record the vals.ai
   standardized run as `standardized_value` where one exists.
3. **SWE-bench Pro** — repo-level, contamination-resistant. Use over Verified.

Before ranking on any benchmark, check saturation: if the top five sit within
3 points, treat it as a floor test, not a ranking. TB 2.1 hit this in August 2026.
4. **SWE-bench Verified** — saturating above 95% and known-contaminated; keep it
   for continuity with older models, do not rank on it.
5. **A cost-normalized benchmark** (e.g. ProgramBench) — score plus $/task, which
   is what actually decides a routing policy.

Also record input/output price per 1M tokens, context window, and the effort or
reasoning level the score was produced at. A score without its effort level and
harness is not usable.

## GitHub Copilot pricing

Fetch `https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing`
and read the per-token tables. This is the resale rate card most engineering
teams actually pay, and it is not the same as the vendor rate card — as of
September 2026 Copilot bills GPT-5.6 Sol at $4/$20 where OpenAI charges $5/$30.

For each model Copilot offers, record under `copilot`:

- `category` — Copilot's own bucket: Lightweight, Versatile, or Powerful.
- `input`, `cached_input`, `cache_write`, `output` per 1M tokens. Copilot prices
  per million tokens; there are no model multipliers, so do not record one.
- `long_context` — the second rate tier and the input-token threshold that
  triggers it. Crossing the threshold reprices the whole request, not the excess.
- `available: false` for models with no Copilot row.

Also refresh `copilot_meta`: the billing model, plan prices and allowances, any
promotional pricing with its expiry date, and which model is designated LTS.
Record all four rates in the JSON, but note that the rendered view compares on
**output price only** — output dominates the bill on agentic runs, and mixing
input and output rates into one axis hides which model is actually cheaper.
Rows in the Copilot catalogue with no model record of their own (older models,
Microsoft MAI, Moonshot Kimi) go in `copilot_catalog_extra`.

Where the Copilot rate differs from the vendor rate for the same model, add a
`conflicts` entry. That gap is a routing decision, not a rounding error.

## Source registry

Maintain a top-level `sources` array. Every entry needs `id`, `title`,
`publisher`, `url`, `accessed`, `type` (vendor-docs, vendor-announcement,
standardized-eval, aggregator, press, reference) and `use` — one line on what
this source is relied on for. Per-score `source` fields hold the URL directly.

Update `accessed` when you re-verify a source. A source not re-checked in this
run keeps its old date, which is how a reader spots stale rows.

## Source ranking

1. Vendor announcement post and model card (authoritative for date, price, ID).
2. Standardized third-party runs where every model goes through one harness
   (e.g. vals.ai, Scale SEAL, Artificial Analysis). Authoritative for cross-vendor.
3. Aggregator leaderboards. Useful for coverage, weakest for comparability.
4. Press coverage. Date confirmation only.

Never average across harnesses. Store each number with its harness.

## Conflict handling

When two credible sources disagree by more than 2 points on the same benchmark:

- Store the standardized third-party value in `scores[bench].value`.
- Store the vendor value in `scores[bench].vendor_value`.
- Append an entry to the top-level `conflicts` array naming both, with URLs.

Flag, do not resolve. Silently picking one number is the main way this dataset
would mislead.

## Rules

- Every score carries `source`, `harness`, and `confidence` (`high` | `medium` | `low`).
- `confidence: low` for any vendor-only number with no independent replication.
- Never interpolate, estimate, or carry a score across model versions.
- If a score is not published, use `null`. An absent number is information.
- Record restricted-access models (trusted-partner tiers) with
  `availability: "restricted"` — they set the ceiling but cannot be deployed.
- Record price cuts as `price_history` entries; several 2026 models were repriced
  by 5x within a month of launch, which changes every cost conclusion.
- Preserve prior records on update. Only overwrite a field when the new source
  outranks the old one; note the change in the changelog.

## Schema

```json
{
  "schema_version": "1.0",
  "generated_at": "YYYY-MM-DD",
  "window": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
  "benchmarks": {
    "<bench_id>": { "name": "", "version": "", "what_it_measures": "", "caveat": "" }
  },
  "models": [
    {
      "id": "vendor-model-slug",
      "vendor": "Anthropic | OpenAI | Google | xAI",
      "name": "",
      "tier": "frontier | flagship | mid | efficient | coding",
      "released": "YYYY-MM-DD",
      "availability": "ga | preview | restricted | withdrawn",
      "anchor": false,
      "context_window": 0,
      "price_in": 0.0,
      "price_out": 0.0,
      "price_history": [{ "date": "", "in": 0.0, "out": 0.0, "note": "" }],
      "scores": {
        "<bench_id>": {
          "value": 0.0,
          "vendor_value": null,
          "harness": "",
          "effort": "",
          "source": "url",
          "confidence": "high"
        }
      },
      "copilot": {
        "available": true,
        "category": "Lightweight | Versatile | Powerful",
        "input": 0.0, "cached_input": 0.0, "cache_write": null, "output": 0.0,
        "long_context": { "threshold": 0, "input": 0.0, "output": 0.0 },
        "source": "github-copilot-pricing"
      },
      "notes": "",
      "sources": ["url"]
    }
  ],
  "sources": [
    { "id": "", "title": "", "publisher": "", "url": "", "accessed": "YYYY-MM-DD",
      "type": "vendor-docs", "use": "" }
  ],
  "copilot_meta": { "source": "github-copilot-pricing", "billing": "", "plans": {},
                    "legacy": "", "notes": [] },
  "copilot_catalog_extra": [
    { "name": "", "vendor": "", "category": "", "input": 0.0, "output": 0.0 }
  ],
  "conflicts": [
    { "model": "", "benchmark": "", "values": [], "sources": [], "note": "" }
  ],
  "changelog": [{ "date": "", "change": "" }]
}
```

## Output

Emit the JSON in one fenced block, nothing before it. Then, outside the block,
list in plain text: models added, scores revised, vendor or Copilot prices
changed, sources re-verified, and any new conflict. Keep the changelog to what a reader would act on.

=== CURRENT DATA ===
(paste the existing agentic-model-timeline.json here, or leave empty)
