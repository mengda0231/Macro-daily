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

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${label} is missing`);
  }
}

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array`);
  }
}

function packageSummary(packageItem) {
  return packageItem.package_title_zh || packageItem.core_topic || "未命名主题包";
}

if (!fs.existsSync(payloadPath)) {
  fail(`missing payload: ${payloadPath}`);
}

const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
const latest = payload.latest ?? {};
const site = payload.site ?? {};

for (const field of ["title", "subtitle", "generated_at", "mode"]) {
  requireString(site[field], `site.${field}`);
}

for (const field of [
  "date",
  "headline",
  "headline_zh",
  "lead_summary",
  "mode",
  "runtime_capability_version",
]) {
  requireString(latest[field], `latest.${field}`);
}

if (typeof latest.runtime_capability_contract !== "object" || latest.runtime_capability_contract === null) {
  fail("latest.runtime_capability_contract must be an object");
}

if (typeof latest.coverage_window !== "object" || latest.coverage_window === null) {
  fail("latest.coverage_window must be an object");
}

for (const field of ["label", "window_start", "window_end", "window_date"]) {
  requireString(latest.coverage_window[field], `latest.coverage_window.${field}`);
}

for (const field of [
  "today_focus_packages",
  "today_secondary_packages",
  "today_background_packages",
  "evidence_sections",
  "monitoring_sources",
]) {
  requireArray(latest[field], `latest.${field}`);
}

if (latest.monitoring_sources.length < 10) {
  fail("latest.monitoring_sources must contain at least 10 configured sources");
}

const countStyleHeadlineMarkers = [
  "重点事件包",
  "次级关注包",
  "窗口内背景包",
  "汇总出",
];

for (const marker of countStyleHeadlineMarkers) {
  if (String(latest.headline_zh).includes(marker) || String(latest.headline).includes(marker)) {
    fail(`headline still looks count-driven: ${marker}`);
  }
}

const packageArrays = [
  ["today_focus_packages", latest.today_focus_packages],
  ["today_secondary_packages", latest.today_secondary_packages],
];

for (const [bucketName, packages] of packageArrays) {
  for (const packageItem of packages) {
    requireString(packageItem.package_title_zh, `${bucketName} package_title_zh`);
    requireString(packageItem.main_content, `${bucketName} ${packageSummary(packageItem)} main_content`);
    requireString(packageItem.commentary_zh, `${bucketName} ${packageSummary(packageItem)} commentary_zh`);
    if (!packageItem.action_block || typeof packageItem.action_block !== "object") {
      fail(`${bucketName} ${packageSummary(packageItem)} action_block is missing`);
    }
    requireString(packageItem.action_block.content, `${bucketName} ${packageSummary(packageItem)} action_block.content`);
    requireString(packageItem.first_published_at, `${bucketName} ${packageSummary(packageItem)} first_published_at`);
    requireString(packageItem.latest_published_at, `${bucketName} ${packageSummary(packageItem)} latest_published_at`);

    const displaySource = packageItem.display_source || packageItem.primary_source;
    if (!displaySource || typeof displaySource !== "object") {
      fail(`${bucketName} ${packageSummary(packageItem)} representative source is missing`);
    }
    if (!String(displaySource.source_name_zh || displaySource.source_name || "").trim()) {
      fail(`${bucketName} ${packageSummary(packageItem)} representative source name is missing`);
    }
  }
}

for (const section of latest.evidence_sections) {
  requireString(section.title, "latest.evidence_sections[].title");
  requireString(section.summary_zh, `evidence section ${section.title} summary_zh`);
  requireString(section.representative_source, `evidence section ${section.title} representative_source`);
  requireString(section.latest_published_at, `evidence section ${section.title} latest_published_at`);
  requireArray(section.items, `evidence section ${section.title} items`);
  if (section.items.length === 0) {
    fail(`evidence section ${section.title} must contain at least one item`);
  }
  for (const item of section.items) {
    requireString(item.summary_zh, `evidence section ${section.title} item summary_zh`);
    requireString(item.source_name_zh || item.source_name, `evidence section ${section.title} item source name`);
    requireString(item.published_at, `evidence section ${section.title} item published_at`);
  }
}

if (!String(site.title).includes("宏观")) {
  fail("site.title should remain Chinese macro-oriented");
}

if (!String(site.subtitle).includes("中文")) {
  fail("site.subtitle should remain Chinese UI oriented");
}

console.log(
  `[check:data] ok | focus_packages=${latest.today_focus_packages.length} secondary_packages=${latest.today_secondary_packages.length} evidence_sections=${latest.evidence_sections.length}`,
);
