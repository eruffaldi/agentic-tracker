// Smoke test: load the built single-file page in jsdom and exercise every view.
// Run with `node --test test/`. Fails the build if the page breaks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const ROOT = new URL("..", import.meta.url);
const html = readFileSync(new URL("dist/agentic-model-timeline.html", ROOT), "utf8");
const data = JSON.parse(readFileSync(new URL("data/agentic-model-timeline.json", ROOT), "utf8"));
const codeVersion = readFileSync(new URL("VERSION", ROOT), "utf8").trim();

function load(width = 1024) {
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    beforeParse(win) {
      win.innerWidth = width;
      win.addEventListener("error", (e) => errors.push(e.message));
    },
  });
  return { dom, doc: dom.window.document, errors };
}

test("no runtime network dependencies", () => {
  assert.doesNotMatch(html, /<(link|script)[^>]+(href|src)="https?:\/\//);
});

test("page renders with version stamp", () => {
  const { doc, errors } = load();
  assert.deepEqual(errors, []);
  const stamp = doc.getElementById("stamp-date").textContent;
  assert.match(stamp, new RegExp(`code v${codeVersion.replace(/\./g, "\\.")}`));
  assert.match(stamp, new RegExp(`data v${data.data_version.replace(/\./g, "\\.")}`));
  assert.match(doc.getElementById("foot").textContent, /code v/);
});

test("default chart draws a point per scored model", () => {
  const { doc } = load();
  const pressed = doc.querySelector('#bench-seg button[aria-pressed="true"]');
  assert.ok(pressed, "a benchmark is selected");
  const svg = doc.getElementById("chart");
  const pts = svg.querySelectorAll("rect, circle").length;
  const bench = Object.keys(data.benchmarks).find((b) =>
    pressed.textContent.startsWith(data.benchmarks[b].name.replace("Terminal-Bench", "TB").replace("SWE-bench", "SWE")));
  const scored = data.models.filter((m) => m.scores[bench]).length;
  assert.equal(pts, scored);
});

test("every benchmark x view x vendor combination renders without error", () => {
  const { dom, doc, errors } = load();
  const click = (el) => el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  const n = (id) => doc.querySelectorAll(`#${id} button`).length;
  for (let v = 0; v < n("view-seg"); v++) {
    click(doc.querySelectorAll("#view-seg button")[v]);
    for (let b = 0; b < n("bench-seg"); b++) {
      click(doc.querySelectorAll("#bench-seg button")[b]);
      for (let f = 0; f < n("vendor-seg"); f++) {
        click(doc.querySelectorAll("#vendor-seg button")[f]);
        assert.ok(doc.getElementById("chart"), "chart present");
        assert.equal(doc.querySelectorAll("#cards .card").length, 4);
      }
    }
  }
  assert.deepEqual(errors, []);
});

test("sources and Copilot tables reflect the data", () => {
  const { doc } = load();
  assert.equal(doc.querySelectorAll("#sources li").length, data.sources.length);
  const sold = data.models.filter((m) => m.copilot?.available).length + (data.copilot_catalog_extra || []).length;
  assert.equal(doc.querySelectorAll("#cp-body tr").length, sold);
});

test("narrow viewport uses the mobile chart geometry", () => {
  const { doc } = load(380);
  assert.match(doc.getElementById("chart").getAttribute("viewBox"), /^0 0 380 /);
});

test("pasted JSON with an unsupported schema is rejected", () => {
  const { dom, doc } = load();
  const bad = { ...data, schema_version: "9.0" };
  doc.getElementById("paste").value = JSON.stringify(bad);
  doc.getElementById("apply").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  assert.match(doc.getElementById("msg").textContent, /not supported/);
});
