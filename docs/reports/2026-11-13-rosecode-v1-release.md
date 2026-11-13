# RoseCode v1.0.0 安装包发布记录

日期：2026-11-13。用户要求补充已公开源码仓库中缺少的安装包。

## 发布结果

- [V] 公开 Release：<https://github.com/Alan1145145/RoseCode/releases/tag/v1.0.0>，GitHub API 返回 `draft=false`，并作为 Latest 发布。
- [V] 发布源码标签指向 `2428f00297e8cc519ae1149055ceeb0979049876`，保留原作者、上游仓库和 AGPL-3.0-only 声明。
- [V] Windows 安装包：`CodexPlusPlus-1.0.0-windows-x64-setup.exe`，32,280,394 字节。
- [V] Windows 便携包：`CodexPlusPlus-1.0.0-windows-x64.zip`，46,053,172 字节。
- [V] Linux DEB：`CodexPlusPlus-1.0.0-linux-amd64.deb`，42,685,124 字节；CI 已执行安装、包文件和动态库检查。
- [V] `SHA256SUMS.txt` 与 `latest.json` 已上传；未登录的 HTTP 请求访问 `releases/latest/download/latest.json` 返回 200，版本为 `v1.0.0`，下载地址均属于 Alan1145145/RoseCode。
- [V] 从公开地址实际下载 Windows 安装包，其 SHA256 为 `6646cb1b62f314e594837f236a97495a277125d8bfd6c7ef507fdbd9fc66e6ea`，与 GitHub asset digest 一致。
- [T] 未在本机执行该安装包的安装交互；本地开发实例已重新构建并启动。

## 发布阻塞与修正

- 初始 tag 构建：<https://github.com/Alan1145145/RoseCode/actions/runs/43348170081>。Windows 与 Linux 成功；macOS 二进制成功，但导入 Developer ID 证书失败，新仓库没有上游签名凭据，因此初始工作流整体失败。
- 修正提交：`a3e8f2d`。macOS 需要配置本仓库自己的 Apple 签名/公证凭据，并设置 `RELEASE_MACOS_ENABLED=true` 才启用；未启用时，Windows 安装版与便携版仍是发布必需附件，Linux 可选。没有绕过 macOS 签名校验或发布未签名 DMG。
- 新增 `platform=publish-existing`，校验已上传附件、重算校验和、生成更新元数据后发布，避免重复构建。非空 Windows 附件缺失时仍会拒绝发布；启用 macOS 后缺 DMG 也会拒绝发布。
- [V] 收尾工作流成功：<https://github.com/Alan1145145/RoseCode/actions/runs/43348903662>。没有手工创建或直接公开空 Release。
- [T] 本次不提供 macOS DMG；后续需维护者配置自己的签名与公证凭据。

## 验证与回退

- [V] `node --test scripts/release-assets.test.mjs`：6 通过，覆盖缺失安装包、缺失便携包、空文件、macOS 开关、可选 Linux 及 RoseCode 下载地址。
- [V] 工作流 YAML 结构解析通过，`node scripts/release-meta.mjs check v1.0.0` 通过，`git diff --check` 通过。
- [V] 本地前端生产构建与 Rust 主程序构建通过，固定开发状态目录保持不变，已启动 RoseCode，未启动独立 ClaudeMom。
- 本次只修改发布工作流、发布测试和文档。若后续发布流程出现回归，可通过新的提交回退 `a3e8f2d`；不改写已发布的 `v1.0.0` 标签。
