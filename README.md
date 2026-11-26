# 量潮模拟经营游戏

教学主题：AI 能给流程和方法，但决定生死的数字必须自己去现实里拿。

## 快速开始

```bash
npm install   # 首次克隆后执行，安装依赖并启用 husky 钩子
npm run dev   # 本地开发
npm run build # 类型检查 + 构建，产物在 dist/
```

## 玩法概要

- 28 天、日均 150 签的经营目标，现金见底即收摊
- 每天押一注、每晚开奖：四档押注（80/120/160/200）加定价滑杆，开出的需求由天气、日历与实测数据共同决定
- 今天不押也可以：花一天探店或盲测，把军师的猜测换成实测
- 周日结算预测误差、备货准确率与断货次数，误差条随亲手拿到的数字收窄
- 五页场景驱动：开场、主场景、周结算、结局、复盘

## 项目结构

```
index.html       # Vite 入口（根目录，npm run dev 用）
src/
  index.html     # 单页游戏入口（速玩版 demo）
  game.js        # 游戏全部逻辑与渲染（原生 JS，无框架）
  style.css      # 全部样式（纯 CSS，无外部依赖）
  bgm.mp3 / bgm_alt.mp3  # 两版 BGM（官网与 TapTap 打包；小红书包不含音频）
scripts/
  build.mjs      # 多平台构建（web / xhs / taptap）
.agents/         # 小红书小工具打包与创服平台上传的 skill
docs/            # 开发文档（玩法、页面设计）
.github/         # CI/CD
```

## 多平台发布

一套源码（`src/`），三个发布目标，构建期只差包体形态：

| 目标 | 命令 | 产物 | 怎么发 |
|------|------|------|--------|
| 自己官网 | `npm run build` | `dist/`（资源入 `assets/` + 相对 `<base>`，含两版 BGM） | push main → CI 自动部署 tycoon.game.quanttide.com |
| 小红书小工具 | `npm run build:xhs` | `dist-xhs/` + `dist-xhs.zip`（平铺、`index.html` 在根、不含音频） | 按 `.agents/minitool-zip-builder` 上传创服平台 |
| TapTap H5 小游戏 | `npm run build:taptap` | `dist-taptap/`（平铺、`index.html` 在根、含两版 BGM） | TapTap MCP `prepare_h5_upload` → `upload_h5_game`（横竖屏选竖屏） |

运行时平台判定与构建无关，都在 `src/game.js`：检测 `window.xhs` 走容器分支（容器 Storage 存档、长按复制、跳过 BGM），否则走浏览器分支——官网与 TapTap 同为浏览器环境，共用一条分支。平台差异资料见领域仓 `data/library/taptap/`。

## 代码质量

pre-commit 钩子在每次提交前运行 ESLint 与 TypeScript 类型检查：

```bash
npm run lint       # ESLint 全量检查
npm run typecheck  # tsc -b 类型检查
npm run build      # 构建验证
```

## 技术栈

React 19 + TypeScript + Vite，运行时仅 React；开发期工具：ESLint、typescript-eslint、eslint-plugin-react-hooks、husky。
