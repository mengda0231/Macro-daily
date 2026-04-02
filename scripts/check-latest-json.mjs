import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const payloadPath = path.join(repoRoot, "data", "latest.json");
const indexPath = path.join(repoRoot, "index.html");

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
  "monitoring_sources",
]) {
  requireArray(latest[field], `latest.${field}`);
}

for (const forbiddenField of [
  "evidence_sections",
  "evidence_digest",
  "official_confirmation",
  "headline_evidence",
  "browser_visible_extraction",
  "evidence_gaps",
]) {
  if (Object.prototype.hasOwnProperty.call(latest, forbiddenField)) {
    fail(`latest.${forbiddenField} should not be exposed in the public payload`);
  }
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

if (latest.today_focus_packages.length > 3) {
  fail("today_focus_packages should stay within the 1-3 package density target");
}

const packageTitleKeys = new Set();

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

    requireString(packageItem.display_lane, `${bucketName} ${packageSummary(packageItem)} display_lane`);
    if (bucketName === "today_focus_packages" && !["headline_media", "official_update"].includes(packageItem.display_lane)) {
      fail(`${bucketName} ${packageSummary(packageItem)} display_lane must be headline_media or official_update`);
    }
    if (bucketName === "today_secondary_packages" && packageItem.display_lane !== "secondary") {
      fail(`${bucketName} ${packageSummary(packageItem)} display_lane must be secondary`);
    }

    const titleKey = String(packageItem.package_title_zh).trim();
    if (packageTitleKeys.has(titleKey)) {
      fail(`duplicate package title leaked into public payload: ${titleKey}`);
    }
    packageTitleKeys.add(titleKey);
  }
}

for (const packageItem of latest.today_background_packages) {
  requireString(packageItem.display_lane, `today_background_packages ${packageSummary(packageItem)} display_lane`);
  if (packageItem.display_lane !== "background") {
    fail(`today_background_packages ${packageSummary(packageItem)} display_lane must be background`);
  }
}

if (latest.today_focus_packages.length > 0) {
  const hasLeadLane = latest.today_focus_packages.some((item) => ["headline_media", "official_update"].includes(item.display_lane));
  if (!hasLeadLane) {
    fail("today_focus_packages must contain at least one result-first display lane");
  }
}

if (!String(site.title).includes("宏观")) {
  fail("site.title should remain Chinese macro-oriented");
}

if (!String(site.subtitle).includes("中文")) {
  fail("site.subtitle should remain Chinese UI oriented");
}

if (!fs.existsSync(indexPath)) {
  fail(`missing built site: ${indexPath}`);
}

const indexHtml = fs.readFileSync(indexPath, "utf8");
for (const forbiddenMarker of ["证据流", "主证据", "高信号媒体", "官方确认", "开放缺口"]) {
  if (indexHtml.includes(forbiddenMarker)) {
    fail(`index.html still leaks removed evidence UI marker: ${forbiddenMarker}`);
  }
}

for (const requiredMarker of ["头版深度与独家", "今日重大官方与政策", "今日次级关注", "框架支持"]) {
  if (!indexHtml.includes(requiredMarker)) {
    fail(`index.html is missing required result-first marker: ${requiredMarker}`);
  }
}

console.log(
  `[check:data] ok | focus_packages=${latest.today_focus_packages.length} secondary_packages=${latest.today_secondary_packages.length}`,
);
