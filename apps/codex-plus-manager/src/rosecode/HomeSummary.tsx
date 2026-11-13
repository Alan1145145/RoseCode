import { ArrowRight, Activity, Plug, Server, Workflow } from "lucide-react";
import type { GatewayPayload } from "../gateway-model";
import { t, tf } from "../i18n";

export function HomeSummary({ gateway, connected, onConfigure }: {
  gateway: GatewayPayload | null;
  connected: number;
  onConfigure: () => void;
}) {
  const modelCount = new Set((gateway?.pool ?? []).flatMap((entry) => entry.models)).size;
  return (
    <section aria-label={t("工作空间状态")} className="rose-home-stats">
      <div data-running={gateway?.helperRunning}><Activity aria-hidden="true" /><span>{t("本地网关")}</span><strong className="rose-stat-status">{gateway ? gateway.helperRunning ? t("运行中") : t("未运行") : "—"}</strong><small>{gateway ? tf("本地端口 {0}", [gateway.port]) : t("读取中…")}</small></div>
      <div><Server aria-hidden="true" /><span>{t("供应商")}</span><strong>{gateway?.pool.length ?? "—"}</strong><small>{t("共享的 API 连接")}</small></div>
      <div><Workflow aria-hidden="true" /><span>{t("已配置模型")}</span><strong>{gateway ? modelCount : "—"}</strong><small>{t("按模型名称路由")}</small></div>
      <button onClick={onConfigure} type="button"><Plug aria-hidden="true" /><span>{t("已接入 Agent")}</span><strong>{gateway ? connected : "—"}</strong><small>{t("管理连接")}<ArrowRight aria-hidden="true" /></small></button>
    </section>
  );
}
