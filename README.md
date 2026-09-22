# Agentic-coding model tracker

Timeline, benchmarks and GitHub Copilot pricing for Anthropic, OpenAI, Google and xAI models, rendered as one self-contained HTML page with no runtime network dependencies.

## Layout

| Path | Stream | Content |
|---|---|---|
| `src/` | code | `template.html`, `style.css`, `app.js` |
| `prompt/` | code | Collection prompt that produces or updates the dataset |
| `tools/` | code | `build.py` (validate + render), `release.py` (version bumps + tags) |
| `test/` | code | jsdom smoke test, runs as build gate |
| `data/agentic-model-timeline.json` | data | Models, scores, Copilot rates, sources, conflicts, changelog |
| `CHANGELOG.code.md` | code | Hand-written |
| `CHANGELOG.data.md` | data | Generated from the JSON changelog; do not edit |

## Two version streams

- **Code**: `VERSION`, tag `code-vX.Y.Z`. Minor for new capability, patch for fixes, major for a break in the data contract.
- **Data**: `data_version` in the JSON, tag `data-vX.Y.Z`. Minor for new models or benchmarks, patch for corrections, major for a schema break.
- **Schema**: `schema_version` in the JSON is the contract between them. Code accepts schema major 1; a data major bump needs a matching code release.

`release.py` refuses to cut a release while the tree has uncommitted changes owned by the other stream, so one commit never mixes code and data.

## Every iteration

```
make test                                   # build + jsdom gate
make release-data BUMP=minor MSG="Added …"   # data changes only
make release-code BUMP=patch MSG="Fixed …"   # code changes only
make verify                                 # package, unzip to /tmp/verifica, rebuild, cmp
```

`make package` writes `out/agentic-model-timeline_c<code>_d<data>.html` and `out/agentic-tracker-src_c<code>_d<data>.zip`. The zip carries `.git`, so history and tags travel with it; unzip it to continue from where the last iteration stopped.

## Status

Verified in this environment: `make check`, `make build`, `make test`, `make package`, `make verify`.
**Non verificato:** `make docker` and the Dockerfile — no Docker daemon was available when this was written.
