#!/usr/bin/env python3
"""
サイトのビルドと検証（外部ライブラリ不要・Python 3.8+）

  src/ のHTML等を _site/ にコピーし、site.config.json の設定を埋め込みます。
  設定値の形式やページの必須要素（title・description・canonical・リンク切れ等）を検査し、
  問題があればエラーで止まります（＝誤った設定のまま公開されない）。

使い方:
  python3 scripts/build.py                     # ローカル確認用（http://localhost:8000）
  python3 scripts/build.py --site-url URL      # 公開URLを指定（GitHub Actions が自動で指定）
"""
import argparse, datetime, html.parser, json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
OUT = os.path.join(ROOT, "_site")
CONFIG = os.path.join(ROOT, "site.config.json")

errors, warnings = [], []

def err(m): errors.append(m)
def warn(m): warnings.append(m)

def load_config():
    try:
        with open(CONFIG, encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        sys.exit(f"[エラー] site.config.json の書式が正しくありません（{e.lineno}行目付近）: {e.msg}")

def validate_config(c):
    ga = str(c.get("ga4MeasurementId", "")).strip()
    if ga and not re.fullmatch(r"G-[A-Z0-9]{6,12}", ga):
        err(f"ga4MeasurementId の形式が違います: '{ga}'（例: G-ABC123DEF4 / 空欄ならGA4なし）")
    if not ga:
        warn("ga4MeasurementId が空欄です（GA4は読み込まれません）")
    fe = str(c.get("formEndpoint", "")).strip()
    if fe and not re.fullmatch(r"https://formspree\.io/f/[A-Za-z0-9]{6,20}", fe):
        err(f"formEndpoint の形式が違います: '{fe}'（例: https://formspree.io/f/xabcdefg）")
    if not fe:
        warn("formEndpoint が空欄です（問い合わせフォームは『準備中』表示になり送信できません）")
    gv = str(c.get("googleSiteVerification", "")).strip()
    if gv and not re.fullmatch(r"[A-Za-z0-9_\-]{20,80}", gv):
        err("googleSiteVerification の形式が違います（Search Consoleの meta タグの content=\"...\" の中身だけを入れてください）")
    su = str(c.get("siteUrl", "")).strip()
    if su and not re.fullmatch(r"https://[^\s\"'<>]+", su):
        err(f"siteUrl は https:// から始まるURLにしてください: '{su}'")
    return ga, fe, gv

class LinkParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.ids=set(); self.meta={}; self.title=0; self.canon=[]; self.scripts=[]
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a: self.ids.add(a["id"])
        if tag == "a" and a.get("href"): self.links.append(a["href"])
        if tag == "title": self.title += 1
        if tag == "meta" and a.get("name"): self.meta[a["name"]] = a.get("content", "")
        if tag == "link" and a.get("rel") == "canonical": self.canon.append(a.get("href", ""))
        if tag == "script" and a.get("src"): self.scripts.append(a["src"])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site-url", default="")
    args = ap.parse_args()

    c = load_config()
    ga, fe, gv = validate_config(c)
    site_url = (str(c.get("siteUrl", "")).strip() or args.site_url or "http://localhost:8000").rstrip("/")

    if os.path.isdir(OUT): shutil.rmtree(OUT)
    shutil.copytree(SRC, OUT)

    # 設定ファイル（ブラウザ用）
    with open(os.path.join(OUT, "assets", "site-config.js"), "w", encoding="utf-8") as f:
        f.write("/* ビルド時に site.config.json から自動生成。直接編集しないでください */\n")
        f.write("window.PROGRESS_SITE_CONFIG = " + json.dumps(
            {"ga4MeasurementId": ga, "formEndpoint": fe, "debug": False}, ensure_ascii=False) + ";\n")

    pages = {}
    for name in sorted(os.listdir(OUT)):
        if not name.endswith(".html"): continue
        p = os.path.join(OUT, name)
        s = open(p, encoding="utf-8").read()
        s = s.replace("{{SITE_URL}}", site_url)
        s = s.replace("{{FORM_ENDPOINT}}", fe or "#")
        if gv and name == "index.html":
            s = s.replace("<head>", f'<head><meta name="google-site-verification" content="{gv}">', 1)
        if "{{" in s and "}}" in s and re.search(r"\{\{[A-Z_]+\}\}", s):
            err(f"{name}: 置き換えられていない設定項目があります {re.findall(r'{{[A-Z_]+}}', s)}")
        open(p, "w", encoding="utf-8").write(s)
        lp = LinkParser(); lp.feed(s); pages[name] = lp

    # ページ検査
    google = re.compile(r"googletagmanager\.com|google-analytics\.com|gtag\(")
    for name, lp in pages.items():
        if name.startswith("google") and len(pages[name].links) == 0:
            continue  # Search Console 確認用ファイル
        if lp.title != 1: err(f"{name}: <title> が1つではありません")
        if not lp.meta.get("description"): err(f"{name}: meta description がありません")
        if len(lp.canon) != 1: err(f"{name}: canonical が1つではありません")
        if lp.scripts.count("assets/analytics.js") != 1:
            err(f"{name}: assets/analytics.js はちょうど1回読み込む必要があります（二重計測防止）")
        if google.search(open(os.path.join(OUT, name), encoding="utf-8").read()):
            err(f"{name}: GA4のタグが直接書かれています。GA4は assets/analytics.js だけで読み込みます（二重計測防止）")
        for h in lp.links:
            if re.match(r"^(https?:|mailto:|tel:)", h): continue
            path, _, frag = h.partition("#")
            target = path or name
            if target not in pages:
                err(f"{name}: リンク切れ → {h}"); continue
            if frag and frag not in pages[target].ids:
                err(f"{name}: ページ内リンク先が見つかりません → {h}")

    # sitemap / robots / .nojekyll
    today = datetime.date.today().isoformat()
    urls = "".join(
        f"  <url><loc>{site_url}{p['path']}</loc><lastmod>{today}</lastmod><priority>{p.get('priority','0.5')}</priority></url>\n"
        for p in c.get("sitemapPages", []))
    for p in c.get("sitemapPages", []):
        fname = "index.html" if p["path"] == "/" else p["path"].lstrip("/")
        if fname not in pages: err(f"sitemapPages に存在しないページがあります: {p['path']}")
    open(os.path.join(OUT, "sitemap.xml"), "w", encoding="utf-8").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n")
    open(os.path.join(OUT, "robots.txt"), "w", encoding="utf-8").write(
        f"User-agent: *\nAllow: /\n\nSitemap: {site_url}/sitemap.xml\n")
    open(os.path.join(OUT, ".nojekyll"), "w").close()

    print(f"公開URL: {site_url}/")
    print(f"GA4: {ga or '（未設定）'} / フォーム: {fe or '（未設定）'} / Search Console確認: {'設定あり' if gv else '（未設定）'}")
    for w in warnings: print(f"[注意] {w}")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(f"### ビルド結果\n- 公開URL: {site_url}/\n- GA4: {ga or '未設定'}\n- フォーム送信先: {fe or '未設定'}\n")
            for w in warnings: f.write(f"- ⚠️ {w}\n")
            for e in errors: f.write(f"- ❌ {e}\n")
    if errors:
        for e in errors: print(f"[エラー] {e}")
        sys.exit(1)
    print(f"OK: {len(pages)}ページをビルドしました → _site/")

if __name__ == "__main__":
    main()
