import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type Node = { type: string; props: Record<string, any> };
const nodes = (value: any): Node[] => !value || typeof value !== "object" ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
const content = (value: any): string => value == null || typeof value === "boolean" ? "" : Array.isArray(value) ? value.map(content).join("") : typeof value === "object" ? content(value.props?.children) : String(value);

function harness(embedded: boolean) {
  const hooks: any[] = [];
  let cursor = 0;
  let escape: (() => void) | null = null;
  let busy: string | null = null;
  const calls: Array<{ command: string; args: any }> = [];
  const jsx = (type: any, props: any) => ({ type, props });
  class InputElement {}
  const modules: Record<string, unknown> = {
    react: { useState: (initial: any) => { const index = cursor++; if (!(index in hooks)) hooks[index] = initial; return [hooks[index], (next: any) => { hooks[index] = typeof next === "function" ? next(hooks[index]) : next; }]; } },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "lucide-react": { Pencil: "svg", Plus: "svg", Trash2: "svg", Zap: "svg" },
    "./app-dialog": { appConfirm: () => assert.fail("本测试不删除 Key") },
    "./i18n": { t: (value: string) => value, tf: (value: string, args: any[]) => value.replace(/\{(\d+)\}/g, (_, index) => String(args[Number(index)])) },
    "./use-escape-layer": { useEscapeLayer: (active: boolean, close: () => void) => { escape = active ? close : null; } },
  };
  const exports: Record<string, any> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./ProviderKeyList.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, HTMLInputElement: InputElement, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  const render = () => { cursor = 0; return exports.ProviderKeyList({ embedded, entry: { id: "demo-provider", keys: [{ id: "demo-key", masked: "demo…masked" }] }, busy, run: async (_: string, command: string, args: any) => { calls.push({ command, args }); return true; }, onTest: () => assert.fail("本测试不发送请求") }) as Node; };
  const button = (tree: Node, label: string) => { const node = nodes(tree).find((item) => item.type === "button" && content(item) === label); assert.ok(node, label); return node; };
  return { render, calls, button, InputElement, setBusy: (next: string | null) => { busy = next; }, escape: () => { assert.ok(escape); escape(); } };
}

test("宽供应商表单里的 Key 编辑不嵌套 form，回车只提交 Key", async () => {
  const ui = harness(true);
  ui.button(ui.render(), "添加 Key").props.onClick();
  let tree = ui.render();
  const input = nodes(tree).find((node) => node.type === "input")!;
  assert.equal(input.props.type, "password");
  input.props.onChange({ currentTarget: { value: "synthetic-test-key" } });
  tree = ui.render();
  assert.equal(nodes(tree).filter((node) => node.type === "form").length, 0);
  assert.equal(ui.button(tree, "保存 Key").props.type, "button");
  let prevented = false; let stopped = false;
  nodes(tree).find((node) => node.props.className === "gw-key-editor")!.props.onKeyDown({ key: "Enter", target: new ui.InputElement(), preventDefault: () => { prevented = true; }, stopPropagation: () => { stopped = true; } });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.ok(prevented && stopped, "不能触发外层连接表单提交");
  assert.deepEqual(ui.calls.map((call) => call.command), ["add_gateway_provider_key"]);
  assert.equal(ui.calls[0].args.id, "demo-provider");
  assert.equal(nodes(ui.render()).some((node) => node.type === "input"), false);
});

test("Key 输入的 Escape 只取消当前 Key，普通详情仍使用独立表单", () => {
  const ui = harness(false);
  ui.button(ui.render(), "添加 Key").props.onClick();
  assert.equal(nodes(ui.render()).filter((node) => node.type === "form").length, 1);
  ui.escape();
  assert.equal(nodes(ui.render()).some((node) => node.type === "input"), false);
  assert.equal(ui.calls.length, 0);
});

test("连接正在保存时，Key 输入的回车也不能发送另一次写入", async () => {
  const ui = harness(true);
  ui.button(ui.render(), "添加 Key").props.onClick();
  nodes(ui.render()).find((node) => node.type === "input")!.props.onChange({ currentTarget: { value: "synthetic-test-key" } });
  ui.setBusy("edit:demo-provider");
  const tree = ui.render();
  assert.equal(ui.button(tree, "保存 Key").props.disabled, true);
  let prevented = false;
  nodes(tree).find((node) => node.props.className === "gw-key-editor")!.props.onKeyDown({ key: "Enter", target: new ui.InputElement(), preventDefault: () => { prevented = true; }, stopPropagation: () => {} });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.ok(prevented);
  assert.equal(ui.calls.length, 0);
  assert.ok(nodes(ui.render()).some((node) => node.type === "input"), "保留草稿供保存结束后重试");
});
