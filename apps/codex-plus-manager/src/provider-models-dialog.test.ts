import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

test("模型列表可以手动编辑、从上游刷新，后台发现的新模型直接带进弹窗", () => {
  const dialog = read("ProviderModelsDialog.tsx");
  assert.match(dialog, /invoke<CheckResult>\("check_gateway_provider_models", \{ id: entry\.id \}\)/);
  assert.match(dialog, /useState<string\[\]>\(entry\.upstreamNew \?\? \[\]\)/);
  const providers = read("GatewayProviders.tsx");
  assert.match(providers, /"save_gateway_provider_models", \{ id: entry\.id, models, defaultModel \}/);
  assert.match(providers, /setModelsOpen\(true\)/);
  // 详情里「编辑」旁的「从上游同步」先打开预览弹窗，勾选后才写入（#2785）。
  assert.match(providers, /onClick=\{\(\) => setSyncOpen\(true\)\}/);
  assert.match(providers, /"apply_gateway_provider_models_sync", \{ id: entry\.id, remove, add \}, t\("从上游同步"\)\)/);
  assert.match(providers, /\{t\("从上游同步"\)\}/);
  assert.doesNotMatch(providers, /fetch_gateway_provider_models/);
  assert.doesNotMatch(providers, /只属于网关，直连模式里看不到/);
});

test("供应商池顶栏的搜索框和按钮同高、不带按钮自己的上边距", () => {
  assert.match(read("GatewayPage.css"), /\.shell \.gw-provider-search-row \.gw-primary-button \{\s*margin-top: 0;/);
});

test("Agent 接入开关独立于默认模型动作栏，名称旁只有一个接入开关", () => {
  const agents = read("GatewayAgents.tsx");
  const row = agents.slice(agents.indexOf('className="gw-agent-row cx-row"'), agents.indexOf("{expanded && connected"));
  assert.ok(row.indexOf('className="rose-agent-access-toggle"') < row.indexOf("<Switch"));
  assert.ok(row.indexOf("<Switch") < row.indexOf('className="cx-row-controls rose-agent-connection-controls"'));
  assert.equal(row.match(/<Switch\b/g)?.length, 1);
  assert.match(row, /<ModelPicker/);
});
