import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./GatewayProviders.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("./GatewayPage.css", import.meta.url), "utf8");

test("供应商池排序用 dnd-kit（指针事件，不用 HTML5 拖放）：跟手移动、松手有位移动画，开启 / 关闭两组各自排序", () => {
  // 桌面端 webview 会拦截 HTML5 拖放，原生 draggable 拖不动；dnd-kit 的 PointerSensor 走指针事件。
  assert.doesNotMatch(source, /^\s+draggable\b/m);
  assert.doesNotMatch(source, /onDrop=/);
  assert.match(source, /useSensor\(PointerSensor, \{ activationConstraint: \{ distance: 4 \} \}\)/);
  assert.match(source, /<DndContext collisionDetection=\{closestCenter\}/);
  assert.match(source, /<SortableContext items=\{group\.map\(\(entry\) => entry\.id\)\} strategy=\{verticalListSortingStrategy\}>/);
  assert.match(source, /const \{ attributes, listeners, setNodeRef, transform, transition, isDragging \} = useSortable\(\{ id: entry\.id \}\);/);
  assert.match(source, /transition: isDragging \? "none" : transition \?\? "transform 200ms ease"/);
  // 组内排序回填原槽位：另一组折叠着也不会被挤到队尾。
  assert.match(source, /const next = reorderProviderSlots\(initial, groupOrder\);/);
  assert.match(source, /sortableList\(collapseOff \? onList : visible, "rose-provider-group"/);
  assert.match(source, /offOpen \? sortableList\(offList, "rose-provider-group rose-provider-group-off"\)/);
});

test("供应商名称可直接编辑，详情全宽展开；添加在页面顶栏", () => {
  assert.match(source, /className="rose-provider-select" onClick=\{entry.account && entry.account !== "chatgpt" \? onToggleExpand : onEdit\}/);
  assert.match(source, /expanded \? <div className="rose-inspector-content"/);
  assert.doesNotMatch(source, /expanded && inspector|inspector=\{/);
  assert.match(source, /<TopbarActions>[\s\S]*?gw-primary-button[\s\S]*?添加供应商/);
  assert.doesNotMatch(source, /className="gw-pool-row"/);
  assert.doesNotMatch(source, /gw-add-row/);
});

test("明细最后一行在正式版样式顺序下也用自适应标签列，不压到按钮", () => {
  assert.match(css, /\.shell \.gw-detail-row\.gw-detail-foot \{\s*grid-template-columns: auto minmax\(0, 1fr\);/);
});
