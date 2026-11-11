# 株式会社プログレス｜法人向けLED照明工事サイト

- 公開URL：https://progress-led.github.io/
- リポジトリ：https://github.com/progress-led/progress-led.github.io
- ページ：トップ／工場・倉庫／マンション共用部／店舗・商業施設／オフィス・ビル／プライバシーポリシー／送信完了

---

## 1. しくみ（全体像）

```
Claude Code で修正
   ↓（作業ブランチにプッシュ → プルリクエスト作成）
GitHub で変更内容を確認  ← 自動チェック（リンク切れ・設定ミス等）＋プレビュー用ファイル
   ↓ あなたが「Merge（マージ）」＝公開の承認
GitHub Actions が自動でビルド・公開（1〜2分）
   ↓
公開サイトに反映
```

| 役割 | サービス | 費用 |
|---|---|---|
| ソース管理・公開 | GitHub / GitHub Pages（HTTPS自動） | 無料（公開リポジトリ） |
| 問い合わせフォーム受付・通知メール | Formspree | 無料（月50件まで） |
| アクセス解析 | Google アナリティクス4 | 無料 |
| 検索登録 | Google Search Console | 無料 |
| ダッシュボード | Looker Studio | 無料 |

> GitHub Pages を無料で使うにはリポジトリを「Public（公開）」にする必要があります。ソースコードは誰でも見られますが、パスワード等の秘密情報は一切入っていません（GA4測定IDやフォームURLは、もともとページ上に表示される値です）。

---

## 2. 日々の更新手順（いつもの流れ）

### ① Claude Code に頼む

このリポジトリのフォルダで Claude Code を起動し、普段の言葉で依頼します。

```
よくある質問に「工事中も営業できますか？→はい、区画ごとに施工します」を追加して
```

Claude Code はこのリポジトリの `CLAUDE.md` のルールに従い、**作業ブランチ → プルリクエスト作成**まで行い、確認用URLを伝えます（公開サイトはまだ変わりません）。

### ② 変更内容を確認する

GitHub のプルリクエスト画面で：

- **Files changed**：変更箇所（赤＝削除、緑＝追加）
- **Checks**：「変更チェック（公開前）」が ✅ になっていること（❌ ならマージしない）
- 見た目を確認したい時：Checks の詳細 → **Artifacts の `preview-site`** をダウンロード → 解凍して `index.html` をブラウザで開く。または Claude Code にスクリーンショットを依頼

### ③ 承認して公開する

問題なければ **「Merge pull request」→「Confirm merge」**。1〜2分で公開サイトに反映されます。
進行状況は **Actions タブ → 「公開（GitHub Pages）」** で確認できます。

やめる場合は **「Close pull request」**（公開サイトは変わりません）。

### 元に戻したい時

マージ済みのプルリクエスト画面の **「Revert」** ボタン → 新しいプルリクエストができるので、それをマージすると元に戻ります。

---

## 3. 設定の変更（GA4・フォーム・Search Console）

設定はすべて **`site.config.json`** に集約しています。

```json
{
  "siteUrl": "",
  "ga4MeasurementId": "G-XXXXXXXXXX",
  "formEndpoint": "https://formspree.io/f/xxxxxxxx",
  "googleSiteVerification": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "sitemapPages": [ ... ]
}
```

| 項目 | 内容 | 空欄の場合 |
|---|---|---|
| `siteUrl` | 独自ドメインを使う時だけ（例 `https://progress-led.jp`） | GitHub PagesのURLを自動使用 |
| `ga4MeasurementId` | GA4の測定ID | GA4を読み込まない |
| `formEndpoint` | FormspreeのフォームURL | フォームは「準備中」表示（送信不可） |
| `googleSiteVerification` | Search Console の HTMLタグ確認コード（`content="..."`の中身） | 確認タグなし |

**変更方法（安全な手順）**：Claude Code に「GA4の測定IDを G-XXXX に変更して」と依頼 → プルリクエスト → 確認してマージ。
形式が間違っている値（例：`UA-` で始まる旧ID、formspree以外のURL）は自動チェックでエラーになり、**公開されません**。

> 問い合わせ通知の**送信先メールアドレス**は、このファイルではなく **Formspree の管理画面**で変更します（コード変更不要）。

---

## 4. 初回セットアップ（済んだらチェック）

### 4-1. GitHub Pages を有効化

- [ ] リポジトリ → **Settings → Pages → Build and deployment → Source** を **「GitHub Actions」** に変更
- [ ] **Actions タブ → 「公開（GitHub Pages）」→ Run workflow** で初回公開
- [ ] 公開URLを開いて表示を確認（鍵マーク＝HTTPS）

### 4-2. 承認なしで公開されないようにする（main ブランチ保護）

