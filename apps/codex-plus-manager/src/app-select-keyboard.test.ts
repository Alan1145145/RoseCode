import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as navigation from "./rosecode/select-navigation.ts";

const source = ts.transpileModule(readFileSync(new URL("./AppSelect.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;

for (const shiftKey of [false, true]) {
  test(`下拉菜单 ${shiftKey ? "Shift+Tab" : "Tab"} 从触发器继续原生焦点顺序，不提交选项`, () => {
    let cursor = 0;
    let focuses = 0;
    const states: any[] = [true];
    const selected: string[] = [];
    const trigger = { focus: () => { focuses += 1; } };
    const jsx = (type: any, props: any) => ({ type, props });
    const modules: Record<string, any> = {
      react: {
        useState(initial: any) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], (value: any) => { states[i] = value; }]; },
        useRef: (current: any) => ({ current }), useId: () => "test", useLayoutEffect: () => {},
      },
      "react/jsx-runtime": { jsx, jsxs: jsx },
      "react-dom": { createPortal: (child: any) => child },
      "lucide-react": { Check: "Check", ChevronDown: "ChevronDown" },
      "./use-popover-layer": { usePopoverLayer: () => ({ rootRef: { current: { querySelector: () => trigger } }, menuRef: { current: null }, menuStyle: {} }) },
      "./rosecode/use-presence": { usePresence: (open: boolean) => open },
      "./rosecode/select-navigation": navigation,
    };
    const exports: Record<string, any> = {};
    vm.runInNewContext(source, { exports, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; }, document: { body: {} } });
    const tree = exports.AppSelect({ value: "a", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }], onChange: (value: string) => selected.push(value) });
    const menu = tree.props.children[1];
    menu.props.onKeyDown({ key: "Tab", shiftKey, preventDefault: () => assert.fail("应保留浏览器原生 Tab 行为") });
    assert.equal(focuses, 1, "先恢复触发器焦点，外层弹窗不再误判焦点逃逸");
    assert.equal(states[0], false);
    assert.deepEqual(selected, []);
  });
}
