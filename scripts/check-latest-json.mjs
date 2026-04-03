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

function ensureOnlyAllowedKeys(value, allowedKeys, label) {
  const unexpectedKeys = Object.keys(value || {}).filter((key) => !allowedKeys.has(key));
  if (unexpectedKeys.length > 0) {
    fail(`${label} leaked unexpected public fields: ${unexpectedKeys.join(", ")}`);
  }
}

function packageSummary(packageItem) {
  return packageItem.package_title_zh || packageItem.core_topic || "未命名主题包";
}

const bannedPromptOpeners = ["关键看", "先看", "继续看", "需要继续看"];

function firstSentence(text) {
  return String(text || "").split(/[。！？]/u)[0].trim();
}

function startsWithBannedPrompt(text) {
  const normalized = String(text || "").trim().replace(/^[：:，,\s]+/u, "");
  return bannedPromptOpeners.some((marker) => normalized.startsWith(marker));
}

function hasCjk(text) {
  return /[\u4e00-\u9fff]/u.test(String(text || ""));
}

if (!fs.existsSync(payloadPath)) {
  fail(`missing payload: ${payloadPath}`);
}

const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
const latest = payload.latest ?? {};
const site = payload.site ?? {};

const allowedLatestFields = new Set([
  "slug",
  "date",
  "coverage_window",
  "headline",
  "headline_zh",
  "lead_summary",
  "mode",
  "judgments",
  "today_focus_packages",
  "today_secondary_packages",
  "today_background_packages",
  "framework_support_cards",
  "today_representative_sources",
  "asset_map",
  "follow_up_signals",
  "daily_input_generated_at",
]);

const allowedCoverageWindowFields = new Set([
  "timezone",
  "window_start",
  "window_end",
  "window_date",
  "label",
]);

const allowedPackageFields = new Set([
  "package_id",
  "package_type",
  "core_topic",
  "package_title_zh",
  "main_content",
  "commentary_zh",
  "action_block",
  "display_source",
  "source_count",
  "source_tier_mix",
  "first_published_at",
  "latest_published_at",
  "display_lane",
]);

const allowedBackgroundPackageFields = new Set([
  "package_id",
  "package_type",
  "package_title_zh",
  "title",
  "title_zh",
  "main_content",
  "commentary_zh",
  "display_source",
  "first_published_at",
  "latest_published_at",
  "display_lane",
  "context_role",
  "downgrade_reason",
]);

const allowedSourceFields = new Set([
  "source_name",
  "source_name_zh",
  "source_tier",
  "published_at",
  "source_url",
]);

const allowedActionBlockFields = new Set([
  "mode",
  "title",
  "content",
]);

const allowedFrameworkCardFields = new Set([
  "title",
  "title_zh",
  "card_kind",
  "summary",
  "current_view",
  "commentary_zh",
  "latest_related_at",
  "follow_up_signals",
  "framework_support_note",
]);

const allowedRepresentativeSourceFields = new Set([
  "package_title_zh",
  "source_name",
  "source_name_zh",
  "source_tier",
  "published_at",
  "source_url",
]);

const allowedAssetMapFields = new Set([
  "label",
  "stance",
  "score",
  "reason",
]);

for (const field of ["title", "subtitle", "generated_at", "mode"]) {
  requireString(site[field], `site.${field}`);
}

ensureOnlyAllowedKeys(latest, allowedLatestFields, "latest");

for (const field of [
  "slug",
  "date",
  "headline",
  "headline_zh",
  "lead_summary",
  "mode",
]) {
  requireString(latest[field], `latest.${field}`);
}

if (typeof latest.coverage_window !== "object" || latest.coverage_window === null) {
  fail("latest.coverage_window must be an object");
}
ensureOnlyAllowedKeys(latest.coverage_window, allowedCoverageWindowFields, "latest.coverage_window");

for (const field of ["timezone", "label", "window_start", "window_end", "window_date"]) {
  requireString(latest.coverage_window[field], `latest.coverage_window.${field}`);
}

