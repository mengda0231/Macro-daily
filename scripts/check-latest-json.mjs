import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const payloadPath = path.join(repoRoot, "data", "latest.json");

function fail(message) {
  console.error(`[check:data] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(payloadPath)) {
  fail(`missing payload: ${payloadPath}`);
}

const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
const latest = payload.latest ?? {};
const site = payload.site ?? {};

const requiredSiteFields = ["title", "subtitle", "generated_at", "mode"];
const requiredLatestFields = ["date", "headline", "summary", "mode", "focus_cards", "secondary_items", "background_items", "monitoring_sources"];

for (const field of requiredSiteFields) {
  if (!site[field]) {
    fail(`site.${field} is missing`);
  }
}

for (const field of requiredLatestFields) {
  if (latest[field] === undefined || latest[field] === null) {
    fail(`latest.${field} is missing`);
  }
}

if (!Array.isArray(latest.focus_cards)) {
  fail("latest.focus_cards must be an array");
}

if (!Array.isArray(latest.secondary_items)) {
  fail("latest.secondary_items must be an array");
}

if (!Array.isArray(latest.background_items)) {
  fail("latest.background_items must be an array");
}

if (!Array.isArray(latest.monitoring_sources) || latest.monitoring_sources.length < 10) {
  fail("latest.monitoring_sources must contain at least 10 configured sources");
}

if (!String(site.title).includes("宏观")) {
  fail("site.title should remain Chinese macro-oriented");
}

if (!String(site.subtitle).includes("中文")) {
  fail("site.subtitle should remain Chinese UI oriented");
}

const focusCount = latest.focus_cards.length;
const sourceCount = latest.monitoring_sources.length;
console.log(`[check:data] ok | focus_cards=${focusCount} monitoring_sources=${sourceCount}`);
