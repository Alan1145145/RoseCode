import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { isTriggerVisible, resolvePopoverLayout } from "./popover-layer.ts";

const file = ts.createSourceFile("GatewayAgents.tsx", readFileSync(new URL("./GatewayAgents.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = file.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "Floating");
assert.ok(component);
const source = ts.transpileModule(component.getText(file).replace(/^export /, ""), { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;

function harness(contentHeight: number, nestedList = false) {
  let position: any = null;
  let effect: (() => void) | undefined;
  let previousDeps: unknown[] | undefined;
  let tree: any;
  const listeners = new Map<string, (event?: { target: unknown }) => void>();
  let focusCount = 0;
  let frame: (() => void) | undefined;
  let onContentChange: (() => void) | undefined;
  const rect = { left: 850, right: 930, width: 80, top: 630, bottom: 664, height: 34 };
  const chromeHeight = nestedList ? 120 : 0;
  const clientHeight = () => Math.min(contentHeight + chromeHeight, (position?.maxHeight ?? 520) - 2);
  const list = {
    get clientHeight() { return Math.max(0, clientHeight() - chromeHeight); },
    get scrollHeight() { return contentHeight; },
  };
  const content = { get scrollHeight() { return clientHeight(); } };
  const panel = {
    get clientHeight() { return clientHeight(); },
    get offsetHeight() { return clientHeight() + 2; },
    get scrollHeight() { return clientHeight(); },
    children: [nestedList ? content : list],
    querySelector: (selector: string) => selector === "[data-gw-popover-scroll]" ? list : {
      focus: () => { if (position) focusCount++; },
    },
    contains: (target: unknown) => target === list,
  };
  const panelRef = { current: null as typeof panel | null };
  const anchorRef = { current: { getBoundingClientRect: () => rect } };
  const context = vm.createContext({
    React: { createElement: (type: any, props: any, ...children: any[]) => ({ type, props: { ...props, children } }) },
    useRef: () => panelRef,
    useState: () => [position, (value: any) => { position = value; }],
    useLayoutEffect: (fn: () => void, deps: unknown[]) => {
      if (!previousDeps || deps.some((value, i) => !Object.is(value, previousDeps![i]))) effect = fn;
      previousDeps = deps;
    },
    useEffect: () => {}, useEscapeLayer: () => {},
    createPortal: (child: unknown) => child,
    window: {
      innerWidth: 1000, innerHeight: 720,
      addEventListener: (name: string, fn: (event?: { target: unknown }) => void) => listeners.set(name, fn),
      removeEventListener: () => {},
      requestAnimationFrame: (callback: () => void) => { frame = callback; return 1; },
      cancelAnimationFrame: () => { frame = undefined; },
    },
    MutationObserver: class {
      constructor(callback: () => void) { onContentChange = callback; }
      observe() {}
      disconnect() {}
    },
    document: { body: {} }, isTriggerVisible, resolvePopoverLayout,
  });
  vm.runInContext(`${source}\nglobalThis.render = Floating;`, context);
  const render = () => {
    tree = context.render({ anchorRef, open: true, onClose: () => assert.fail("锚点仍可见"), width: 300, minHeight: 180, children: "供应商" });
    if (tree) tree.props.ref.current = panel;
    if (effect) { const run = effect; effect = undefined; run(); }
    return tree;
  };
  return {
    render, style: () => position, rect, listeners, context, list,
    changeContent: (height: number) => { contentHeight = height; onContentChange?.(); },
    focusCount: () => focusCount,
    paint: () => { const callback = frame; frame = undefined; callback?.(); },
  };
}

test("搜索框在浮层定位可见后获得焦点，滚动时不抢焦点", () => {
  const h = harness(320, true);
  h.render();
  assert.equal(h.focusCount(), 0);
  h.paint();
  assert.equal(h.focusCount(), 1);
  h.listeners.get("scroll")!({ target: h.list });
  h.paint();
  assert.equal(h.focusCount(), 1);
});

test("供应商浮层初次挂载即测量完整内容，靠下时向上展开", () => {
  const h = harness(260);
  assert.ok(h.render(), "首次布局前也要挂载隐藏节点供测量");
  const style = h.style();
  assert.ok(style.maxHeight >= 180);
  assert.ok(style.top + 260 <= h.rect.top);
  assert.ok(style.left >= 12);
  assert.ok(style.left + style.width <= 988);
});

test("展开供应商后按完整模型列表定位，连续滚动不会压缩弹层", () => {
  const h = harness(60, true);
  h.rect.top = 350;
  h.rect.bottom = 384;
  h.render();
  assert.equal(h.style().top, 390, "收起的供应商列表可在下方显示");

  h.changeContent(900);
  assert.equal(h.style().top, 12, "展开后使用空间更大的一侧");
  assert.equal(h.style().maxHeight, 332);
  for (let i = 0; i < 20; i++) {
    const expanded = h.style();
    h.listeners.get("scroll")!({ target: h.list });
    assert.equal(h.style(), expanded, "列表内部滚动不应重新定位");
    h.listeners.get("scroll")!({ target: {} });
    assert.equal(h.style().maxHeight, 332, "外部滚动也不能用已裁短的高度");
  }

  h.changeContent(60);
  assert.equal(h.style().top, 390, "搜索结果减少后可回到下方");
  assert.equal(h.style().maxHeight, 182, "高度包含上下边框");
});

test("小菜单贴近下沿时也保留可用区域，不变成空白细条", () => {
  const h = harness(80);
  h.rect.top = 670;
  h.rect.bottom = 704;
  h.render();
  assert.ok(h.style().maxHeight >= 180);
  assert.ok(h.style().top + 80 <= h.rect.top);
});
