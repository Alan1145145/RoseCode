import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { selectedProviderId } from "./rosecode/provider-selection.ts";
import type { GatewayPoolEntry } from "./gateway-model.ts";

const off = { id: "off", enabled: false } as GatewayPoolEntry;
const on = { id: "on", enabled: true } as GatewayPoolEntry;
const other = { id: "other", enabled: true } as GatewayPoolEntry;

type Node = { type: string; props: Record<string, any> };
function nodes(value: any): Node[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(nodes);
  return [value, ...nodes(value.props?.children)];
}
function content(value: any): string {
  if (value == null || typeof value === "boolean") return "";
  if (Array.isArray(value)) return value.map(content).join("");
  return typeof value === "object" ? content(value.props?.children) : String(value);
}
function workspace(loadState: "ready" | "loading" | "error") {
  const exports: Record<string, any> = {};
  const jsx = (type: any, props: any) => ({ type, props });
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./rosecode/ProviderWorkspace.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: (name: string) => {
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
    if (name === "lucide-react") return { Server: "svg", ShieldCheck: "svg", Workflow: "svg" };
    if (name === "../i18n") return { t: (value: string) => value };
    assert.fail(`unexpected import: ${name}`);
  } });
  return exports.ProviderWorkspace({ total: 0, enabled: 0, models: 0, loadState, list: null, toolbar: null });
}

test("供应商详情优先选启用项，仍允许显式查看未启用项", () => {
  assert.equal(selectedProviderId([off, on], null), "on");
  assert.equal(selectedProviderId([off, on], "off"), "off");
  assert.equal(selectedProviderId([off], null), "off");
});

test("筛选、折叠与后台删除后，详情不会指向不可见条目", () => {
  assert.equal(selectedProviderId([other], "on"), "other");
  assert.equal(selectedProviderId([], "on"), null);
  const entries = [off, on, other];
  const before = structuredClone(entries);
  selectedProviderId(entries, "missing");
  assert.deepEqual(entries, before, "选择详情不能调整实际顺序或开关");
});

test("全宽供应商列表允许全部收起，不因刷新或筛选自动打开其它条目", () => {
  assert.equal(selectedProviderId([off, on], null, false), null);
  assert.equal(selectedProviderId([off, on], "off", false), "off");
  assert.equal(selectedProviderId([on], "off", false), null);
});

test("供应商读取中和读取失败时不伪装成空池或零统计", () => {
  for (const state of ["loading", "error"] as const) {
    const tree = workspace(state);
    const metrics = nodes(tree).find((node) => node.props.className === "rose-provider-metrics");
    assert.deepEqual(nodes(metrics).filter((node) => node.type === "strong").map(content), ["—", "—", "—"]);
    assert.doesNotMatch(content(tree), /选择一个供应商|连接、模型与 Key 会显示在这里/);
    assert.match(content(tree), state === "loading" ? /正在读取/ : /读取供应商失败，请刷新重试/);
    assert.equal(nodes(tree).find((node) => node.props.className === "rose-provider-workspace")?.props["aria-busy"], state === "loading");
  }
});

test("真正读取到空供应商池时才显示零统计和空池提示", () => {
  const tree = workspace("ready");
  const metrics = nodes(tree).find((node) => node.props.className === "rose-provider-metrics");
  assert.deepEqual(nodes(metrics).filter((node) => node.type === "strong").map(content), ["0", "0/ 0", "0"]);
  assert.match(content(tree), /尚未添加供应商/);
});
