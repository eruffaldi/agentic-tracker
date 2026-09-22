#!/usr/bin/env python3
"""Build the single-file tracker page from src/ + data/.

Usage:
  tools/build.py check   validate data and versions, write nothing
  tools/build.py build   validate, then render dist/ and CHANGELOG.data.md

Output is deterministic: no timestamps are generated, so rebuilding the same
sources yields byte-identical files (`git diff --exit-code` stays clean).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DATA = ROOT / "data" / "agentic-model-timeline.json"
DIST = ROOT / "dist"
OUT_NAME = "agentic-model-timeline.html"

SUPPORTED_SCHEMA_MAJOR = 1
SEMVER = re.compile(r"^\d+\.\d+\.\d+$")
VENDORS = {"Anthropic", "OpenAI", "Google", "xAI"}
TIERS = {"frontier", "flagship", "mid", "efficient", "coding"}
CONFIDENCE = {"high", "medium", "low"}


class DataError(Exception):
    pass


def code_version() -> str:
    v = (ROOT / "VERSION").read_text().strip()
    if not SEMVER.match(v):
        raise DataError(f"VERSION '{v}' is not semver")
    return v


def validate(d: dict) -> list[str]:
    errs: list[str] = []

    def err(msg: str) -> None:
        errs.append(msg)

    dv = d.get("data_version", "")
    if not SEMVER.match(str(dv)):
        err(f"data_version '{dv}' is not semver")
    sv = str(d.get("schema_version", ""))
    if not sv or int(sv.split(".")[0]) != SUPPORTED_SCHEMA_MAJOR:
        err(f"schema_version '{sv}' unsupported (need {SUPPORTED_SCHEMA_MAJOR}.x)")

    log = d.get("changelog", [])
    if not log or log[-1].get("version") != dv:
        err("last changelog entry must carry the current data_version")
    seen_v = [c.get("version") for c in log]
    if len(seen_v) != len(set(seen_v)):
        err("duplicate versions in changelog")

    bench = set(d.get("benchmarks", {}))
    ids, names = set(), set()
    for m in d.get("models", []):
        mid = m.get("id", "?")
        if mid in ids:
            err(f"duplicate model id {mid}")
        ids.add(mid)
        names.add(m.get("name"))
        if m.get("vendor") not in VENDORS:
            err(f"{mid}: vendor '{m.get('vendor')}'")
        if m.get("tier") not in TIERS:
            err(f"{mid}: tier '{m.get('tier')}'")
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(m.get("released", ""))):
            err(f"{mid}: released '{m.get('released')}'")
        for b, s in m.get("scores", {}).items():
            if b not in bench:
                err(f"{mid}: score on undeclared benchmark '{b}'")
            if not isinstance(s.get("value"), (int, float)):
                err(f"{mid}/{b}: value is not numeric")
            if not str(s.get("source", "")).startswith("http"):
                err(f"{mid}/{b}: source missing")
            if s.get("confidence") not in CONFIDENCE:
                err(f"{mid}/{b}: confidence '{s.get('confidence')}'")
        cp = m.get("copilot")
        if not isinstance(cp, dict) or "available" not in cp:
            err(f"{mid}: copilot block missing")
        elif cp["available"] and not isinstance(cp.get("output"), (int, float)):
            err(f"{mid}: copilot available but no output price")

    src_ids = [s.get("id") for s in d.get("sources", [])]
    if len(src_ids) != len(set(src_ids)):
        err("duplicate source ids")
    for s in d.get("sources", []):
        if not str(s.get("url", "")).startswith("http"):
            err(f"source {s.get('id')}: url missing")
    return errs


def render(d: dict, cv: str) -> str:
    tpl = (SRC / "template.html").read_text()
    data_json = json.dumps(d, indent=2, ensure_ascii=False).replace("</", "<\\/")
    parts = {
        "{{CODE_VERSION}}": cv,
        "{{STYLE}}": (SRC / "style.css").read_text().rstrip("\n"),
        "{{DATA}}": data_json,
        "{{APP}}": (SRC / "app.js").read_text(),
    }
    for k, v in parts.items():
        if tpl.count(k) != 1:
            raise DataError(f"template must contain {k} exactly once")
        tpl = tpl.replace(k, v)
    if re.search(r"\{\{[A-Z_]+\}\}", tpl):
        raise DataError("unresolved placeholder in template")
    if re.search(r'<(link|script)[^>]+(href|src)="https?://', tpl):
        raise DataError("runtime network dependency in output")
    return tpl


def data_changelog(d: dict) -> str:
    lines = [
        "# Data changelog",
        "",
        "Generated from `data/agentic-model-timeline.json` by `tools/build.py`. Do not edit.",
        "",
        "Versions marked *reconstructed* were rebuilt from session history; no file snapshot exists for them.",
        "",
    ]
    for c in reversed(d["changelog"]):
        tag = "" if c.get("snapshot") else " *(reconstructed)*"
        lines += [f"## {c['version']} — {c['date']}{tag}", "", c["change"], ""]
    return "\n".join(lines)


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else "build"
    d = json.loads(DATA.read_text())
    cv = code_version()
    errs = validate(d)
    if errs:
        print("DATA INVALID:", *errs, sep="\n  ", file=sys.stderr)
        return 1
    print(f"ok  code v{cv}  data v{d['data_version']}  schema {d['schema_version']}  models {len(d['models'])}")
    if mode == "check":
        return 0
    html = render(d, cv)
    DIST.mkdir(exist_ok=True)
    (DIST / OUT_NAME).write_text(html)
    (ROOT / "CHANGELOG.data.md").write_text(data_changelog(d))
    print(f"wrote dist/{OUT_NAME} ({len(html)} bytes) and CHANGELOG.data.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
