import { ChevronRight, Search } from "lucide-react";
import { t } from "../i18n";
import { paletteShortcut } from "../command-palette-model";

/** 应用导航与页面操作分层，标题区不再重复堆放面包屑。 */
export function WorkspaceBar({ section, title, onSearch }: { section: string; title: string; onSearch: () => void }) {
  return (
    <div className="rose-workspace-bar" data-tauri-drag-region="deep">
      <nav aria-label={t("当前位置")}><span>{section}</span><ChevronRight aria-hidden="true" /><strong>{title}</strong></nav>
      <button className="rose-global-search" onClick={onSearch} type="button"><Search aria-hidden="true" /><span>{t("搜索工作空间")}</span><kbd>{paletteShortcut}</kbd></button>
    </div>
  );
}
