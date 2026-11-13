import type { ResolvedTheme } from "../theme-mode";

/** Windows 的系统标题栏跟随当前外观；网页预览与其它平台继续由原生外壳处理。 */
export function syncNativeAppearance(theme: ResolvedTheme) {
  if (!("__TAURI_INTERNALS__" in window) || !/Windows/i.test(navigator.userAgent)) return;
  void import("@tauri-apps/api/window")
    .then(({ getCurrentWindow }) => getCurrentWindow().setTheme(theme))
    .catch((error) => console.warn("[RoseCode] 标题栏外观更新失败", error));
}
