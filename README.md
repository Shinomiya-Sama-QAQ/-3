# 王一凡个人作品集网站

基于 React + Vite 的 PC 端作品集基础版本。页面内容来自提供的简历与作品集素材，包含：

- 全屏视频背景首页
- 个人介绍、联系方式、经历与项目数据
- 5 个精选项目大卡片及详情弹层
- 个人优势与工具能力
- 全屏联系方式收尾页
- GSAP 首屏开场与 ScrollTrigger 章节动效

## 本地运行

```bash
pnpm install
pnpm dev
```

默认开发地址为 `http://localhost:5173`。

## 生产构建

```bash
pnpm build
pnpm preview
```

## 主要内容位置

- `src/App.jsx`：页面结构与交互
- `src/styles.css`：视觉系统与响应式样式
- `src/data.js`：项目、经历和个人优势数据
- `src/components/LiquidEther/`：头图下方的 WebGL 流体背景组件
- `src/components/BorderGlow/`：个人资料卡的动态渐变边框与边缘光晕
- `public/projects/`：项目图片素材
- `public/media/`：首页视频与视频封面

首页视频为本地生成的低饱和抽象视频，不依赖外部链接。

## 动效说明

- 首屏包含约 3 秒的加载标识、双幕揭开和标题遮罩归位动画
- 章节英文标题先以遮罩、位移和轻微压缩进场，卡片随后分批 stagger
- 项目图片使用遮罩揭示和低幅滚动视差，仅动画 transform / opacity
- 支持 `prefers-reduced-motion` 降级，动画实例会随 React 组件清理

动效编排集中在 `src/motion.js`。如需重新抓取关键帧，请先启动开发服务器，再运行：

```bash
pnpm capture:motion
```
