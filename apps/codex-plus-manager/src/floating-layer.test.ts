import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { isTriggerVisible, resolvePopoverLayout } from "./popover-layer.ts";

function harness() {
  const file = ts.createSourceFile("GatewayAgents.tsx", readFileSync(new URL("./GatewayAgents.tsx", import.meta.url), "utf8"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const component = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "Floating");
  assert.ok(component);
  const hooks: any[] = [];
  let cursor = 0;
  let mounted = false;
  let closed = 0;
  let focused = 0;
  let escape = () => {};
  const rect = { left: 245, right: 420, top: 340, bottom: 374, width: 175, height: 34 };
  const events = new Map<string, () => void>();
  const window = { innerWidth: 1180, innerHeight: 720, addEventListener: (name: string, action: () => void) => events.set(name, action), removeEventListener: () => {} };
  const jsx = (type: any, props: any) => ({ type, props });
  const exports: Record<string, any> = {};
  const effect = (run: () => unknown) => { if (!mounted) run(); };
  vm.runInNewContext(ts.transpileModule(component.getText(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, window, document: { body: {}, addEventListener: () => {}, removeEventListener: () => {} },
    require: () => ({ jsx, jsxs: jsx }),
    useState: (initial: unknown) => { const index = cursor++; if (!(index in hooks)) hooks[index] = initial; return [hooks[index], (value: unknown) => { hooks[index] = value; }]; },
    useRef: (initial: unknown) => { const index = cursor++; if (!(index in hooks)) hooks[index] = { current: initial }; return hooks[index]; },
    useEffect: effect, useLayoutEffect: effect, useEscapeLayer: (_: boolean, close: () => void) => { escape = close; }, createPortal: (node: unknown) => node,
    isTriggerVisible, resolvePopoverLayout,
  });
  const render = () => { cursor = 0; const tree = exports.Floating({ anchorRef: { current: { getBoundingClientRect: () => rect, focus: () => { focused++; } } }, open: true, onClose: () => { closed++; }, width: 560, minHeight: 240, children: "models" }); mounted = true; return tree; };
  return { render, rect, window, closed: () => closed, focused: () => focused, escape: () => escape(), scroll: () => events.get("scroll")!() };
}

test("模型弹层从触发器左边缘展开，避免覆盖侧栏", () => {
  const h = harness(); h.render();
  assert.equal(h.render().props.style.left, 245);
});

test("触发器滚出视口后关闭浮层，不能留在无关页面位置", () => {
  const h = harness(); h.render();
  h.rect.top = 800; h.rect.bottom = 834; h.scroll();
  assert.equal(h.closed(), 1);
});

test("浮层的保底高度也不能计算为负值", () => {
  const h = harness(); h.window.innerHeight = 20; h.rect.top = 2; h.rect.bottom = 10; h.render();
  assert.ok(h.render().props.style.maxHeight >= 0);
});

test("Esc 关闭模型浮层后把焦点交回触发按钮", () => {
  const h = harness(); h.render(); h.escape();
  assert.equal(h.closed(), 1);
  assert.equal(h.focused(), 1, "后续键盘操作不能跳回页面开头");
});
