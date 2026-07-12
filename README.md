# TJ 的个人博客

网站：[t2j5.github.io](https://t2j5.github.io/)

## 本地开发

需要 Node.js 20.19 或更新版本。

```bash
npm ci
npm run server
```

## 构建与发布

```bash
npm run check
```

推送到 `source_code` 分支后，GitHub Actions 会构建 `public/` 并部署到 GitHub Pages。首次迁移时，请在仓库 Settings → Pages 中将 Build and deployment 的 Source 设为 **GitHub Actions**。

## 从 Obsidian 导入 AI 文档

```bash
npm run import:ai
```

该命令会将 `/Users/tj/Documents/obsidian/AI` 中的 Markdown 转换到 `source/_posts/ai/`，统一设置为 `ai` 分类，并把附件复制到 `source/img/ai/`。PDF 可在文章中使用如下 HTML 嵌入：

```html
<iframe class="pdf-embed" src="/path/to/document.pdf" title="PDF 文档"></iframe>
```
