import { useCallback, useEffect, useRef, useState } from "react";

/** 动画结束后再通知外层卸载；连续点击关闭不会重复执行回调。 */
export function useAnimatedDismiss(onDismiss: () => void) {
  const [closing, setClosing] = useState(false);
  const callback = useRef(onDismiss);
  const timer = useRef<number | undefined>(undefined);
  callback.current = onDismiss;
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const dismiss = useCallback(() => {
    if (timer.current !== undefined) return;
    setClosing(true);
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 150;
    timer.current = window.setTimeout(() => callback.current(), duration);
  }, []);
  return { closing, dismiss };
}
