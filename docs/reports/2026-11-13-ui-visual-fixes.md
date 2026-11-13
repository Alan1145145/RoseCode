# 截图反馈修复记录

日期：2026-11-13。依据：用户提供的六张截图。

| 记录 | 问题与原因 | 修复 | 验证 |
| --- | --- | --- | --- |
| BF-V01 | 额外 ClaudeMom 窗口由上一轮构建验证时手动启动，和用户要求的内置使用方式不符 | 关闭独立进程；AGENTS.md 改为默认只在 RoseCode 内验证 Claude，明确请求独立工具时才启动 ClaudeMom | [V] 最终仅启动 RoseCode，进程检查无 ClaudeMom；窗口列表及 RoseCode AX 内容确认主程序加载 |
| BF-V02 | 图表把悬停日期作为额外横轴标签，和附近固定刻度重叠 | 横轴只绘制固定刻度；任意悬停日期仍在提示卡中显示 | [V] 真实图表组件遍历 30 天悬停，7 个刻度位置和数量保持不变；浏览器验证提示卡与横轴 |
| BF-V03 | 圆角组合搜索框内部还叠加通用输入框焦点描边 | 外壳统一绘制圆角焦点，内部 input 清除 outline、border 和 shadow | [V] 聚焦后计算样式为 input outline-style:none、shadow:none；外壳 radius:999px 且有焦点环；已看截图 |
| BF-V04 | Agent 图标框放大到 38px，内部 25px 图标仍默认靠左上；外围容器仅 30px | 外围容器同为 38px，图标框使用 flex 双向居中 | [V] 浏览器测量 Codex、Claude、Grok 三种图标，中心偏移 dx/dy 均为 0；已看截图 |
| BF-V05 | 供应商浮层使用受限外壳的 scrollHeight 定位，容易沿用被压缩的高度；初次测量节点尚未挂载 | 首次挂载隐藏节点供测量，同时读取滚动子节点完整高度；供应商挑选菜单显式保留 180px 可用高度，其余普通浮层沿用原定位策略 | [V] 覆盖首次挂载、反复滚动、14px 受限外壳和靠近窗口下沿；既有普通浮层、模型浮层、Esc 与越界关闭测试通过；浏览器菜单实测高度 258px、完整列表和管理入口可见 |
| BF-V06 | 协议分段控件撑满整行，但按钮只占左边一小块 | 三列等宽 grid，按钮保持一致尺寸和圆角 | [V] 三个按钮宽度均为 135.66px；点击 Anthropic 后 aria-checked=true；已看截图 |

## 代码与验证

- 变更：`GatewayUsage.tsx`、`GatewayAgents.tsx`、`rosecode/controls.css`、`rosecode/workspaces.css`、`rosecode/providers.css`、`AGENTS.md`。
- 新增回归：`usage-chart-hover.test.ts`、`floating-layout.test.ts`，共 4 项。
- [V] `npm run check` 通过；`npm test`：1981 通过、2 跳过、0 失败。
- [V] `npm run vite:build` 通过；`cargo build -p codex-plus-manager --bin codex-plus-plus` 通过。
- Rust 业务代码未修改，本轮未重复执行 Rust 单元测试；上一轮结果不计入本轮验证。
- 构建日志：`target/local-msvc/ui-visual-20261113-{tests,vite,build}.log`。沿用已有 C++ 运行库链接设置，没有安装依赖。
- 本地 Windows 开发实例：`target/debug/codex-plus-plus.exe`，沿用 `dist/local-build/state`，已重新启动；未启动 ClaudeMom。
- 清理脚本已执行：只有固定 `dist/local-build`，没有历史构建需要清理。macOS `ps` 参数在 Windows 不适用，但未发生删除。
- 浏览器验证使用仓库预览数据。原生确认主程序启动；原生点击自动化未能获取可靠输入几何，未以此声称逐项完成原生实测。

## 审查与回滚

- 已自行核对修改和既有回归，待用户在 RoseCode 内验收；没有独立审查签字。
- 当前目录没有 `.git`，未生成提交或声称合入 main。
- 原文件备份：`target/local-msvc/ui-visual-20261113-backup/`，均保留原换行格式。回滚时按文件名逐个复制回上述路径，重新构建启动；新增测试可保留复现问题，无需删除文件。
