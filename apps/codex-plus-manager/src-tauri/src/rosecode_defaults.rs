//! RoseCode 的一次性供应商预配置，不改已有凭据、模型或 Agent 接入。

use codex_plus_core::gateway::store::{GatewayProvider, GatewayStore};
use codex_plus_core::settings::{RelayMode, RelayProfile, RelayProtocol};
use serde_json::json;

const INITIALIZED: &str = "rosecodeProtocolProvidersInitialized";

const VARIANTS: [(&str, &str, RelayProtocol); 3] = [
    ("roseai", "Responses", RelayProtocol::Responses),
    ("roseai-chat", "Chat", RelayProtocol::ChatCompletions),
    ("roseai-anthropic", "Anthropic", RelayProtocol::AnthropicMessages),
];

fn roseai_provider(id: String, label: &str, protocol: RelayProtocol) -> anyhow::Result<GatewayProvider> {
    let mut relay = RelayProfile {
        id,
        name: format!("RoseAI · {label}"),
        base_url: if protocol == RelayProtocol::AnthropicMessages { "https://whiteroseai.org" } else { "https://whiteroseai.org/v1" }.into(),
        protocol,
        relay_mode: RelayMode::PureApi,
        ..Default::default()
    };
    codex_plus_core::relay_config::normalize_relay_profile_for_storage(&mut relay)?;
    // 缺少 Key 和模型时不参与调度；保留其余网关字段的 serde 默认值。
    let mut provider: GatewayProvider = serde_json::from_value(json!({
        "enabled": false,
        "source": format!("preset:{}", VARIANTS.iter().find(|item| item.2 == protocol).unwrap().0),
        "relay": &relay
    }))?;
    // 地址等派生字段不参与序列化，保留已经归一化的内存对象。
    provider.relay = relay;
    Ok(provider)
}

pub fn ensure_default_provider(store: &GatewayStore) -> anyhow::Result<()> {
    store.update(|gateway| {
        if gateway.extra.get(INITIALIZED).and_then(|value| value.as_bool()) == Some(true) {
            return Ok(());
        }
        for (slug, label, protocol) in VARIANTS {
            let existing = gateway.providers.iter().any(|provider| {
                provider.relay.protocol == protocol && tauri::Url::parse(&provider.relay.base_url)
                    .ok()
                    .is_some_and(|url| url.host_str() == Some("whiteroseai.org"))
            });
            if existing { continue; }
            let id = gateway.unique_slug(slug, false);
            let provider = roseai_provider(id.clone(), label, protocol)?;
            for binding in gateway.bindings.values_mut() {
                if !binding.pool_exclude.contains(&id) {
                    binding.pool_exclude.push(id.clone());
                }
            }
            gateway.providers.push(provider);
        }
        gateway.extra.insert(INITIALIZED.into(), json!(true));
        Ok(())
    })?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use codex_plus_core::gateway::store::{AgentBinding, GatewaySettings};

    #[test]
    fn default_is_disabled_without_credentials_and_added_only_once() {
        let dir = tempfile::tempdir().unwrap();
        let store = GatewayStore::at(dir.path().join("gateway.json"));
        ensure_default_provider(&store).unwrap();
        let first = store.load().unwrap();
        assert_eq!(first.providers.len(), 3);
        for (_, _, protocol) in VARIANTS {
            assert_eq!(first.providers.iter().filter(|item| item.relay.protocol == protocol).count(), 1);
        }
        assert!(first.providers.iter().all(|item| !item.enabled && item.relay.api_key.is_empty() && item.relay.model_list.is_empty()));
        assert_eq!(first.providers[2].relay.base_url, "https://whiteroseai.org");
        let provider = &first.providers[0];
        assert_eq!(provider.relay.base_url, "https://whiteroseai.org/v1");
        assert!(!provider.enabled);
        assert!(provider.relay.api_key.is_empty());
        assert!(provider.relay.model_list.is_empty());
        assert!(!provider.relay.no_auth);
        let saved = std::fs::read(&store.path).unwrap();
        ensure_default_provider(&store).unwrap();
        assert_eq!(std::fs::read(&store.path).unwrap(), saved);
        store.update(|gateway| { gateway.providers.clear(); Ok(()) }).unwrap();
        ensure_default_provider(&store).unwrap();
        assert!(store.load().unwrap().providers.is_empty());
    }

    #[test]
    fn existing_roseai_credentials_and_customization_are_preserved() {
        let dir = tempfile::tempdir().unwrap();
        let store = GatewayStore::at(dir.path().join("gateway.json"));
        let mut provider = roseai_provider("my-account".into(), "Anthropic", RelayProtocol::AnthropicMessages).unwrap();
        provider.relay.name = "My RoseAI".into();
        provider.relay.api_key = "test-only-key".into();
        provider.relay.model = "custom-model".into();
        provider.relay.config_contents.clear();
        provider.relay.auth_contents.clear();
        codex_plus_core::relay_config::normalize_relay_profile_for_storage(&mut provider.relay).unwrap();
        let mut gateway = GatewaySettings::default();
        gateway.providers.push(provider);
        store.save(&gateway).unwrap();
        let previous = store.load().unwrap().providers;
        ensure_default_provider(&store).unwrap();
        let saved = store.load().unwrap();
        assert_eq!(saved.providers.len(), 3);
        assert_eq!(saved.providers[0], previous[0]);
        assert_eq!(saved.providers.iter().filter(|item| item.relay.protocol == RelayProtocol::AnthropicMessages).count(), 1);
    }

    #[test]
    fn unrelated_providers_and_agent_join_preferences_are_preserved() {
        let dir = tempfile::tempdir().unwrap();
        let store = GatewayStore::at(dir.path().join("gateway.json"));
        let mut provider = roseai_provider("roseai".into(), "Responses", RelayProtocol::Responses).unwrap();
        provider.relay.base_url = "https://other.example/v1".into();
        provider.relay.config_contents.clear();
        codex_plus_core::relay_config::normalize_relay_profile_for_storage(&mut provider.relay).unwrap();
        let mut gateway = GatewaySettings::default();
        gateway.providers.push(provider);
        gateway.bindings.insert("codex".into(), AgentBinding { auto_join_providers: true, ..Default::default() });
        gateway.extra.insert("rosecodeDefaultProvidersInitialized".into(), json!(true));
        store.save(&gateway).unwrap();
        ensure_default_provider(&store).unwrap();
        let saved = store.load().unwrap();
        assert_eq!(saved.providers.len(), 4);
        assert_eq!(saved.providers[1].relay.id, "roseai-2");
        assert_eq!(saved.providers[0].relay.base_url, "https://other.example/v1");
        assert!(saved.bindings["codex"].pool_exclude.contains(&"roseai-2".into()));
        assert!(saved.bindings["codex"].pool_exclude.contains(&"roseai-chat".into()));
        assert!(saved.bindings["codex"].pool_exclude.contains(&"roseai-anthropic".into()));
    }

    #[test]
    fn damaged_store_is_not_overwritten() {
        let dir = tempfile::tempdir().unwrap();
        let store = GatewayStore::at(dir.path().join("gateway.json"));
        std::fs::write(&store.path, "broken-json").unwrap();
        assert!(ensure_default_provider(&store).is_err());
        assert_eq!(std::fs::read_to_string(&store.path).unwrap(), "broken-json");
    }
}
