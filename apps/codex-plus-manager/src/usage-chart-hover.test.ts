import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { axisLabelIndexes, formatTokens, niceCeiling, shortDate, usageDayStats } from "./gateway-model.ts";

const file = ts.createSourceFile("GatewayUsage.tsx", readFileSync(new URL("./GatewayUsage.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = file.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "UsageChart");
assert.ok(component);
const source = ts.transpileModule(component.getText(file), { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
const nodes = (value: any): any[] => value == null || typeof value !== "object" ? []
  : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];

test("30 天图表悬停任意日期时固定刻度数量和位置不变，日期只在提示卡里补充", () => {
  let hover: number | null = null;
  const context = vm.createContext({
    React: { createElement: (type: any, props: any, ...children: any[]) => ({ type, props: { ...props, children } }) },
    useState: () => [hover, (value: number | null) => { hover = value; }],
    getLanguage: () => "zh", t: (value: string) => value,
    tf: (value: string, args: unknown[]) => value.replace(/\{(\d+)\}/g, (_, index) => String(args[Number(index)])),
    axisLabelIndexes, formatTokens, niceCeiling, shortDate, usageDayStats,
  });
  vm.runInContext(`${source}\nglobalThis.render = UsageChart;`, context);
  const days = Array.from({ length: 30 }, (_, index) => ({ date: new Date(Date.UTC(2026, 9, 15 + index)).toISOString().slice(0, 10), calls: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0 }));
  const render = () => context.render({ summary: { days } });
  const axis = (tree: any) => nodes(tree).find((node) => node.props?.className === "gw-chart-axis");
  const positions = (tree: any) => nodes(axis(tree)).filter((node) => node.type === "span").map((node) => node.props.style.left);
  const expected = positions(render());
  assert.equal(expected.length, 7);
  for (let index = 0; index < days.length; index++) {
    nodes(render()).filter((node) => node.props?.className === "gw-bar-hit")[index].props.onMouseEnter();
    const tree = render();
    assert.deepEqual(positions(tree), expected);
    const tip = nodes(tree).find((node) => node.props?.className === "gw-chart-tip");
    assert.ok(tip);
    assert.equal(nodes(tip).find((node) => node.type === "strong").props.children[0], shortDate(days[index].date));
  }
});
