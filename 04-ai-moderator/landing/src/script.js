(() => {
  // ── 原型状态：上线后由服务端返回（code、是否已加入），这里存 localStorage 只为演示。
  //    页面不展示名次，也没有"邀请几人前进几位"的规则：只告诉用户邀请的人越多，排得越靠前。
  const T = window.I18N;
  const KEY = "atypica-ai-moderator-waitlist";
  const BASE = "https://atypica.ai" + T.path;
  // 只认这一版的字段，旧原型存下的状态（带名次）直接丢掉
  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && v.email && v.role && v.code ? v : null; } catch { return null; } };
  const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
  // 原型专用：网址带 ?reset 就清掉加入状态，方便反复看加入流程；清完把参数从地址栏去掉
  if (new URLSearchParams(location.search).has("reset")) {
    try { localStorage.removeItem(KEY); } catch {}
    history.replaceState(null, "", location.pathname + location.hash);
  }
  let state = load();

  const $ = (id) => document.getElementById(id);
  const link = (s) => `${BASE}?ref=${s.code}`;
  // 分享卡的头像：从 Hippy Ghost 1–100 里只挑长得像正常人脸、表情平和的 8 只，按邮箱固定选一只
  const GHOSTS = [16, 19, 22, 30, 59, 66, 67, 84];
  const ghostId = (seed) => {
    const n = String(seed).split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    return GHOSTS[n % GHOSTS.length];
  };

  const toast = (msg) => { const t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2400); };
  const copyLink = () => {
    const text = link(state);
    const fallback = () => toast(T.copyFailed + " " + text);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast(T.linkCopied), fallback);
    else fallback();
  };

  // ── 邀请来源 ──
  const ref = new URLSearchParams(location.search).get("ref");
  if (ref && !state) $("invited").hidden = false;

  // ── 弹窗 ──
  const open = (name) => {
    const d = $("dlg-" + name);
    if (name === "card") drawCard();
    d.showModal();
    if (name === "film") $("film-video").play().catch(() => {});
  };
  document.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => open(b.dataset.open)));
  document.querySelectorAll("[data-copy-link]").forEach((b) => b.addEventListener("click", copyLink));
  document.querySelectorAll("dialog").forEach((d) => {
    d.querySelector("[data-close]").addEventListener("click", () => d.close());
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
  });
  $("dlg-film").addEventListener("close", () => $("film-video").pause());

  // 底部的 Join 只是把人送回 hero 的输入框，不再放第二张表
  document.querySelectorAll("[data-focus-join]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    setTimeout(() => $("j-email").focus({ preventScroll: true }), 400);
  }));

  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  $("join").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target, err = $("join-err");
    const email = form.email.value.trim(), role = form.role.value.trim();
    if (!validEmail(email)) return (err.textContent = T.errEmail, form.email.focus());
    if (!role) return (err.textContent = T.errRole, form.role.focus());
    err.textContent = "";
    const code = Math.abs([...email].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)).toString(36).slice(0, 6);
    state = { email, role, code, ref: ref || null, joinedAt: Date.now() };
    save(state);
    render();
    open("card");
  });

  $("sales-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target, err = $("sales-err");
    if (!f.name.value.trim()) return (err.textContent = T.errName, f.name.focus());
    if (!validEmail(f.email.value.trim())) return (err.textContent = T.errEmail, f.email.focus());
    if (!f.company.value.trim()) return (err.textContent = T.errCompany, f.company.focus());
    err.textContent = "";
    $("sales-sent-t").textContent = T.salesSent.replace("{email}", f.email.value.trim());
    [...f.querySelectorAll(".field:not(.sent)")].forEach((el) => (el.hidden = true));
    $("sales-sent").hidden = false;
  });

  function render() {
    if (!state) return;
    $("join").hidden = true; $("invited").hidden = true; $("hero-joined").hidden = false;
    $("cta-actions").hidden = true; $("cta-joined").hidden = false;
  }

  // ── 分享卡：1200×630，左边 Hippy Ghost，右下二维码（与 report shareImage.ts 同一做法：直接画模块网格）
  //    卡上不放名次，只说"扫码加入，我就往前排"。
  const ghostCache = {};
  const loadGhost = (id) => ghostCache[id] ||= new Promise((res) => {
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => res(img); img.onerror = () => res(null);
    img.src = `https://api.hippyghosts.io/~/storage/images/raw/${id}`;
  });

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // ghost 原图 1200×1200，形象只占中间一小块，下方还有一条灰色投影；量出形象本身的范围再裁
  const boxCache = new WeakMap();
  function ghostBox(img) {
    if (boxCache.has(img)) return boxCache.get(img);
    const N = 120, c = document.createElement("canvas"); c.width = c.height = N;
    const x = c.getContext("2d"); x.drawImage(img, 0, 0, N, N);
    let full = { x: 0, y: 0, w: img.width, h: img.height };
    try {
      const d = x.getImageData(0, 0, N, N).data, lim = Math.floor(N * 0.72);
      let x0 = N, y0 = N, x1 = -1, y1 = -1;
      for (let yy = 0; yy < lim; yy++) for (let xx = 0; xx < N; xx++) if (d[(yy * N + xx) * 4 + 3] > 20) {
        if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy;
      }
      if (x1 >= 0) { const f = img.width / N; full = { x: x0 * f, y: y0 * f, w: (x1 - x0 + 1) * f, h: (y1 - y0 + 1) * f }; }
    } catch {}
    boxCache.set(img, full); return full;
  }

  function drawQr(ctx, text, x, y, box) {
    const qr = qrcode(0, "M"); qr.addData(text); qr.make();
    const n = qr.getModuleCount(), m = Math.max(1, Math.floor(box / n)), size = n * m;
    const ox = x + Math.floor((box - size) / 2), oy = y + Math.floor((box - size) / 2);
    ctx.fillStyle = "#111111";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(ox + c * m, oy + r * m, m, m);
  }

  // 中文落到 PingFang / 雅黑，英文走品牌字体
  const SANS = '"EuclidCircularA", system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
  const MONO = '"IBMPlexMono", ui-monospace, Menlo, "PingFang SC", monospace';

  // 居中排版，从上到下：品牌 → atypica 是什么 → 头像 + 「我在排队」→ 新能力主标 → 扫码说明 + 二维码
  async function drawCard() {
    const cv = $("share-canvas"), ctx = cv.getContext("2d"), W = 1200, H = 630, C = T.card, CX = W / 2;
    await document.fonts.ready;
    ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1;
    for (let x = 0.5; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0.5; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    [[14, 14, 1], [W - 22, 14, 0], [14, H - 22, 0], [W - 22, H - 22, 1]].forEach(([x, y, g]) => { ctx.fillStyle = g ? "#18ff19" : "#555"; ctx.fillRect(x, y, 8, 8); });
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";

    // 品牌：atypica.AI 三段颜色，整体居中
    ctx.font = `500 30px ${SANS}`; const wA = ctx.measureText("atypica").width, wB = ctx.measureText(".AI").width;
    let x0 = CX - (wA + wB) / 2; ctx.textAlign = "left";
    ctx.fillStyle = "#fff"; ctx.fillText("atypica", x0, 78);
    ctx.fillStyle = "#18ff19"; ctx.fillText(".AI", x0 + wA, 78);
    ctx.textAlign = "center";
    // atypica 是什么
    ctx.font = `400 19px ${SANS}`; ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(C.about, CX, 114);
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(CX - 40, 140, 80, 1);

    // 头像 + 「我在排队」一行。头像按 ghost 本身的轮廓裁紧，只留一圈很窄的底
    const gs = 52, inset = 4;
    ctx.font = `400 16px ${MONO}`;
    const kw = ctx.measureText(C.kicker).width, rowW = gs + 14 + kw;
    const gx = Math.round(CX - rowW / 2), gy = 168;
    ctx.fillStyle = "#f4f4f2"; roundRect(ctx, gx, gy, gs, gs, 6); ctx.fill();
    const img = await loadGhost(ghostId(state.email));
    if (img) {
      const b = ghostBox(img);
      const inner = gs - inset * 2, k = inner / Math.max(b.w, b.h);
      const dw = b.w * k, dh = b.h * k;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, b.x, b.y, b.w, b.h, gx + inset + (inner - dw) / 2, gy + inset + (inner - dh), dw, dh);
    }
    ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(C.kicker, gx + gs + 14, gy + gs / 2 + 1);
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";

    // 新能力主标，两行居中，第二行后半段高亮
    ctx.font = `500 ${C.size}px ${SANS}`; ctx.fillStyle = "#fff";
    ctx.fillText(C.l1, CX, 296);
    const wa = ctx.measureText(C.l2a).width, wb = ctx.measureText(C.l2b).width;
    x0 = CX - (wa + wb) / 2; ctx.textAlign = "left";
    ctx.fillText(C.l2a, x0, 296 + Math.round(C.size * 1.16));
    ctx.fillStyle = "#18ff19"; ctx.fillText(C.l2b, x0 + wa, 296 + Math.round(C.size * 1.16));
    ctx.textAlign = "center";

    // 底部：二维码 + 扫码说明，作为一组居中
    const qb = 96, pad = 6, box = qb + pad * 2;
    ctx.font = `400 20px ${SANS}`;
    const lw = Math.max(...C.invite.map((l) => ctx.measureText(l).width));
    const groupW = box + 22 + lw, qx = Math.round(CX - groupW / 2), qy = 440;
    ctx.fillStyle = "#fff"; roundRect(ctx, qx, qy, box, box, 6); ctx.fill();
    drawQr(ctx, link(state), qx + pad, qy + pad, qb);
    ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,0.85)";
    const ly = qy + box / 2 - ((C.invite.length - 1) * 30) / 2 + 7;
    C.invite.forEach((line, i) => ctx.fillText(line, qx + box + 22, ly + i * 30));
    ctx.textAlign = "start";

    $("card-link").value = link(state);
    $("share-x").href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(T.shareText)}&url=${encodeURIComponent(link(state))}`;
    $("share-in").href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link(state))}`;
  }

  $("card-copy-img").addEventListener("click", () => {
    const cv = $("share-canvas");
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") return toast(T.imgUnsupported);
    const blob = new Promise((res) => cv.toBlob(res, "image/png"));
    navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(() => toast(T.imgCopied), () => toast(T.imgFailed));
  });

  render();
})();
