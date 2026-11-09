/*
 * アクセス解析・流入元記録（株式会社プログレス LED化工事LP）
 * ------------------------------------------------------------
 * - GA4 は assets/site-config.js の ga4MeasurementId が入っている時だけ読み込む
 * - 1ページにつき1回だけ読み込む（二重計測防止）
 * - 解析ツールへは個人情報（氏名・電話・メール・会社名・住所・入力内容）を一切送らない
 * - 流入元（UTM・参照元）はブラウザ内に保存し、問い合わせフォームの隠し項目に入れる
 */
(function () {
  "use strict";

  var CONFIG = window.PROGRESS_SITE_CONFIG || {};
  var GA_ID = String(CONFIG.ga4MeasurementId || "").trim();
  var GA_ON = /^G-[A-Z0-9]{4,}$/i.test(GA_ID);
  var DEBUG = !!CONFIG.debug;

  /* ---------- 1. 流入元の判定と保存 ---------- */

  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var FIRST_KEY = "progress_attr_first";
  var SESSION_KEY = "progress_attr_session";
  var FIRST_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 初回流入は90日保持

  // utm_source の値 → 流入区分
  var SOURCE_CATEGORY = {
    flyer: "flyer", chirashi: "flyer", posting: "flyer",
    shokai: "introduction", introduction: "introduction", syokai: "introduction",
    teleapo: "telemarketing", tele: "telemarketing", telemarketing: "telemarketing"
  };
  var CATEGORY_LABEL = {
    flyer: "チラシ",
    introduction: "紹介",
    telemarketing: "テレアポ",
    organic_search: "自然検索",
    paid_search: "検索広告",
    other_campaign: "その他キャンペーン",
    referral_site: "他サイトからのリンク",
    direct: "直接アクセス（URL入力・ブックマーク等）"
  };
  var SEARCH_HOSTS = /(^|\.)(google\.[a-z.]+|search\.yahoo\.co\.jp|yahoo\.co\.jp|search\.yahoo\.com|bing\.com|duckduckgo\.com|ecosia\.org|baidu\.com|yandex\.[a-z]+|naver\.com)$/i;

  function safeGet(storage, key) {
    try { var v = storage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function safeSet(storage, key, value) {
    try { storage.setItem(key, JSON.stringify(value)); } catch (e) { /* 保存できない環境では無視 */ }
  }
  function clip(v, n) { return String(v || "").slice(0, n || 100); }

  function externalReferrerHost() {
    try {
      if (!document.referrer) return "";
      var r = new URL(document.referrer);
      if (r.hostname === location.hostname) return "";
      return r.hostname; // ホスト名のみ（パスやクエリは記録しない）
    } catch (e) { return ""; }
  }

  function classify(utm, refHost, params) {
    var src = (utm.utm_source || "").toLowerCase();
    var med = (utm.utm_medium || "").toLowerCase();
    if (src && SOURCE_CATEGORY[src]) return SOURCE_CATEGORY[src];
    if (params.get("gclid") || params.get("gbraid") || params.get("wbraid") || med === "cpc" || med === "ppc") return "paid_search";
    if (src) return "other_campaign";
    if (refHost && SEARCH_HOSTS.test(refHost)) return "organic_search";
    if (refHost) return "referral_site";
    return "direct";
  }

  function captureAttribution() {
    var params;
    try { params = new URLSearchParams(location.search); } catch (e) { params = { get: function () { return null; } }; }
    var utm = {};
    var hasUtm = false;
    UTM_KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v) { utm[k] = clip(v, 100); hasUtm = true; }
    });
    var refHost = externalReferrerHost();
    var current = safeGet(sessionStorage, SESSION_KEY);
    // UTM付き・外部サイトから来た時は新しい流入として上書き。サイト内移動では維持
    if (hasUtm || refHost || !current) {
      current = {
        category: classify(utm, refHost, params),
        utm: utm,
        referrer: refHost,
        landing: location.pathname,
        ts: Date.now()
      };
      safeSet(sessionStorage, SESSION_KEY, current);
    }

    var first = safeGet(localStorage, FIRST_KEY);
    if (!first || (Date.now() - (first.ts || 0)) > FIRST_TTL_MS) {
      first = current;
      safeSet(localStorage, FIRST_KEY, first);
    }
    return { current: current, first: first };
  }

  var attribution = captureAttribution();

  window.progressAttribution = {
    get: function () { return attribution; },
    label: function (cat) { return CATEGORY_LABEL[cat] || cat || ""; }
  };

  /* ---------- 2. GA4 の読み込み（1回だけ） ---------- */

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  function sanitizedLocation() {
    // utm_* と広告ID以外のクエリは送らない（万一URLに個人情報が付いても送信しない）
    try {
      var u = new URL(location.href);
      var keep = new URLSearchParams();
      u.searchParams.forEach(function (v, k) {
        if (/^utm_/.test(k) || k === "gclid" || k === "gbraid" || k === "wbraid") keep.set(k, v);
      });
      var q = keep.toString();
      return u.origin + u.pathname + (q ? "?" + q : "");
    } catch (e) { return location.origin + location.pathname; }
  }

  var alreadyLoaded = window.__progressGa4Loaded ||
    !!document.querySelector('script[src*="googletagmanager.com/gtag/js?id=' + GA_ID + '"]');

  if (GA_ON && !alreadyLoaded) {
    window.__progressGa4Loaded = true;
    window.gtag = window.gtag || gtag;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", GA_ID, {
      page_location: sanitizedLocation(),
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    }); // page_view はこの config で自動送信（1ページ1回）
  }

  function track(name, params) {
    params = params || {};
    params.page_path = location.pathname;
    if (DEBUG) { try { console.info("[analytics]", name, params, GA_ON ? "" : "(GA4未設定のため送信なし)"); } catch (e) {} }
    if (GA_ON && window.__progressGa4Loaded) gtag("event", name, params);
  }
  window.progressTrack = track;

  /* ---------- 3. イベント計測 ---------- */

  function sectionOf(el) {
    if (el.closest(".sticky-cta")) return "sticky_cta";
    if (el.closest("header")) return "header";
    if (el.closest("footer")) return "footer";
    var sec = el.closest("section[id]");
    if (sec) return sec.id;
    var any = el.closest("section");
    if (any && any.className) return String(any.className).split(" ")[0];
    return "other";
  }

  // 電話・LINE（ボタンを後から設置しても自動で計測される）
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    var where = a.getAttribute("data-track-location") || sectionOf(a);
    if (/^tel:/i.test(href)) {
      track("click_phone", { link_location: where }); // 電話番号自体は送らない
      return;
    }
    var host = "";
    try { host = new URL(a.href, location.href).hostname; } catch (err) {}
    if (/(^|\.)(line\.me|lin\.ee)$/i.test(host)) {
      track("click_line", { link_location: where });
    }
  }, true);

  // フォーム入力開始（1ページにつき1回）。入力内容は送らない
  var formStarted = {};
  function onFormInput(e) {
    var form = e.target && e.target.form;
    if (!form || !form.hasAttribute("data-track-form")) return;
    if (e.target.type === "hidden" || e.target.name === "_gotcha") return;
    var id = form.getAttribute("data-track-form");
    if (formStarted[id]) return;
    formStarted[id] = true;
    track("form_start", { form_id: id });
  }
  document.addEventListener("input", onFormInput, true);
  document.addEventListener("change", onFormInput, true);

  // 問い合わせ完了（送信成功時に form.js が立てた印がある場合のみ、1回だけ）
  var LEAD_FLAG = "progress_lead_ok";
  if (document.documentElement.getAttribute("data-page") === "thanks") {
    var flag = safeGet(sessionStorage, LEAD_FLAG);
    try { sessionStorage.removeItem(LEAD_FLAG); } catch (e) {}
    if (flag && (Date.now() - (flag.ts || 0)) < 30 * 60 * 1000) {
      track("generate_lead", {
        form_id: "lead",
        facility_type: clip(flag.facility_type, 40),
        lead_source_category: clip(flag.lead_source_category, 40)
      });
    }
  }
})();
