# atypica AI Moderator 落地页（原型）

AI 访谈（访谈真人模式）发布用的落地页原型，英文 `index.html`、中文 `zh.html`。上线地址预期是 `atypica.ai/ai-moderator` 和 `atypica.ai/zh/ai-moderator`。

## 改文案 / 改样式

不要直接改 `index.html` 和 `zh.html`，它们是生成出来的。改 `src/` 下的源文件，再重新生成：

```sh
python3 -I src/build.py
```

- `src/content.py`：中英文全部文案，两份结构一样
- `src/template.html`：页面结构，两种语言共用
- `src/style.css`：样式（atypica `/v2` 设计规范）
- `src/script.js`：候补名单加入、分享卡（Hippy Ghost 头像 + 二维码）、销售表单

字体从 `../comp/public/fonts/` 内联进页面。

## 本地预览

`media/` 里的截图和发布片不进 git（仓库的 `.gitignore` 排除所有图片和视频），本机才有。在这个目录起一个服务器：

```sh
python3 -m http.server 8787
```

打开 http://localhost:8787/ 。网址加 `?reset` 会清掉"已加入候补名单"的状态，方便重看加入流程。

## 还没接的

- 候补名单、邀请码、销售表单都没有后端，状态只存在浏览器里
- 二维码指向 `atypica.ai/ai-moderator?ref=…`，页面上线前扫出来是 404
- SEO 方向见 `SEO方向.md`
