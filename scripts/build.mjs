// 纯静态 demo 构建：src/ 是自包含的原生单页（index.html + game.js + style.css + mp3），
// 直接原样复制到 dist/ 即可部署，无需 tsc / Vite 打包。
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "src");
const dist = resolve(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(src, dist, { recursive: true });

console.log(`built ${dist} from ${src}`);
