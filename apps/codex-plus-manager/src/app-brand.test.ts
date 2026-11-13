import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { APP_NAME, APP_LOGO_URL, PROJECT_REPOSITORY, PROJECT_URL, PROJECT_ISSUES_URL, UPSTREAM_URL, QQ_GROUP_NUMBER, appBrandText } from "./app-brand.ts";

test("品牌展示保留真实路径、协议和已经注册的钩子名", () => {
  assert.equal(APP_NAME, "RoseCode");
  assert.ok(APP_LOGO_URL.endsWith("/assets/rosecode-logo.png"));
  assert.equal(appBrandText("Codex++ 与 Codex++ 网关"), "RoseCode 与 RoseCode 网关");
  for (const text of [
    "/Applications/Codex++.app",
    "C:\\Apps\\Codex++\\codex-plus-plus.exe",
    "codexplusplus://import",
    "window.codexPlus",
    "Codex++ 拓展钩子",
  ]) assert.equal(appBrandText(text), text);
});

test("项目、反馈和更新指向 RoseCode，原项目单独署名，社区保留用户指定 QQ 群", () => {
  assert.equal(PROJECT_REPOSITORY, "Alan1145145/RoseCode");
  assert.equal(PROJECT_URL, "https://github.com/Alan1145145/RoseCode");
  assert.equal(PROJECT_ISSUES_URL, `${PROJECT_URL}/issues`);
  assert.equal(UPSTREAM_URL, "https://github.com/BigPizzaV3/CodexPlusPlus");
  assert.equal(QQ_GROUP_NUMBER, "473502913");
  const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
  const about = app.slice(app.indexOf("function AboutScreen("), app.indexOf("function AgentSettingsScreen("));
  assert.match(about, /openUrl\(PROJECT_URL\)/);
  assert.match(about, /openUrl\(PROJECT_ISSUES_URL\)/);
  assert.match(about, /openUrl\(UPSTREAM_URL\)/);
  assert.match(about, /原作者：BigPizzaV3 及 CodexPlusPlus 贡献者/);
  assert.match(about, /QQ_GROUP_NUMBER/);
  assert.doesNotMatch(about, /discord\.gg|t\.me\//);
  const updater = readFileSync(new URL("../../../crates/codex-plus-core/src/update.rs", import.meta.url), "utf8");
  assert.ok(updater.includes(`"${PROJECT_REPOSITORY}"`));
  assert.ok(updater.includes(`${PROJECT_URL}/releases/latest/download/latest.json`));
});

test("中英文翻译统一展示品牌，同时保留模板参数中的用户数据", async () => {
  // 用真实翻译字典与模块代码，替换仅供 Vite 使用的模块路径。
  const source = readFileSync(new URL("./i18n.ts", import.meta.url), "utf8")
    .replace('"@/i18n-en"', JSON.stringify(new URL("./i18n-en.ts", import.meta.url).href))
    .replace('"./app-brand"', JSON.stringify(new URL("./app-brand.ts", import.meta.url).href));
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  const { t, tf, setLanguage } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
  for (const language of ["zh", "en"]) {
    setLanguage(language);
    assert.equal(t("打开 RoseCode"), language === "en" ? "Open RoseCode" : "打开 RoseCode");
    const text = tf("{0} 接入 RoseCode", ["Codex++ user project"]);
    assert.ok(text.includes("RoseCode"));
    assert.ok(text.includes("Codex++ user project"));
  }
});
