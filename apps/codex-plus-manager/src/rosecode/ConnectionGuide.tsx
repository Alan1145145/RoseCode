import { ArrowRight, Check } from "lucide-react";
import { t } from "../i18n";
import { providerHasSavedKey, type GatewayPayload } from "../gateway-model";

export function ConnectionGuide({ gateway, connected, onProviders, onAgents }: { gateway: GatewayPayload | null; connected: number; onProviders: () => void; onAgents: () => void }) {
  const steps = [
    { title: t("添加供应商"), detail: t("准备 API 地址与 Key"), done: (gateway?.pool ?? []).some((entry) => Boolean(entry.account) || providerHasSavedKey(entry)), run: onProviders },
    { title: t("选择模型"), detail: t("从上游获取或手动添加"), done: (gateway?.pool ?? []).some((entry) => entry.models.length > 0), run: onProviders },
    { title: t("连接 Agent"), detail: t("由你决定哪些 Agent 使用网关"), done: connected > 0, run: onAgents },
  ];
  return (
    <section className="rose-connection-guide">
      <div className="rose-guide-heading"><h2>{t("连接准备")}</h2><span>{steps.filter((step) => step.done).length} / 3</span></div>
      <p>{t("从模型到 Agent，完成你的工作空间。")}</p>
      <div className="rose-guide-steps">{steps.map((step, index) => <button key={step.title} onClick={step.run} type="button"><span className="rose-step-number" data-done={step.done}>{step.done ? <Check aria-hidden="true" /> : index + 1}</span><span><strong>{step.title}</strong><small>{step.detail}</small></span><ArrowRight aria-hidden="true" /></button>)}</div>
    </section>
  );
}
