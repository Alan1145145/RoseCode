//! 从供应商池读取可直连的 Anthropic 上游；只生成草稿，不保存、不启用、不请求上游。

use codex_plus_core::claude_mom::UpstreamProfile;
use codex_plus_core::gateway::{key_pool, store::{GatewaySettings, GatewayStore}};
use codex_plus_core::model_suffix::parse_model_suffix;
use codex_plus_core::settings::RelayProtocol;
use serde::Serialize;

use crate::commands::{CommandResult, failed, ok};

#[derive(Default, Serialize)]
pub struct PoolProfiles {
    profiles: Vec<UpstreamProfile>,
}

fn profiles_from_pool(gateway: &GatewaySettings) -> Vec<UpstreamProfile> {
    gateway.providers.iter().filter_map(|provider| {
        if provider.relay.protocol != RelayProtocol::AnthropicMessages { return None; }
        let candidate = key_pool::expand_keys(&provider.relay).into_iter()
            .find(|item| !item.relay.api_key.trim().is_empty())?;
        let relay = candidate.relay;
        let url = tauri::Url::parse(&relay.base_url).ok()?;
        if !matches!(url.scheme(), "http" | "https") { return None; }
        let mut models = Vec::new();
        let (mut model, suffix_window) = parse_model_suffix(&relay.model);
        for raw in std::iter::once(relay.model.as_str()).chain(relay.model_list.split(['\r', '\n', ','])) {
            let (id, _) = parse_model_suffix(raw);
            if !id.is_empty() && !models.contains(&id) { models.push(id); }
        }
        if model.is_empty() { model = models.first().cloned().unwrap_or_default(); }
        let context_window = provider.model_windows.get(&model).copied()
            .or(suffix_window).or(provider.context_window)
            .or_else(|| relay.context_window.parse::<u64>().ok()).filter(|value| *value > 0);
        Some(UpstreamProfile {
            name: relay.name,
            base_url: relay.base_url.trim_end_matches('/').into(),
            api_key: relay.api_key,
            model,
            models,
            context_window,
            source: "provider-pool".into(),
            source_id: relay.id,
            ..Default::default()
        })
    }).collect()
}

#[tauri::command]
pub fn claude_mom_pool_profiles() -> CommandResult<PoolProfiles> {
    let store = if crate::flavor::is_claude_mom() {
        GatewayStore::at(codex_plus_core::paths::codex_plus_plus_state_dir().join("gateway.json"))
    } else { GatewayStore::default() };
    match store.load() {
        Ok(gateway) => ok("已读取供应商池。", PoolProfiles { profiles: profiles_from_pool(&gateway) }),
        Err(error) => failed(&format!("读取供应商池失败：{error:#}"), PoolProfiles::default()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use codex_plus_core::gateway::store::GatewayProvider;
    use codex_plus_core::settings::RelayProfile;

    fn provider(protocol: RelayProtocol, key: &str) -> GatewayProvider {
        let mut provider: GatewayProvider = serde_json::from_value(serde_json::json!({ "relay": RelayProfile::default() })).unwrap();
        provider.relay = RelayProfile {
            id: "roseai-anthropic".into(), name: "My RoseAI".into(), protocol,
            base_url: "https://whiteroseai.org/".into(), api_key: key.into(),
            model: "claude-a[1M]".into(), model_list: "claude-a[1M]\nclaude-b\nclaude-b".into(),
            ..Default::default()
        };
        provider
    }

    #[test]
    fn pool_sync_copies_anthropic_credentials_models_and_window_without_changing_pool() {
        let mut gateway = GatewaySettings::default();
        gateway.providers.push(provider(RelayProtocol::AnthropicMessages, "test-only-key"));
        let before = gateway.clone();
        let profiles = profiles_from_pool(&gateway);
        assert_eq!(gateway, before);
        assert_eq!(profiles.len(), 1);
        let profile = &profiles[0];
        assert_eq!(profile.api_key, "test-only-key");
        assert_eq!(profile.base_url, "https://whiteroseai.org");
        assert_eq!(profile.model, "claude-a");
        assert_eq!(profile.models, ["claude-a", "claude-b"]);
        assert_eq!(profile.context_window, Some(1_000_000));
        assert_eq!(profile.source_id, "roseai-anthropic");
        assert!(profile.id.is_empty());
    }

    #[test]
    fn pool_sync_skips_other_protocols_and_unconfigured_keys() {
        let mut gateway = GatewaySettings::default();
        gateway.providers.push(provider(RelayProtocol::Responses, "test-key"));
        gateway.providers.push(provider(RelayProtocol::ChatCompletions, "test-key"));
        gateway.providers.push(provider(RelayProtocol::AnthropicMessages, ""));
        assert!(profiles_from_pool(&gateway).is_empty());
    }

    #[test]
    fn explicit_model_window_takes_priority() {
        let mut gateway = GatewaySettings::default();
        let mut provider = provider(RelayProtocol::AnthropicMessages, "test-key");
        provider.model_windows.insert("claude-a".into(), 500_000);
        gateway.providers.push(provider);
        assert_eq!(profiles_from_pool(&gateway)[0].context_window, Some(500_000));
    }
}
