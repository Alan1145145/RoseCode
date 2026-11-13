import { providerEnabled, type GatewayPoolEntry } from "../gateway-model.ts";

/** 搜索、切协议、后台删除时，详情始终对应当前可见的供应商。只选择，不写配置。 */
export function selectedProviderId(entries: GatewayPoolEntry[], requested: string | null, autoSelect = true): string | null {
  if (!autoSelect) return entries.find((entry) => entry.id === requested)?.id ?? null;
  return entries.find((entry) => entry.id === requested)?.id
    ?? entries.find(providerEnabled)?.id
    ?? entries[0]?.id
    ?? null;
}
