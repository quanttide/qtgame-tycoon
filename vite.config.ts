import { defineConfig } from "vite";

// 当前 src/ 为原生 JS 单页 demo，无 TS/React 源码，构建由 scripts/build.mjs 直接复制静态文件。
// 这里仅保留 Vite dev server 配置；base 用相对路径以兼容 OSS 自定义域名根路径与 Pages 子路径。
export default defineConfig({
  base: "./",
});