for (const field of [
  "today_focus_packages",
  "today_secondary_packages",
  "today_background_packages",
  "framework_support_cards",
  "today_representative_sources",
  "asset_map",
  "follow_up_signals",
]) {
  requireArray(latest[field], `latest.${field}`);
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

const totalMainPackages = latest.today_focus_packages.length + latest.today_secondary_packages.length;
if (totalMainPackages > 12) {
  fail("main reading flow should stay within the homepage density ceiling");
}
if (latest.today_focus_packages.length > 6) {
  fail("today_focus_packages should stay within the result-first lead-lane ceiling");
}
if (latest.today_secondary_packages.length > 8) {
  fail("today_secondary_packages should stay within the compressed secondary lane ceiling");
}

const packageTitleKeys = new Set();

for (const [bucketName, packages] of packageArrays) {
  for (const packageItem of packages) {
    ensureOnlyAllowedKeys(packageItem, allowedPackageFields, `${bucketName} ${packageSummary(packageItem)}`);
    requireString(packageItem.package_title_zh, `${bucketName} package_title_zh`);
    if (!hasCjk(packageItem.package_title_zh)) {
      fail(`${bucketName} ${packageSummary(packageItem)} package_title_zh must stay Chinese-facing`);
    }
    requireString(packageItem.main_content, `${bucketName} ${packageSummary(packageItem)} main_content`);
    requireString(packageItem.commentary_zh, `${bucketName} ${packageSummary(packageItem)} commentary_zh`);
    if (startsWithBannedPrompt(firstSentence(packageItem.commentary_zh))) {
      fail(`${bucketName} ${packageSummary(packageItem)} commentary_zh still starts with a prompt-style phrase`);
    }
    if (!packageItem.action_block || typeof packageItem.action_block !== "object") {
      fail(`${bucketName} ${packageSummary(packageItem)} action_block is missing`);
    }
    ensureOnlyAllowedKeys(packageItem.action_block, allowedActionBlockFields, `${bucketName} ${packageSummary(packageItem)} action_block`);
    requireString(packageItem.action_block.content, `${bucketName} ${packageSummary(packageItem)} action_block.content`);
    requireString(packageItem.first_published_at, `${bucketName} ${packageSummary(packageItem)} first_published_at`);
    requireString(packageItem.latest_published_at, `${bucketName} ${packageSummary(packageItem)} latest_published_at`);

    const displaySource = packageItem.display_source;
    if (!displaySource || typeof displaySource !== "object") {
      fail(`${bucketName} ${packageSummary(packageItem)} representative source is missing`);
    }
    ensureOnlyAllowedKeys(displaySource, allowedSourceFields, `${bucketName} ${packageSummary(packageItem)} display_source`);
    if (!String(displaySource.source_name_zh || displaySource.source_name || "").trim()) {
      fail(`${bucketName} ${packageSummary(packageItem)} representative source name is missing`);
    }
    requireString(displaySource.source_url, `${bucketName} ${packageSummary(packageItem)} display_source.source_url`);

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
  ensureOnlyAllowedKeys(packageItem, allowedBackgroundPackageFields, `today_background_packages ${packageSummary(packageItem)}`);
  if (packageItem.package_title_zh && !hasCjk(packageItem.package_title_zh)) {
    fail(`today_background_packages ${packageSummary(packageItem)} package_title_zh must stay Chinese-facing`);
  }
  if (packageItem.display_source !== undefined && packageItem.display_source !== null) {
    if (typeof packageItem.display_source !== "object") {
      fail(`today_background_packages ${packageSummary(packageItem)} display_source must be an object`);
    }
    ensureOnlyAllowedKeys(packageItem.display_source, allowedSourceFields, `today_background_packages ${packageSummary(packageItem)} display_source`);
  }
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

requireArray(latest.judgments, "latest.judgments");
if (latest.judgments.length > 5) {
  fail("latest.judgments should stay within the 3-5 judgment range");
}
if (totalMainPackages > 0 && latest.judgments.length < 3) {
  fail("latest.judgments should provide at least 3 result-first judgments when the main flow is populated");
}
for (const judgment of latest.judgments) {
  requireString(judgment, "latest.judgments[]");
  if (startsWithBannedPrompt(firstSentence(judgment))) {
    fail(`judgment still starts with a prompt-style phrase: ${judgment}`);
  }
}

for (const item of latest.framework_support_cards) {
  ensureOnlyAllowedKeys(item, allowedFrameworkCardFields, "latest.framework_support_cards[]");
  if (item.follow_up_signals !== undefined) {
    requireArray(item.follow_up_signals, "latest.framework_support_cards[].follow_up_signals");
  }
}

for (const item of latest.today_representative_sources) {
  ensureOnlyAllowedKeys(item, allowedRepresentativeSourceFields, "latest.today_representative_sources[]");
  if (!String(item.source_name_zh || item.source_name || "").trim()) {
    fail("latest.today_representative_sources[] must include a source name");
  }
  requireString(item.source_url, "latest.today_representative_sources[].source_url");
}

for (const item of latest.asset_map) {
  ensureOnlyAllowedKeys(item, allowedAssetMapFields, "latest.asset_map[]");
  requireString(item.label, "latest.asset_map[].label");
  requireString(item.stance, "latest.asset_map[].stance");
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
