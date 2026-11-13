import { invoke } from "@tauri-apps/api/core";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { hostOf, isOk, type CommandResult, type UpstreamProfile } from "./model";

/** 只读供应商池；选择后交给上游表单，由用户明确保存或启用。 */
export function PoolUpstreamPicker({ onPick, onClose }: {
  onPick: (profile: UpstreamProfile) => void;
  onClose: () => void;
}) {
  const [profiles, setProfiles] = useState<UpstreamProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void invoke<CommandResult<{ profiles: UpstreamProfile[] }>>("claude_mom_pool_profiles")
      .then((result) => {
        if (cancelled) return;
        if (isOk(result)) setProfiles(result.profiles);
        else { setProfiles([]); setError(result.message); }
      })
      .catch((cause) => { if (!cancelled) { setProfiles([]); setError(String(cause)); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [revision]);
  return (
    <div className="cm-pool-picker">
      <div className="cm-pool-picker-head">
        <strong>从供应商池同步</strong>
        <button className="cm-btn cm-btn-small" disabled={loading} onClick={() => setRevision((value) => value + 1)} type="button"><RefreshCw />刷新</button>
        <button className="cm-btn cm-btn-small" onClick={onClose} type="button">返回</button>
      </div>
      <p>选择已配置 Key 的 Anthropic 供应商，将地址、当前 Key、模型和上下文窗口带入表单。保存后生效，不会自动启用。</p>
      <p>这是一次配置复制；供应商池之后有改动时可再次同步。供应商的独立代理和多 Key 轮换不随复制带入。</p>
      {error ? <p role="alert">{error}</p> : loading ? <p role="status">正在读取供应商池…</p> : !profiles.length ? (
        <p>没有可同步的上游。请先在供应商池配置 Anthropic 协议和 API Key，例如 RoseAI · Anthropic。</p>
      ) : profiles.map((profile) => (
        <button className="cm-pool-source" key={profile.sourceId} onClick={() => onPick(profile)} type="button">
          <strong>{profile.name}</strong>
          <span>{hostOf(profile.baseUrl)} · {profile.models.length} 个模型{profile.model ? ` · 默认 ${profile.model}` : ""}</span>
          <small>同步到上游表单</small>
        </button>
      ))}
    </div>
  );
}