- [ ] **Settings → Rules → Rulesets → New ruleset → New branch ruleset**
  - Ruleset name：`main保護` ／ Enforcement status：**Active**
  - Target branches：**Add target → Include default branch**
  - ✅ **Restrict deletions**、✅ **Block force pushes**
  - ✅ **Require a pull request before merging**（Required approvals は 0 のままでOK）
  - ✅ **Require status checks to pass** → 「Add checks」で **`check`** を追加
  - **Create**

これで main（＝公開サイト）は、プルリクエストを**あなたがマージした時だけ**更新されます。

### 4-3. 問い合わせフォーム（Formspree）

- [ ] https://formspree.io/ で **Sign up**（Googleアカウントで可）
- [ ] **+ Add New → New Form**：名前「LED化LP問い合わせ」、通知先メールに自分のアドレス
- [ ] 表示された **フォームURL（`https://formspree.io/f/xxxxxxxx`）** を Claude Code に伝え、`formEndpoint` に設定してもらう → マージ
- [ ] Formspree のフォーム設定（Settings）：
  - **Restrict to Domain**（表示される場合）に `progress-led.github.io` を入力（他サイトからの悪用防止。プランによっては設定項目がありません）
  - reCAPTCHA は **OFF のまま**（本サイトは画面遷移なしで送信するため。スパムは自動フィルタ＋隠し項目 `_gotcha` で防止）
- [ ] 公開サイトからテスト送信 → 完了画面 → 通知メールが届くこと
- 通知先メールの変更：Formspree → 対象フォーム → **Settings → Notifications/Emails**
- 無料プランは**月50件**まで。超えそうなら有料プランか別サービスへ切り替え（`formEndpoint` の変更のみ）

### 4-4. Google アナリティクス4

- [ ] https://analytics.google.com/ → 測定を開始 → アカウント「株式会社プログレス」→ プロパティ「LED化工事サイト」（日本・日本円）
- [ ] データストリーム「ウェブ」→ URL に公開URL → **測定ID（G-…）** を Claude Code に伝えて `ga4MeasurementId` に設定 → マージ
- [ ] データストリーム → **拡張計測機能の歯車 → 「フォームの操作」をOFF**（独自に form_start を送るため。ONだと二重計測）
- [ ] GA4のタグを Googleタグマネージャー等で**別途追加しない**（二重計測になります）
- [ ] **管理 → イベント**：`generate_lead` を「キーイベント（コンバージョン）」にマーク。電話ボタン設置後は `click_phone` も
- [ ] **管理 → カスタム定義 → カスタムディメンション**（範囲：イベント）
  - 施設の種類：`facility_type`
  - 問い合わせ時の流入区分：`lead_source_category`
  - クリック位置：`link_location`
- [ ] **管理 → チャネルグループ → 新規**「プログレス集客経路」：
  チラシ（参照元＝`flyer`）／紹介（参照元＝`shokai`）／テレアポ（参照元＝`teleapo`）／自然検索（デフォルトチャネル＝Organic Search）

### 4-5. Google Search Console

- [ ] https://search.google.com/search-console → プロパティ追加 → **URLプレフィックス** に公開URL（末尾 `/` まで）
- [ ] 確認方法 **「HTMLタグ」** → `content="…"` の中身を Claude Code に伝え、`googleSiteVerification` に設定 → マージ → 公開後に「確認」
- [ ] **サイトマップ** に `sitemap.xml` を送信
- [ ] **URL検査** → トップ・各ページで「インデックス登録をリクエスト」
- [ ] GA4 **管理 → Search Console のリンク** で連携

> GitHub Pages のサブパス公開（`/リポジトリ名/`）では `robots.txt` は検索エンジンに読まれませんが、サイトマップは上記の手動送信で問題なく登録されます。独自ドメインにすると robots.txt も有効になります。

### 4-6. 集客ダッシュボード（Looker Studio）

https://lookerstudio.google.com/ → 空のレポート → データ：Google アナリティクス（このプロパティ）

| 指標 | グラフ | ディメンション | 指標 |
|---|---|---|---|
| 月間アクセス数 | 時系列＋スコアカード | 年月 | セッション・総ユーザー数 |
| ページ別閲覧数 | 表 | ページパス | 表示回数 |
| 問い合わせ完了数 | スコアカード | — | キーイベント（generate_lead） |
| 問い合わせ率 | スコアカード | — | セッションのキーイベント率（generate_lead） |
| 電話ボタンクリック数 | スコアカード | — | イベント数（イベント名＝click_phone で絞り込み） |
| 集客経路別アクセス数 | 棒グラフ | セッションのチャネルグループ（プログレス集客経路） | セッション |
| 集客経路別問い合わせ数 | 表 | 同上 | キーイベント（generate_lead） |

