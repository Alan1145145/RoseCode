import assert from "node:assert/strict";
import test from "node:test";
import { THEME_STORAGE_KEY, loadThemePreference, parseThemePreference, resolveTheme, storeThemePreference, toggledThemePreference } from "./theme-mode.ts";

test("老用户存的固定主题原样沿用，没存过或存坏了默认跟随系统", () => {
  assert.equal(parseThemePreference("dark"), "dark");
  assert.equal(parseThemePreference("light"), "light");
  assert.equal(parseThemePreference("system"), "system");
  assert.equal(parseThemePreference(null), "system");
  assert.equal(parseThemePreference("blue"), "system");
});

test("跟随系统时按系统外观解析，固定模式不受系统影响", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("light", true), "light");
});

test("快捷切换按当前看到的颜色切到另一种固定模式", () => {
  assert.equal(toggledThemePreference("dark"), "light");
  assert.equal(toggledThemePreference("light"), "dark");
});

test("RoseCode 首次默认跟随系统，不继承上游固定主题，显式选择仍可保存", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const values = new Map<string, string>([["codex-plus-theme", "light"]]);
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } } });
  try {
    assert.equal(THEME_STORAGE_KEY, "rosecode-theme");
    assert.equal(loadThemePreference(), "system");
    storeThemePreference("dark");
    assert.equal(loadThemePreference(), "dark");
    assert.equal(values.get("codex-plus-theme"), "light");
    storeThemePreference("system");
    assert.equal(loadThemePreference(), "system");
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
