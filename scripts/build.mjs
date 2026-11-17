// 纯静态 demo 构建：src/ 是自包含的原生单页（index.html + game.js + style.css + mp3）。
// 资源放入 dist/assets/，并在 HTML 注入相对 <base href="assets/">：
//   1) 发布域 CDN 的回源重写只放行 /assets/，根目录资源会被兜底成 index.html（白屏根因）；
//   2) 相对 base 同时兼容 OSS 自定义域名根路径与 GitHub Pages 子路径。
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "src");
const dist = resolve(root, "dist");
const assets = resolve(dist, "assets");

rmSync(dist, { recursive: true, force: true });
mkdirSync(assets, { recursive: true });

// 资源（脚本 / 样式 / 音乐）统一进 assets/
for (const name of ["game.js", "style.css", "bgm.mp3", "bgm_alt.mp3"]) {
  cpSync(resolve(src, name), resolve(assets, name));
}

// HTML 留在 dist 根，注入相对 base 让所有相对引用落到 assets/
const html = readFileSync(resolve(src, "index.html"), "utf8");
const withBase = html.replace("<head>", '<head>\n<base href="assets/">');
writeFileSync(resolve(dist, "index.html"), withBase, "utf8");

console.log(`built ${dist} from ${src}`);
