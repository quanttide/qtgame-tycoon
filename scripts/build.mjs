// 一套源码（src/），三个发布目标：
//   web（默认）→ dist/          自己官网：资源入 assets/ 并注入相对 <base href="assets/">，
//                               适配发布域 CDN 回源重写只放行 /assets/ 的规则；含两版 BGM
//   xhs         → dist-xhs/     小红书小工具：平铺、index.html 在根、不含音频
//                               （容器只收静态资源类型，不收音频；容器内代码已跳过 BGM）
//   taptap      → dist-taptap/  TapTap H5 小游戏：平铺、index.html 在根、含两版 BGM
//                               （TapTap MCP 的 prepare_h5_upload 上传该目录）
//
// 包体形态是构建期差异；运行时平台判定在 src/game.js（window.xhs → 容器存档 / 长按复制 / 跳过 BGM），
// TapTap 与官网同为浏览器环境，走同一条分支，无需专用代码。
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "src");

const AUDIO = ["bgm.mp3", "bgm_alt.mp3"];
const RESOURCES = ["game.js", "style.css", ...AUDIO];

const target = (process.argv[2] || "web").toLowerCase();
if (!["web", "xhs", "taptap"].includes(target)) {
  console.error(`未知目标 "${target}"，可选：web / xhs / taptap`);
  process.exit(1);
}

const out = target === "web" ? resolve(root, "dist") : resolve(root, `dist-${target}`);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const html = readFileSync(resolve(src, "index.html"), "utf8");

if (target === "web") {
  // 资源统一进 assets/，HTML 注入相对 base 让所有相对引用落到 assets/
  const assets = resolve(out, "assets");
  for (const name of RESOURCES) cpSync(resolve(src, name), resolve(assets, name));
  writeFileSync(resolve(out, "index.html"), html.replace("<head>", '<head>\n<base href="assets/">'), "utf8");
} else {
  // 平铺：index.html 与资源同级，引用已是相对路径，不需要 base
  for (const name of RESOURCES) {
    if (target === "xhs" && AUDIO.includes(name)) continue;
    cpSync(resolve(src, name), resolve(out, name));
  }
  writeFileSync(resolve(out, "index.html"), html, "utf8");
}

// 小红书要上传 zip：压缩「与 index.html 同级的内容」本身，解压后 index.html 直接在根
let zipPath = null;
if (target === "xhs") {
  zipPath = resolve(root, "dist-xhs.zip");
  try {
    execFileSync("zip", ["-r", "-q", zipPath, ".", "-x", "*.DS_Store"], { cwd: out, stdio: "inherit" });
  } catch (e) {
    console.error(`zip 命令不可用（${e.message}），请手动：cd dist-xhs && zip -r ../dist-xhs.zip .`);
    process.exit(1);
  }
}

const walk = (dir, prefix = "") =>
  readdirSync(dir).flatMap((name) => {
    const p = resolve(dir, name);
    return statSync(p).isDirectory()
      ? walk(p, `${prefix}${name}/`)
      : [`${prefix}${name}  ${(statSync(p).size / 1024).toFixed(0)}KB`];
  });

console.log(`目标 ${target} → ${out}`);
walk(out).forEach((f) => console.log(`  ${f}`));
if (zipPath) console.log(`  zip → ${zipPath}`);
