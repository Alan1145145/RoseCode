import assert from "node:assert/strict";
import test from "node:test";
import { nextSelectIndex, selectSearchIndex } from "./rosecode/select-navigation.ts";

test("菜单键盘导航跳过禁用选项、循环首尾，并处理空列表", () => {
  const options = [{}, { disabled: true }, {}, {}];
  assert.equal(nextSelectIndex(options, -1, 1), 0);
  assert.equal(nextSelectIndex(options, 0, 1), 2);
  assert.equal(nextSelectIndex(options, 0, -1), 3);
  assert.equal(nextSelectIndex(options, 3, 1), 0);
  assert.equal(nextSelectIndex([], -1, 1), -1);
  assert.equal(nextSelectIndex([{ disabled: true }], 0, -1), -1);
});

test("模型菜单按键搜索可以跨越当前模型前缀，未匹配时不改变选择", () => {
  const models = ["claude-fable-5", "claude-fable-5-1", "claude-opus-5-5"];
  assert.equal(selectSearchIndex(models, "claude-opus", 0), 2);
  assert.equal(selectSearchIndex(models, "CLAUDE-FABLE", 2), 0);
  assert.equal(selectSearchIndex(models, "no-match", 1), -1);
  assert.equal(selectSearchIndex(models, "", 1), -1);
  assert.equal(selectSearchIndex([], "model", 0), -1);
});
