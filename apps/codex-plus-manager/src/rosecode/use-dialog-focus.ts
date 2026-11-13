import { useEffect, type RefObject } from "react";

/** 对话框只约束自己的 Tab 顺序；退出动画卸载后恢复打开它的控件。 */
export function useDialogFocus(active: boolean, root: RefObject<HTMLElement | null>, initial: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => initial.current?.focus({ preventScroll: true }));
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !root.current) return;
      const modals = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')).filter((item) => item.getClientRects().length > 0);
      const top = modals[modals.length - 1];
      if (top && top !== root.current && !root.current.contains(top)) return;
      const items = Array.from(root.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')).filter((item) => item.tabIndex >= 0 && item.getClientRects().length > 0);
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !root.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !root.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", trap);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [active, root, initial]);
}
