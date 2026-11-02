# 生成 ../index.html（英文）和 ../zh.html（中文）。用法：python3 -I build.py
import base64, html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from content import EN, ZH  # noqa: E402  本目录的 content.py（-I 下 sys.path 不含 cwd，所以手动插入）

FONTS_DIR = os.path.join(HERE, "../../comp/public/fonts")
FACES = [("EuclidCircularA", "Euclid-Circular-A-Light", 300), ("EuclidCircularA", "Euclid-Circular-A-Regular", 400),
         ("EuclidCircularA", "Euclid-Circular-A-Medium", 500), ("IBMPlexMono", "IBMPlexMono-Light", 300),
         ("IBMPlexMono", "IBMPlexMono-Regular", 400)]


def fonts():
    out = []
    for fam, f, w in FACES:
        b = base64.b64encode(open(os.path.join(FONTS_DIR, f + ".woff2"), "rb").read()).decode()
        out.append(f'@font-face{{font-family:"{fam}";font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{b}) format("woff2")}}')
    return "\n".join(out)


def e(t):  # 纯文本转义；带 <em> 的字段不经过这里
    return html.escape(t, quote=True)


PINS = [["", "g", "", ""], ["g", "", "", "g"], ["", "", "g", ""], ["", "g", "", ""]]


def pins(i):
    return '<div class="pins" aria-hidden="true">' + "".join(f'<span class="{c}"></span>' if c else "<span></span>" for c in PINS[i % 4]) + "</div>"


def fragments(c):
    f = {"PINS0": pins(0), "PINS1": pins(1)}
    f["turing.rows"] = "".join(
        f'<tr><th scope="row">{e(a)}</th><td class="no">{e(b)}</td><td class="us">{e(u)}</td></tr>'
        for a, b, u in c["turing"]["rows"])
    CUR = ' aria-current="page"'
    f["suite.items"] = "".join(
        f'<a class="suite-i{" on" if on else ""}" href="{u}"{CUR if on else ""}><b>{e(n)}</b><small>{e(d)}</small></a>'
        for u, n, d, on in c["suite"]["items"])
    f["eras.items"] = "".join(
        f'<li class="era{" now" if now else ""}">{pins(i + 2) if now else ""}<span class="era-v">{e(v)}</span>'
        f'<div class="era-t"><h3>{e(h)}</h3><p>{e(p)}</p></div></li>'
        for i, (v, h, p, now) in enumerate(c["eras"]["items"]))
    f["tests.aTicks"] = "".join(f"<li>{e(t)}</li>" for t in c["tests"]["aTicks"])
    f["tests.bTicks"] = "".join(f"<li>{e(t)}</li>" for t in c["tests"]["bTicks"])
    f["faq.items"] = "".join(
        f'<details{" open" if i == 0 else ""}><summary>{e(q)}</summary><p>{e(a)}</p></details>'
        for i, (q, a) in enumerate(c["faq"]["items"]))
    f["sales.ticks"] = "".join(f"<li>{e(t)}</li>" for t in c["sales"]["ticks"])
    f["sales.sizeOptions"] = "".join(f"<option>{e(o)}</option>" for o in c["sales"]["sizeOptions"])
    f["sales.whenOptions"] = "".join(f"<option>{e(o)}</option>" for o in c["sales"]["whenOptions"])
    f["related.groups"] = "".join(
        f'<nav class="rel-col" aria-label="{e(g)}"><span class="rel-h">{e(g)}</span>'
        + "".join(f'<a href="{u}">{e(t)}</a>' for u, t in links) + "</nav>"
        for g, links in c["related"]["groups"])
    return f


def jsonld(c):
    url = "https://atypica.ai" + c["path"]
    data = {"@context": "https://schema.org", "@graph": [
        {"@type": "SoftwareApplication", "@id": url + "#app", "name": "atypica.AI Interview", "alternateName": "atypica AI Moderator",
         "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "inLanguage": c["lang"],
         "description": c["meta"]["description"], "publisher": {"@id": "https://atypica.ai/#org"}},
        {"@type": "WebPage", "@id": url, "name": c["meta"]["ogTitle"], "inLanguage": c["lang"], "dateModified": "2026-11-02",
         "author": {"@type": "Organization", "name": "atypica Research"}, "about": {"@id": url + "#app"},
         "breadcrumb": {"@type": "BreadcrumbList", "itemListElement": [
             {"@type": "ListItem", "position": 1, "name": "atypica.AI", "item": "https://atypica.ai/"},
             {"@type": "ListItem", "position": 2, "name": c["nav"]["interviewProject"], "item": url}]}},
        {"@type": "VideoObject", "name": c["film"]["alt"], "description": c["tests"]["lede"],
         "thumbnailUrl": "https://atypica.ai/ai-moderator/film-poster.jpg", "contentUrl": "https://atypica.ai/ai-moderator/launch-film.mp4",
         "uploadDate": "2026-10-28", "duration": "PT59S"},
        {"@type": "Organization", "@id": "https://atypica.ai/#org", "name": "atypica.AI", "url": "https://atypica.ai/"},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
                                            for q, a in c["faq"]["items"]]}]}
    return json.dumps(data, ensure_ascii=False, indent=1).replace("</", "<\\/")


RAW = {"hero.h1", "shift.slogan"}  # 这两项本身带 <em>


def build(c, out):
    tpl = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
    frag = fragments(c)

    def val(key):
        if key in frag:
            return frag[key]
        top, _, sub = key.partition(".")
        node = c["for_"] if top == "for" else c[top]
        v = node[sub] if sub else node
        return v if key in RAW else e(v)

    keys = set(re.findall(r"\{\{([a-zA-Z0-9_.]+)\}\}", tpl)) - {"FONTS", "CSS", "SCRIPT", "I18N", "jsonld"}
    for k in keys:
        tpl = tpl.replace("{{" + k + "}}", val(k))
    tpl = tpl.replace("{{jsonld}}", jsonld(c))
    tpl = tpl.replace("{{I18N}}", json.dumps(c["js"], ensure_ascii=False).replace("</", "<\\/"))
    tpl = tpl.replace("{{CSS}}", open(os.path.join(HERE, "style.css"), encoding="utf-8").read())
    tpl = tpl.replace("{{SCRIPT}}", open(os.path.join(HERE, "script.js"), encoding="utf-8").read())
    tpl = tpl.replace("{{FONTS}}", fonts())
    # 文件里没有自己的 <html>；这里补一个只带 lang 的开始标签，解析器会把属性并到根元素上
    tpl = f'<html lang="{c["lang"]}">\n' + tpl
    left = re.findall(r"\{\{[^}]+\}\}", tpl)
    if left:
        raise SystemExit(f"{out}: unfilled {sorted(set(left))}")
    open(os.path.join(HERE, "..", out), "w", encoding="utf-8").write(tpl)
    print(out, len(tpl))


build(EN, "index.html")
build(ZH, "zh.html")
