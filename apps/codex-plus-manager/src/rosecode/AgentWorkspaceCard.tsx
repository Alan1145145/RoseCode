import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { t } from "../i18n";

export function AgentWorkspaceCard({ title, icon, detail, connected, onOpen, children }: { title: string; icon: ReactNode; detail: string; connected: boolean; onOpen: () => void; children: ReactNode }) {
  return (
    <article className="rose-agent-card">
      <button className="rose-agent-open" onClick={onOpen} type="button"><span className="rose-agent-mark">{icon}</span><strong>{title}</strong><ArrowUpRight aria-hidden="true" /></button>
      <p>{detail}</p>
      <div className="rose-agent-card-foot"><span data-connected={connected}><i />{connected ? t("已连接网关") : t("独立配置")}</span><div>{children}</div></div>
    </article>
  );
}
