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
