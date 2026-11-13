/**
 * 下拉选择：全应用替代原生下拉框。按钮 + portal 浮层（外点关闭、滚动跟随由 usePopoverLayer 负责），
 * 样式在 styles.css 的 `.app-select*`。选项可带一行说明（hint）。
 */
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { usePopoverLayer } from "./use-popover-layer";
import { usePresence } from "./rosecode/use-presence";
import { nextSelectIndex, selectSearchIndex } from "./rosecode/select-navigation";

export type AppSelectOption<T extends string> = {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  title?: string;
  /** 选项下面的一行小字说明。 */
  hint?: ReactNode;
};

export function AppSelect<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  className = "",
  title = "",
  ariaLabel,
  label,
  placeholder,
  id,
  size = "md",
  menuWidth,
}: {
  value: T;
  options: AppSelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  ariaLabel?: string;
  /** 同 ariaLabel。 */
  label?: string;
  /** 当前值不在选项里时显示的文字（如「全部设为…」这类动作菜单）；不给时显示第一项。 */
  placeholder?: ReactNode;
  id?: string;
  /** sm：放在一行小控件里的紧凑尺寸。 */
  size?: "sm" | "md";
  /** 浮层最小宽度（默认 180）。 */
  menuWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const present = usePresence(open && !disabled, 120);
  const generatedId = useId();
  const triggerId = id ?? `select-${generatedId}`;
  const menuId = `${triggerId}-options`;
  const [activeIndex, setActiveIndex] = useState(-1);
  const search = useRef({ text: "", at: 0 });
  const pendingIndex = useRef<number | null>(null);
  const matched = options.find((option) => option.value === value);
  const selected = matched ?? (placeholder === undefined ? options[0] : undefined);
  const selectOption = (option: AppSelectOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    rootRef.current?.querySelector("button")?.focus({ preventScroll: true });
  };
  const { rootRef, menuRef, menuStyle } = usePopoverLayer({
    open: present,
    onOpenChange: setOpen,
    minWidth: menuWidth ?? 180,
    maxHeight: 300,
  });
  useLayoutEffect(() => {
    if (disabled) { setOpen(false); return; }
    if (!open) { search.current = { text: "", at: 0 }; return; }
    const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
    setActiveIndex(pendingIndex.current ?? (selectedIndex >= 0 ? selectedIndex : nextSelectIndex(options, -1, 1)));
    pendingIndex.current = null;
  }, [open, value, disabled]);
  useLayoutEffect(() => {
    if (!open || activeIndex < 0) return;
    const menu = menuRef.current;
    const option = menu?.querySelectorAll<HTMLButtonElement>("[role='option']")[activeIndex];
    if (!menu || !option) return;
    option.focus({ preventScroll: true });
    const top = option.offsetTop;
    if (top < menu.scrollTop) menu.scrollTop = top;
    else if (top + option.offsetHeight > menu.scrollTop + menu.clientHeight) menu.scrollTop = top + option.offsetHeight - menu.clientHeight;
  }, [activeIndex, open, menuRef]);
  const keyDown = (event: KeyboardEvent) => {
    if (event.key === "Tab") {
      if (open) {
        setOpen(false);
        // portal 选项不在表单的 DOM 顺序里，先还焦点，让原生 Tab 从触发器继续。
        rootRef.current?.querySelector("button")?.focus({ preventScroll: true });
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      setActiveIndex(nextSelectIndex(options, activeIndex, event.key === "ArrowDown" ? 1 : -1));
    } else if (open && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      setActiveIndex(nextSelectIndex(options, event.key === "Home" ? -1 : 0, event.key === "Home" ? 1 : -1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open && options[activeIndex]) selectOption(options[activeIndex]); else setOpen(true);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      const query = now - search.current.at > 650 ? event.key : search.current.text + event.key;
      search.current = { text: query, at: now };
      const index = selectSearchIndex(options.map((option) => option.disabled ? "" : typeof option.label === "string" ? option.label : option.title ?? ""), query, activeIndex);
      if (index >= 0) { event.preventDefault(); if (!open) pendingIndex.current = index; setOpen(true); setActiveIndex(index); }
    }
  };
  const sizeClass = size === "sm" ? "app-select-sm text-xs" : "";
  return (
    <div
      className={`app-select ${sizeClass} ${open ? "open" : ""} ${disabled ? "disabled" : ""} ${className}`.trim()}
      ref={rootRef}
    >
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel ?? label}
        aria-controls={open ? menuId : undefined}
        className="app-select-trigger"
        disabled={disabled}
        id={triggerId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={keyDown}
        title={title}
        type="button"
      >
        <span className={selected ? undefined : "app-select-placeholder"}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {present ? createPortal(
        <div
          className={`app-select-menu app-select-menu-portal ${sizeClass} ${className}`.trim()}
          ref={menuRef}
          id={menuId}
          aria-labelledby={triggerId}
          aria-hidden={!open || undefined}
          data-state={open ? "open" : "closed"}
          onKeyDown={keyDown}
          role="listbox"
          style={menuStyle}
        >
          {options.map((option, index) => (
            <button
              aria-selected={option.value === value}
              className={`app-select-option ${option.value === value ? "selected" : ""} ${option.hint ? "has-hint" : ""}`.trim()}
              disabled={option.disabled}
              data-highlighted={activeIndex === index || undefined}
              key={option.value}
              onClick={() => selectOption(option)}
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onPointerMove={() => { if (open && !option.disabled) setActiveIndex(index); }}
              role="option"
              tabIndex={-1}
              title={option.title}
              type="button"
            >
              {option.hint ? (
                <span className="app-select-option-text">
                  <span>{option.label}</span>
                  <small>{option.hint}</small>
                </span>
              ) : (
                <span className="app-select-option-label">{option.label}</span>
              )}
              {option.value === value ? <Check aria-hidden className="app-select-check" /> : null}
            </button>
          ))}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
