# Claude Code 向け作業ルール（このリポジトリ）

株式会社プログレス「法人向けLED照明工事」サイト。GitHub Pages で公開。

## 絶対に守ること

1. **main ブランチへ直接コミット・プッシュしない。** 必ず作業ブランチ（例: `update/2026-11-faq`）を作り、プルリクエスト（PR）を作成する。
2. **PR をマージしない。** マージ＝公開の承認。オーナー（人間）が GitHub 上で確認してマージする。
3. **デザイン・配色・レイアウト・文章は、指示がない限り変更しない。** 指示外の変更が必要な場合は、作業前に必ずオーナーに確認する。
4. GA4 のタグを HTML に直接書かない。GA4 は `src/assets/analytics.js` だけが読み込む（二重計測防止。ビルドでも検査される）。
5. 個人情報（氏名・電話・メール・会社名・住所・フォーム入力値）を GA4 へ送る処理を追加しない。
6. 秘密情報（パスワード・APIの秘密鍵）をリポジトリに入れない。`site.config.json` の値（GA4測定ID・Formspreeのフォーム URL 等）はページ上に公開される前提の値なので問題ない。

## 構成

| 場所 | 内容 |
|---|---|
| `src/` | サイト本体（HTML・CSS は各HTML内・JS は `src/assets/`） |
| `site.config.json` | GA4測定ID・フォーム送信先・Search Console確認コード・サイトマップ対象ページ |
| `scripts/build.py` | `src/` → `_site/` へビルド。設定の埋め込み・sitemap/robots生成・検証（リンク切れ、title/description/canonical、GA二重読み込み） |
| `.github/workflows/preview.yml` | PR 作成時に検証＋プレビュー用ファイル（Artifacts: preview-site） |
| `.github/workflows/deploy.yml` | main への反映時に GitHub Pages へ公開 |

- HTML 内の `{{SITE_URL}}`・`{{FORM_ENDPOINT}}` はビルド時に置き換わる。手で書き換えない。
- ページ間リンクは相対パス（`factory.html` など）。GitHub Pages はサブパス（`/リポジトリ名/`）で配信されるため、`/` 始まりの絶対パスは使わない。
- 新しいページを追加したら `site.config.json` の `sitemapPages` に追加し、`<title>`・description・canonical（`{{SITE_URL}}/ファイル名`）・`assets/site-config.js`/`assets/analytics.js` の読み込みを既存ページと同じ形で入れる。

## 更新の手順（毎回）

1. `git checkout main && git pull` → `git checkout -b update/<内容>`
2. 修正する
3. `python3 scripts/build.py` で検証（エラー0であること）
4. ローカル確認：`python3 -m http.server 8000 -d _site` → http://localhost:8000/ 。デザインに関わる変更は PC幅（1280px）とスマホ幅（390px）で変更前後のスクリーンショットを撮り、オーナーに見せる
5. コミット → `git push -u origin <ブランチ>` → `gh pr create`（タイトルと本文は日本語。本文に「変更したページ」「変更内容」「見た目への影響の有無」を書く）
6. PR の URL をオーナーに伝え、マージ（承認）を待つ

## 計測仕様（変更時は README の仕様表も更新）

- `page_view`：gtag config で自動（1ページ1回）
- `form_start`：`form[data-track-form]` への最初の入力
- `generate_lead`：Formspree が成功（2xx & ok）を返した時だけ `sessionStorage.progress_lead_ok` を立て、`thanks.html`（`<html data-page="thanks">`）で1回送信
- `click_phone`：`a[href^="tel:"]`／`click_line`：`line.me`・`lin.ee` へのリンク（ボタンを後から置けば自動計測）
- 流入元：UTM・参照元ホストを保存し、フォームの hidden 項目（lead_source 等）に入れる
