# RoseCode

[中文](README.md) · [Source](https://github.com/Alan1145145/RoseCode) · [Releases](https://github.com/Alan1145145/RoseCode/releases) · [Issues](https://github.com/Alan1145145/RoseCode/issues)

A unified workspace for AI coding agents, provider and model management, a local gateway, an embedded Claude workspace, sessions, usage, and UI enhancements.

**RoseCode is derived from [CodexPlusPlus](https://github.com/BigPizzaV3/CodexPlusPlus), originally created by [BigPizzaV3](https://github.com/BigPizzaV3) and the CodexPlusPlus contributors. This branch is maintained by [Alan1145145](https://github.com/Alan1145145). Credit for the upstream implementation remains with its original authors.**

RoseCode remains open source under **AGPL-3.0-only**. See [LICENSE](LICENSE), [NOTICE.md](NOTICE.md), and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Features

- Manage providers, API keys, models, and context windows for coding agents.
- Route requests through a local gateway with multiple providers and failover.
- Configure Claude upstreams and Desktop enhancements inside RoseCode, without opening a separate ClaudeMom window.
- Inspect sessions, request logs, tokens, cache usage, and estimated costs.
- Retain upstream extension, MCP, Skills, and Codex enhancement capabilities.
- Follow the system theme by default, with optional explicit light or dark preferences.

## Downloads and support

Installers are published to [RoseCode Releases](https://github.com/Alan1145145/RoseCode/releases). If no release is available yet, build from source below.

The application's project link, issue reporting, and update checks use `Alan1145145/RoseCode`. Update metadata comes from this repository's `latest.json` release asset.

Report bugs through [GitHub Issues](https://github.com/Alan1145145/RoseCode/issues), including your OS, RoseCode version, reproduction steps, and redacted logs.

**QQ group: 473502913.** Copy the number from the application's About page and search for it in QQ.

## Build from source

Install Node.js / npm, stable Rust, and the native build dependencies for Tauri on your platform. Windows requires Visual Studio C++ build tools and the Windows SDK.

```bash
git clone https://github.com/Alan1145145/RoseCode.git
cd RoseCode/apps/codex-plus-manager
npm ci
npm run check
npm test
npm run vite:build
cd ../..
cargo build --release -p codex-plus-manager --bin rosecode
```

The executable is `target/release/rosecode.exe` on Windows or `target/release/rosecode` on other platforms. The Claude workspace is embedded in the main application.

```bash
cargo test -p codex-plus-core --test all updater::
cargo test -p codex-plus-manager --lib
```

Reassemble renderer injection shards after editing them with `node scripts/assemble-renderer-inject.mjs`.

### Optional Google subscription login

Google OAuth client credentials are not embedded in the source or installer. Set the matching OAuth application's credentials in the environment of the RoseCode process before using subscription login or token refresh:

| Login | Client ID variable | Client Secret variable |
| --- | --- | --- |
| Gemini Code Assist | `ROSECODE_GEMINI_OAUTH_CLIENT_ID` | `ROSECODE_GEMINI_OAUTH_CLIENT_SECRET` |
| Antigravity | `ROSECODE_ANTIGRAVITY_OAUTH_CLIENT_ID` | `ROSECODE_ANTIGRAVITY_OAUTH_CLIENT_SECRET` |

Missing configuration produces an explicit error. Imported Google tokens must belong to the configured client. Ordinary API providers and other agents do not require these variables. Never commit actual credentials.

## Publish a version

Add a `## X.Y.Z - YYYY-MM-DD` section to `CHANGELOG.md`, then run:

```bash
node scripts/release.mjs X.Y.Z --dry-run
node scripts/release.mjs X.Y.Z
```

The release workflow builds assets and creates `latest.json` using the current GitHub repository. Release assets use the `RoseCode-*` prefix; release URLs and the update source belong to RoseCode. Publishing the source repository alone does not create a release tag or installer.

Windows setup and portable ZIP packages are required. Linux DEB is included when its build succeeds. macOS publishing is opt-in: configure this repository's own Apple Developer ID signing and notarization secrets, then set the repository variable `RELEASE_MACOS_ENABLED` to `true`. The workflow does not reuse upstream certificates or publish unsigned macOS packages.

To finalize a draft whose installers are already uploaded, manually run `Release assets` with `platform=publish-existing` and `publish=true`. It validates the assets and regenerates checksums and update metadata without recompiling.

## Copyright and attribution

- Upstream: [CodexPlusPlus](https://github.com/BigPizzaV3/CodexPlusPlus).
- Original authors: [BigPizzaV3](https://github.com/BigPizzaV3) and CodexPlusPlus contributors.
- Upstream copyright: Copyright (C) 2026 BigPizzaV3.
- RoseCode modifications: Copyright (C) 2026 Alan1145145 and RoseCode contributors.
- License: [GNU Affero General Public License v3.0](LICENSE), SPDX identifier `AGPL-3.0-only`.

Preserve copyright and license notices and provide corresponding source code as required by the license when distributing or offering modified versions. Third-party code, fonts, icons, and assets retain their respective licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and notices alongside the assets.
