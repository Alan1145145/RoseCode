# 导航图标与浅色可读性修订

范围：补齐用户截图中的 Agent 子页面、模型行图标，改善浅色主题的层次与选中状态。

## BF-CLARITY-01：子导航和模型行左侧空白

- 原因：页面路由已有图标但子导航没有渲染；模型行未渲染图标，却保留了 80px 左内边距。
- 修改：App 子导航复用 `routes` 的图标；模型行增加品牌头像、自动切换 / 模型组图标；调整缩进和间距。
- 文件：`App.tsx`、`GatewayAgents.tsx`、`rosecode/shell.css`、新增 `rosecode/model-picker.css`，由 `rosecode-ui.css` 导入。
- [V] 浏览器检查 Codex 7 个、Claude 3 个子页面均各有一个图标；展开的 7 个模型行均有图标；960×640 深色模式可查看菜单与子导航。

## BF-CLARITY-02：浅色文字、状态层次过浅

- 原因：普通侧栏菜单也使用辅助文字灰；选中与悬停均使用低透明度底色，模型选中仅靠细竖线区分。
- 修改：白色内容区、浅灰侧栏、深灰正文与图标；选中使用更深的完整灰色底，悬停使用独立底色；输入边界更明确，保留背景模糊。
- 文件：`rosecode/tokens.css`、`rosecode/shell.css`、`rosecode/model-picker.css`；移除 `materials.css` 中覆盖选中底色的旧规则。
- [V] 浏览器实际计算值：内容区 `rgb(255,255,255)`、导航文字 `rgb(56,56,56)`、侧栏 `rgba(245,245,245,.92)`、选中侧栏 `rgb(224,224,224)`；模型选择为完整灰色底。

## 验证与边界

- [V] `npm run check` 通过；`npm test`：1959 通过、2 项原有跳过，共 1961 项。
- [V] `cargo test --locked -p codex-plus-manager --lib`：202 通过、1 项原有忽略。
- [V] `npm run vite:build` 通过，保留现有大 chunk 提醒。
- [V] 两个二进制构建通过，保留现有 `codex_cli_can_start` dead_code 提醒。RoseCode PID 8224 保持运行；ClaudeMom PID 29784 验证入口加载后结束测试实例。
- [V] 原生浅色聚合网关与 Agent 卡片正常加载；默认模型列表的可访问树包含 OpenAI 和 GPT-6.1-Sol。检测到用户正在操作窗口后停止点击，没有切换模型或更改接入配置。
- 截图 `target/local-msvc/rosecode-clarity-final.png` 使用隔离浏览器预览（演示数据），用于展示新增导航图标与浅色层次；不作为真实配置截图。临时视口已复原、预览页已关闭、服务已停止。
- [V] 已执行 `node scripts/prune-local-builds.mjs --apply`；仅保留固定 `local-build`，没有历史构建需清理。
- 复用已安装的 Lucide 与品牌资产，没有引入依赖。所有图标为装饰，保留按钮原本名称、路由和事件；本轮没有改动连接、模型绑定或凭据的业务逻辑。
- 自查：主导航 / 子导航、品牌头像 / 通用图标、浅色 / 深色、1180×720 / 960×640 已覆盖；最终视觉体验待用户验收。
- Git：此目录无 Git 元数据，未创建提交。回退需恢复以上列出的源码与样式，不能提供 commit 回退点。
