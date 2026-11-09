/*
 * 問い合わせフォーム送信（Formspree）
 * ------------------------------------------------------------
 * - 送信先は site.config.json の formEndpoint（ビルド時に埋め込み）
 * - Formspree が「受付成功（HTTP 2xx かつ ok:true）」を返した時だけ完了画面へ移動
 *   → 完了画面で GA4 の generate_lead を1回だけ送信
 * - 失敗時はエラー表示し、入力内容は残したまま再送信できる（完了扱いにしない）
 * - 流入元（UTM・参照元）を隠し項目に入れ、通知メールで確認できるようにする
 */
(function () {
  "use strict";
  var form = document.getElementById("lead-form");
  if (!form) return;

  var CONFIG = window.PROGRESS_SITE_CONFIG || {};
  var ENDPOINT = String(CONFIG.formEndpoint || "").trim();
  var THANKS = form.getAttribute("data-thanks") || "thanks.html";

  var button = form.querySelector('button[type="submit"]');
  var errorBox = document.getElementById("lead-form-error");
  var buttonLabel = button ? button.textContent : "";

  function setHidden(name, value) {
    var el = form.querySelector('input[type="hidden"][name="' + name + '"]');
    if (el) el.value = value || "";
  }

  function fillAttribution() {
    var A = window.progressAttribution;
    if (!A) return;
    var a = A.get() || {};
    var cur = a.current || {};
    var first = a.first || {};
    var utm = cur.utm || {};
    setHidden("lead_source", A.label(cur.category));
    setHidden("utm_source", utm.utm_source);
    setHidden("utm_medium", utm.utm_medium);
    setHidden("utm_campaign", utm.utm_campaign);
    setHidden("utm_content", utm.utm_content);
    setHidden("utm_term", utm.utm_term);
    setHidden("referrer", cur.referrer);
    setHidden("landing_page", cur.landing);
    setHidden("first_lead_source", A.label(first.category));
    if (first.ts) {
      var d = new Date(first.ts);
      setHidden("first_visit", d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2));
    }
  }
  fillAttribution();

  function showError(msg) {
    if (!errorBox) { alert(msg); return; }
    errorBox.textContent = msg;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function resetButton() {
    if (button) { button.disabled = false; button.textContent = buttonLabel; }
  }

  form.addEventListener("submit", function (e) {
    if (!window.fetch || !window.FormData) return; // 古いブラウザは通常送信（Formspreeの画面へ）
    e.preventDefault();
    if (form.checkValidity && !form.checkValidity()) { form.reportValidity && form.reportValidity(); return; }
    if (!/^https:\/\//.test(ENDPOINT)) {
      showError("現在フォームを準備中のため送信できません。恐れ入りますが、時間をおいて再度お試しください。");
      return;
    }

    fillAttribution();
    if (errorBox) errorBox.hidden = true;
    if (button) { button.disabled = true; button.textContent = "送信中…"; }

    var facility = (form.elements.facility && form.elements.facility.value) || "";
    var A = window.progressAttribution;
    var cat = A && A.get() && A.get().current ? A.get().current.category : "";

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Accept": "application/json" },
      body: new FormData(form)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok || data.ok === false || data.errors) {
          var err = new Error("submit failed");
          err.status = res.status;
          throw err;
        }
        // 送信成功時のみ、完了画面で generate_lead を1回送るための印（個人情報は含めない）
        try {
          sessionStorage.setItem("progress_lead_ok", JSON.stringify({
            ts: Date.now(), facility_type: facility, lead_source_category: cat
          }));
        } catch (x) {}
        location.href = THANKS;
      });
    }).catch(function (err) {
      resetButton();
      if (err && err.status === 429) {
        showError("送信が混み合っています。1分ほどおいて、もう一度お試しください。入力内容は保持されています。");
      } else {
        showError("送信できませんでした。通信環境をご確認のうえ、もう一度お試しください。入力内容は保持されています。");
      }
    });
  });
})();
