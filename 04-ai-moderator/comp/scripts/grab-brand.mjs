// TEMPLATE (brand-hero-video skill). 品牌提取——做视频前的第 0 步。
// 用 Playwright 抓目标产品官网的真实视觉：主色/背景/强调色、字体、圆角、阴影、渐变、logo 文案。
// 产出一份"brand tokens"，据此定 src/theme.ts，别照搬 skill 默认的深色霓虹。
// 用法: npm i -D playwright && npx playwright install chromium
//        node scripts/grab-brand.mjs https://your-product.com  [输出目录默认 ./brand]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const URL = process.argv[2];
if (!URL) { console.error("usage: node grab-brand.mjs <url> [outdir]"); process.exit(1); }
const OUT = process.argv[3] || "brand";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);

// 截图：首屏 + 下滚两屏（用 Read 工具亲眼看，别只信色值统计）
for (const [name, frac] of [["top", 0], ["mid", 0.33], ["low", 0.66]]) {
  await page.evaluate((f) => window.scrollTo(0, document.body.scrollHeight * f), frac);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
}

const data = await page.evaluate(() => {
  const root = getComputedStyle(document.documentElement);
  const vars = {};
  for (const n of root) if (n.startsWith("--")) vars[n] = root.getPropertyValue(n).trim();
  const freq = {};
  const tally = (c) => { if (!c || c === "rgba(0, 0, 0, 0)" || c === "transparent") return; freq[c] = (freq[c] || 0) + 1; };
  document.querySelectorAll("*").forEach((el) => {
    const s = getComputedStyle(el);
    tally(s.backgroundColor); tally(s.color);
    if (s.backgroundImage && s.backgroundImage.includes("gradient")) freq["GRAD::" + s.backgroundImage] = (freq["GRAD::" + s.backgroundImage] || 0) + 1;
  });
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 30);
  const fonts = new Set();
  document.querySelectorAll("h1,h2,h3,p,button,span").forEach((el) => fonts.add(getComputedStyle(el).fontFamily));
  const buttons = [...document.querySelectorAll("button,a")].map((b) => b.textContent.trim()).filter(Boolean).slice(0, 30);
  // 圆角/阴影样本（卡片质感）
  const radii = new Set(), shadows = new Set();
  document.querySelectorAll("div,section,button,a").forEach((el) => {
    const s = getComputedStyle(el);
    if (s.borderRadius && s.borderRadius !== "0px") radii.add(s.borderRadius);
    if (s.boxShadow && s.boxShadow !== "none") shadows.add(s.boxShadow);
  });
  return { title: document.title, bodyBg: getComputedStyle(document.body).backgroundColor, vars, topColors: top, fonts: [...fonts].slice(0, 8), buttons, radii: [...radii].slice(0, 10), shadows: [...shadows].slice(0, 8) };
});
fs.writeFileSync(path.join(OUT, "tokens.json"), JSON.stringify(data, null, 2));
console.log("title:", data.title, "| bodyBg:", data.bodyBg);
console.log("top colors:", data.topColors.slice(0, 12).map((c) => c[0]).join("  "));
console.log("fonts:", data.fonts.slice(0, 3).join(" | "));
console.log("→", OUT, "(看 top/mid/low.png + tokens.json，据此写 src/theme.ts)");
await browser.close();
