# AI Moderator 落地页：SEO / GEO 方向（2026-10-28）

参考：getminds.ai（Minds）。用户给的 getmans.com 目前是"网站建设中"的占位页，没有内容可参考，这里按 Minds 来写。如果指的是别的站，告诉我再补。

## 这一页在整个 SEO 体系里的位置

Minds 的打法是"一个产品页 + 一大片围着它的内容页"：榜单（best-xxx）、替代品（xxx-alternatives）、术语、FAQ、研究。产品页自己只负责两件事：
1. **占住品类词**：这里是 "AI moderator"、"AI-moderated interviews"、"AI qualitative research"。
2. **当所有内容页的落点**：榜单、术语、对比页都链回这里。

所以这一页不追求长尾流量，要做的是**让搜索引擎和 AI 一眼看懂"atypica 有一个 AI moderator，它是什么、能做什么"**，然后围绕它的内容页把权重导进来。

## 页面上已经做了的（原型里）

| 项 | 做法 | 为什么 |
|---|---|---|
| URL | `atypica.ai/ai-moderator` | 品类词直接进路径，不用 `/interview` 这种产品内部名 |
| title / description | "The First AI Moderator to Pass the Turing Test \| atypica.AI Interview" | 品类词 + 主张 + 品牌 |
| H1 | 唯一一个，就是主张句 | |
| 结构化数据 | `SoftwareApplication` + `WebPage`（带 `dateModified`、`author`、`BreadcrumbList`）+ `VideoObject` + `FAQPage` | Minds 每页都有 FAQPage + Breadcrumb；视频单独标出来能进视频结果 |
| FAQ | 8 问，正文可见，和 JSON-LD 一一对应 | AI 搜索最常直接引用 FAQ 段落；正文不可见的 FAQ schema 会被 Google 判违规 |
| 署名 + 更新日期 | "By atypica Research · Updated October 28, 2026" | Minds 的做法，给 AI 判时效和来源 |
| 主动讲局限 | FAQ "When should I still use a human moderator?" | Minds 榜单里专门有"什么时候不够用"，能降低被质疑 |
| 真实素材 | 所有对白来自真实访谈，图片 alt 写清画面内容 | 不用泛化 AI 图（也是 design.md 的要求） |
| Markdown 版本 | `<link rel="alternate" type="text/markdown" href="/ai-moderator.md">` | 给 AI 爬虫读，对应计划里第 0 步 |
| 相关链接 | 底部链到首页、glossary、featured studies、pricing | 内链 |

## 上线时要接的（不在原型里）

1. **.md 版本**：`/ai-moderator.md` 返回 `text/markdown`，内容是页面正文 + FAQ。
2. **llms.txt**：加一段 AI Interview / AI Moderator，写清"真人受访者、视频、最长一小时、产品体验测试、waitlist 阶段"。
3. **sitemap**：加这一页，`lastmod` 跟 `dateModified` 一致。
4. **多语言**：`/zh/ai-moderator`、`/ja/ai-moderator`，加 `hreflang`。现在语言靠 cookie，中文版等于不被收录。
5. **OG 图**：做一张 1200×630 的静态 OG（主标 + 主持人画面），和用户分享卡不是一张图。
6. **邀请链接**：`?ref=xxx` 的页面加 `<link rel="canonical" href="https://atypica.ai/ai-moderator">`，避免每个邀请码都被当成一个新页面。原型里已经写了 canonical。

## 围绕这一页要做的内容（按优先级）

1. **glossary**：`ai-moderator`、`ai-moderated-interview`、`depth-interview`、`in-home-usage-test`（IHUT）、`turing-test`。每页链回落地页。
2. **榜单**：`best-ai-moderated-interview-tools-2026`。对比对象：Outset、Listen Labs、Strella、Conveo、Voxpopme、Discuss.io、Remesh、Qualtrics。atypica 排第一并声明是我们发布的，每格附出处。
3. **替代品页**：`outset-alternatives`、`listen-labs-alternatives`。
4. **研究 / 证据页**：`/research/ai-moderator-turing-test`，写清测试方法、样本和结果，附 Suggested Citation。**"通过图灵测试"是整页的主张，但目前页面上没有证据。** 这一页做出来之前，AI 和评测站引用这句话时很可能会打折扣。这是 SEO 角度最该补的一项。

## 不要做的

- 不要学 Minds 用模板批量生成 use-cases 页（"How does Minds support abm-campaign-angle-validation…" 这种）。Google 会按 scaled content abuse 降权。
- FAQ 不写正文里看不到的问题。
- 不在页面上编数字。对比表里"As many as you invite"这类说法要和产品确认。

## 需要产品 / 研发确认

- waitlist 的后端：页面不展示名次，也不承诺"邀请几人前进几位"，只说邀请的人越多排得越靠前。后端只需要记录邮箱、职位、邀请码、谁邀请了谁。
- Contact Sales 留资表单（页面上 `#contact` 一节）提交到哪里：CRM、飞书，还是发邮件给销售。
- 分享卡上的头像：用邮箱做 seed，算法和 `HippyGhostAvatar` 一样，所以同一个人在站内看到的是同一只 ghost。
