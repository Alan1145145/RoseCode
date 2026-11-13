import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const workflow = readFileSync(new URL("../.github/workflows/release-assets.yml", import.meta.url), "utf8");
const script = workflow.match(/node <<'NODE'\r?\n([\s\S]*?)\r?\n\s+NODE/)[1]
  .replace(/^          /gm, "");
const version = "1.0.0";
const windows = ["windows-x64-setup.exe", "windows-x64.zip"];
const macos = "macos-universal.dmg";

function metadata(suffixes, includeMacos = false, size = 123) {
  let output;
  const release = {
    tagName: `v${version}`,
    url: "https://github.com/Alan1145145/RoseCode/releases/untagged-test",
    body: "RoseCode release",
    assets: suffixes.map((suffix) => ({ name: `RoseCode-${version}-${suffix}`, size })),
  };
  const fs = {
    readFileSync: () => JSON.stringify(release),
    writeFileSync: (_path, text) => { output = JSON.parse(text); },
  };
  runInNewContext(script, {
    require: (name) => { assert.equal(name, "fs"); return fs; },
    process: { env: { REPO: "Alan1145145/RoseCode", TAG: `v${version}`, INCLUDE_MACOS: String(includeMacos) } },
  });
  return output;
}

test("Windows-only release uses public RoseCode URLs", () => {
  const result = metadata(windows);
  assert.equal(result.version, "v1.0.0");
  assert.equal(result.url, "https://github.com/Alan1145145/RoseCode/releases/tag/v1.0.0");
  assert.equal(result.assets.length, 2);
  assert.ok(result.assets.every(({ url }) => url.startsWith("https://github.com/Alan1145145/RoseCode/releases/download/v1.0.0/")));
});

test("missing Windows installer blocks publication", () => {
  assert.throws(() => metadata([windows[1]]), /windows-x64-setup\.exe/);
});

test("missing portable Windows asset blocks publication", () => {
  assert.throws(() => metadata([windows[0]]), /windows-x64\.zip/);
});

test("empty installers block publication", () => {
  assert.throws(() => metadata(windows, false, 0), /windows-x64-setup\.exe/);
});

test("enabled macOS cannot publish without its DMG", () => {
  assert.throws(() => metadata(windows, true), /macos-universal\.dmg/);
  assert.equal(metadata([...windows, macos], true).assets.length, 3);
});

test("optional Linux package is included in update metadata", () => {
  assert.equal(metadata([...windows, "linux-amd64.deb"]).assets.length, 3);
});
