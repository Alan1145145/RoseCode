import { useEffect, useState } from "react";

/** 关闭时保留节点一小段时间，供菜单和弹窗完成退出动画。 */
export function usePresence(open: boolean, duration = 140): boolean {
  const [present, setPresent] = useState(open);
  useEffect(() => {
    if (open) { setPresent(true); return; }
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : duration;
    const timer = window.setTimeout(() => setPresent(false), delay);
    return () => window.clearTimeout(timer);
  }, [open, duration]);
  return open || present;
}