数値の反映には24〜48時間かかります。

---

## 5. 集客経路の計測（UTM）

チラシ・紹介・テレアポで案内するURL（QRコード）には必ずUTMを付けます。

| 経路 | 案内するURL |
|---|---|
| チラシ | `https://progress-led.github.io/?utm_source=flyer&utm_medium=print&utm_campaign=2026-11_flyer` |
| 紹介 | `https://progress-led.github.io/?utm_source=shokai&utm_medium=introduction&utm_campaign=shokai` |
| テレアポ | `https://progress-led.github.io/?utm_source=teleapo&utm_medium=sales_call&utm_campaign=2026-11_teleapo` |
| 自然検索 | 不要（Google・Yahoo!等から自動判定） |

- 施設別ページに直接案内：`.../factory.html?utm_source=flyer&...`
- `utm_campaign` を配布月・エリアごとに変えると効果比較ができます（例 `2026-12_flyer_minato`）
- **UTMに個人名・会社名・電話番号を入れない**
- 問い合わせ通知メールには `lead_source`（チラシ／紹介／テレアポ／自然検索 等）・UTM・参照元・最初に見たページが記載されます

---

## 6. 計測の仕様

| イベント | 送信タイミング | 送る情報 |
|---|---|---|
| `page_view` | 各ページ表示（1回） | URL（UTM以外のパラメータは除去） |
| `form_start` | フォームへの最初の入力（1回） | フォームID |
| `generate_lead` | **Formspreeが受付成功を返した時だけ**、完了画面で1回 | 施設の種類・流入区分 |
| `click_phone` | `tel:` リンクのクリック | クリック位置（番号は送らない） |
| `click_line` | LINE（line.me / lin.ee）リンクのクリック | クリック位置 |

- 氏名・電話・メール・会社名・住所・入力内容は GA4 へ送信しません
- 送信失敗時はエラーを表示し、完了扱いにしません（入力内容は保持）
- 完了画面の再読み込み・直接アクセスでは `generate_lead` は送信されません
- 電話・LINEボタンは、後から設置すれば自動で計測されます

---

## 7. 別のパソコンで作業する

### 初回だけ

1. **Git** をインストール（Mac：ターミナルで `git --version` → 案内に従ってインストール）
2. **GitHub CLI** をインストールしてログイン
   ```bash
   brew install gh        # Homebrew がない場合は https://cli.github.com/ から
   gh auth login          # GitHub.com → HTTPS → ブラウザでログイン
   ```
3. **Claude Code** をインストール（https://claude.com/claude-code の手順に従う）
4. リポジトリを取得
   ```bash
   cd ~/Documents
   gh repo clone progress-led/progress-led.github.io
   cd progress-led.github.io
   claude
   ```

### 2回目以降

```bash
cd ~/Documents/progress-led.github.io
git checkout main && git pull
claude
```

Python 3 が入っていれば（Mac は標準）、ローカル確認もできます：

```bash
python3 scripts/build.py
python3 -m http.server 8000 -d _site     # → http://localhost:8000/
```

Claude Code（Web版・スマホ版）からこのリポジトリを指定して作業することもできます。

---

## 8. フォルダ構成

```
├── src/                     サイト本体（ここを編集）
│   ├── index.html           トップ（問い合わせフォームあり）
│   ├── factory.html / apartment.html / store.html / office.html
│   ├── privacy.html         プライバシーポリシー
│   ├── thanks.html          送信完了（検索除外）
│   └── assets/
│       ├── analytics.js     GA4・イベント計測・流入元記録
│       └── form.js          フォーム送信（Formspree）
├── site.config.json         設定（GA4・フォーム・Search Console・サイトマップ）
├── scripts/build.py         ビルドと自動チェック
├── .github/workflows/       自動チェック・自動公開
├── CLAUDE.md                Claude Code 用の作業ルール
└── README.md                この手順書
```

---

## 9. 困った時

| 症状 | 確認すること |
|---|---|
| マージしたのに反映されない | Actions タブで「公開（GitHub Pages）」が ✅ か。ブラウザを再読み込み（数分のキャッシュあり） |
| 自動チェックが ❌ | ❌ の詳細に日本語でエラー内容が出ます。Claude Code に「PRのチェックエラーを直して」と依頼 |
| フォームが「準備中」 | `formEndpoint` が未設定 |
| フォームが送信エラー | Formspree の月間上限・Restrict to Domain の設定を確認 |
| GA4に数字が出ない | `ga4MeasurementId` を確認。リアルタイムレポートで自分のアクセスが見えるか |
| GA4の form_start が多すぎる | 拡張計測機能の「フォームの操作」がONになっていないか |
