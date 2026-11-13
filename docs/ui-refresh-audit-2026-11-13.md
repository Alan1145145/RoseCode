# 浅色外观、品牌图标与交互检查

依据用户本轮截图，检查范围为供应商表单、模型选择与菜单、导航和焦点、深浅主题、Agent 图标、应用及托盘图标；另外执行 core / data / manager 的 Rust 测试与前端完整测试。此记录不代表已证明整个项目没有缺陷。

## 外观与图标

- [V] E-UI：浅色改为白色内容区、很浅的冷色侧栏与淡蓝选中底色，减轻边框和焦点框的灰黑感。浏览器实测选中底色 `rgb(230,240,255)`，主按钮 `rgb(53,114,227)`，配白色文字的对比约 4.5:1。
- [V] E-BRAND：Claude 使用现有的品牌橙色星芒 SVG，Codex 使用彩色应用图标；工作台、侧栏和接入页面共用映射。
- [V] E-ICON：新建 `src/assets/rosecode-logo.svg` 与独立 `rosecode-tray.svg`。用已安装的 Tauri CLI 生成应用 PNG、ICO、macOS 源 PNG 与透明托盘模板；没有安装依赖。
- 新图标采用浅色圆角底与蓝、粉、紫色花瓣，中央留白；网页、原生窗口与打包资源使用同一来源。

## BF-REFRESH-01：模型菜单遮住侧栏，锚点消失后仍停留

- 原因：Floating 强制右边缘对齐，560px 菜单从窄按钮向左展开后被夹到窗口最左边；滚动时仅更新位置，没有检查触发器是否已不可见。极小视口还可能产生负的 maxHeight。
- 修改：复用已有 `resolvePopoverLayout` 和 `isTriggerVisible`，从触发器左边缘展开、夹进视口；锚点不可见即关闭，高度不为负。
- [V] E-REPRO：`rosecode-refresh-repro.log` 保留修复前的三个失败断言；`floating-layer.test.ts` 回归通过。
- [V] E-ANCHOR：浏览器实际触发器 left 245.8px，弹层 left 246px、right 806px，位于 1180px 视口内。

## BF-REFRESH-02：旧地址返回的模型进入新连接

- 原因：fetchModels 等待响应期间可以编辑连接，返回后仍按旧草稿生成模型候选。
- 修改：用地址、协议、Key 和模型草稿签名校验响应；只接收当前请求的结果。卸载时令旧请求失效，失败提示也不跨连接应用。
- [V] E-RACE：修复前测试实际出现 `old-endpoint-model`；现在旧响应被忽略，按钮恢复可用、连接没有自动保存；正常响应仍可显示候选。证据见前端定向回归日志。

## BF-REFRESH-03：Esc 关闭菜单后丢失键盘位置

- 原因：模型菜单卸载时焦点随搜索框消失，没有交还按钮。
- 修改：Esc 仍通过统一栈关闭最上层，并恢复触发按钮焦点；外部点击不抢焦点。
- [V] E-FOCUS：`rosecode-refresh-focus-repro.log` 保留修复前的失败；浏览器实际 Esc 后弹层数为 0，activeElement 为“默认模型主力编程”。

## BF-REFRESH-04：选中状态被悬停底色覆盖

- 原因：普通 hover 选择器比 active 选择器优先级更高，鼠标进入选中项后底色变淡。
- 修改：普通 hover 排除 active，展开的 Agent 父级保留自己的悬停样式。
- [V] E-UI：点击后的当前项保持淡蓝底色；键盘焦点框使用较轻的主题 ring。

## 图标模板与测试兼容性

- [V] E-TRAY：原 macOS 模板通过 R-B 猜测透明度，会丢掉新图标的蓝、紫花瓣；改用独立黑色透明模板。Rust 像素测试验证四片花瓣、中央留白、透明外围与黑色颜色通道。
- [V] E-PY：第一次 core 测试发现 Windows 的 python3 为商店别名，进程启动但没有成功执行脚本。测试现先探测可运行的 Python 3，再调用原探测脚本；此机器使用现有 Python 运行通过，没有跳过该断言或修改脚本业务逻辑。

## BF-REFRESH-05：增量构建仍包含旧的 EXE 图标

- 原因：build.rs 的输出仅追踪 Tauri 配置与 capabilities，未追踪图标文件；更新 ICO 后原生资源编译步骤没有重跑。
- 修改：在 build.rs 显式追踪 ICO、PNG、macOS 源与托盘模板文件。
- [V] E-PE：修复前，新 ICO 的 16 / 24 / 32 / 48 / 64 / 256px 六组图像均不在构建出的 EXE 中；补依赖重建后，RoseCode 和 ClaudeMom 两个 EXE 均包含全部六组新图像。验证结果保存在 `rosecode-refresh-icon-check.json`。

## 最终检查

| 检查 | 结果 |
| --- | --- |
| 前端类型检查 | [V] 通过 |
| 前端完整测试 | [V] 1965 通过，2 项原有跳过，共 1967 项 |
| core 单元测试 | [V] 2449 通过，15 忽略 |
| core 合并集成测试 | [V] 1887 通过，28 忽略 |
| core 独立集成测试 | [V] 6 通过 |
| data 单元及集成测试 | [V] 518 通过，2 忽略 |
| manager 单元测试 | [V] 202 通过，1 忽略 |
| Vite 生产构建 | [V] 通过，保留现有大 chunk 提醒 |
| 浏览器界面 | [V] 1180×720 浅色与 960×640 深色，Agent 彩色图标、菜单定位与 Esc 焦点；控制台无 error |
| 原生构建与启动 | [V] 两个二进制构建成功；均已启动并读取到完整入口界面 |

测试日志为 `target/local-msvc/rosecode-refresh-*.log`。Rust 合计 5062 通过、46 忽略；未执行的忽略用例没有计作通过。界面截图 `rosecode-refresh-light.png` 使用隔离预览的演示数据。

RoseCode PID 28592 保持运行，浅色工作台显示原有 3 个供应商、4 个模型。ClaudeMom 验证后结束本次测试实例。浏览器预览页、视口覆盖与开发服务已收尾；已执行固定本地构建清理脚本，无历史构建待清理。

自查未改动凭据格式、协议转换、默认 Agent 勾选或路由策略；测试均沿用现有测试框架。macOS 托盘只验证资源与像素行为，没有在 macOS 实机启动。最终视觉与使用体验待用户验收。

Git：当前目录无 Git 元数据，未创建提交。回退需恢复本轮涉及的 `gateway-ui.tsx`、`GatewayAgents.tsx`、`ProviderFormDialog.tsx`、主题样式、品牌资产、`lib.rs`、`build.rs` 与测试文件；无可提供的 commit 回退点。
