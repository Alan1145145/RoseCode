import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { usePresence } from "./use-presence";

type Tip = { anchor: HTMLElement; text: string; side: "right" | "bottom" };

/** 委托监听，不扫描或修改业务控件；portal 避免侧栏滚动区裁掉提示。 */
export function TooltipHost() {
  const id = useId();
  const [tip, setTip] = useState<Tip | null>(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const node = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const current = useRef<Tip | null>(null);
  const present = usePresence(open, 100);

  useEffect(() => {
    let nativeTitle: { anchor: HTMLElement; text: string } | null = null;
    const restoreTitle = () => { if (nativeTitle) nativeTitle.anchor.setAttribute("title", nativeTitle.text); nativeTitle = null; };
    const hide = () => { window.clearTimeout(timer.current); setOpen(false); restoreTitle(); };
    const anchorFor = (target: EventTarget | null) => target instanceof Element
      ? target.closest<HTMLElement>("[data-tooltip], .cx-side button[aria-label], .cx-side button[title]") : null;
    const show = (target: EventTarget | null, immediate = false) => {
      const anchor = anchorFor(target);
      if (!anchor) { hide(); return; }
      const text = anchor.dataset.tooltip || anchor.getAttribute("title") || anchor.getAttribute("aria-label");
      if (!text) { hide(); return; }
      window.clearTimeout(timer.current);
      if (nativeTitle?.anchor !== anchor) restoreTitle();
      if (anchor.hasAttribute("title")) { nativeTitle = { anchor, text: anchor.getAttribute("title")! }; anchor.removeAttribute("title"); }
      const next: Tip = { anchor, text, side: anchor.closest(".cx-side") || anchor.dataset.tooltipSide === "right" ? "right" : "bottom" };
      timer.current = window.setTimeout(() => {
        if (!anchor.isConnected) return;
        current.current = next; setTip(next); setOpen(true);
      }, immediate || current.current?.anchor === anchor ? 70 : 360);
    };
    const over = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const next = anchorFor(event.target);
      if (next && event.relatedTarget instanceof Node && next.contains(event.relatedTarget)) return;
      show(event.target);
    };
    const out = (event: PointerEvent) => {
      const anchor = anchorFor(event.target);
      if (anchor && event.relatedTarget instanceof Node && anchor.contains(event.relatedTarget)) return;
      hide();
    };
    const focus = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement && event.target.matches(":focus-visible")) show(event.target, true);
    };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") hide(); };
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    document.addEventListener("pointerdown", hide, true);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", hide);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    window.addEventListener("blur", hide);
    return () => {
      restoreTitle();
      window.clearTimeout(timer.current);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("pointerdown", hide, true);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", hide);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      window.removeEventListener("blur", hide);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open || !tip || !node.current) return;
    const rect = tip.anchor.getBoundingClientRect();
    const box = node.current.getBoundingClientRect();
    const left = tip.side === "right" ? rect.right + 10 : rect.left + (rect.width - box.width) / 2;
    const top = tip.side === "right" ? rect.top + (rect.height - box.height) / 2 : rect.bottom + 8;
    setStyle({ left: Math.max(8, Math.min(left, window.innerWidth - box.width - 8)), top: Math.max(8, Math.min(top, window.innerHeight - box.height - 8)) });
    const previous = tip.anchor.getAttribute("aria-describedby");
    tip.anchor.setAttribute("aria-describedby", [previous, id].filter(Boolean).join(" "));
    return () => { if (previous) tip.anchor.setAttribute("aria-describedby", previous); else tip.anchor.removeAttribute("aria-describedby"); };
  }, [id, open, tip]);

  return present && tip ? createPortal(
    <div className="rose-tooltip" data-open={open} data-side={tip.side} id={id} ref={node} role="tooltip" style={style}>{tip.text}</div>, document.body,
  ) : null;
}
