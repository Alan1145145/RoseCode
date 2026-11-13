# RoseCode 开源与仓库迁移记录

日期：2026-11-13。

## 项目与署名

- 公开仓库：<https://github.com/Alan1145145/RoseCode>，账号由用户明确选定。
- 原项目：<https://github.com/BigPizzaV3/CodexPlusPlus>。
- 原作者：BigPizzaV3 及 CodexPlusPlus 贡献者。关于页、中英文 README、NOTICE.md 均保留署名与原仓库链接。
- 保留完整 LICENSE（AGPL-3.0-only）、THIRD_PARTY_NOTICES.md 与资源目录许可证；不把上游代码声明成 RoseCode 原创。
- 当前工作目录原无 Git 历史，以源码快照作为 RoseCode 初始提交，NOTICE.md 对此有明确说明；原仓库登记为 upstream remote。

## 行为调整

- [V] `rosecode-theme` 单独保存主题偏好；首次默认跟随系统，不继承旧 `codex-plus-theme` 的固定浅色或深色。用户之后的显式选择仍可保存。
- [V] 关于页项目地址与 GitHub 问题反馈指向新仓库。
- [V] 社区保留 GitHub 反馈和 QQ 群聊 473502913，提供复制群号按钮。
- [V] core 更新源改为 `https://github.com/Alan1145145/RoseCode/releases/latest/download/latest.json`；发版工作流根据 `github.repository` 生成地址，标题使用 RoseCode。
- [V] 尚无 Release 时，404 对应“此仓库尚无已发布版本”，不会改走上游；500 等服务错误仍返回失败。
- 发版仍通过推送 `v*` 标签触发工作流。本次发布源码，不创建版本标签或手工发布空安装包 Release。
- 继承的官网内容未迁移，Pages 工作流仅保留手动触发，不随源码首次推送自动部署上游官网。

## 验证

- [V] 类型检查通过。
- [V] 前端测试：1983 通过、2 跳过、0 失败。
- [V] Rust 更新集成测试：12 通过。
- [V] Rust HTTP 回归：覆盖 404、500、有效更新响应，1 通过。
- [V] Google OAuth 改为本地配置后的订阅模块回归：126 通过，包含缺少/空白配置、Client ID 与 Secret 配对、授权 URL、导入校验及其他订阅类型。
- [V] 前端生产构建通过；版本元数据检查确认 6 处版本均为 1.0.0。
- [V] 浏览器观察到默认“跟随系统”、原作者与原仓库链接、新项目地址、AGPL-3.0-only 及 QQ 群号。
- 首次导入包含既有上游尾随空白等格式提示，没有批量改写上游文件；本次变更按原文件备份进行核对。
- 验证日志保留在本地 `target/local-msvc/rosecode-publish-*.log`，不随仓库推送。

## 发布文件范围

- Git 忽略构建目录、node_modules、运行状态目录和 .env；候选源码中无 auth.json、upstreams.json 等用户配置文件。
- 本地扫描命中测试值、公开测试夹具和上游已有源码；测试私钥与上游公开文件 Git blob 哈希一致，运行令牌代码只有前缀和随机生成逻辑。
- GitHub 首次推送保护另外识别出上游内置的两组 Google OAuth 客户端 ID / Secret，并拒绝推送。已将四项凭据从源文件移除，改读 `ROSECODE_GEMINI_OAUTH_*` / `ROSECODE_ANTIGRAVITY_OAUTH_*` 环境变量；保留缺失配置错误与导入客户端匹配校验。没有申请绕过或关闭推送保护。
- 更新未公开的初始提交后再推送，旧含凭据的提交不进入公开分支。README 中英文与 NOTICE / CHANGELOG 明确说明 Google 订阅登录需要本地配置。
- 公开源码包含 README、NOTICE、完整许可证、第三方声明与构建/发版工作流。
- 已自行核对变更；没有独立审查签字，界面待用户实测验收。
- 本次修改前备份位于本地 `target/local-msvc/rosecode-publish-backup/`；必要时按文件逐个恢复并重新构建，不删除运行状态。
