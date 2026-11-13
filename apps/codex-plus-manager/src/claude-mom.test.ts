import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { claudeState, emptyProfile, formatWindow, hostOf, normalizeModels, profileProblem, setupSteps, type ClaudeStatus } from "./claude-mom/model.ts";

const status = (patch: Partial<ClaudeStatus> = {}): ClaudeStatus => ({
  supported: true, sourceApp: "", version: "1.0", claudeRunning: false, running: false, connected: false,
  caReady: true, caTrusted: true, nodeAvailable: true, dictationReady: true, models: [], needsRestart: false,
  config: { enabled: true, model: "", localization: true, voiceInput: false, computerUse: false, backgroundMode: false },
  ...patch,
});

test("上游表单：要有效的 Base URL 和默认模型，不能写到 /v1/messages", () => {
  const profile = { ...emptyProfile(), baseUrl: "https://api.example.com", model: "glm-5" };
  assert.equal(profileProblem(profile), null);
  assert.equal(profileProblem({ ...profile, baseUrl: "" }), "填一个 Base URL");
  assert.equal(profileProblem({ ...profile, baseUrl: "api.example.com" }), "Base URL 不是有效地址");
  assert.equal(profileProblem({ ...profile, baseUrl: "ftp://x" }), "Base URL 要以 http:// 或 https:// 开头");
  assert.match(profileProblem({ ...profile, baseUrl: "https://x/v1/messages" }) ?? "", /不要带/);
  assert.equal(profileProblem({ ...profile, model: " " }), "选一个默认模型");
  assert.equal(hostOf("http://127.0.0.1:3425"), "127.0.0.1:3425");
});

test("模型列表去重，默认模型排第一", () => {
  assert.deepEqual(normalizeModels(["b", " a ", "b", ""], "a"), ["a", "b"]);
});

test("默认和快速模型使用完整选择列表，不按当前模型前缀过滤", () => {
  const models = ["claude-fable-5", "claude-fable-5-1", "claude-fable-5-2", "claude-opus-5-5"];
  assert.deepEqual(normalizeModels(models, models[0]), models);
  assert.deepEqual(normalizeModels(models, models[3]), [models[3], ...models.slice(0, 3)]);
  const app = readFileSync(new URL("./claude-mom/ClaudeMomApp.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(app, /<datalist|\blist=\{listId\}/);
  assert.doesNotMatch(app, /<select\b/);
  for (const label of ["默认模型", "快速模型", "上下文窗口"]) assert.match(app, new RegExp(`<AppSelect ariaLabel="${label}"`));
});

test("状态文案：已连接、运行中、外部打开、未启动", () => {
  assert.deepEqual(claudeState(null, null), { text: "正在检测 Claude…", tone: "busy" });
  assert.equal(claudeState(status({ connected: true }), null).tone, "ok");
  assert.equal(claudeState(status({ claudeRunning: true }), null).tone, "warn");
  assert.equal(claudeState(status(), null).text, "未启动");
  assert.equal(claudeState(status(), "launch").text, "正在启动…");
  assert.equal(claudeState(status({ supported: false }), null).text, "没有找到 Claude Desktop");
});

test("启动前清单按顺序列出缺的步骤", () => {
  const ready = { ...emptyProfile(), baseUrl: "https://a.example", model: "m" };
  assert.deepEqual(setupSteps(status(), ready), []);
  assert.deepEqual(setupSteps(status({ caTrusted: false, nodeAvailable: false }), null).map((step) => step.id), ["upstream", "node", "trust"]);
});

test("窗口显示", () => {
  assert.equal(formatWindow(null), "200k");
  assert.equal(formatWindow(1_000_000), "1M");
  assert.equal(formatWindow(1_100_000), "1.1M");
  assert.equal(formatWindow(400_000), "400k");
});

test("前端调用的命令都在后端注册了", () => {
  const app = readFileSync(new URL("./claude-mom/ClaudeMomApp.tsx", import.meta.url), "utf8");
  const lib = readFileSync(new URL("../src-tauri/src/lib.rs", import.meta.url), "utf8");
  // 命令名有的直接传给 invoke，有的经 bookCall 转一手：按字面量收。
  const called = new Set([...app.matchAll(/"(claude_(?:mom|local)_[a-z_]+)"/g)].map((match) => match[1]));
  assert.ok(called.size >= 9, [...called].join(","));
  for (const command of called) assert.ok(new RegExp(`::${command},`).test(lib), `${command} 没有注册`);
});

test("RoseCode Claude 页面内嵌上游管理，切换增强页时保留未保存草稿", () => {
  const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
  const workspace = readFileSync(new URL("./ClaudeWorkspace.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./claude-mom/claude-mom.css", import.meta.url), "utf8");
  assert.match(app, /<ClaudeWorkspace onLocalStatus=/);
  assert.match(workspace, /<ClaudeMomApp embedded onLocalStatus=/);
  assert.match(workspace, /hidden=\{tab !== "gateway"\}/);
  assert.match(workspace, /tab === "enhancements" \? children : null/);
  assert.doesNotMatch(workspace, /iframe|launch_app|claude-mom\.exe/);
  // 独立工具的全局样式不能覆盖主应用的 body、控件和主题。
  assert.doesNotMatch(styles, /^\s*(?:body|:root|\*)\s*\{/m);
  assert.match(styles, /\.cm-standalone body/);
});
