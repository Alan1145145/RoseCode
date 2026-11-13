import type { ReactNode } from "react";
import { Server } from "lucide-react";
import { t } from "../i18n";

export function ProviderWorkspace({ total, enabled, models, loadState, list, toolbar }: {
  total: number;
  enabled: number;
  models: number;
  loadState: "ready" | "loading" | "error";
  list: ReactNode;
  toolbar: ReactNode;
}) {
  return (
    <>
      <div className="rose-provider-metrics">
        <span><strong>{loadState === "ready" ? total : "—"}</strong>{t("供应商")}</span>
        <span><i className="gw-dot" data-tone="ok" /><strong>{loadState === "ready" ? <>{enabled}<em>/ {total}</em></> : "—"}</strong>{t("已启用")}</span>
        <span><strong>{loadState === "ready" ? models : "—"}</strong>{t("已配置模型")}</span>
      </div>
      {toolbar}
      <div aria-busy={loadState === "loading"} className="rose-provider-workspace">
        {loadState === "ready" ? <section aria-label={t("供应商列表")} className="rose-provider-list">{list || <div className="gw-empty">{t("尚未添加供应商")}</div>}</section> : <div className="rose-pool-load-state"><Server aria-hidden="true" /><strong>{loadState === "loading" ? t("正在读取…") : t("读取供应商失败，请刷新重试")}</strong></div>}
      </div>
    </>
  );
}
