# UI 草稿与键盘导航修复记录

日期：2026-11-13。范围：RoseCode 的 Claude 工作区、独立 ClaudeMom、共用 AppSelect。

## BF-20261113-01：保存响应覆盖草稿

- 根因：`bookCall` 对失败结果也执行 `acceptBook`；成功结果用整条已保存配置覆盖正在输入的草稿。
- 修复：失败只报告错误；保存成功更新列表，按提交时快照逐字段合并，保留请求发出后修改的字段。新建条目接收后端 id，避免重试时重复新增。
- 代码：`apps/codex-plus-manager/src/claude-mom/ClaudeMomApp.tsx`。
- [V] 回归覆盖失败结果、抛出异常、继续输入、字段规范化、新建 id 与正常保存后的 dirty 状态。

## BF-20261113-02：模型响应串入已修改连接

- 根因：拉取完成后直接写入当前草稿，没有判断地址或 Key 是否已改变。
- 修复：连接编辑和草稿切换使请求序号失效；旧响应不修改模型，并提示重新拉取。地址改动后再改回也视为失效。
- 代码：`apps/codex-plus-manager/src/claude-mom/ClaudeMomApp.tsx`。
- [V] 回归覆盖地址改变、Key 改变、地址往返、连接未变时成功拉取及保留名称编辑。

## BF-20261113-03：新建或切换丢失未保存内容

- 根因：新建、选择、导入和供应商池同步直接替换草稿。
- 修复：有未保存修改时提示先保存或放弃；操作期间阻止切换；再次选择当前上游只返回编辑页。初始读取迟到时保留已经新建的草稿。
- 代码：`apps/codex-plus-manager/src/claude-mom/ClaudeMomApp.tsx`。
- [V] 回归覆盖上述入口、放弃后新建、独立 ClaudeMom、迟到读取和返回当前上游。隔离浏览器实测再次点击添加，名称保留并显示提示。

## BF-20261113-04：弹窗下拉框 Tab 跳回顶部

- 根因：选项 portal 挂在 body，外层焦点约束把选项焦点视为逃离弹窗。
- 修复：Tab 关闭下拉时先恢复触发器焦点，再交给浏览器执行正常 Tab 顺序；不提交选项。
- 代码：`apps/codex-plus-manager/src/AppSelect.tsx`。
- [V] 新增 Tab / Shift+Tab 回归；隔离浏览器实测“达到上限后”Tab 进入“用量未知或过期时”，Shift+Tab 返回前项。

## 验证与交付

- [V] `npm run check` 通过。
- [V] `npm test`：1977 通过、2 跳过、0 失败；新增 12 项回归测试。
- [V] `cargo test -p codex-plus-manager --lib`：202 通过、1 忽略、0 失败。
- [V] `npm run vite:build` 通过，保留既有 chunk 体积警告。
- Windows 链接显式使用仓库已有 `target/local-msvc/crt-x64/Contents/VC/Tools/MSVC/14.44.35207/lib/x64/libcpmt.lib`，解决本机默认 MSVC 14.38 缺少 sherpa-onnx 所需 C++ 符号的问题；未安装依赖或修改清单。
- 构建目标为固定路径 `target/debug/codex-plus-plus.exe`、`target/debug/claude-mom.exe`。本机是 Windows，未运行仅适用于 macOS bundle 的 relaunch 脚本。
- 原生 RoseCode 与 ClaudeMom 窗口已观察到成功加载；错误响应与慢响应场景通过真实组件、模拟 IPC 验证，没有向真实上游发送请求。
- 历史构建清理脚本已执行：仅有固定 `dist/local-build`，没有需要清理的历史构建；其进程检测使用的 macOS `ps` 参数在 Windows 不适用。
- 详细日志：`target/local-msvc/ui-fix-20261113-{tests,rust-tests,vite,build}.log`。
- 审查状态：已自行核对变更与反例；未进行独立审查，待用户应用内验收。
- Git 状态：当前工作目录没有 `.git`，无法提交；没有生成提交、标签或声称合入 main。
- 回滚：原文件备份在 `target/local-msvc/ui-fix-20261113-backup/`。分别复制 `ClaudeMomApp.tsx` 回 `src/claude-mom/`、`AppSelect.tsx` 回 `src/`，然后重新构建并启动。新增测试保留作问题复现，不删除任何文件。
