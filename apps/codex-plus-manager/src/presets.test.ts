import assert from "node:assert";
import { describe, it, test } from "node:test";
import { PRESETS } from "./presets.ts";

describe("provider presets", () => {
  it("keeps MiniMax China and global credentials in separate presets", () => {
    const china = PRESETS.find((preset) => preset.id === "minimax");
    const global = PRESETS.find((preset) => preset.id === "minimax-global");

    assert.deepStrictEqual(china, {
      id: "minimax",
      name: "MiniMax (China)",
      websiteUrl: "https://platform.minimaxi.com",
      apiKeyUrl: "https://platform.minimaxi.com/subscribe/coding-plan",
      category: "cn_official",
      baseUrl: "https://api.minimaxi.com/v1",
      protocol: "chatCompletions",
      model: "MiniMax-M3",
      modelList: ["MiniMax-M3", "MiniMax-M2.7"],
    });

    assert.deepStrictEqual(global, {
      id: "minimax-global",
      name: "MiniMax (Global)",
      websiteUrl: "https://platform.minimax.io",
      apiKeyUrl: "https://platform.minimax.io/subscribe/coding-plan",
      category: "official",
      baseUrl: "https://api.minimax.io/v1",
      protocol: "chatCompletions",
      model: "MiniMax-M3",
      modelList: ["MiniMax-M3", "MiniMax-M2.7"],
    });
  });

test("DeepSeek preset uses the official Responses integration", () => {
  const preset = PRESETS.find((candidate) => candidate.id === "deepseek");
  assert.ok(preset);
  assert.equal(preset.baseUrl, "https://api.deepseek.com/");
  assert.equal(preset.protocol, "responses");
  assert.equal(preset.model, "deepseek-v4-flash");
  assert.deepEqual(preset.modelList, ["deepseek-v4-flash", "deepseek-v4-pro"]);
});

// GrooRoute 赞助已于 2026-10-15 到期：预设与推广链接一并下线。
test("expired GrooRoute sponsor preset is removed", () => {
  assert.equal(PRESETS.some((candidate) => candidate.id === "grooroute"), false);
});

test("RoseAI preset uses the published v1 Base URL", () => {
  const preset = PRESETS.find((candidate) => candidate.id === "roseai");
  assert.ok(preset);
  assert.equal(preset.baseUrl, "https://whiteroseai.org/v1");
  assert.equal(preset.protocol, "responses");
});
test("RoseAI includes all three protocols with the correct Base URLs", () => {
  const roseai = PRESETS.filter((preset) => preset.id === "roseai" || preset.id.startsWith("roseai-"));
  assert.deepEqual(roseai.map(({ protocol, baseUrl }) => [protocol, baseUrl]), [
    ["responses", "https://whiteroseai.org/v1"],
    ["chatCompletions", "https://whiteroseai.org/v1"],
    ["anthropicMessages", "https://whiteroseai.org"],
  ]);
  assert.ok(roseai.every((preset) => !preset.model && !preset.modelList?.length));
});
});
