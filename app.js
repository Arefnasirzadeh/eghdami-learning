/* EGHDAMI LEARNING: core, helpers, then one module per tab. Add a tab with App.tab({...}). */
(function () {
  "use strict";
  var C = window.CONTENT;
  var LEVELS = C.levels.map(function (l) { return l.id; });
  var FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
  function fa(n) { return String(n).replace(/\d/g, function (d) { return FA_DIGITS[d]; }); }
  function levelFa(id) { var l = C.levels.find(function (x) { return x.id === id; }); return l ? l.fa : id; }

  /* el("div.cls", {attr}, children...) — tiny DOM builder; strings become text nodes */
  function el(sel, attrs) {
    var p = sel.split("."), n = document.createElement(p[0] || "div");
    if (p.length > 1) n.className = p.slice(1).join(" ");
    var kids = Array.prototype.slice.call(arguments, 2);
    if (attrs && (typeof attrs !== "object" || attrs.nodeType || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    for (var k in attrs || {}) {
      var v = attrs[k];
      if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
      else if (k === "html") n.innerHTML = v;
      else if (v === true) n.setAttribute(k, "");
      else if (v !== false && v != null) n.setAttribute(k, v);
    }
    (function add(list) { list.forEach(function (c) { if (c == null || c === false) return; if (Array.isArray(c)) add(c); else n.appendChild(c.nodeType ? c : document.createTextNode(c)); }); })(kids);
    return n;
  }
  function en(text, tag) { return el((tag || "span") + ".x-en", { dir: "ltr", lang: "en" }, text); }

  /* ---------- state (memory only) ---------- */
  var state = { level: "A2", xp: 0, rate: 1, marks: {}, history: [] };
  var KIND = { story: "داستان", pod: "پادکست", gram: "گرامر", scen: "سناریو", gu: "دوره گرامر" };

  /* «جدید» for items whose optional added:"YYYY-MM-DD" is within the last 7 days */
  function isNew(x) { if (!x || !x.added) return false; var d = (Date.now() - Date.parse(x.added)) / 864e5; return d > -1 && d < 7; }
  function newBadge(x) { return isNew(x) ? el("span.chip.chip--solid", "جدید") : null; }
  /* history of completed items, newest first */
  function complete(key, title, kind) {
    var h = state.history, i = h.findIndex(function (x) { return x.key === key; });
    if (i > -1) h.splice(i, 1);
    h.unshift({ key: key, title: title, kind: kind, when: new Date() });
  }
  function isMarked(key) { var m = state.marks[key]; return !!(m && m.star); }
  /* ⭐ toggle + a short note, kept in memory */
  function markBar(key, title, kind) {
    var m = state.marks[key] || (state.marks[key] = { key: key, title: title, kind: kind, star: false, note: "" });
    var star = el("button.x-sec", { type: "button", onclick: function () {
      m.star = !m.star; draw(); toast(m.star ? "⭐ نشان شد" : "از نشان‌شده‌ها برداشته شد");
    } });
    function draw() { star.setAttribute("aria-pressed", String(m.star)); star.textContent = m.star ? "⭐ نشان‌شده" : "☆ نشان کردن"; }
    draw();
    var note = el("input.x-input", { type: "text", dir: "auto", maxlength: "140", placeholder: "یادداشت کوتاه برای خودت…", "aria-label": "یادداشت", autocomplete: "off",
      oninput: function () { m.note = note.value; } });
    note.value = m.note;
    return el("div.x-mark", star, note);
  }
  /* list-item heading: title, «جدید», ⭐, level */
  function itemHead(title, level, item, key) {
    return el("div.x-row.x-row--between",
      el("div.x-row", en(title, "strong"), newBadge(item), key && isMarked(key) ? el("span", { "aria-label": "نشان‌شده" }, "⭐") : null),
      el("span.pill.x-en", level));
  }
  function addXP(n, why) { state.xp += n; toast("+" + fa(n) + " XP" + (why ? " · " + why : "")); }
  var toastEl, toastT;
  function toast(msg) { toastEl.textContent = msg; clearTimeout(toastT); toastT = setTimeout(function () { toastEl.textContent = ""; }, 1800); }

  /* ---------- speak(text, rate) → Promise ---------- */
  var synth = window.speechSynthesis, voice = null, gbVoices = [];
  function pickVoice() {
    if (!synth) return;
    var vs = synth.getVoices().filter(function (v) { return /^en/i.test(v.lang); });
    var gb = vs.filter(function (v) { return /en[-_]GB/i.test(v.lang); });
    gbVoices = gb;
    voice = gb.find(function (v) { return /UK|British/i.test(v.name); }) || gb[0] ||
      vs.find(function (v) { return /UK|British/i.test(v.name); }) || vs[0] || null;
  }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }
  /* two podcast hosts: two different en-GB voices, else one voice at two pitches */
  function hostVoices() {
    pickVoice();
    if (gbVoices.length > 1) {
      var a = gbVoices.find(function (v) { return /Daniel|Arthur|George|Oliver|Ryan|Thomas|Male/i.test(v.name); }) || gbVoices[0];
      var b = gbVoices.find(function (v) { return v !== a && /Female|Serena|Kate|Libby|Sonia|Martha|Stephanie|Hazel|Susan/i.test(v.name); }) ||
        gbVoices.find(function (v) { return v !== a; });
      return [{ voice: a, pitch: 1 }, { voice: b, pitch: 1 }];
    }
    return [{ voice: voice, pitch: 0.9 }, { voice: voice, pitch: 1.15 }];
  }
  function speak(text, rate, opts) {
    return new Promise(function (resolve) {
      var r = (rate || 1) * state.rate;
      if (!synth || !window.SpeechSynthesisUtterance) { setTimeout(resolve, text.split(" ").length * 380 / r); return; }
      synth.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "en-GB"; u.rate = r;
      if (opts && opts.voice) u.voice = opts.voice; else if (voice) u.voice = voice;
      if (opts && opts.pitch) u.pitch = opts.pitch;
      var done = false, fin = function () { if (!done) { done = true; clearTimeout(t); resolve(); } };
      var t = setTimeout(fin, 2500 + text.length * 140 / r); // guard for engines that drop onend
      u.onend = fin; u.onerror = fin;
      synth.speak(u);
    });
  }
  function stopSpeak() { if (synth) synth.cancel(); }

  /* ---------- listen() → Promise<string> ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var micOK = !!SR;
  function listen() {
    return new Promise(function (resolve, reject) {
      if (!micOK) return reject(new Error("unavailable"));
      var r = new SR(), got = "";
      r.lang = "en-GB"; r.interimResults = false; r.maxAlternatives = 1;
      r.onresult = function (e) { got = e.results[0][0].transcript; };
      r.onerror = function (e) {
        if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") micOK = false;
        reject(new Error(e.error));
      };
      r.onend = function () { got ? resolve(got) : reject(new Error("no-speech")); };
      try { r.start(); } catch (err) { micOK = false; reject(err); }
    });
  }

  /* micInput(onText): big 🎤, or the typed fallback when there is no microphone */
  function micInput(onText) {
    var box = el("div.x-type");
    function typed(msg) {
      var inp = el("input", { type: "text", dir: "ltr", lang: "en", placeholder: "Type the sentence…", autocomplete: "off" });
      var go = function () { if (inp.value.trim()) onText(inp.value.trim()); };
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
      box.replaceChildren(el("p.x-muted", msg || "میکروفون در دسترس نیست؛ جمله رو تایپ کن"), inp, el("button.x-primary", { type: "button", onclick: go }, "بررسی"));
    }
    if (!micOK) { typed(); return box; }
    var hint = el("p.x-muted", { style: "text-align:center" }, "دکمه رو بزن و جمله رو بگو");
    var btn = el("button.x-mic", { type: "button", "aria-label": "ضبط صدا", onclick: function () {
      if (btn.classList.contains("is-live")) return;
      stopSpeak(); btn.classList.add("is-live"); hint.textContent = "دارم گوش می‌دم…";
      listen().then(function (t) { onText(t); }, function (e) {
        if (!micOK) return typed();
        hint.textContent = e.message === "no-speech" ? "چیزی نشنیدم؛ دوباره امتحان کن" : "خطا: " + e.message;
      }).then(function () { btn.classList.remove("is-live"); if (hint.textContent === "دارم گوش می‌دم…") hint.textContent = "دکمه رو بزن و جمله رو بگو"; });
    } }, "🎤");
    box.append(btn, hint);
    return box;
  }

  /* ---------- compare(target, said) → {words, accuracy} ---------- */
  function norm(s) {
    return s.toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9'\s-]/g, " ").replace(/-/g, " ")
      .split(/\s+/).map(function (w) { return w.replace(/^'+|'+$/g, ""); }).filter(Boolean);
  }
  function compare(target, said) {
    var a = norm(target), b = norm(said), n = a.length, m = b.length, i, j, d = [];
    for (i = 0; i <= n; i++) { d[i] = [i]; for (j = 1; j <= m; j++) d[i][j] = i ? 0 : j; }
    for (i = 1; i <= n; i++) for (j = 1; j <= m; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    var out = [], ok = 0;
    for (i = n, j = m; i > 0 || j > 0;) {
      if (i && j && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
        var same = a[i - 1] === b[j - 1]; if (same) ok++;
        out.unshift({ w: a[i - 1], t: same ? "ok" : "bad", heard: same ? "" : b[j - 1] }); i--; j--;
      } else if (i && d[i][j] === d[i - 1][j] + 1) { out.unshift({ w: a[i - 1], t: "miss", heard: "—" }); i--; }
      else { out.unshift({ w: b[j - 1], t: "extra" }); j--; }
    }
    return { words: out, accuracy: n ? Math.round(ok / n * 100) : 0 };
  }
  function diffView(res) {
    return el("div.x-diff", { dir: "ltr", lang: "en" }, res.words.map(function (x) {
      return el("span.x-w." + x.t, { title: { ok: "درست", bad: "اشتباه", miss: "جاافتاده", extra: "اضافه" }[x.t] }, x.w, x.heard ? el("small", x.heard) : null);
    }));
  }

  /* ---------- app shell and tabs ---------- */
  var tabs = [], current = null, screen, tabbar, titleEl, subEl;
  var App = {
    C: C, LEVELS: LEVELS, state: state, el: el, en: en, fa: fa, levelFa: levelFa,
    speak: speak, stopSpeak: stopSpeak, listen: listen, micInput: micInput, compare: compare, diffView: diffView,
    micOK: function () { return micOK; }, hostVoices: hostVoices,
    KIND: KIND, isNew: isNew, newBadge: newBadge, complete: complete, isMarked: isMarked, markBar: markBar, itemHead: itemHead,
    open: function (key) {
      var p = key.split(":");
      if (p[0] === "scen") App.go("talk", { scen: p.slice(1).join(":") });
      else if (p[0] === "gu" || p[0] === "gram") App.go("grammar", { open: key });
      else App.go("stories", { open: key });
    },
    addXP: addXP, toast: toast, tabs: function () { return tabs; },
    tab: function (t) { tabs.push(t); },
    go: function (id, arg) {
      var t = tabs.find(function (x) { return x.id === id; });
      if (!t || t.soon) return;
      stopSpeak(); if (current && current.leave) current.leave();
      current = t; titleEl.textContent = t.title || t.label; subEl.textContent = t.sub || t.blurb || "";
      document.getElementById("app").setAttribute("data-tab", id);
      screen.className = "x-screen"; screen.replaceChildren(); screen.scrollTop = 0; App.dock.replaceChildren();
      t.render(screen, arg);
      tabbar.querySelectorAll(".x-tab").forEach(function (b) { b.toggleAttribute("aria-current", b.dataset.id === id); if (b.dataset.id === id) b.setAttribute("aria-current", "page"); });
    },
    refresh: function () { if (current) App.go(current.id); }
  };
  window.App = App;

  function settingsSheet() {
    var val = el("span.x-en", fa(state.rate.toFixed(1)) + "×");
    var range = el("input", { type: "range", min: "0.6", max: "1.2", step: "0.1", value: String(state.rate), "aria-label": "سرعت صدا", dir: "ltr",
      oninput: function () { state.rate = parseFloat(range.value); val.textContent = fa(state.rate.toFixed(1)) + "×"; } });
    var sheet = el("div.x-sheet", { hidden: true, onclick: function (e) { if (e.target === sheet) sheet.hidden = true; } },
      el("div.x-sheet__body", { role: "dialog", "aria-label": "تنظیمات" },
        el("div.x-row.x-row--between", el("h2.x-h2", "تنظیمات"), el("button.x-icon", { type: "button", "aria-label": "بستن", onclick: function () { sheet.hidden = true; } }, "✕")),
        el("div.x-row.x-row--between", el("strong", "سرعت صدا"), val), range,
        el("p.x-muted", synth ? "صدا: " + (voice ? voice.name : "پیش‌فرض دستگاه") : "این مرورگر صدای خودکار نداره."),
        el("button.x-sec", { type: "button", onclick: function () { speak("Hello Aref, this is your English coach."); } }, "🔊 امتحان صدا")));
    return sheet;
  }

  App.start = function () {
    var root = document.getElementById("app");
    titleEl = el("h1"); subEl = el("p.x-top__sub");
    var sheet = settingsSheet();
    screen = el("main.x-screen", { id: "screen" });
    tabbar = el("nav.x-tabs", { "aria-label": "بخش‌ها" }, tabs.map(function (t) {
      return el("button.x-tab", { type: "button", "data-id": t.id, disabled: !!t.soon, onclick: function () { App.go(t.id); } },
        el("b", { "aria-hidden": "true" }, t.icon), el("span.x-tab__l", t.label), t.soon ? el("small", "به‌زودی") : null);
    }));
    toastEl = el("div.x-toast", { role: "status", "aria-live": "polite" });
    root.append(el("header.x-top", el("span.x-top__mark", { "aria-hidden": "true" }, "E"), el("div.x-top__t", titleEl, subEl), el("button.x-icon", { type: "button", "aria-label": "تنظیمات", onclick: function () { pickVoice(); sheet.replaceWith(sheet = settingsSheet()); sheet.hidden = false; } }, "⚙︎")),
      screen, App.dock = el("div"), tabbar, sheet, toastEl);
    App.go(tabs[0].id);
  };
})();

/* ---------- tab: home ---------- */
(function (A) {
  var el = A.el;
  function sayToggle(text, label) {
    var b = el("button.x-sec", { type: "button", "aria-pressed": "false", onclick: function () {
      b.setAttribute("aria-pressed", "true"); b.textContent = "🔊 در حال پخش…";
      A.speak(text).then(function () { b.setAttribute("aria-pressed", "false"); b.textContent = label; });
    } }, label);
    return b;
  }
  function idiomOfDay() {
    var I = A.C.idioms || [];
    if (!I.length) return null;
    var day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
    return I[day % I.length];
  }
  function hhmm(d) { return A.fa(String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0")); }

  /* photos live as <img> in index.html so they are inlined; Home clones them */
  function photo(id, alt) {
    var src = document.getElementById(id);
    if (!src) return null;
    var img = src.cloneNode(false); img.removeAttribute("id"); img.removeAttribute("hidden"); img.className = "x-photo__img"; img.alt = alt;
    return img;
  }
  /* PWA install: only when the browser offers it; silent everywhere else */
  var installEvt = null;
  try {
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault(); installEvt = e;
      document.querySelectorAll(".x-install").forEach(function (b) { b.hidden = false; });
    });
  } catch (e) { /* no install support */ }
  function installBtn() {
    var b = el("button.x-primary.x-install", { type: "button", hidden: !installEvt, onclick: function () {
      if (!installEvt) return;
      try { installEvt.prompt(); } catch (e) { /* ignore */ }
      installEvt = null; document.querySelectorAll(".x-install").forEach(function (x) { x.hidden = true; });
    } }, "📲 نصب اپ");
    return b;
  }
  var IG = "https://instagram.com/eghdam_academy";
  function contactBtns() {
    return el("div.x-contact__btns",
      el("a.x-ig", { href: IG, target: "_blank", rel: "noopener" }, el("span.x-ig__icon", { "aria-hidden": "true" }), A.en("@eghdam_academy")),
      el("a.x-tel", { href: "tel:+989112335658" }, el("span.x-tel__icon", { "aria-hidden": "true" }, "📞"), "تماس: ۰۹۱۱۲۳۳۵۶۵۸"));
  }

  A.tab({ id: "home", icon: "🏠", label: "خانه", title: "EGHDAMI LEARNING", sub: "انگلیسی بریتیش، هر روز یه قدم", render: function (s) {
    var st = A.state, w = A.wordOfDay ? A.wordOfDay() : null, idm = idiomOfDay();
    var marked = Object.keys(st.marks).map(function (k) { return st.marks[k]; }).filter(function (m) { return m.star || m.note.trim(); });
    var gp = A.gramProgress ? A.gramProgress() : null;
    s.append(
      el("section.x-hero",
        photo("x-ph-desk", "عارف پشت میز کارش"),
        el("div.x-hero__copy",
          el("p.x-hero__label.x-en", "EGHDAMI LEARNING"),
          el("p.x-hero__tag", "امروز یه قدم به انگلیسی بریتیش نزدیک‌تر"),
          el("div.x-hero__chips",
            el("span.x-badge", el("b.x-en", st.level), " " + A.levelFa(st.level)),
            el("span.x-xp", "⚡ " + A.fa(st.xp) + " XP")))),
      el("div.x-stats",
        el("div.x-stat", el("span.x-stat__i", { "aria-hidden": "true" }, "🎯"), el("b.x-en", st.level), el("small", "سطح")),
        el("div.x-stat", el("span.x-stat__i", { "aria-hidden": "true" }, "⚡"), el("b", A.fa(st.xp)), el("small", "XP")),
        gp ? el("div.x-stat", el("span.x-stat__i", { "aria-hidden": "true" }, "📐"), el("b", A.fa(gp.done) + "/" + A.fa(gp.total)), el("small", "گرامر")) : null),
      installBtn(),
      A.gramHomeCard ? A.gramHomeCard() : null,
      idm ? el("div.x-card.x-daycard",
        el("div.x-row.x-row--between", el("strong.x-cardh", "💬 اصطلاح روز"), el("span.pill", "انگلیسی بریتانیایی")),
        A.en(idm.en, "p.x-big"),
        el("p", idm.fa),
        A.en(idm.ex, "p.x-muted"),
        el("div.x-row", sayToggle(idm.en + ". " + idm.ex, "🔊 تلفظ و مثال"))) : null,
      w ? el("div.x-card.x-daycard",
        el("div.x-row.x-row--between", el("strong.x-cardh", "📅 واژه روز"), el("span.pill", "۵۰۴ واژه · درس " + A.fa(w.lesson))),
        el("div.x-row", A.en(w.w[0], "p.x-big"), el("span.pill.x-en", w.w[1])),
        el("p", w.w[2]),
        A.en(w.w[3], "p.x-muted"),
        el("div.x-row",
          el("button.x-sec", { type: "button", "aria-pressed": "false", onclick: function () {
            var b = this; b.setAttribute("aria-pressed", "true"); b.textContent = "🔊 در حال پخش…";
            A.speak(w.w[0] + ". " + w.w[3]).then(function () { b.setAttribute("aria-pressed", "false"); b.textContent = "🔊 تلفظ"; });
          } }, "🔊 تلفظ"),
          el("button.x-sec", { type: "button", onclick: function () { A.go("words504", { lesson: w.lesson }); } }, "رفتن به درس"))) : null,
      el("section.x-photo.x-photo--daily",
        photo("x-ph-reading", "عارف در حال خواندن"),
        el("div.x-photo__copy",
          el("p.x-photo__eyebrow", "تمرین ۱۰ دقیقه‌ای امروز"),
          el("h2.x-photo__title", "هر روز فقط ۱۰ دقیقه"),
          el("button.x-primary", { type: "button", onclick: function () { A.go("shadow"); } }, "▶ شروع تمرین امروز"))),
      el("h3.x-h3.x-sh", "🧭 بخش‌ها"),
      el("div.x-tiles.x-tiles--home", A.tabs().filter(function (t) { return t.id !== "home"; }).map(function (t) {
        return el("button.x-tile", { type: "button", disabled: !!t.soon, onclick: function () { A.go(t.id); } },
          el("b", { "aria-hidden": "true" }, t.icon), el("strong", t.label), el("span.x-muted", t.soon ? "به‌زودی" : t.blurb || ""));
      })),
      el("div.x-list", el("h3.x-h3", "⭐ نشان‌شده‌ها"),
        marked.length ? marked.map(function (m) {
          return el("button.x-item", { type: "button", onclick: function () { A.open(m.key); } },
            el("div.x-row.x-row--between", el("div.x-row", A.en(m.title, "strong"), m.star ? el("span", "⭐") : null), el("span.pill", A.KIND[m.kind])),
            m.note.trim() ? el("span.x-muted", { dir: "auto" }, "📝 " + m.note) : null);
        }) : el("p.x-muted", "هنوز چیزی نشان نکردی. روی ⭐ داستان، پادکست یا کارت گرامر بزن.")),
      el("div.x-list", el("h3.x-h3", "🕘 تاریخچه"),
        st.history.length ? st.history.slice(0, 10).map(function (h) {
          return el("button.x-item", { type: "button", onclick: function () { A.open(h.key); } },
            el("div.x-row.x-row--between", A.en(h.title, "strong"), el("span.pill", A.KIND[h.kind])),
            el("span.x-muted", "✓ تموم شد · ساعت " + hhmm(h.when)));
        }) : el("p.x-muted", "هنوز چیزی رو تموم نکردی. داستان، پادکست، گرامر یا سناریوهای تموم‌شده اینجا میان.")),
      el("section.x-photo.x-photo--class",
        photo("x-ph-class", "عارف در حال تدریس سر کلاس"),
        el("div.x-photo__copy",
          el("p.x-photo__eyebrow", "درباره مدرس"),
          el("h2.x-photo__title", "کلاس‌های اقدام آکادمی"),
          el("p.x-photo__text", "آموزش انگلیسی بریتیش با عارف اقدامی"))),
      el("section.x-contact",
        el("h3.x-h3", "✉️ ارتباط با ما"),
        el("p.x-muted", "برای کلاس‌ها و مشاوره، در اینستاگرام پیام بده یا تماس بگیر."),
        contactBtns()),
      el("footer.x-foot",
        contactBtns(),
        el("p.x-foot__brand", A.en("EGHDAMI LEARNING"), " · اقدام آکادمی")));
  } });
})(window.App);

/* ---------- tab: stories ---------- */
(function (A) {
  var el = A.el, C = A.C, filter = null, run = 0, section = "stories";
  var SECTIONS = [["stories", "داستان‌ها"], ["pod", "پادکست ۶ دقیقه‌ای"]];

  function header(s) {
    return el("div.x-seg", { role: "group", "aria-label": "بخش" }, SECTIONS.map(function (p) {
      return el("button", { type: "button", "aria-pressed": String(section === p[0]), onclick: function () {
        section = p[0]; run++; A.stopSpeak(); A.dock.replaceChildren(); list(s);
      } }, p[1]);
    }));
  }
  function backBtn(label, s) {
    return el("button.x-sec", { type: "button", style: "justify-self:start", onclick: function () { run++; A.stopSpeak(); A.dock.replaceChildren(); list(s); } }, label);
  }

  function list(s) {
    if (section === "pod") return podList(s);
    if (!filter) filter = A.state.level;
    var items = el("div.x-list");
    function draw() {
      var arr = C.stories.filter(function (x) { return filter === "all" || x.level === filter; });
      items.replaceChildren.apply(items, arr.length ? arr.map(function (x) {
        return el("button.x-item", { type: "button", onclick: function () { reader(s, x); } },
          A.itemHead(x.title, x.level, x, "story:" + x.id),
          el("span.x-muted", x.fa + " · " + A.fa(x.s.length) + " جمله"));
      }) : [el("p.x-muted", "برای این سطح هنوز داستانی نیست. سطح دیگه‌ای رو انتخاب کن.")]);
      seg.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.v === filter); });
    }
    var seg = el("div.x-seg", { role: "group", "aria-label": "فیلتر سطح" }, [["all", "همه"]].concat(A.LEVELS.map(function (l) { return [l, l]; })).map(function (p) {
      return el("button", { type: "button", "data-v": p[0], onclick: function () { filter = p[0]; draw(); } }, p[1]);
    }));
    s.replaceChildren(header(s), el("p.x-muted", "سطح:"), seg, items);
    s.scrollTop = 0;
    draw();
  }

  /* shared 3-question quiz */
  function mcq(qs, onEnd) {
    var wrap = el("div.x-list"), answered = 0, right = 0, score = el("p.x-muted", { "aria-live": "polite" });
    qs.forEach(function (q) {
      var fb = el("p.x-muted");
      var opts = q[1].map(function (o, k) {
        return el("button.x-opt", { type: "button", dir: "ltr", lang: "en", onclick: function () {
          opts.forEach(function (b) { b.disabled = true; });
          opts[q[2]].classList.add("is-ok");
          if (k === q[2]) { right++; fb.textContent = "✅ درسته!"; A.addXP(10, "جواب درست"); }
          else { this.classList.add("is-bad"); fb.textContent = "❌ جواب درست: " + q[1][q[2]]; }
          if (++answered === qs.length) { score.textContent = "نتیجه: " + A.fa(right) + " از " + A.fa(qs.length); if (onEnd) onEnd(right); }
        } }, o);
      });
      wrap.append(el("div.x-q", A.en(q[0], "strong"), opts, fb));
    });
    wrap.append(score);
    return wrap;
  }

  /* ----- 6 Minute podcast ----- */
  function podList(s) {
    var eps = C.podcasts || [];
    s.replaceChildren(header(s),
      el("p.x-muted", "دو مجری، شش دقیقه، چند واژه کاربردی. اول قسمت یه سؤال می‌پرسن و آخرش جوابش رو می‌گن."),
      el("div.x-list", eps.length ? eps.map(function (ep) {
        return el("button.x-item", { type: "button", onclick: function () { podcast(s, ep); } },
          A.itemHead(ep.title, ep.level, ep, "pod:" + ep.id),
          el("span.x-muted", ep.fa + " · " + A.fa(ep.vocab.length) + " واژه"));
      }) : el("p.x-muted", "هنوز قسمتی نیست.")));
    s.scrollTop = 0;
  }

  function podcast(s, ep) {
    var key = "pod:" + ep.id, idx = 0, playing = false, hide = false, guess = null, revealed = false, quizShown = false;
    var hosts = A.hostVoices(), hostIdx = {};
    Object.keys(ep.hosts).forEach(function (k, i) { hostIdx[k] = i % 2; });
    run++;
    var sub = el("div.x-sub.x-en", { dir: "ltr", lang: "en", "aria-live": "polite" });
    A.dock.replaceChildren(sub);
    var rows = ep.lines.map(function (L, i) {
      return el("button.x-sent", { type: "button", dir: "ltr", onclick: function () { stop(); mark(i); say(i); } },
        el("span.x-who.x-en", ep.hosts[L[0]]), A.en(L[1]));
    });
    var sents = el("div.x-sents", rows);
    var playBtn = el("button.x-primary", { type: "button", onclick: function () { playing ? stop() : play(); } }, "▶ پخش");
    var hideBtn = el("button.x-sec", { type: "button", "aria-pressed": "false", onclick: function () {
      hide = !hide; hideBtn.setAttribute("aria-pressed", String(hide)); sents.classList.toggle("x-hide", hide);
      sub.textContent = hide || !rows.some(function (r) { return r.classList.contains("is-on"); }) ? "" : line(idx);
    } }, "مخفی کردن متن");
    function line(i) { return ep.hosts[ep.lines[i][0]] + ": " + ep.lines[i][1]; }
    function mark(i) {
      idx = i; rows.forEach(function (r, k) { r.classList.toggle("is-on", k === i); });
      sub.textContent = hide ? "" : line(i);
      rows[i].scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    function say(i) { var t = run; return A.speak(ep.lines[i][1], 1, hosts[hostIdx[ep.lines[i][0]]]).then(function () { return t === run; }); }
    function stop() { playing = false; run++; A.stopSpeak(); playBtn.textContent = "▶ ادامه"; }
    function play() {
      playing = true; playBtn.textContent = "⏸ توقف";
      var t = ++run;
      (function step() {
        if (t !== run || !playing) return;
        if (idx >= ep.lines.length) { playing = false; playBtn.textContent = "↺ از اول"; idx = 0; reveal(); quiz(); return; }
        mark(idx);
        say(idx).then(function (ok) { if (ok && t === run) { idx++; step(); } });
      })();
    }

    /* opening question, answered at the end */
    var askFb = el("p.x-muted", { "aria-live": "polite" }, "حدست رو بزن؛ جواب آخر قسمت میاد.");
    var askOpts = ep.ask.o.map(function (o, k) {
      return el("button.x-opt", { type: "button", dir: "ltr", lang: "en", onclick: function () {
        if (revealed) return;
        guess = k; askOpts.forEach(function (b, j) { b.classList.toggle("is-pick", j === k); });
        askFb.textContent = "حدست ثبت شد؛ تا آخر گوش بده.";
      } }, String.fromCharCode(97 + k) + ") " + o);
    });
    function reveal() {
      if (revealed) return;
      revealed = true;
      askOpts.forEach(function (b) { b.disabled = true; b.classList.remove("is-pick"); });
      askOpts[ep.ask.a].classList.add("is-ok");
      if (guess === null) askFb.textContent = "جواب: " + ep.ask.o[ep.ask.a];
      else if (guess === ep.ask.a) { askFb.textContent = "✅ حدست درست بود!"; A.addXP(5, "حدس درست"); }
      else { askOpts[guess].classList.add("is-bad"); askFb.textContent = "❌ جواب درست: " + ep.ask.o[ep.ask.a]; }
    }

    var quizBox = el("div.x-list");
    function quiz() {
      reveal();
      if (quizShown) { quizBox.scrollIntoView({ behavior: "smooth" }); return; }
      quizShown = true; A.addXP(20, "پادکست تموم شد"); A.complete(key, ep.title, "pod");
      quizBox.append(el("h3.x-h3", "آزمون این قسمت"), mcq(ep.q));
      quizBox.firstChild.scrollIntoView({ behavior: "smooth" });
    }

    s.replaceChildren(
      backBtn("→ همه قسمت‌ها", s),
      el("div", A.en(ep.title, "h2.x-h2"), el("p.x-muted", ep.fa + " · سطح " + ep.level + " · " + Object.keys(ep.hosts).map(function (k) { return ep.hosts[k]; }).join(" و "))),
      A.markBar(key, ep.title, "pod"),
      el("div.x-q", el("strong", "❓ سؤال این قسمت"), A.en(ep.ask.q, "p"), askOpts, askFb),
      el("div.x-row", playBtn, hideBtn),
      sents,
      el("div.x-list", el("h3.x-h3", "لغت‌های این قسمت"), ep.vocab.map(function (v) {
        return el("div.x-word",
          el("div.x-row.x-row--between", A.en(v[0], "strong"), el("button.x-icon", { type: "button", "aria-label": "پخش " + v[0], onclick: function () { A.speak(v[0]); } }, "🔊")),
          el("span", v[1]));
      })),
      el("button.x-sec", { type: "button", style: "justify-self:start", onclick: function () { stop(); quiz(); } }, "رفتن به آزمون و جواب سؤال"),
      quizBox);
    s.scrollTop = 0;
  }

  /* ----- extra grammar cards (shown inside the grammar course as «درس‌های اضافه») ----- */
  A.gramCard = function (s, g, onBack) {
    var key = "gram:" + g.id;
    run++; A.dock.replaceChildren();
    s.replaceChildren(
      el("button.x-sec", { type: "button", style: "justify-self:start", onclick: function () { A.stopSpeak(); onBack(); } }, "→ درس‌های اضافه"),
      el("div", A.en(g.title, "h2.x-h2"), el("p.x-muted", g.fa + " · سطح " + g.level)),
      A.markBar(key, g.title, "gram"),
      el("div.x-card", g.explain.map(function (p) { return el("p", p); })),
      el("div.x-list", el("h3.x-h3", "مثال‌ها"), g.ex.map(function (e) {
        return el("div.x-word",
          el("div.x-row.x-row--between", A.en(e[0], "strong"), el("button.x-icon", { type: "button", "aria-label": "پخش مثال", onclick: function () { A.speak(e[0]); } }, "🔊")),
          el("span.x-muted", e[1]));
      })),
      el("div.x-list", el("h3.x-h3", "آزمون"), mcq(g.q, function () { A.complete(key, g.title, "gram"); A.addXP(15, "گرامر تموم شد"); })));
    s.scrollTop = 0;
  };

  function reader(s, story) {
    var my = ++run, idx = 0, playing = false, showFa = false, hide = false, quizShown = false;
    var sub = el("div.x-sub.x-en", { dir: "ltr", lang: "en", "aria-live": "polite" });
    A.dock.replaceChildren(sub);
    var rows = story.s.map(function (p, i) {
      return el("button.x-sent", { type: "button", dir: "ltr", onclick: function () { stop(); mark(i); say(i); } },
        A.en(p[0]), el("span.x-fa", { dir: "rtl", lang: "fa", hidden: true }, p[1]));
    });
    var sents = el("div.x-sents", rows);
    var playBtn = el("button.x-primary", { type: "button", onclick: function () { playing ? stop() : play(); } }, "▶ پخش");
    function toggle(label, fn) {
      var b = el("button.x-sec", { type: "button", "aria-pressed": "false", onclick: function () { var on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", on); fn(on); } }, label);
      return b;
    }
    var quizBox = el("div.x-list");
    function mark(i) {
      idx = i; rows.forEach(function (r, k) { r.classList.toggle("is-on", k === i); });
      sub.textContent = hide ? "" : story.s[i][0];
      rows[i].scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    function say(i) { var t = run; return A.speak(story.s[i][0]).then(function () { return t === run; }); }
    function stop() { playing = false; run++; A.stopSpeak(); playBtn.textContent = "▶ ادامه"; }
    function play() {
      playing = true; playBtn.textContent = "⏸ توقف";
      var t = ++run;
      (function step() {
        if (t !== run || !playing) return;
        if (idx >= story.s.length) { playing = false; playBtn.textContent = "↺ از اول"; idx = 0; quiz(); return; }
        mark(idx);
        say(idx).then(function (ok) { if (ok && t === run) { idx++; step(); } });
      })();
    }
    s.replaceChildren(
      el("button.x-sec", { type: "button", style: "justify-self:start", onclick: function () { stop(); A.dock.replaceChildren(); list(s); } }, "→ همه داستان‌ها"),
      el("div", A.en(story.title, "h2.x-h2"), el("p.x-muted", story.fa + " · سطح " + story.level)),
      A.markBar("story:" + story.id, story.title, "story"),
      el("div.x-row", playBtn,
        toggle("ترجمه فارسی", function (on) { showFa = on; rows.forEach(function (r) { r.lastChild.hidden = !on; }); }),
        toggle("مخفی کردن متن", function (on) { hide = on; sents.classList.toggle("x-hide", on); sub.textContent = on || !rows.some(function (r) { return r.classList.contains("is-on"); }) ? "" : story.s[idx][0]; })),
      sents,
      el("button.x-sec", { type: "button", style: "justify-self:start", onclick: function () { quiz(); } }, "رفتن به آزمون"),
      quizBox);
    s.scrollTop = 0;

    function quiz() {
      if (quizShown) { quizBox.scrollIntoView({ behavior: "smooth" }); return; }
      quizShown = true; A.addXP(20, "داستان تموم شد"); A.complete("story:" + story.id, story.title, "story");
      var answered = 0, right = 0, score = el("p.x-muted");
      quizBox.append(el("h3", { style: "font: var(--type-heading)" }, "آزمون درک مطلب"));
      story.q.forEach(function (q) {
        var fb = el("p.x-muted");
        var opts = q[1].map(function (o, k) {
          return el("button.x-opt", { type: "button", dir: "ltr", lang: "en", onclick: function () {
            opts.forEach(function (b) { b.disabled = true; });
            opts[q[2]].classList.add("is-ok");
            if (k === q[2]) { right++; fb.textContent = "✅ درسته!"; A.addXP(10, "جواب درست"); }
            else { this.classList.add("is-bad"); fb.textContent = "❌ جواب درست: " + q[1][q[2]]; }
            if (++answered === story.q.length) score.textContent = "نتیجه: " + A.fa(right) + " از " + A.fa(story.q.length);
          } }, o);
        });
        quizBox.append(el("div.x-q", A.en(q[0], "strong"), opts, fb));
      });
      quizBox.append(score, el("button.x-primary", { type: "button", style: "justify-self:start", onclick: function () {
        stop(); A.go("shadow", { title: story.title, list: story.s.map(function (p) { return p[0]; }) });
      } }, "🎧 شادویینگ این داستان"));
      quizBox.firstChild.scrollIntoView({ behavior: "smooth" });
    }
  }

  A.tab({ id: "stories", icon: "📖", label: "داستان‌ها", blurb: "داستان و پادکست", render: function (s, arg) {
    var p = arg && arg.open ? arg.open.split(":") : null, id = p && p.slice(1).join(":");
    var find = function (arr) { return (arr || []).find(function (x) { return x.id === id; }); };
    var it;
    if (p && p[0] === "story" && (it = find(C.stories))) { section = "stories"; reader(s, it); }
    else if (p && p[0] === "pod" && (it = find(C.podcasts))) { section = "pod"; podcast(s, it); }
    else list(s);
  }, leave: function () { run++; } });
})(window.App);

/* ---------- tab: grammar course ---------- */
(function (A) {
  var el = A.el, C = A.C, G = C.gcourse || { units: [], table12: [], final: [] }, U = G.units, st = A.state;
  st.gprog = st.gprog || {}; st.gmist = st.gmist || [];
  var LEVELS = ["A1", "A2", "B1", "B2", "C1"];
  var TYPE = { c: "گزینه درست رو انتخاب کن", g: "جای خالی رو بنویس", x: "اشتباه رو پیدا کن و درستش کن", o: "کلمه‌ها رو به ترتیب درست بچین" };

  function prog(id) { return st.gprog[id] || (st.gprog[id] = { seen: false, best: null, passed: false }); }
  function unitById(id) { return U.find(function (u) { return u.id === id; }); }
  function nextUnit() { return U.find(function (u) { return !prog(u.id).passed; }) || null; }
  function doneCount() { return U.filter(function (u) { return prog(u.id).passed; }).length; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function addMistake(uid, raw) { if (!st.gmist.some(function (m) { return m.raw === raw; })) st.gmist.push({ u: uid, raw: raw }); }

  /* ----- answer checking: case, punctuation and contractions don't matter ----- */
  var CONTR = [[/\bwon't\b/g, "will not"], [/\bshan't\b/g, "shall not"], [/\bcan't\b/g, "can not"], [/\bcannot\b/g, "can not"],
    [/n't\b/g, " not"], [/\bwont\b/g, "will not"], [/\bcant\b/g, "can not"],
    [/\b(is|are|was|were|has|have|had|do|does|did|could|would|should|must|need)nt\b/g, "$1 not"], [/'m\b/g, " am"], [/'re\b/g, " are"], [/'ve\b/g, " have"], [/'ll\b/g, " will"]];
  function variants(s) {
    var b = " " + String(s).toLowerCase().replace(/[’‘`]/g, "'") + " ", out = [];
    CONTR.forEach(function (c) { b = b.replace(c[0], c[1]); });
    [" is", " has", "s"].forEach(function (S) { [" would", " had"].forEach(function (D) {
      out.push(b.replace(/'s\b/g, S).replace(/'d\b/g, D).replace(/[^a-z0-9' ]+/g, " ").replace(/'/g, "").replace(/\s+/g, " ").trim());
    }); });
    return out;
  }
  function matches(input, answers) {
    var v = variants(input);
    return answers.split("|").some(function (a) { return variants(a).some(function (x) { return v.indexOf(x) > -1; }); });
  }
  /* the full sentence for 🔊: blanks filled, (hints) removed; two blanks take the first word, then the rest */
  function fill(q, ans) {
    var n = q.split("___").length - 1, w = ans.split(" ");
    if (n > 1) q = q.replace("___", w.shift()).replace("___", w.join(" "));
    else q = q.replace("___", ans);
    q = q.replace(/\s*\([^)]*\)/g, "").replace(/\s+([.,?!])/g, "$1").trim();
    return q.charAt(0).toUpperCase() + q.slice(1);
  }
  function sayText(t) { return String(t).split("→").pop().replace(/"/g, "").trim(); }

  /* one practice / test item with instant feedback; onResult(ok) fires once */
  function item(raw, onResult, tag) {
    var t = raw[0], why = raw[raw.length - 1], done = false;
    var fb = el("div.x-fb", { "aria-live": "polite", hidden: true });
    var box = el("div.x-q", el("div.x-row.x-row--between", el("span.x-muted", TYPE[t]), tag ? el("span.pill.x-en", tag) : null));
    function finish(ok, correct, say) {
      if (done) return; done = true;
      fb.hidden = false; fb.className = "x-fb " + (ok ? "is-ok" : "is-bad");
      put(fb,
        el("strong", ok ? "✅ درسته!" : "❌ نه کاملاً"),
        ok ? null : el("p", "جواب درست: ", A.en(correct, "b")),
        el("p", why),
        say ? el("button.x-icon", { type: "button", "aria-label": "پخش جمله درست", onclick: function () { A.speak(say); } }, "🔊") : null);
      if (ok) A.addXP(5, "جواب درست");
      if (onResult) onResult(ok);
    }
    if (t === "c") {
      var say = fill(raw[1], raw[2][raw[3]]);
      var opts = raw[2].map(function (o, k) {
        return el("button.x-opt", { type: "button", dir: "ltr", lang: "en", onclick: function () {
          opts.forEach(function (b) { b.disabled = true; });
          opts[raw[3]].classList.add("is-ok");
          if (k !== raw[3]) this.classList.add("is-bad");
          finish(k === raw[3], raw[2][raw[3]], say);
        } }, o);
      });
      box.append(A.en(raw[1], "p.x-gq"), el("div.x-list", opts));
    } else if (t === "g" || t === "x") {
      var ans = raw[2], first = ans.split("|")[0], say2 = t === "g" ? fill(raw[1], first) : first;
      var inp = el("input.x-input", { type: "text", dir: "ltr", lang: "en", autocomplete: "off", autocapitalize: "off", spellcheck: "false", "aria-label": TYPE[t] });
      if (t === "x") inp.value = raw[1];
      var go = el("button.x-sec", { type: "button" }, "بررسی");
      var check = function () { if (done || !inp.value.trim()) return; inp.disabled = true; go.disabled = true; finish(matches(inp.value, ans), first, say2); };
      go.onclick = check;
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") check(); });
      box.append(t === "x" ? el("p.x-gq", A.en(raw[1], "s")) : A.en(raw[1], "p.x-gq"));
      if (t === "g" && raw[1].split("___").length > 2) box.append(el("span.x-muted", "هر دو جای خالی رو پشت سر هم بنویس"));
      box.append(el("div.x-askrow", inp, go));
    } else {
      var target = raw[1].split("|")[0], end = (target.match(/[.?!]$/) || [""])[0];
      var words = target.replace(/[.?!]$/, "").split(" "), order = shuffle(words.map(function (w, i) { return i; }));
      if (words.length > 1 && order.every(function (v, i) { return v === i; })) order.push(order.shift());
      var built = [], line = el("div.x-build", { dir: "ltr", lang: "en" }), bank = el("div.x-bank", { dir: "ltr", lang: "en" });
      var okBtn = el("button.x-sec", { type: "button", disabled: true }, "بررسی");
      var clr = el("button.x-sec", { type: "button", onclick: function () { if (!done) { built = []; draw(); } } }, "↺ پاک کن");
      var draw = function () {
        line.replaceChildren.apply(line, built.length ? built.map(function (wi, k) {
          return el("button.x-wtile", { type: "button", disabled: done, onclick: function () { built.splice(k, 1); draw(); } }, words[wi]);
        }) : [el("span.x-muted", { dir: "rtl" }, "روی کلمه‌ها به ترتیب بزن…")]);
        bank.replaceChildren.apply(bank, order.map(function (wi) {
          var used = built.indexOf(wi) > -1;
          return el("button.x-wtile" + (used ? ".is-used" : ""), { type: "button", disabled: used || done, "aria-hidden": used ? "true" : null,
            onclick: function () { built.push(wi); draw(); } }, words[wi]);
        }));
        okBtn.disabled = done || built.length !== words.length;
      };
      okBtn.onclick = function () {
        var said = built.map(function (wi) { return words[wi]; }).join(" ") + end;
        clr.disabled = true; okBtn.disabled = true;
        finish(matches(said, raw[1]), target, target);
        draw();
      };
      draw();
      box.append(line, bank, el("div.x-row", okBtn, clr));
    }
    box.append(fb);
    return box;
  }

  /* ----- explanation parts ----- */
  function timeline(tl) {
    if (!tl) return null;
    var track = el("div.x-tl__track", el("i.x-tl__now"));
    tl.m.forEach(function (m) {
      var t = m[0], lab = function (x) { return x ? el("span", x) : null; };
      if (t === "p" || t === "x") track.append(el("i.x-tl__pt" + (t === "x" ? ".is-ref" : ""), { style: "left:" + m[1] + "%" }, lab(m[2])));
      else if (t === "s" || t === "c") track.append(el("i.x-tl__span" + (t === "c" ? ".is-cont" : ""), { style: "left:" + m[1] + "%;width:" + (m[2] - m[1]) + "%" }, lab(m[3])));
      else if (t === "m") {
        for (var k = m[1]; k <= m[2]; k += 9) track.append(el("i.x-tl__pt.is-sm", { style: "left:" + k + "%" }));
        track.append(el("i.x-tl__lab", { style: "left:" + ((m[1] + m[2]) / 2) + "%" }, lab(m[3])));
      }
    });
    return el("figure.x-tl", { role: "img", "aria-label": "نمودار زمانی: " + tl.cap },
      el("div.x-tl__axis", { dir: "ltr" }, track),
      el("div.x-tl__ends", { dir: "ltr" }, el("span", "گذشته"), el("span", "حالا"), el("span", "آینده")),
      el("figcaption.x-muted", tl.cap));
  }
  function gtable(tb) {
    return el("div.table-wrap", el("table", { dir: "ltr" },
      tb.cap ? el("caption", { dir: "rtl" }, tb.cap) : null,
      el("thead", el("tr", tb.h.map(function (h) { return el("th", { scope: "col" }, h); }))),
      el("tbody", tb.r.map(function (r) {
        return el("tr", el("th", { scope: "row" }, r[0]), r.slice(1).map(function (c, i) { return el("td", { "data-label": tb.h[i + 1], dir: "auto" }, c); }));
      }))));
  }
  function explain(u) {
    var forms = typeof u.form[0] === "string" ? u.form.map(function (f, k) { return [["+ مثبت", "− منفی", "? سؤالی"][k], f]; }) : u.form;
    return el("div.x-panels",
      panel("🕰️", "نمودار زمانی", timeline(u.tl)),
      panel("💡", "کی به کار می‌ره", el("div.x-fa-box", u.when.map(function (p) { return el("p", { dir: "auto" }, p); }))),
      panel("🧩", "ساختار", el("div.x-forms", forms.map(function (f) { return el("div.x-form", el("b", f[0]), A.en(f[1])); }))),
      u.sig && u.sig.length ? panel("🔎", "کلمه‌های نشانه", el("div.x-row", u.sig.map(function (w) { return el("span.pill.x-en", w); }))) : null,
      u.tbl ? panel("📊", "جدول", gtable(u.tbl)) : null,
      panel("⚠️", "اشتباه‌های رایج فارسی‌زبان‌ها", u.err.map(function (e) {
        return el("div.x-mist", el("p", el("span.x-no", { "aria-label": "غلط" }, "✗ "), A.en(e[0], "s")),
          el("p", el("span.x-yes", { "aria-label": "درست" }, "✓ "), A.en(e[1], "b")), el("p.x-muted", e[2]));
      })));
  }
  function panel(icon, title) {
    return el("section.x-panel", el("h4.x-panel__h", el("span.x-panel__i", { "aria-hidden": "true" }, icon), title), Array.prototype.slice.call(arguments, 2));
  }
  function block(icon, title) {
    return el("section.x-block", el("h3.x-h3.x-block__h", el("span.x-panel__i", { "aria-hidden": "true" }, icon), title), Array.prototype.slice.call(arguments, 2));
  }
  function exRow(e) {
    return el("div.x-word",
      el("div.x-row.x-row--between", A.en(e[0], "strong"), el("button.x-icon", { type: "button", "aria-label": "پخش مثال", onclick: function () { A.speak(sayText(e[0])); } }, "🔊")),
      el("span.x-muted", e[1]));
  }
  function back(label, fn) { return el("button.x-sec", { type: "button", style: "justify-self:start", onclick: function () { A.stopSpeak(); fn(); } }, label); }
  /* replaceChildren that flattens arrays and skips null parts */
  function put(s) {
    var kids = [];
    (function add(list) { list.forEach(function (c) { if (c == null || c === false) return; if (Array.isArray(c)) add(c); else kids.push(c); }); })(Array.prototype.slice.call(arguments, 1));
    s.replaceChildren.apply(s, kids);
  }

  /* ----- course home ----- */
  function home(s) {
    var nx = nextUnit(), done = doneCount();
    function tile(icon, title, sub, fn) {
      return el("button.x-tile", { type: "button", onclick: fn }, el("b", { "aria-hidden": "true" }, icon), el("strong", title), el("span.x-muted", sub));
    }
    put(s,
      el("div", el("h2.x-h2", "دوره گرامر"),
        el("p.x-muted", A.fa(U.length) + " واحد به ترتیب CEFR، انگلیسی بریتانیایی با توضیح فارسی. همه واحدها بازن؛ مسیر پیشنهادی از بالا به پایینه.")),
      el("div.x-card",
        el("div.x-row.x-row--between", el("strong", "پیشرفت"), el("span.x-muted", A.fa(done) + " از " + A.fa(U.length) + " واحد قبول")),
        el("div.x-bar", el("i", { style: "width:" + (done / (U.length || 1) * 100) + "%" })),
        nx ? el("div.x-list", el("span.x-muted", "پیشنهاد بعدی · " + nx.level), A.en(nx.en, "p.x-big"), el("p.x-muted", nx.fa),
          el("button.x-primary", { type: "button", style: "justify-self:start", onclick: function () { unitPage(s, nx); } }, done ? "ادامه مسیر" : "شروع از واحد اول"))
          : el("p", "🎉 همه واحدها رو قبول شدی. حالا آزمون جامع رو امتحان کن.")),
      el("div.x-tiles",
        tile("📋", "جدول ۱۲ زمان", "همه زمان‌ها در یک نگاه", function () { table12(s); }),
        tile("🏁", "آزمون جامع زمان‌ها", A.fa(G.final.length) + " سؤال با تحلیل", function () { finalTest(s); }),
        tile("🔁", "مرور اشتباه‌ها", st.gmist.length ? A.fa(st.gmist.length) + " مورد" : "خالی", function () { review(s); }),
        tile("➕", "درس‌های اضافه", A.fa((C.grammar || []).length) + " کارت گرامر", function () { extras(s); })),
      LEVELS.map(function (lv) {
        var list = U.filter(function (u) { return u.level === lv; });
        if (!list.length) return null;
        return el("div.x-list", el("h3.x-h3", A.en(lv), " · ", A.levelFa(lv)), list.map(function (u) {
          var p = prog(u.id), n = U.indexOf(u) + 1;
          return el("button.x-item.x-unit" + (p.passed ? ".is-done" : ""), { type: "button", onclick: function () { unitPage(s, u); } },
            el("div.x-row.x-row--between",
              el("div.x-row", el("span.x-tick", { "aria-label": p.passed ? "قبول شده" : "واحد " + A.fa(n) }, p.passed ? "✓" : A.fa(n)), A.en(u.en, "strong"),
                A.isMarked("gu:" + u.id) ? el("span", { "aria-label": "نشان‌شده" }, "⭐") : null),
              u === nx ? el("span.chip.chip--solid", "پیشنهاد بعدی") : p.best != null ? el("span.pill", A.fa(p.best) + "٪") : null),
            el("span.x-muted", u.fa));
        }));
      }));
    s.scrollTop = 0;
  }

  /* ----- one unit: explanation, examples, practice, test ----- */
  function unitPage(s, u) {
    var p = prog(u.id), i = U.indexOf(u), next = U[i + 1];
    p.seen = true; A.stopSpeak(); A.dock.replaceChildren();
    var answered = 0, right = 0, prScore = el("p.x-muted", { "aria-live": "polite" });
    put(s,
      back("→ دوره گرامر", function () { home(s); }),
      el("div", el("div.x-row", el("span.pill.x-en", u.level), el("span.x-muted", "واحد " + A.fa(i + 1) + " از " + A.fa(U.length)), p.passed ? el("span.chip", "✓ قبول") : null),
        A.en(u.en, "h2.x-h2"), el("p.x-muted", u.fa)),
      A.markBar("gu:" + u.id, u.en, "gu"),
      block("📘", "۱ · توضیح", explain(u)),
      block("🗣️", "۲ · مثال‌ها",
      el("div.x-list", u.ex.map(exRow)),
      el("button.x-sec", { type: "button", style: "justify-self:start", onclick: function () {
        A.go("shadow", { title: u.en, list: u.ex.map(function (e) { return sayText(e[0]); }) });
      } }, "🎧 شادویینگ این مثال‌ها")),
      block("✍️", "۳ · تمرین",
      el("div.x-list", u.p.map(function (raw) {
        return item(raw, function (ok) {
          answered++; if (ok) right++;
          if (answered === u.p.length) prScore.textContent = "نتیجه تمرین: " + A.fa(right) + " از " + A.fa(u.p.length) + (right < u.p.length ? " · توضیح‌ها رو یه بار دیگه بخون، بعد برو سراغ آزمون." : " · عالی! آماده آزمونی.");
        });
      })),
      prScore),
      block("🏁", "۴ · آزمون واحد",
        el("p", A.fa(u.t.length) + " سؤال. قبولی با ۷۰٪ و ‎+۲۵ XP؛ جواب‌های غلط به «مرور اشتباه‌ها» اضافه می‌شن."),
        p.best != null ? el("p.x-muted", "بهترین نتیجه‌ات: " + A.fa(p.best) + "٪") : null,
        el("button.x-primary", { type: "button", style: "justify-self:start", onclick: function () { unitTest(s, u); } }, p.best != null ? "↺ آزمون دوباره" : "شروع آزمون واحد")),
      next ? el("button.x-sec", { type: "button", style: "justify-self:end", onclick: function () { unitPage(s, next); } }, "واحد بعدی: ", A.en(next.en), " ←") : null);
    s.scrollTop = 0;
  }

  /* one item per screen, with a progress bar */
  function quizRun(s, title, list, onCancel, onEnd) {
    var i = 0, res = [];
    function show() {
      if (i >= list.length) return onEnd(res);
      var k = i, nextBtn = el("button.x-primary", { type: "button", hidden: true, style: "justify-self:end", onclick: function () { i++; show(); } }, k + 1 < list.length ? "بعدی ←" : "دیدن نتیجه");
      s.replaceChildren(
        el("div.x-row.x-row--between", el("strong", title + " · " + A.fa(k + 1) + " از " + A.fa(list.length)), back("انصراف", onCancel)),
        el("div.x-bar", el("i", { style: "width:" + (k / list.length * 100) + "%" })),
        item(list[k].raw, function (ok) { res[k] = { ok: ok, raw: list[k].raw, u: list[k].u }; nextBtn.hidden = false; }),
        nextBtn);
      s.scrollTop = 0;
    }
    show();
  }

  function unitTest(s, u) {
    A.stopSpeak();
    quizRun(s, "آزمون واحد", shuffle(u.t).map(function (r) { return { raw: r, u: u.id }; }), function () { unitPage(s, u); }, function (res) {
      var right = res.filter(function (r) { return r.ok; }).length, pct = Math.round(right / res.length * 100), p = prog(u.id), pass = pct >= 70;
      var wrong = res.filter(function (r) { return !r.ok; });
      wrong.forEach(function (r) { addMistake(r.u, r.raw); });
      if (pass && !p.passed) setTimeout(function () { A.addXP(25, "قبولی آزمون واحد"); }, 900);
      if (pass) { p.passed = true; A.complete("gu:" + u.id, u.en, "gu"); }
      p.best = Math.max(p.best || 0, pct);
      var nx = nextUnit();
      s.replaceChildren(
        el("div", el("h2.x-h2", pass ? "قبول شدی 🎉" : "هنوز نه؛ یه بار دیگه"), A.en(u.en, "p.x-muted")),
        el("section.stats",
          el("div.stat", el("span.stat__fig", A.fa(right) + " / " + A.fa(res.length)), el("span.stat__label", "جواب درست")),
          el("div.stat", el("span.stat__fig", A.fa(pct) + "٪"), el("span.stat__label", pass ? "قبول (حداقل ۷۰٪)" : "برای قبولی ۷۰٪ لازمه"))),
        wrong.length ? el("p.x-muted", A.fa(wrong.length) + " سؤال غلط به «مرور اشتباه‌ها» اضافه شد.") : el("p.x-muted", "همه رو درست جواب دادی!"),
        el("div.x-row",
          pass && nx ? el("button.x-primary", { type: "button", onclick: function () { unitPage(s, nx); } }, "واحد بعدی: ", A.en(nx.en)) : null,
          !pass ? el("button.x-primary", { type: "button", onclick: function () { unitPage(s, u); } }, "مرور توضیح‌ها") : null,
          el("button.x-sec", { type: "button", onclick: function () { unitTest(s, u); } }, "↺ آزمون دوباره"),
          wrong.length ? el("button.x-sec", { type: "button", onclick: function () { review(s); } }, "🔁 مرور اشتباه‌ها") : null,
          el("button.x-sec", { type: "button", onclick: function () { home(s); } }, "دوره گرامر")));
      s.scrollTop = 0;
    });
  }

  /* ----- final mixed test with a per-tense breakdown ----- */
  function finalTest(s) {
    A.stopSpeak();
    quizRun(s, "آزمون جامع", shuffle(G.final).map(function (f) { return { raw: f[1], u: f[0] }; }), function () { home(s); }, function (res) {
      var by = {}, right = 0;
      res.forEach(function (r) { var b = by[r.u] || (by[r.u] = { n: 0, ok: 0 }); b.n++; if (r.ok) { b.ok++; right++; } else addMistake(r.u, r.raw); });
      var ids = U.map(function (u) { return u.id; }).filter(function (id) { return by[id]; });
      var weak = ids.filter(function (id) { return by[id].ok < by[id].n; }).sort(function (a, b) { return by[a].ok / by[a].n - by[b].ok / by[b].n; });
      s.replaceChildren(
        el("h2.x-h2", "نتیجه آزمون جامع زمان‌ها"),
        el("section.stats",
          el("div.stat", el("span.stat__fig", A.fa(right) + " / " + A.fa(res.length)), el("span.stat__label", "جواب درست")),
          el("div.stat", el("span.stat__fig", A.fa(Math.round(right / res.length * 100)) + "٪"), el("span.stat__label", "دقت کل"))),
        el("div.breakdown", el("dl", ids.map(function (id) {
          var u = unitById(id);
          return el("div.row", el("dt", A.en(u.en), el("small", u.fa)), el("dd", A.fa(by[id].ok) + " از " + A.fa(by[id].n)));
        }))),
        weak.length ? el("div.x-list", el("h3.x-h3", "پیشنهاد: این واحدها رو دوباره ببین"), weak.slice(0, 4).map(function (id) {
          var u = unitById(id);
          return el("button.x-item", { type: "button", onclick: function () { unitPage(s, u); } },
            el("div.x-row.x-row--between", A.en(u.en, "strong"), el("span.pill", A.fa(by[id].ok) + " از " + A.fa(by[id].n))), el("span.x-muted", u.fa + " · " + u.level));
        })) : el("p", "🎉 همه زمان‌ها رو درست زدی!"),
        el("div.x-row",
          el("button.x-primary", { type: "button", onclick: function () { finalTest(s); } }, "↺ آزمون دوباره"),
          weak.length ? el("button.x-sec", { type: "button", onclick: function () { review(s); } }, "🔁 مرور اشتباه‌ها") : null,
          el("button.x-sec", { type: "button", onclick: function () { home(s); } }, "دوره گرامر")));
      s.scrollTop = 0;
    });
  }

  /* ----- mistakes to review: a right answer takes the item off the list ----- */
  function review(s) {
    A.stopSpeak();
    var list = st.gmist.slice();
    put(s,
      back("→ دوره گرامر", function () { home(s); }),
      el("div", el("h2.x-h2", "مرور اشتباه‌ها"), el("p.x-muted", "سؤال‌هایی که در آزمون‌ها غلط زدی. جواب درست، اون سؤال رو از فهرست برمی‌داره.")),
      list.length ? el("div.x-list", list.map(function (m) {
        var u = unitById(m.u);
        return item(m.raw, function (ok) {
          if (ok) st.gmist = st.gmist.filter(function (x) { return x !== m; });
        }, u ? u.en : "");
      })) : el("p.x-muted", "فهرست خالیه. هر سؤالی که در آزمون واحد یا آزمون جامع غلط بزنی اینجا میاد."),
      list.length ? el("button.x-sec", { type: "button", style: "justify-self:start", onclick: function () { review(s); } }, "↺ به‌روز کردن فهرست") : null);
    s.scrollTop = 0;
  }

  /* ----- overview of the 12 tenses ----- */
  function table12(s) {
    var H = ["زمان", "ساختار", "مثال", "معادل فارسی"];
    s.replaceChildren(
      back("→ دوره گرامر", function () { home(s); }),
      el("div", el("h2.x-h2", "جدول ۱۲ زمان"), el("p.x-muted", "هر زمان: ساختار، یک مثال با 🔊 و معادل فارسی. روی اسم زمان بزن تا به واحدش بری.")),
      el("div.table-wrap.x-t12", el("table", { dir: "ltr" },
        el("thead", el("tr", H.map(function (h) { return el("th", { scope: "col" }, h); }))),
        el("tbody", G.table12.map(function (r) {
          var u = unitById(r[4]);
          return el("tr",
            el("th", { scope: "row" }, u ? el("button.x-link", { type: "button", onclick: function () { unitPage(s, u); } }, r[0]) : r[0]),
            el("td", { "data-label": H[1] }, r[1]),
            el("td", { "data-label": H[2] }, el("span.x-exline", r[2], el("button.x-icon", { type: "button", "aria-label": "پخش: " + r[2], onclick: function () { A.speak(r[2]); } }, "🔊"))),
            el("td", { "data-label": H[3], dir: "rtl" }, r[3]));
        })))));
    s.scrollTop = 0;
  }

  /* ----- the four earlier grammar cards ----- */
  function extras(s) {
    A.stopSpeak();
    s.replaceChildren(
      back("→ دوره گرامر", function () { home(s); }),
      el("div", el("h2.x-h2", "درس‌های اضافه"), el("p.x-muted", "کارت‌های کوتاه گرامر: توضیح فارسی، سه مثال با تلفظ و یه آزمون سه‌سؤالی.")),
      el("div.x-list", (C.grammar || []).map(function (g) {
        return el("button.x-item", { type: "button", onclick: function () { A.gramCard(s, g, function () { extras(s); }); } },
          A.itemHead(g.title, g.level, g, "gram:" + g.id), el("span.x-muted", g.fa));
      })));
    s.scrollTop = 0;
  }

  /* big card for خانه */
  A.gramProgress = function () { return { done: doneCount(), total: U.length }; };
  A.gramHomeCard = function () {
    if (!U.length) return null;
    var nx = nextUnit(), done = doneCount(), pct = Math.round(done / U.length * 100);
    return el("div.x-card.x-gramcard",
      el("div.x-gramcard__top",
        el("div.x-ring", { style: "--p:" + pct, role: "img", "aria-label": "پیشرفت " + A.fa(pct) + " درصد" }, el("span", A.fa(pct) + "٪")),
        el("div.x-list", el("strong.x-cardh", "📐 دوره گرامر"), el("span.pill", A.fa(done) + " / " + A.fa(U.length) + " واحد"))),
      el("div.x-bar", el("i", { style: "width:" + (done / U.length * 100) + "%" })),
      nx ? el("div", el("span.x-muted", "پیشنهاد بعدی · " + nx.level), A.en(nx.en, "p.x-big"), el("p.x-muted", nx.fa)) : el("p", "🎉 همه واحدها قبول شد."),
      el("div.x-row",
        nx ? el("button.x-primary", { type: "button", onclick: function () { A.go("grammar", { open: "gu:" + nx.id }); } }, done ? "ادامه دوره" : "شروع دوره") : null,
        el("button.x-sec", { type: "button", onclick: function () { A.go("grammar"); } }, "همه واحدها"),
        el("button.x-sec", { type: "button", onclick: function () { A.go("grammar", { view: "table" }); } }, "جدول ۱۲ زمان")));
  };

  A.tab({ id: "grammar", icon: "📐", label: "گرامر", title: "دوره گرامر", blurb: A.fa(U.length) + " واحد، A1 تا C1", render: function (s, arg) {
    var p = arg && arg.open ? arg.open.split(":") : null, id = p && p.slice(1).join(":");
    if (p && p[0] === "gu" && unitById(id)) return unitPage(s, unitById(id));
    if (p && p[0] === "gram") { var g = (C.grammar || []).find(function (x) { return x.id === id; }); if (g) return A.gramCard(s, g, function () { extras(s); }); }
    if (arg && arg.view === "table") return table12(s);
    home(s);
  } });
})(window.App);

/* ---------- tab: shadowing ---------- */
(function (A) {
  var el = A.el, C = A.C, pickLevel = null;

  function picker(s) {
    if (!pickLevel) pickLevel = A.state.level;
    var start = el("button.x-primary", { type: "button", style: "justify-self:start" });
    var seg = el("div.x-seg", { role: "group", "aria-label": "سطح" }, A.LEVELS.map(function (l) {
      return el("button.x-en", { type: "button", "data-v": l, onclick: function () { pickLevel = l; draw(); } }, l);
    }));
    function draw() {
      var n = (C.shadowing[pickLevel] || []).length;
      start.textContent = "شروع: " + A.fa(n) + " جمله سطح " + pickLevel;
      start.disabled = !n;
      start.onclick = function () { session(s, "سطح " + pickLevel, C.shadowing[pickLevel]); };
      seg.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.v === pickLevel); });
    }
    s.replaceChildren(
      el("h2.x-h2", "شادویینگ"),
      el("p.x-muted", "جمله رو بشنو، همون‌طور تکرار کن، و ببین کدوم کلمه‌ها درست بود."),
      seg, start,
      el("h3", { style: "font: var(--type-heading)" }, "یا جمله‌های یک داستان"),
      el("div.x-list", C.stories.map(function (x) {
        return el("button.x-item", { type: "button", onclick: function () { session(s, x.title, x.s.map(function (p) { return p[0]; })); } },
          A.itemHead(x.title, x.level, x), el("span.x-muted", x.fa));
      })));
    draw();
  }

  /* «ضبط صدای من»: record, then hear my attempt and the model back to back */
  var rec = null, myAudio = null;
  function stopRec() {
    if (myAudio) { myAudio.onended = null; myAudio.pause(); myAudio = null; }
    if (rec) { var r = rec; rec = null; try { if (r.mr.state !== "inactive") r.mr.stop(); } catch (e) {} r.stream.getTracks().forEach(function (t) { t.stop(); }); }
  }
  function recorder(target) {
    var box = el("div.x-rec", el("strong", "🎙 ضبط صدای من"));
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder)) {
      box.append(el("p.x-muted", "ضبط صدا در این مرورگر پشتیبانی نمی‌شه؛ با نسخه جدید کروم، فایرفاکس یا سافاری امتحان کن."));
      return box;
    }
    var url = null, audio = null;
    var status = el("p.x-muted", { "aria-live": "polite" }, "صدات رو ضبط کن، بعد کنار صدای نمونه گوشش بده.");
    var recBtn = el("button.x-sec", { type: "button", "aria-pressed": "false", onclick: toggle }, "⏺ ضبط");
    var mineBtn = el("button.x-sec", { type: "button", disabled: true, onclick: function () { playBack(false); } }, "▶ صدای من");
    var bothBtn = el("button.x-sec", { type: "button", disabled: true, onclick: function () { playBack(true); } }, "▶ من، بعد نمونه");
    function toggle() {
      if (rec) { rec.mr.stop(); return; }
      A.stopSpeak(); if (myAudio) myAudio.pause();
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        var chunks = [], mr;
        if (!box.isConnected) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
        try { mr = new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach(function (t) { t.stop(); }); status.textContent = "ضبط صدا روی این دستگاه کار نکرد."; return; }
        rec = { mr: mr, stream: stream };
        mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        mr.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          if (rec && rec.mr === mr) rec = null;
          recBtn.classList.remove("is-live"); recBtn.setAttribute("aria-pressed", "false"); recBtn.textContent = "⏺ ضبط دوباره";
          if (!box.isConnected) return;
          if (!chunks.length) { status.textContent = "صدایی ضبط نشد؛ دوباره امتحان کن."; return; }
          if (url) URL.revokeObjectURL(url);
          url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || "audio/webm" }));
          audio = new Audio(url);
          mineBtn.disabled = false; bothBtn.disabled = false; status.textContent = "ضبط شد. حالا با صدای نمونه مقایسه کن.";
        };
        mr.start();
        recBtn.classList.add("is-live"); recBtn.setAttribute("aria-pressed", "true"); recBtn.textContent = "⏹ توقف ضبط";
        status.textContent = "دارم ضبط می‌کنم… جمله رو بگو.";
      }, function () { status.textContent = "اجازه میکروفون داده نشد یا میکروفون در دسترس نیست؛ ضبط ممکن نیست."; });
    }
    function playBack(both) {
      if (!audio || rec) return;
      A.stopSpeak(); myAudio = audio; audio.currentTime = 0;
      status.textContent = "▶ صدای تو…";
      audio.onended = function () {
        if (!both) { status.textContent = ""; return; }
        status.textContent = "🔊 صدای نمونه…";
        A.speak(target).then(function () { status.textContent = ""; });
      };
      audio.play().catch(function () { status.textContent = "پخش نشد؛ دوباره بزن."; });
    }
    box.append(el("div.x-row", recBtn, mineBtn, bothBtn), status);
    return box;
  }

  function session(s, title, list) {
    var i = 0, scores = list.map(function () { return null; });
    function card() {
      stopRec();
      var target = list[i], result = el("div.x-list", { "aria-live": "polite" });
      var mic = A.micInput(function (said) {
        var r = A.compare(target, said);
        if (scores[i] === null && r.accuracy >= 80) A.addXP(5, "تلفظ خوب");
        scores[i] = r.accuracy;
        result.replaceChildren(
          el("div.x-row", el("span.x-acc", A.fa(r.accuracy) + "٪"), el("span.x-muted", r.accuracy >= 80 ? "عالی!" : r.accuracy >= 50 ? "خوبه، یه بار دیگه" : "دوباره گوش بده و تکرار کن")),
          A.diffView(r),
          el("p.x-muted", "شنیدم: ", A.en(said)),
          el("div.x-row", el("button.x-sec", { type: "button", onclick: card }, "↺ دوباره")));
      });
      s.replaceChildren(
        el("div.x-row.x-row--between", el("button.x-sec", { type: "button", onclick: function () { A.stopSpeak(); stopRec(); picker(s); } }, "→ انتخاب تمرین"), el("span.x-muted", A.fa(i + 1) + " از " + A.fa(list.length))),
        el("div.x-bar", el("i", { style: "width:" + ((i + 1) / list.length * 100) + "%" })),
        el("p.x-muted", "🎧 " + title),
        el("div.x-card",
          A.en(target, "p.x-big"),
          el("div.x-row", el("button.x-sec", { type: "button", onclick: function () { A.speak(target); } }, "🔊 عادی"),
            el("button.x-sec", { type: "button", onclick: function () { A.speak(target, 0.7); } }, "🐢 آهسته ۰٫۷×")),
          mic, result, recorder(target)),
        el("button.x-primary", { type: "button", style: "justify-self:end", onclick: function () {
          A.stopSpeak(); if (++i < list.length) card(); else summary();
        } }, i + 1 < list.length ? "بعدی ←" : "پایان و نتیجه"));
      s.scrollTop = 0;
    }
    function summary() {
      stopRec();
      var done = scores.filter(function (x) { return x !== null; });
      var avg = done.length ? Math.round(done.reduce(function (a, b) { return a + b; }, 0) / done.length) : 0;
      if (done.length) A.addXP(10, "تمرین تموم شد");
      s.replaceChildren(
        el("h2.x-h2", "نتیجه شادویینگ"),
        el("section.stats",
          el("div.stat", el("span.stat__fig", A.fa(avg) + "٪"), el("span.stat__label", "میانگین دقت")),
          el("div.stat", el("span.stat__fig", A.fa(done.length) + " / " + A.fa(list.length)), el("span.stat__label", "جمله تمرین‌شده"))),
        el("div.breakdown", el("dl", list.map(function (t, k) {
          return el("div.row", el("dt", A.en(t)), el("dd", scores[k] === null ? "—" : A.fa(scores[k]) + "٪"));
        }))),
        el("div.x-row",
          el("button.x-primary", { type: "button", onclick: function () { i = 0; scores = list.map(function () { return null; }); card(); } }, "↺ دوباره از اول"),
          el("button.x-sec", { type: "button", onclick: function () { picker(s); } }, "تمرین دیگه")));
      s.scrollTop = 0;
    }
    card();
  }

  A.tab({ id: "shadow", icon: "🎧", label: "شادویینگ", blurb: "تکرار و تلفظ", render: function (s, arg) {
    if (arg && arg.list) session(s, arg.title, arg.list); else picker(s);
  }, leave: stopRec });
})(window.App);

/* ---------- tab: placement ---------- */
(function (A) {
  var el = A.el, C = A.C, L = A.LEVELS, TOTAL = 12;

  function intro(s) {
    s.replaceChildren(
      el("h2.x-h2", "تعیین سطح"),
      el("p.x-muted", "۱۲ سؤال. از سطح A2 شروع می‌کنیم؛ جواب درست سؤال بعدی رو سخت‌تر می‌کنه و جواب غلط آسون‌تر."),
      el("button.x-primary", { type: "button", style: "justify-self:start", onclick: function () { test(s); } }, "شروع آزمون"));
  }

  function test(s) {
    var lv = L.indexOf("A2"), used = new Set(), log = [], up = true;
    function pick() {
      for (var d = 0; d < L.length; d++) {
        var tries = d ? (up ? [lv + d, lv - d] : [lv - d, lv + d]) : [lv];
        for (var t = 0; t < tries.length; t++) {
          var q = C.placement.find(function (x) { return x.level === L[tries[t]] && !used.has(x); });
          if (q) return q;
        }
      }
      return null;
    }
    function next() {
      var q = log.length < TOTAL && pick();
      if (!q) return result(s, log);
      used.add(q);
      var opts = q.o.map(function (o, k) {
        return el("button.x-opt", { type: "button", dir: "ltr", lang: "en", onclick: function () {
          opts.forEach(function (b) { b.disabled = true; });
          this.classList.add("is-pick");
          var ok = k === q.a; up = ok;
          log.push({ level: q.level, ok: ok });
          lv = Math.max(0, Math.min(L.length - 1, L.indexOf(q.level) + (ok ? 1 : -1)));
          setTimeout(next, 350);
        } }, o);
      });
      s.replaceChildren(
        el("div.x-row.x-row--between", el("strong", "سؤال " + A.fa(log.length + 1) + " از " + A.fa(TOTAL)), el("button.x-sec", { type: "button", onclick: function () { intro(s); } }, "انصراف")),
        el("div.x-bar", el("i", { style: "width:" + (log.length / TOTAL * 100) + "%" })),
        el("div.x-q", A.en(q.q, "p.x-big"), opts));
    }
    next();
  }

  function result(s, log) {
    var by = {}, res = "A1";
    L.forEach(function (l) { by[l] = { n: 0, ok: 0 }; });
    log.forEach(function (x) { by[x.level].n++; if (x.ok) by[x.level].ok++; });
    L.forEach(function (l) { if (by[l].ok >= 2 && by[l].ok / by[l].n >= 0.5) res = l; });
    var right = log.filter(function (x) { return x.ok; }).length;
    s.replaceChildren(
      el("h2.x-h2", "سطح تو"),
      el("section.stats",
        el("div.stat", el("span.stat__fig.x-en", res), el("span.stat__label", A.levelFa(res))),
        el("div.stat", el("span.stat__fig", C.vocabSize[res]), el("span.stat__label", "دامنه واژگان تخمینی")),
        el("div.stat", el("span.stat__fig", A.fa(right) + " / " + A.fa(log.length)), el("span.stat__label", "جواب درست"))),
      el("div.breakdown", el("dl", L.filter(function (l) { return by[l].n; }).map(function (l) {
        return el("div.row", el("dt", A.en(l), el("small", A.levelFa(l))), el("dd", A.fa(by[l].ok) + " از " + A.fa(by[l].n)));
      }))),
      el("div.x-row",
        el("button.x-primary", { type: "button", onclick: function () { A.state.level = res; A.addXP(30, "سطح " + res); A.go("home"); } }, "شروع با این سطح"),
        el("button.x-sec", { type: "button", onclick: function () { test(s); } }, "↺ آزمون دوباره")));
  }

  A.tab({ id: "placement", icon: "🎯", label: "تعیین سطح", blurb: "۱۲ سؤال تطبیقی", render: intro });
})(window.App);

/* ---------- tab: 504 words ---------- */
(function (A) {
  var el = A.el, C = A.C;
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  A.shuffle = shuffle;
  A.wordOfDay = function () {
    var all = [];
    C.words504.forEach(function (L) { L.words.forEach(function (w) { all.push({ lesson: L.lesson, w: w }); }); });
    return all.length ? all[Math.floor(Date.now() / 864e5) % all.length] : null;
  };
  function back(label, fn) { return el("button.x-sec", { type: "button", style: "justify-self:start", onclick: function () { A.stopSpeak(); fn(); } }, label); }
  function sayBtn(w, label) { return el("button.x-icon", { type: "button", "aria-label": "پخش " + w[0], onclick: function () { A.speak(w[0] + ". " + w[3]); } }, label || "🔊"); }

  function lessons(s) {
    s.replaceChildren(
      el("h2.x-h2", "۵۰۴ واژه ضروری"),
      el("p.x-muted", "هر درس ۱۲ واژه: فهرست، فلش‌کارت و آزمون."),
      el("div.x-list", C.words504.map(function (L) {
        return el("button.x-item", { type: "button", onclick: function () { lesson(s, L); } },
          el("div.x-row.x-row--between", el("strong", "درس " + A.fa(L.lesson)), el("span.pill", A.fa(L.words.length) + " واژه")),
          A.en(L.words.slice(0, 4).map(function (w) { return w[0]; }).join(" · ") + " …", "span.x-muted"));
      })),
      el("p.fineprint", "درس‌های ۶ تا ۴۲ به‌زودی"));
    s.scrollTop = 0;
  }

  function lesson(s, L) {
    s.replaceChildren(
      back("→ همه درس‌ها", function () { lessons(s); }),
      el("h2.x-h2", "درس " + A.fa(L.lesson)),
      el("div.x-row",
        el("button.x-primary", { type: "button", onclick: function () { flash(s, L); } }, "🃏 فلش‌کارت"),
        el("button.x-sec", { type: "button", onclick: function () { quiz(s, L); } }, "📝 آزمون " + A.fa(Math.min(12, L.words.length)) + " سؤالی")),
      el("div.x-list", L.words.map(function (w) {
        return el("div.x-word",
          el("div.x-row.x-row--between", el("div.x-row", A.en(w[0], "strong"), el("span.pill.x-en", w[1])), sayBtn(w)),
          el("span", w[2]),
          A.en(w[3], "p.x-muted"));
      })));
    s.scrollTop = 0;
  }

  function flash(s, L) {
    var queue = shuffle(L.words), total = L.words.length, known = 0, missed = [];
    function card() {
      if (!queue.length) return done();
      var w = queue[0];
      var face = el("button.x-flash", { type: "button", "aria-label": "برگردوندن کارت", onclick: function () { face.classList.toggle("is-flipped"); } },
        el("span.x-flash__front", A.en(w[0], "span.x-big"), el("span.pill.x-en", w[1]), el("span.x-muted", "برای دیدن معنی بزن")),
        el("span.x-flash__back", el("strong.x-big", w[2]), A.en(w[3], "span.x-muted")));
      function answer(ok) {
        queue.shift();
        if (ok) known++; else { if (missed.indexOf(w[0]) < 0) missed.push(w[0]); queue.push(w); }
        card();
      }
      s.replaceChildren(
        el("div.x-row.x-row--between", back("→ درس " + A.fa(L.lesson), function () { lesson(s, L); }), el("span.x-muted", A.fa(known) + " از " + A.fa(total) + " بلدم")),
        el("div.x-bar", el("i", { style: "width:" + (known / total * 100) + "%" })),
        face,
        el("div.x-row", { style: "justify-content:center" }, sayBtn(w, "🔊 تلفظ")),
        el("div.x-split",
          el("button.x-sec", { type: "button", onclick: function () { answer(false); } }, "بلد نیستم ↺"),
          el("button.x-primary", { type: "button", onclick: function () { answer(true); } }, "بلدم ✓")));
      A.speak(w[0]);
    }
    function done() {
      A.addXP(15, "فلش‌کارت درس " + A.fa(L.lesson));
      s.replaceChildren(
        el("h2.x-h2", "آفرین! همه کارت‌ها رو بلدی 🎉"),
        el("p.x-muted", missed.length ? "این‌ها رو چند بار تکرار کردی:" : "همه رو از دور اول بلد بودی."),
        missed.length ? A.en(missed.join(" · "), "p") : null,
        el("div.x-row",
          el("button.x-primary", { type: "button", onclick: function () { quiz(s, L); } }, "📝 برو به آزمون"),
          el("button.x-sec", { type: "button", onclick: function () { flash(s, L); } }, "↺ دوباره"),
          el("button.x-sec", { type: "button", onclick: function () { lessons(s); } }, "درس دیگه")));
      s.scrollTop = 0;
    }
    card();
  }

  function quiz(s, L) {
    var qs = shuffle(L.words).slice(0, 12), i = 0, right = 0;
    function next() {
      if (i >= qs.length) return result();
      var w = qs[i], opts = shuffle([w].concat(shuffle(L.words.filter(function (x) { return x !== w; })).slice(0, 3)));
      var fb = el("p.x-muted", { "aria-live": "polite" });
      var nextBtn = el("button.x-primary", { type: "button", hidden: true, style: "justify-self:end", onclick: function () { i++; next(); } }, i + 1 < qs.length ? "بعدی ←" : "نتیجه");
      var btns = opts.map(function (o) {
        return el("button.x-opt.x-opt--fa", { type: "button", onclick: function () {
          btns.forEach(function (b) { b.disabled = true; });
          btns[opts.indexOf(w)].classList.add("is-ok");
          if (o === w) { right++; fb.textContent = "✅ درسته!"; A.addXP(5, "جواب درست"); }
          else { this.classList.add("is-bad"); fb.textContent = "❌ این گزینه معنی «" + o[0] + "» بود."; }
          nextBtn.hidden = false;
        } }, o[2]);
      });
      s.replaceChildren(
        el("div.x-row.x-row--between", el("strong", "سؤال " + A.fa(i + 1) + " از " + A.fa(qs.length)), back("انصراف", function () { lesson(s, L); })),
        el("div.x-bar", el("i", { style: "width:" + (i / qs.length * 100) + "%" })),
        el("div.x-q", el("div.x-row.x-row--between", A.en(w[0], "p.x-big"), sayBtn(w)), el("span.x-muted", "معنی فارسی کدومه؟"), btns, fb),
        nextBtn);
      A.speak(w[0]);
    }
    function result() {
      A.addXP(10, "آزمون درس " + A.fa(L.lesson));
      s.replaceChildren(
        el("h2.x-h2", "نتیجه آزمون درس " + A.fa(L.lesson)),
        el("section.stats",
          el("div.stat", el("span.stat__fig", A.fa(right) + " / " + A.fa(qs.length)), el("span.stat__label", "جواب درست")),
          el("div.stat", el("span.stat__fig", A.fa(Math.round(right / qs.length * 100)) + "٪"), el("span.stat__label", "دقت"))),
        el("div.x-row",
          el("button.x-primary", { type: "button", onclick: function () { quiz(s, L); } }, "↺ آزمون دوباره"),
          el("button.x-sec", { type: "button", onclick: function () { flash(s, L); } }, "🃏 فلش‌کارت"),
          el("button.x-sec", { type: "button", onclick: function () { lessons(s); } }, "درس دیگه")));
      s.scrollTop = 0;
    }
    next();
  }

  A.tab({ id: "words504", icon: "📚", label: "۵۰۴ واژه", blurb: "درس ۱ تا ۵", render: function (s, arg) {
    var L = arg && C.words504.find(function (x) { return x.lesson === arg.lesson; });
    if (L) lesson(s, L); else lessons(s);
  } });
})(window.App);
/* ---------- tab: conversation (scenarios + free AI chat) ---------- */
(function (A) {
  var el = A.el, C = A.C, mode = "scen", guide = false, run = 0;

  function scrollEnd(s) { requestAnimationFrame(function () { s.scrollTop = s.scrollHeight; }); }
  function speakBtn(text, label, rate) {
    return el("button.x-icon", { type: "button", "aria-label": "پخش", onclick: function () { A.speak(text, rate); } }, label || "🔊");
  }
  function botBubble(text) { return el("div.x-msg.is-bot", A.en(text, "p"), speakBtn(text)); }
  function userBubble(text) { return el("div.x-msg.is-me", A.en(text, "p")); }

  /* answer bar in the dock: 🎤 + text input always available */
  function answerBar(onText, extra) {
    var live = false;
    var inp = el("input.x-input", { type: "text", dir: "ltr", lang: "en", placeholder: "Type your answer…", autocomplete: "off", "aria-label": "جواب" });
    function go() { var t = inp.value.trim(); if (!t) return; inp.value = ""; onText(t); }
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    var mic = el("button.x-micsm", { type: "button", "aria-label": "ضبط صدا", onclick: function () { bar.listen(); } }, "🎤");
    var status = el("p.x-muted", { "aria-live": "polite" });
    var bar = el("div.x-dockbar",
      el("div.x-askrow", A.micOK() ? mic : null, inp, el("button.x-primary", { type: "button", onclick: go }, "ارسال")),
      extra || null, status);
    bar.status = function (t) { status.textContent = t || ""; };
    bar.listen = function () {
      if (live) { bar.err = "busy"; return Promise.resolve(null); }
      if (!A.micOK()) { bar.err = "unavailable"; bar.status("میکروفون در دسترس نیست؛ تایپ کن"); return Promise.resolve(null); }
      A.stopSpeak(); live = true; bar.err = ""; mic.classList.add("is-live"); bar.status("دارم گوش می‌دم…");
      return A.listen().then(function (t) { return t; }, function (e) {
        bar.err = e.message;
        bar.status(!A.micOK() ? "میکروفون در دسترس نیست؛ تایپ کن" : e.message === "no-speech" ? "چیزی نشنیدم؛ دوباره امتحان کن" : "خطا: " + e.message);
        if (!A.micOK()) mic.remove();
        return null;
      }).then(function (t) {
        live = false; mic.classList.remove("is-live");
        if (!t) return null;
        bar.status("");
        return Promise.resolve(onText(t)).then(function () { return t; });
      });
    };
    return bar;
  }

  function header(s) {
    return [el("h2.x-h2", "مکالمه"),
      el("div.x-seg", { role: "group", "aria-label": "حالت" }, [["scen", "سناریوها"], ["free", "مکالمه آزاد با هوش مصنوعی"]].map(function (p) {
        return el("button", { type: "button", "aria-pressed": String(mode === p[0]), onclick: function () { mode = p[0]; A.stopSpeak(); (mode === "scen" ? scenList : free)(s); } }, p[1]);
      }))];
  }

  /* ----- (A) scenarios ----- */
  function keyHit(txt, k) {
    if (k.charAt(0) === "\\") return new RegExp(k).test(txt);
    return new RegExp("(^|[^a-z'])" + k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(txt);
  }
  function passes(t, keys) {
    var txt = " " + t.toLowerCase().replace(/[’‘`]/g, "'") + " ";
    var hit = keys.filter(function (g) { return [].concat(g).some(function (k) { return keyHit(txt, k); }); }).length;
    return hit >= Math.ceil(keys.length / 2);
  }

  function scenList(s) {
    run++; A.dock.replaceChildren();
    s.replaceChildren.apply(s, header(s).concat([
      el("p.x-muted", "ربات جمله‌اش رو می‌گه؛ با 🎤 یا تایپ جواب بده. اگه جوابت جا نیفتاد، جواب نمونه رو می‌بینی و تکرارش می‌کنی."),
      el("div.x-list", C.scenarios.map(function (sc) {
        return el("button.x-item", { type: "button", onclick: function () { scenario(s, sc); } },
          A.itemHead(sc.title, sc.level, sc),
          el("span.x-muted", sc.fa + " · " + A.fa(sc.turns.length) + " نوبت"));
      }))]));
    s.scrollTop = 0;
  }

  function scenario(s, sc) {
    var my = ++run, i = 0, ok = 0, waiting = false, hintBox = null;
    var chat = el("div.x-chat");
    var guideBtn = el("button.x-sec", { type: "button", "aria-pressed": String(guide), onclick: function () {
      guide = !guide; guideBtn.setAttribute("aria-pressed", String(guide)); if (hintBox) hintBox.hidden = !guide;
    } }, "💡 حالت راهنما");
    var bar = answerBar(function (t) { judge(t); });
    A.dock.replaceChildren(bar);
    s.replaceChildren(
      el("div.x-row.x-row--between", el("button.x-sec", { type: "button", onclick: function () { A.stopSpeak(); scenList(s); } }, "→ سناریوها"), guideBtn),
      el("div", A.en(sc.title, "h2.x-h2"), el("p.x-muted", sc.fa + " · سطح " + sc.level)),
      chat);
    s.scrollTop = 0;

    function turn() {
      if (my !== run) return;
      if (i >= sc.turns.length) return finish();
      var T = sc.turns[i];
      chat.append(botBubble(T.ai));
      hintBox = el("div.x-model", { hidden: !guide }, el("span.x-muted", "💡 می‌تونی بگی:"), el("div.x-row.x-row--between", A.en(T.model, "p"), speakBtn(T.model)));
      chat.append(hintBox);
      waiting = true; bar.status(A.fa(i + 1) + " از " + A.fa(sc.turns.length));
      scrollEnd(s);
      A.speak(T.ai);
    }
    function judge(t) {
      if (!waiting || my !== run) return;
      var T = sc.turns[i]; waiting = false;
      if (hintBox) { hintBox.remove(); hintBox = null; }
      chat.append(userBubble(t));
      if (passes(t, T.keys)) {
        ok++; A.addXP(5, "جواب خوب");
        chat.append(el("p.x-muted", "✅ عالی، جوابت جا افتاد!"));
        i++; setTimeout(turn, 600);
      } else {
        var res = el("div.x-list", { "aria-live": "polite" });
        chat.append(el("div.x-fix",
          el("strong", "جواب نمونه؛ گوش بده و همین رو تکرار کن:"),
          A.en(T.model, "p.x-big"),
          el("div.x-row", speakBtn(T.model, "🔊 بشنو"), speakBtn(T.model, "🐢 آهسته", 0.7)),
          A.micInput(function (said) {
            var r = A.compare(T.model, said);
            if (r.accuracy >= 80) A.addXP(3, "تکرار خوب");
            res.replaceChildren(el("strong", A.fa(r.accuracy) + "٪ " + (r.accuracy >= 80 ? "عالی!" : "یه بار دیگه")), A.diffView(r));
          }),
          res,
          el("button.x-primary", { type: "button", style: "justify-self:end", onclick: function () { this.disabled = true; i++; turn(); } }, "ادامه ←")));
        A.speak(T.model);
      }
      scrollEnd(s);
    }
    function finish() {
      A.addXP(15, "سناریو تموم شد"); A.complete("scen:" + sc.id, sc.title, "scen");
      A.dock.replaceChildren();
      chat.append(el("div.x-card",
        el("strong", "🎉 سناریو تموم شد"),
        el("p.x-muted", A.fa(ok) + " از " + A.fa(sc.turns.length) + " جواب از دور اول جا افتاد."),
        el("div.x-row",
          el("button.x-primary", { type: "button", onclick: function () { scenario(s, sc); } }, "↺ دوباره"),
          el("button.x-sec", { type: "button", onclick: function () { scenList(s); } }, "سناریوی دیگه"))));
      scrollEnd(s);
    }
    turn();
  }

  /* ----- (B) free AI conversation. The key lives only in this object, in memory. ----- */
  var cfg = { provider: "pollinations", key: "", model: "google/gemma-4-31b-it:free", custom: "", topic: "daily" };
  var OR_MODELS = ["google/gemma-4-31b-it:free", "google/gemma-4-26b-a4b-it:free", "nvidia/nemotron-3.5-lightning:free"];
  var TOPICS = [
    ["daily", "زندگی روزمره", "daily life"], ["gym", "باشگاه", "the gym and fitness"],
    ["tech", "تکنولوژی و AI", "technology and AI"], ["travel", "سفر", "travel"],
    ["job", "مصاحبه کاری", "job interviews"], ["free", "آزاد", "anything the learner wants to talk about"],
    ["barber", "نقش: آرایشگر", "role-play: you are a barber and the learner is your customer"],
    ["doctor", "نقش: دکتر", "role-play: you are a doctor (GP) and the learner is your patient"],
    ["interviewer", "نقش: مصاحبه‌گر", "role-play: you are a job interviewer at a tech company and the learner is the candidate"]];
  var ERR = {
    key: "اول کلید رو وارد کن", bad: "کلید اشتباهه",
    limit: "سقف رایگان امروز پر شد یا مدل شلوغه؛ مدل دیگه‌ای رو امتحان کن",
    net: "اتصال برقرار نشد؛ VPN یا کلید رو چک کن"
  };

  function sysPrompt() {
    var t = TOPICS.find(function (x) { return x[0] === cfg.topic; }) || TOPICS[0];
    return "You are Hark Coach, a friendly English speaking partner for an Iranian learner at level " + A.state.level + ". Topic: " + t[2] +
      ". Use British English spelling, vocabulary and expressions (e.g. flat, lift, holiday, colour)." +
      " Reply in 1–3 short sentences in English only, then ask a follow-up question. Return ONLY JSON: " +
      '{"reply":"...","correction":"corrected version of the learner\'s last sentence or empty if fine","tip_fa":"one short Persian explanation of the mistake or empty"}';
  }
  function needsKey() { return cfg.provider !== "pollinations"; }
  function errFa(status, body) {
    if (status === 429 && !needsKey()) return "سرور رایگان شلوغه؛ چند ثانیه بعد دوباره امتحان کن";
    if (status === 401 || (status === 400 && /API_KEY_INVALID|API key not valid/i.test(body || ""))) return ERR.bad;
    if (status === 429) return ERR.limit;
    if (status === 402) return "اعتبار حساب کافی نیست؛ یه مدل رایگان (:free) انتخاب کن";
    if (status === 404) return "این مدل پیدا نشد؛ مدل دیگه‌ای رو امتحان کن";
    if (status === 403) return "دسترسی رد شد؛ کلید یا VPN رو چک کن";
    return "خطای سرور (کد " + A.fa(status) + ")؛ دوباره امتحان کن یا مدل دیگه‌ای رو انتخاب کن";
  }
  function callAI(system, messages) {
    if (needsKey() && !cfg.key) return Promise.reject({ fa: ERR.key });
    var p = cfg.provider, url, opts;
    if (p === "pollinations") {
      url = "https://text.pollinations.ai/openai";
      opts = { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openai", messages: [{ role: "system", content: system }].concat(messages) }) };
    } else if (p === "gemini") {
      url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + encodeURIComponent(cfg.key);
      opts = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map(function (m) { return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }; }),
        generationConfig: { temperature: 0.7 } }) };
    } else {
      var model = p === "openai" ? "gpt-4o-mini" : (cfg.model === "custom" ? cfg.custom : cfg.model);
      if (!model) return Promise.reject({ fa: "اسم مدل دلخواه رو بنویس" });
      url = p === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
      var h = { "Content-Type": "application/json", Authorization: "Bearer " + cfg.key };
      if (p === "openrouter") h["X-Title"] = "EGHDAMI LEARNING";
      opts = { method: "POST", headers: h, body: JSON.stringify({ model: model, temperature: 0.7, messages: [{ role: "system", content: system }].concat(messages) }) };
    }
    return fetch(url, opts).then(function (res) {
      return res.text().then(function (body) {
        if (!res.ok) throw { fa: errFa(res.status, body) };
        var j; try { j = JSON.parse(body); } catch (e) { throw { fa: "جواب سرور قابل خوندن نبود" }; }
        if (j.error) throw { fa: errFa(+j.error.code || 500, JSON.stringify(j.error)) };
        var text = p === "gemini"
          ? ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map(function (x) { return x.text || ""; }).join("")
          : (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "";
        if (!String(text).trim()) throw { fa: "مدل جوابی نداد؛ دوباره امتحان کن یا مدل دیگه‌ای رو انتخاب کن" };
        return String(text);
      });
    }, function () { throw { fa: ERR.net }; });
  }
  function stripFences(t) { return String(t || "").replace(/```[a-z]*\s*/gi, "").replace(/```/g, "").trim(); }
  function parseReply(raw) {
    var t = stripFences(raw), a = t.indexOf("{"), b = t.lastIndexOf("}"), o = null;
    if (a > -1 && b > a) { try { o = JSON.parse(t.slice(a, b + 1)); } catch (e) { o = null; } }
    if (!o || typeof o.reply !== "string" || !o.reply.trim()) return { reply: t, correction: "", tip_fa: "" };
    return { reply: o.reply.trim(),
      correction: typeof o.correction === "string" ? o.correction.trim() : "",
      tip_fa: typeof o.tip_fa === "string" ? o.tip_fa.trim() : "" };
  }
  function same(a, b) { var n = function (x) { return x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }; return n(a) === n(b); }

  function free(s) {
    var my = ++run, msgs = [], busy = false, hands = false, misses = 0;
    var chat = el("div.x-chat");

    /* settings card */
    var prov = el("select.x-input", { "aria-label": "سرویس", onchange: function () { cfg.provider = prov.value; drawModel(); } },
      [["pollinations", "رایگان، بدون کلید (Pollinations)"], ["openrouter", "OpenRouter (با کلید رایگان)"], ["openai", "OpenAI · gpt-4o-mini"], ["gemini", "Gemini · gemini-2.0-flash"]].map(function (p) {
        return el("option", { value: p[0], selected: cfg.provider === p[0] }, p[1]);
      }));
    var key = el("input.x-input", { type: "password", dir: "ltr", autocomplete: "off", spellcheck: "false", placeholder: "API key", "aria-label": "کلید API",
      oninput: function () { cfg.key = key.value.trim(); } });
    key.value = cfg.key;
    var modelSel = el("select.x-input", { dir: "ltr", "aria-label": "مدل OpenRouter", onchange: function () { cfg.model = modelSel.value; drawModel(); } },
      OR_MODELS.concat(["custom"]).map(function (m) { return el("option", { value: m, selected: cfg.model === m }, m === "custom" ? "Custom model…" : m); }));
    var custom = el("input.x-input", { type: "text", dir: "ltr", autocomplete: "off", placeholder: "vendor/model-name:free", "aria-label": "نام مدل دلخواه",
      oninput: function () { cfg.custom = custom.value.trim(); } });
    custom.value = cfg.custom;
    var modelWrap = el("div.x-field", el("span", "مدل OpenRouter"), modelSel, custom);
    var noKeyNote = el("p.fineprint", "بدون ثبت‌نام و کلید کار می‌کنه");
    var keyWrap = el("label.x-field", el("span", "کلید API"), key);
    var keyNote = el("p.fineprint", "کلید فقط در حافظه همین صفحه می‌مونه؛ جایی ذخیره یا فرستاده نمی‌شه جز به همون سرویس.");
    var keyHelp = el("div.aside", el("h3", "کلید رایگان"),
      el("p.fineprint", A.en("openrouter.ai"), " ← ورود با گوگل ← ", A.en("Keys"), " ← ", A.en("Create Key"), " ← کپی و اینجا paste کن"));
    function drawModel() {
      var nk = !needsKey();
      noKeyNote.hidden = !nk; keyWrap.hidden = nk; keyNote.hidden = nk; keyHelp.hidden = nk;
      modelWrap.hidden = cfg.provider !== "openrouter"; custom.hidden = cfg.model !== "custom";
    }
    drawModel();
    var settings = el("details.x-card.x-details", { open: needsKey() && !cfg.key },
      el("summary", "⚙︎ تنظیمات هوش مصنوعی"),
      el("label.x-field", el("span", "سرویس"), prov, noKeyNote),
      keyWrap,
      modelWrap,
      keyNote);

    /* topic chips */
    var chips = el("div.x-seg.x-seg--wrap", { role: "group", "aria-label": "موضوع" }, TOPICS.map(function (t) {
      return el("button", { type: "button", "data-v": t[0], "aria-pressed": String(cfg.topic === t[0]), onclick: function () {
        cfg.topic = t[0]; chips.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === cfg.topic)); });
      } }, t[1]);
    }));

    /* dock: answer bar + hands-free + end */
    var handsBtn = el("button.x-sec", { type: "button", "aria-pressed": "false", onclick: function () {
      if (hands) return stopHands();
      if (!A.micOK()) return bar.status("میکروفون در دسترس نیست؛ تایپ کن");
      if (needsKey() && !cfg.key) { settings.open = true; key.focus(); return bar.status(ERR.key); }
      hands = true; misses = 0; handsBtn.setAttribute("aria-pressed", "true"); handsBtn.textContent = "🎤 بدون دست: روشن";
      loop();
    } }, "🎤 بدون دست: خاموش");
    var bar = answerBar(send, el("div.x-row", handsBtn, el("button.x-sec", { type: "button", onclick: end }, "پایان جلسه")));
    A.dock.replaceChildren(bar);

    function stopHands() { hands = false; handsBtn.setAttribute("aria-pressed", "false"); handsBtn.textContent = "🎤 بدون دست: خاموش"; }
    function loop() {
      if (!hands || my !== run || busy) return;
      bar.listen().then(function (t) {
        if (!hands || my !== run || t || bar.err === "busy") { if (t) misses = 0; return; }
        if (bar.err === "no-speech" && ++misses < 3) return loop();
        stopHands();
      });
    }

    function send(text) {
      if (busy || my !== run) return;
      if (needsKey() && !cfg.key) { stopHands(); settings.open = true; key.focus(); bar.status(ERR.key); return; }
      busy = true;
      var userB = userBubble(text), typing = el("div.x-msg.is-bot.x-typing", { "aria-label": "در حال نوشتن" }, "…");
      chat.append(userB, typing); scrollEnd(s);
      msgs.push({ role: "user", content: text });
      bar.status("دارم فکر می‌کنم…");
      return callAI(sysPrompt(), msgs).then(function (raw) {
        if (my !== run) return;
        typing.remove(); busy = false; bar.status("");
        var r = parseReply(raw);
        msgs.push({ role: "assistant", content: raw });
        if (r.correction && !same(r.correction, text)) {
          userB.after(el("div.x-fix", el("strong", "شکل درست:"), A.en(r.correction, "p"), r.tip_fa ? el("p", { dir: "auto" }, r.tip_fa) : null, speakBtn(r.correction)));
        } else A.addXP(3, "جمله درست");
        chat.append(botBubble(r.reply)); scrollEnd(s);
        return A.speak(r.reply).then(function () { if (hands && my === run) loop(); });
      }, function (e) {
        if (my !== run) return;
        typing.remove(); busy = false; msgs.pop();
        chat.append(el("p.x-err", e.fa)); bar.status(e.fa); stopHands(); scrollEnd(s);
      });
    }

    function end() {
      if (busy) return;
      if (!msgs.length) return bar.status("هنوز گفتگویی نشده؛ اول چند جمله حرف بزن");
      if (needsKey() && !cfg.key) return bar.status(ERR.key);
      stopHands(); A.stopSpeak(); busy = true;
      var title = el("strong", "📝 خلاصه جلسه"), sum = el("div.x-card", title, el("p.x-muted", "دارم خلاصه رو آماده می‌کنم…"));
      chat.append(sum); scrollEnd(s);
      var ask = "The session is over. In Persian, write a short summary of our conversation and my main mistakes (3–4 sentences). " +
        "Then list 5 useful British English words or phrases from it, one per line as: word — Persian meaning. Plain text only, no JSON.";
      callAI("You are Hark Coach, a British English teacher for an Iranian learner at level " + A.state.level + ". Write in Persian, keeping English words in English.",
        msgs.concat([{ role: "user", content: ask }])).then(function (raw) {
        busy = false;
        sum.replaceChildren(title, stripFences(raw).split(/\n+/).filter(function (l) { return l.trim(); }).map(function (l) {
          return el("p", { dir: "auto" }, l.replace(/\*\*/g, "").replace(/^#+\s*/, ""));
        }), el("button.x-primary", { type: "button", style: "justify-self:start", onclick: function () { free(s); } }, "جلسه جدید"));
        A.addXP(20, "جلسه مکالمه"); scrollEnd(s);
      }, function (e) { busy = false; sum.replaceChildren(title, el("p.x-err", e.fa)); });
    }

    s.replaceChildren.apply(s, header(s).concat([
      settings,
      keyHelp,
      el("div.x-list", el("strong", "موضوع"), chips),
      el("p.x-muted", "با 🎤 یا تایپ شروع کن؛ مثلاً ", A.en("Hi! How are you?"), ". با «بدون دست» گفتگو خودکار ادامه پیدا می‌کنه."),
      chat]));
    s.scrollTop = 0;
  }

  A.tab({ id: "talk", icon: "💬", label: "مکالمه", blurb: "سناریو و هوش مصنوعی", render: function (s, arg) {
    var sc = arg && arg.scen && C.scenarios.find(function (x) { return x.id === arg.scen; });
    if (sc) { mode = "scen"; return scenario(s, sc); }
    (mode === "free" ? free : scenList)(s);
  }, leave: function () { run++; } });
})(window.App);

window.App.start();
