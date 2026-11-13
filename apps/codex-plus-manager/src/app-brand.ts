/** 只更新展示品牌；配置路径、协议和拓展接口沿用已有标识。 */
export const APP_NAME = "RoseCode";
export const APP_LOGO_URL = new URL("./assets/rosecode-logo.png", import.meta.url).href;
export const PROJECT_REPOSITORY = "Alan1145145/RoseCode";
export const PROJECT_URL = `https://github.com/${PROJECT_REPOSITORY}`;
export const PROJECT_ISSUES_URL = `${PROJECT_URL}/issues`;
export const UPSTREAM_URL = "https://github.com/BigPizzaV3/CodexPlusPlus";
export const QQ_GROUP_NUMBER = "473502913";

/** 保留真实文件路径与已经写入客户端的钩子名称。 */
export function appBrandText(text: string): string {
  return text.replace(/(^|[^\w./\\:-])Codex\+\+(?![\w./\\]| 拓展钩子)/g, `$1${APP_NAME}`);
}
