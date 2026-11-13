/** ⌘K 命令面板：跳到任意页面、切到某个 Agent 的页面、执行几个常用操作。 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpDown, CornerDownLeft, Search, X } from "lucide-react";
import { t, tf } from "./i18n";
import { filterCommands, type PaletteCommand } from "./command-palette-model";
import { useEscapeLayer } from "./use-escape-layer";
import { usePresence } from "./rosecode/use-presence";
import { useDialogFocus } from "./rosecode/use-dialog-focus";

export type { PaletteCommand };

export function CommandPalette({ open, commands, onClose }: { open: boolean; commands: PaletteCommand[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [group, setGroup] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();
  const present = usePresence(open, 140);
  const matches = useMemo(() => filterCommands(commands, query), [commands, query]);
  const groups = useMemo(() => Array.from(new Set(commands.map((command) => command.group))), [commands]);
  const results = useMemo(() => matches.filter((command) => !group || command.group === group), [matches, group]);
  const active = results.length ? Math.min(highlight, results.length - 1) : -1;
  useDialogFocus(present, root, input);
  // 登记进 Esc 栈：面板盖在弹窗上时，Esc 只关面板，不关下面的弹窗。
  useEscapeLayer(present, onClose);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setGroup("");
    setHighlight(0);
  }, [open]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, group, query]);

  if (!present) return null;

  const choose = (command: PaletteCommand | undefined) => {
    if (!command) return;
    onClose();
    command.run();
  };

  return createPortal(
    <div className="rose-palette-backdrop" data-open={open} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div aria-labelledby={`${id}-title`} aria-modal="true" className="rose-palette" ref={root} role="dialog">
        <header className="rose-palette-heading"><div><span className="rose-eyebrow">ROSECODE</span><h2 id={`${id}-title`}>{t("快速跳转")}</h2></div><button aria-label={t("关闭")} onClick={onClose} type="button"><X aria-hidden="true" /></button></header>
        <div className="rose-palette-input">
          <Search aria-hidden="true" className="h-4 w-4" />
          <input
            aria-activedescendant={active >= 0 ? `${id}-option-${active}` : undefined}
            aria-controls={`${id}-results`}
            aria-expanded={open}
            aria-label={t("搜索页面和操作")}
            autoComplete="off"
            onChange={(event) => { setQuery(event.currentTarget.value); setHighlight(0); }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") { event.preventDefault(); setHighlight(results.length ? (active + 1) % results.length : 0); }
              if (event.key === "ArrowUp") { event.preventDefault(); setHighlight(results.length ? (active - 1 + results.length) % results.length : 0); }
              if (event.key === "Enter") { event.preventDefault(); choose(results[active]); }
            }}
            placeholder={t("跳到页面、Agent 或执行操作…")}
            ref={input}
            role="combobox"
            value={query}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="rose-palette-body">
          <nav aria-label={t("搜索分类")} className="rose-palette-groups">
            {["", ...groups].map((item) => <button aria-pressed={group === item} key={item} onClick={() => { setGroup(item); setHighlight(0); input.current?.focus(); }} type="button"><span>{item || t("全部")}</span><small>{item ? matches.filter((command) => command.group === item).length : matches.length}</small></button>)}
          </nav>
        <div aria-label={t("搜索结果")} className="rose-palette-results" id={`${id}-results`} ref={list} role="listbox">
          <div className="rose-palette-result-heading">{query ? tf("{0} 个结果", [results.length]) : t("页面与常用操作")}</div>
          {results.length === 0 ? <div className="rose-palette-empty"><Search aria-hidden="true" /><strong>{t("没有匹配项")}</strong><p>{t("试试页面名称、Agent 或操作名称")}</p></div> : null}
          {results.map((command, index) => {
            return (
                <button
                  aria-selected={index === active}
                  className="rose-palette-item"
                  data-index={index}
                  id={`${id}-option-${index}`}
                  key={command.id}
                  onClick={() => choose(command)}
                  onMouseMove={() => setHighlight(index)}
                  role="option"
                  tabIndex={-1}
                  type="button"
                >
                  <span className="rose-palette-icon">{command.icon}</span>
                  <span className="rose-palette-label">{command.label}<small>{command.group}</small></span>
                  {index === active ? <CornerDownLeft aria-hidden="true" className="rose-palette-enter" /> : null}
                </button>
            );
          })}
        </div>
        </div>
        <footer className="rose-palette-foot"><span><ArrowUpDown aria-hidden="true" />{t("选择")}</span><span><kbd>Enter</kbd>{t("打开")}</span><span><kbd>Esc</kbd>{t("关闭")}</span></footer>
      </div>
    </div>,
    document.body,
  );
}
