import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as model from "./claude-mom/model.ts";

type Element = { type: any; props: Record<string, any> };
const original = { ...model.emptyProfile(), id: "a", name: "上游 A", baseUrl: "https://old.example", model: "old-model", models: ["old-model"] };
const second = { ...original, id: "b", name: "上游 B" };
const ready = { status: "ok", message: "", supported: false, running: false, claudeRunning: false, config: {}, models: [] };
const source = ts.transpileModule(readFileSync(new URL("./claude-mom/ClaudeMomApp.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
const elements = (node: any): Element[] => !node || typeof node !== "object" ? []
  : Array.isArray(node) ? node.flatMap(elements) : [node, ...elements(node.props?.children)];
const text = (node: any): string => node == null ? "" : Array.isArray(node) ? node.map(text).join("")
  : typeof node === "object" ? text(node.props?.children) : String(node);
function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// 运行真实组件及事件处理器，仅替换 hooks 和 IPC；不连接本机 Claude，不写真实上游。
async function harness(handler: (command: string, args: any) => Promise<any>, profiles = [original, second], embedded = true, initialLoad?: Promise<any>) {
  let cursor = 0;
  const hooks: any[] = [];
  const effects: Array<() => void> = [];
  const calls: Array<{ command: string; args: any }> = [];
  const book = { status: "ok", message: "已读取", profiles: structuredClone(profiles), activeId: profiles[0]?.id ?? null };
  const memo = (fn: () => any, deps: unknown[]) => {
    const i = cursor++;
    if (!hooks[i] || deps.some((value, j) => !Object.is(value, hooks[i].deps[j]))) hooks[i] = { deps, value: fn() };
    return hooks[i].value;
  };
  const jsx = (type: any, props: Record<string, any>) => ({ type, props });
  const modules: Record<string, any> = {
    react: {
      useState(initial: any) {
        const i = cursor++;
        if (!(i in hooks)) hooks[i] = typeof initial === "function" ? initial() : initial;
        return [hooks[i], (value: any) => { hooks[i] = typeof value === "function" ? value(hooks[i]) : value; }];
      },
      useRef(initial: any) { const i = cursor++; return hooks[i] ??= { current: initial }; },
      useEffect(fn: () => void, deps: unknown[]) {
        const i = cursor++;
        if (!hooks[i] || deps.some((value, j) => !Object.is(value, hooks[i][j]))) effects.push(fn);
        hooks[i] = deps;
      },
      useMemo: memo,
      useCallback: (fn: () => any, deps: unknown[]) => memo(() => fn, deps),
    },
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "react-dom": { createPortal: (child: unknown) => child },
    "lucide-react": new Proxy({}, { get: (_target, key) => String(key) }),
    "@tauri-apps/api/core": { invoke: async (command: string, args: any) => {
      if (command === "claude_mom_load") return initialLoad ?? structuredClone(book);
      if (command === "claude_local_status") return ready;
      calls.push({ command, args });
      return handler(command, args);
    } },
    "../AppSelect": { AppSelect: "AppSelect" },
    "../use-popover-layer": { usePopoverLayer: () => ({}) },
    "../rosecode/use-presence": { usePresence: (open: boolean) => open },
    "./claude-mom.css": {},
    "./PoolUpstreamPicker": { PoolUpstreamPicker: "PoolUpstreamPicker" },
    "./model": model,
  };
  const exports: Record<string, any> = {};
  vm.runInNewContext(source, { exports, require: (name: string) => {
    assert.ok(name in modules, name);
    return modules[name];
  }, setInterval: () => 0, clearInterval: () => {} });
  const render = () => { cursor = 0; return exports.ClaudeMomApp({ embedded }) as Element; };
  const flush = async () => {
    for (let round = 0; round < 4; round++) {
      render();
      for (const effect of effects.splice(0)) effect();
      for (let i = 0; i < 12; i++) await Promise.resolve();
    }
  };
  const find = (predicate: (element: Element) => boolean) => {
    const found = elements(render()).find(predicate);
    assert.ok(found, "未找到目标控件");
    return found.props;
  };
  const editor = () => find((element) => element.type?.name === "UpstreamEditor");
  const button = (label: string) => find((element) => element.type === "button" && text(element) === label);
  const edit = (patch: Partial<model.UpstreamProfile>) => editor().onChange({ ...editor().draft, ...patch });
  await flush();
  return { editor, button, edit, find, flush, calls, book, render };
}

test("上游保存失败或抛异常保留草稿，可以再次保存", async () => {
  for (const throws of [false, true]) {
    const h = await harness(async () => {
      if (throws) throw new Error("磁盘不可写");
      return { ...structuredClone(h.book), status: "failed", message: "保存失败" };
    });
    h.edit({ name: "不能丢的输入" });
    h.editor().onSave(false);
    await h.flush();
    assert.equal(h.editor().draft.name, "不能丢的输入");
    assert.equal(h.editor().busy, null);
    assert.equal(h.editor().dirty, true);
    h.editor().onSave(false);
    await h.flush();
    assert.equal(h.calls.length, 2);
  }
});

test("保存期间继续编辑保留新输入，未改字段接收后端规范值", async () => {
  const pending = deferred();
  const h = await harness(() => pending.promise);
  h.edit({ name: "提交的名称" });
  h.editor().onSave(false);
  h.edit({ name: "提交后继续输入", modelNames: { "old-model": "新显示名" } });
  pending.resolve({ ...h.book, profiles: [{ ...original, name: "提交的名称", baseUrl: "https://normalized.example" }, second] });
  await h.flush();
  assert.equal(h.editor().draft.name, "提交后继续输入");
  assert.equal(h.editor().draft.baseUrl, "https://normalized.example");
  assert.equal(h.editor().draft.modelNames["old-model"], "新显示名");
  assert.equal(h.editor().dirty, true);
  assert.equal(h.calls.length, 1);
});

test("新增保存期间继续输入保留草稿并接收新 id，再保存更新同一条", async () => {
  const pending = deferred();
  const h = await harness(() => pending.promise, []);
  h.button("添加上游").onClick();
  h.edit({ name: "新增", baseUrl: "https://new.example/", model: "new-model" });
  h.editor().onSave(false);
  h.edit({ name: "继续输入" });
  const saved = { ...h.calls[0].args.profile, id: "created", baseUrl: "https://new.example" };
  pending.resolve({ status: "ok", message: "已保存", profiles: [saved], activeId: null });
  await h.flush();
  assert.equal(h.editor().draft.id, "created");
  assert.equal(h.editor().draft.name, "继续输入");
  assert.equal(h.editor().draft.baseUrl, "https://new.example");
  h.editor().onSave(false);
  assert.equal(h.calls[1].args.profile.id, "created");
});

test("未继续编辑的保存会更新已保存状态", async () => {
  const h = await harness(async (_command, args) => ({ ...h.book, profiles: [args.profile, second] }));
  h.edit({ name: "新名称" });
  h.editor().onSave(false);
  await h.flush();
  assert.equal(h.editor().draft.name, "新名称");
  assert.equal(h.editor().dirty, false);
});

test("拉取期间修改地址、Key 或改回原地址，旧响应均不写入模型", async () => {
  for (const field of ["baseUrl", "apiKey", "roundTrip"] as const) {
    const pending = deferred();
    const h = await harness(() => pending.promise);
    h.editor().onFetchModels();
    if (field === "apiKey") h.edit({ apiKey: "synthetic-new-key" });
    else {
      h.edit({ baseUrl: "https://new.example" });
      if (field === "roundTrip") h.edit({ baseUrl: original.baseUrl });
    }
    pending.resolve({ status: "ok", message: "已读取", models: [{ id: "stale-model" }] });
    await h.flush();
    assert.deepEqual(Array.from(h.editor().draft.models), ["old-model"]);
    assert.match(text(h.render()), /连接已修改/);
  }
});

test("连接未变时拉取模型成功，并保留拉取期间修改的名称", async () => {
  const pending = deferred();
  const h = await harness(() => pending.promise);
  h.editor().onFetchModels();
  h.edit({ name: "拉取期间改名" });
  pending.resolve({ status: "ok", message: "已读取", models: [{ id: "fresh-model", displayName: "新模型", contextWindow: null }] });
  await h.flush();
  assert.ok(h.editor().draft.models.includes("fresh-model"));
  assert.equal(h.editor().draft.modelNames["fresh-model"], "新模型");
  assert.equal(h.editor().draft.name, "拉取期间改名");
});

test("有草稿时新建、切换、导入和供应商池同步不丢修改，放弃后可新建", async () => {
  const h = await harness(async () => { assert.fail("不应发送写请求"); });
  h.edit({ name: "未保存" });
  h.button("添加上游").onClick();
  h.find((element) => element.type === "AppSelect" && element.props.ariaLabel === "选择上游").onChange("b");
  h.find((element) => element.type?.name === "ImportMenu").onPick("magpie");
  h.button("从供应商池同步").onClick();
  assert.equal(h.editor().draft.name, "未保存");
  assert.equal(h.editor().draft.id, "a");
  assert.equal(h.calls.length, 0);
  assert.match(text(h.render()), /请先保存或放弃修改/);
  h.editor().onDiscard();
  h.button("添加上游").onClick();
  h.edit({ name: "新增草稿" });
  h.button("添加上游").onClick();
  assert.equal(h.editor().draft.name, "新增草稿");
});

test("独立 ClaudeMom 的添加按钮同样保留未保存草稿", async () => {
  const h = await harness(async () => { assert.fail(); }, [original], false);
  h.edit({ name: "独立版草稿" });
  h.button("添加").onClick();
  assert.equal(h.editor().draft.name, "独立版草稿");
});

test("初始读取迟到不会覆盖用户已经新建的草稿", async () => {
  const pending = deferred();
  const h = await harness(async () => { assert.fail(); }, [original], true, pending.promise);
  h.button("添加上游").onClick();
  h.edit({ name: "读取完成前的新草稿" });
  pending.resolve(h.book);
  await h.flush();
  assert.equal(h.editor().draft.id, "");
  assert.equal(h.editor().draft.name, "读取完成前的新草稿");
});

test("点击当前上游返回编辑页但不重置草稿", async () => {
  const h = await harness(async () => { assert.fail(); });
  h.edit({ name: "保留的输入" });
  h.button("Claude 设置").onClick();
  h.find((element) => element.type === "AppSelect" && element.props.ariaLabel === "选择上游").onChange("a");
  assert.equal(h.editor().draft.name, "保留的输入");
});
