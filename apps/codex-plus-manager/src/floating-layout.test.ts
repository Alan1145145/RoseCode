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

function harness(contentHeight: number) {
  let position: any = null;
  let effect: (() => void) | undefined;
  let previousDeps: unknown[] | undefined;
  let tree: any;
  const listeners = new Map<string, () => void>();
  const rect = { left: 850, right: 930, width: 80, top: 630, bottom: 664, height: 34 };
  const panel = {
    get scrollHeight() { return Math.min(contentHeight, position?.maxHeight ?? 520); },
    children: [{ scrollHeight: contentHeight }],
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
    window: { innerWidth: 1000, innerHeight: 720, addEventListener: (name: string, fn: () => void) => listeners.set(name, fn), removeEventListener: () => {} },
    document: { body: {} }, isTriggerVisible, resolvePopoverLayout,
  });
  vm.runInContext(`${source}\nglobalThis.render = Floating;`, context);
  const render = () => {
    tree = context.render({ anchorRef, open: true, onClose: () => assert.fail("锚点仍可见"), width: 300, minHeight: 180, children: "供应商" });
    if (tree) tree.props.ref.current = panel;
    if (effect) { const run = effect; effect = undefined; run(); }
    return tree;
  };
  return { render, style: () => position, rect, listeners, context };
}

test("供应商浮层初次挂载即测量完整内容，靠下时向上展开", () => {
  const h = harness(260);
  assert.ok(h.render(), "首次布局前也要挂载隐藏节点供测量");
  const style = h.style();
  assert.ok(style.maxHeight >= 180);
  assert.ok(style.top + 260 <= h.rect.top);
  assert.ok(style.left >= 12);
  assert.ok(style.left + style.width <= 988);
});

test("多次滚动定位读取子节点完整高度，不会沿用已压扁的外壳高度", () => {
  const h = harness(320);
  h.render();
  // 模拟上一轮曾被窗口边界压成细条；内部滚动节点仍有完整内容。
  Object.assign(h.style(), { maxHeight: 14 });
  for (let i = 0; i < 5; i++) {
    h.listeners.get("scroll")!();
    h.render();
    assert.ok(h.style().maxHeight >= 180);
    assert.ok(h.style().top + 320 <= h.rect.top);
  }
});

test("小菜单贴近下沿时也保留可用区域，不变成空白细条", () => {
  const h = harness(80);
  h.rect.top = 670;
  h.rect.bottom = 704;
  h.render();
  assert.ok(h.style().maxHeight >= 180);
  assert.ok(h.style().top + 80 <= h.rect.top);
});
