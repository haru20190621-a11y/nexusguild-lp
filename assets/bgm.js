/* サイト全体のBGM（ハル 2026-11-20「サイトに来るとこの音源が小さく流れるようにしてほしい。どのページでも」）
   曲: BGMer「受け継がれゆく心」ロング版（https://bgmer.net/ 商用利用可・クレジット任意）
   ハル 2026-11-20「やっぱこっちに変更でお願い」で「角砂糖をもうひとつ」から差し替え。約11分・64kbps モノラル
   iPhone は音量を仕組みから下げられない（いつも最大）ので、曲そのものを 0.12 倍の小さい音で作ってある（bgm-3.mp3）
   - ブラウザは、見ている人がまだ何も操作していないページで音を鳴らすのを止めるので、
     鳴らせなかったときは、最初にどこかを押した・キーを押した瞬間から流す
   - ページを移っても続きから流れるように、再生位置を sessionStorage に残す
   - 右下のボタンで止められる。止めたことは localStorage に残し、次からは流さない
   - タブを裏に回したら止め、戻ったら続きから流す
   - 音楽つきのページどうしを移るときは、ページを読み直さずに中身だけ入れ替えるので、音楽が途切れない（下の「ページを移っても音楽を止めない」） */
(function () {
  "use strict";
  var me = document.currentScript;
  if (!me || !window.Audio) return;
  var SRC = new URL("sound/bgm-3.mp3", me.src).href;
  var VOL = 1;               // 曲そのものを小さく作ってあるので、仕組みでは下げない
  var KEY_OFF = "ng-bgm-off";
  var KEY_POS = "ng-bgm-pos";
  var KEY_ENTERED = "ng-entered";   // 入口の「サイトに入る」を押したか（同じタブのあいだ）

  function get(store, k) { try { return window[store].getItem(k); } catch (e) { return null; } }
  function set(store, k, v) { try { window[store].setItem(k, v); } catch (e) {} }
  function del(store, k) { try { window[store].removeItem(k); } catch (e) {} }

  var audio = new Audio();
  audio.src = SRC;
  audio.loop = true;
  audio.preload = "metadata";   // 長い曲なので、流し始めるまで全部は読み込まない
  audio.volume = 0;

  var off = get("localStorage", KEY_OFF) === "1";
  var started = false;       // 一度でも鳴らせたか
  var fadeT = 0;

  /* ---------- 右下の止めるボタン ---------- */
  var css = document.createElement("style");
  css.textContent =
    ".bgm-btn{position:fixed;z-index:60;right:calc(14px + env(safe-area-inset-right,0px));bottom:calc(14px + env(safe-area-inset-bottom,0px));" +
    "display:flex;align-items:center;justify-content:center;width:44px;height:44px;padding:0;border:1px solid rgba(0,0,0,.18);border-radius:50%;" +
    "background:rgba(255,255,255,.92);color:#111;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.18);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}" +
    ".bgm-btn svg{width:20px;height:20px;display:block;flex:0 0 auto}" +
    ".bgm-btn .tx{display:none;font:500 13px/1 \"Noto Sans JP\",\"Hiragino Sans\",\"Yu Gothic\",sans-serif;letter-spacing:.02em;white-space:nowrap}" +
    ".bgm-btn.wait{width:auto;gap:8px;padding:0 16px 0 14px;border-radius:22px}" +
    ".bgm-btn.wait .tx{display:inline}" +
    ".bgm-btn .w{transition:opacity .2s}" +
    ".bgm-btn[aria-pressed=false] .w{opacity:0}" +
    ".bgm-btn[aria-pressed=true] .x{opacity:0}" +
    "@media print{.bgm-btn{display:none}}";
  css.setAttribute("data-ng-keep", "");   // ページの中身を入れ替えるときも残すもの
  document.head.appendChild(css);
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "bgm-btn";
  btn.setAttribute("data-ng-keep", "");
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/>' +
    '<path class="w" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>' +
    '<path class="x" d="M16 9.5l5 5M21 9.5l-5 5"/></svg><span class="tx">音楽を流す</span>';
  function show(playing) {
    /* 流したいのに、まだタップが無くて鳴らせないときだけ「音楽を流す」と出す（自分で止めた人には出さない） */
    btn.classList.toggle("wait", !playing && !off);
    btn.setAttribute("aria-pressed", playing ? "true" : "false");
    btn.setAttribute("aria-label", playing ? "音楽を止める" : "音楽を流す");
    btn.title = playing ? "音楽を止める" : "音楽を流す";
  }
  show(false);
  function mount() { document.body.appendChild(btn); }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);

  /* ---------- 鳴らす・止める ---------- */
  function fadeTo(target, ms, done) {
    clearInterval(fadeT);
    var from = audio.volume, t0 = Date.now();
    fadeT = setInterval(function () {
      var q = Math.min(1, (Date.now() - t0) / ms);
      audio.volume = Math.max(0, Math.min(1, from + (target - from) * q));
      if (q >= 1) { clearInterval(fadeT); if (done) done(); }
    }, 40);
  }
  function restorePos() {
    var p = parseFloat(get("sessionStorage", KEY_POS));
    if (p > 0 && isFinite(p)) {
      try { audio.currentTime = audio.duration ? p % audio.duration : p; } catch (e) {}
    }
  }
  function play() {
    if (off) return;
    if (!started) restorePos();
    var r;
    try { r = audio.play(); } catch (e) { return; }
    if (r && r.then) {
      r.then(function () { started = true; show(true); fadeTo(VOL, 1500); }).catch(function () { show(false); });
    } else { started = true; show(true); fadeTo(VOL, 1500); }
  }
  function pause() {
    fadeTo(0, 300, function () { audio.pause(); });
    show(false);
  }
  function savePos() { if (started) set("sessionStorage", KEY_POS, String(audio.currentTime || 0)); }

  btn.addEventListener("click", function () {
    if (!audio.paused && audio.volume > 0) {
      off = true; set("localStorage", KEY_OFF, "1"); pause();
    } else {
      off = false; del("localStorage", KEY_OFF); play();
    }
  });

  /* 最初の操作で流す（ボタン自体を押したときは、ボタンの処理に任せる） */
  function firstTouch(e) {
    if (e && e.target && e.target.closest && e.target.closest(".bgm-btn, .ng-intro")) return;
    if (!off && audio.paused) play();
  }
  var FIRST = ["pointerdown", "pointerup", "keydown", "touchend", "click"];
  FIRST.forEach(function (ev) {
    document.addEventListener(ev, firstTouch, { capture: true, passive: true });
  });
  audio.addEventListener("playing", function () {
    FIRST.forEach(function (ev) {
      document.removeEventListener(ev, firstTouch, { capture: true });
    });
  });

  /* タブを裏に回したら止め、戻ったら続きから */
  var wasPlaying = false;
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { wasPlaying = !audio.paused; savePos(); audio.pause(); }
    else if (wasPlaying && !off) { audio.play().catch(function () { show(false); }); }
  });
  window.addEventListener("pagehide", savePos);
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted || off) return;
    var p = parseFloat(get("sessionStorage", KEY_POS));
    if (p > 0 && isFinite(p)) { try { audio.currentTime = audio.duration ? p % audio.duration : p; } catch (er) {} }
    if (audio.paused) play();
  });
  setInterval(savePos, 2000);

  /* ---------- 入口（ハル 2026-11-20「サイトへ飛んだらボタンをクリック。充電ゲージがたまる感じにして、溜まったらおしゃれなエフェクトで今のサイトが現れる感じにしてみて」）
     ブラウザは、見ている人が一度タップするまで音を出させないので、最初に「サイトに入る」を押してもらい、その押した瞬間に音楽を流し始める。
     押すと、細い充電のゲージが 0→100% までたまり、たまったゲージが横いっぱいに伸びて、その線から上下に黒い幕が開いてサイトが現れる。
     同じタブで一度入ったら、ほかのページへ移っても出さない（sessionStorage）。
     ページの <head> の小さな仕掛けが、入る前はページを隠しておく（html.ng-gate）。 */
  window.__ngGateReady = true;
  var root = document.documentElement;
  function buildGate() {
    var gcss = document.createElement("style");
    gcss.textContent =
      ".ng-intro{position:fixed;inset:0;z-index:2147483000;visibility:visible;color:#fff;font-family:\"Noto Sans JP\",\"Hiragino Sans\",\"Yu Gothic\",sans-serif;-webkit-font-smoothing:antialiased}" +
      ".ng-half{position:absolute;left:0;right:0;height:50.5%;background:#000;transition:transform 1.05s cubic-bezier(.77,0,.18,1)}" +
      ".ng-half.a{top:0}.ng-half.b{bottom:0}" +
      ".ng-intro.open{pointer-events:none}.ng-intro.open .ng-half.a{transform:translateY(-101%)}.ng-intro.open .ng-half.b{transform:translateY(101%)}" +
      ".ng-box{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;text-align:center;transition:opacity .35s ease,transform .35s ease}" +
      ".ng-logo{display:flex;align-items:center;gap:12px;font-weight:300;font-size:clamp(30px,6vw,44px);letter-spacing:-.02em;line-height:1;opacity:0;animation:ngUp .9s cubic-bezier(.2,.7,.2,1) .1s forwards}" +
      ".ng-mark{display:inline-flex;align-items:center;justify-content:center;width:1.05em;height:1.05em;border:1px solid currentColor;border-radius:.18em;font-family:\"Noto Serif JP\",\"Hiragino Mincho ProN\",\"Yu Mincho\",serif;font-weight:500;font-size:.8em}" +
      ".ng-sub{font-size:13px;font-weight:500;letter-spacing:.14em;color:rgba(255,255,255,.75);opacity:0;animation:ngUp .9s cubic-bezier(.2,.7,.2,1) .25s forwards}" +
      ".ng-enter{position:relative;margin-top:14px;min-height:54px;min-width:220px;padding:0 34px;border:1px solid rgba(255,255,255,.85);border-radius:4px;background:transparent;color:#fff;font:500 15px/1 \"Noto Sans JP\",\"Hiragino Sans\",sans-serif;letter-spacing:.12em;cursor:pointer;opacity:0;animation:ngUp .9s cubic-bezier(.2,.7,.2,1) .45s forwards,ngGlow 2.4s ease-in-out 1.4s infinite;transition:background .25s,color .25s}" +
      ".ng-enter:hover,.ng-enter:focus-visible{background:#fff;color:#000;outline:none}" +
      ".ng-note{font-size:12px;color:rgba(255,255,255,.6);opacity:0;animation:ngUp .9s cubic-bezier(.2,.7,.2,1) .6s forwards}" +
      ".ng-quiet{min-height:40px;padding:0 10px;border:0;background:none;color:rgba(255,255,255,.6);font:400 12px/1 \"Noto Sans JP\",\"Hiragino Sans\",sans-serif;text-decoration:underline;text-underline-offset:4px;cursor:pointer;opacity:0;animation:ngUp .9s cubic-bezier(.2,.7,.2,1) .7s forwards}" +
      ".ng-quiet:hover,.ng-quiet:focus-visible{color:#fff;outline:none}" +
      ".ng-intro.charging .ng-box{opacity:0;transform:scale(.97);pointer-events:none}" +
      ".ng-charge{position:absolute;left:50%;top:50%;width:min(320px,70vw);transform:translate(-50%,-50%);opacity:0;pointer-events:none;transition:opacity .3s ease .15s,width .5s cubic-bezier(.7,0,.2,1)}" +
      ".ng-intro.charging .ng-charge{opacity:1}" +
      ".ng-intro.full .ng-charge{width:100vw;transition:width .5s cubic-bezier(.7,0,.2,1)}" +
      ".ng-intro.open .ng-charge{opacity:0;transition:opacity .4s ease}" +
      ".ng-gauge{position:relative;height:2px;background:rgba(255,255,255,.16);overflow:hidden}" +
      ".ng-fill{position:absolute;inset:0;background:#fff;transform:scaleX(0);transform-origin:left center;box-shadow:0 0 12px rgba(255,255,255,.9)}" +
      ".ng-pct{display:flex;justify-content:space-between;margin-top:12px;font-size:12px;font-weight:300;letter-spacing:.22em;color:rgba(255,255,255,.75);font-variant-numeric:tabular-nums;transition:opacity .25s}" +
      ".ng-intro.full .ng-pct{opacity:0}" +
      "@keyframes ngUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}" +
      "@keyframes ngGlow{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}50%{box-shadow:0 0 22px 2px rgba(255,255,255,.22)}}" +
      "@media (prefers-reduced-motion:reduce){.ng-logo,.ng-sub,.ng-enter,.ng-note,.ng-quiet{animation:none;opacity:1}}";
    gcss.setAttribute("data-ng-keep", "");
    document.head.appendChild(gcss);

    var g = document.createElement("div");
    g.className = "ng-intro";
    g.setAttribute("role", "dialog");
    g.setAttribute("aria-modal", "true");
    g.setAttribute("aria-label", "NexusGuild の入口");
    g.innerHTML =
      '<div class="ng-half a"></div><div class="ng-half b"></div>' +
      '<div class="ng-box">' +
      '<p class="ng-logo"><span class="ng-mark" aria-hidden="true">N</span>NexusGuild</p>' +
      '<p class="ng-sub">埼玉・上福岡の、小さなスタジオ</p>' +
      '<button type="button" class="ng-enter">サイトに入る</button>' +
      '<p class="ng-note">音楽が小さく流れます</p>' +
      '<button type="button" class="ng-quiet">音を出さずに入る</button>' +
      '</div>' +
      '<div class="ng-charge" aria-hidden="true"><div class="ng-gauge"><i class="ng-fill"></i></div><p class="ng-pct"><span>CHARGING</span><span class="n">0%</span></p></div>';
    document.body.appendChild(g);
    var enterBtn = g.querySelector(".ng-enter");
    try { enterBtn.focus({ preventScroll: true }); } catch (e) {}

    var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var going = false;
    function finish() {
      root.classList.remove("ng-gate");
      if (g.parentNode) g.parentNode.removeChild(g);
    }
    function reveal() {
      g.classList.add("full");
      setTimeout(function () {
        root.classList.remove("ng-gate");   // 幕の向こうでページを見せ、止めていた最初の動きを動かす
        g.classList.add("open");
        setTimeout(finish, 1150);
      }, 520);
    }
    /* たまり方：少しずつ・途中で一息ついて・最後は一気に（約1.8秒） */
    function curve(t) {
      if (t < 0.5) return 0.62 * (1 - Math.pow(1 - t / 0.5, 2));
      if (t < 0.68) return 0.62 + 0.08 * ((t - 0.5) / 0.18);
      var u = (t - 0.68) / 0.32;
      return 0.70 + 0.30 * (u * u * (3 - 2 * u));
    }
    function charge() {
      var fill = g.querySelector(".ng-fill"), num = g.querySelector(".ng-pct .n");
      var t0 = null, DUR = 1800;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var t = Math.min(1, (ts - t0) / DUR), v = curve(t);
        fill.style.transform = "scaleX(" + v.toFixed(4) + ")";
        num.textContent = Math.round(v * 100) + "%";
        if (t < 1) requestAnimationFrame(step); else reveal();
      }
      requestAnimationFrame(step);
    }
    function enter(withSound) {
      if (going) return;
      going = true;
      set("sessionStorage", KEY_ENTERED, "1");
      if (withSound) {
        if (off) { off = false; del("localStorage", KEY_OFF); }
        play();                                   // 押した瞬間なので、どのブラウザでも鳴らせる
      } else {
        off = true; set("localStorage", KEY_OFF, "1"); show(false);
      }
      if (reduce) { finish(); return; }
      g.classList.add("charging");
      charge();
    }
    enterBtn.addEventListener("click", function () { enter(true); });
    g.querySelector(".ng-quiet").addEventListener("click", function () { enter(false); });
  }

  /* ---------- ページを移っても音楽を止めない（ハル 2026-11-21「料金タブへのクリックをボタンとして音楽が自動で流れるようにできないかな。
     サイトの音をうざったいと感じた人が止めるのはいいんだけど、自分から付けるのは違うからさ」）
     iPhone などは、新しく開いたページでは、もう一度タップするまで音を出させない。だから普通にページを移ると、料金ページで音楽が止まる。
     そこで、音楽つきのページ（この bgm.js を読んでいるページ）どうしを移るときは、ページを読み直さず、
     白い幕を一瞬かけて、その裏で中身だけを新しいページに入れ替える。音楽は同じページで鳴り続けるので途切れない。
     戻る・進むボタンにも対応する。うまくいかないとき・音楽の無いページへは、今までどおり普通に移る。 */
  var siteRoot = new URL("../", me.src);
  var veil = null, navBusy = false;
  function keyOf(u) { return u.pathname.replace(/index\.html$/, ""); }
  var curKey = keyOf(location);
  function ours(u) {
    return u.origin === location.origin && !u.search && u.pathname.indexOf(siteRoot.pathname) === 0 &&
      /(\/|\.html)$/.test(u.pathname);
  }
  function veilOn(on) {
    if (!veil) {
      var vcss = document.createElement("style");
      vcss.setAttribute("data-ng-keep", "");
      vcss.textContent =
        ".ng-veil{position:fixed;inset:0;z-index:2147482000;background:#fff;opacity:0;pointer-events:none;transition:opacity .28s ease}" +
        ".ng-veil.on{opacity:1;pointer-events:auto}" +
        "@media (prefers-reduced-motion:reduce){.ng-veil{transition:none}}";
      document.head.appendChild(vcss);
      veil = document.createElement("div");
      veil.className = "ng-veil";
      veil.setAttribute("data-ng-keep", "");
      veil.setAttribute("aria-hidden", "true");
      document.body.appendChild(veil);
      void veil.offsetWidth;   // 幕がふわっと出るように、透明な状態をいったん確定させる
    }
    veil.classList.toggle("on", on);
  }
  function scrollNow(y, el) {
    var b = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";   // ページの「なめらかに動く」設定を、入れ替えの瞬間だけ外す
    if (el) el.scrollIntoView(); else window.scrollTo(0, y || 0);
    root.style.scrollBehavior = b;
  }
  function swap(doc, href, push, y) {
    if (push) history.pushState({ ngY: 0 }, "", href);   // 先に住所を変える（新しい中身の写真などが、新しい住所から読み込まれるように）
    curKey = keyOf(location);

    /* <head>：同じものは残し、違うもの（題名・説明・ページの見た目）だけ入れ替える。script は動かし直さない */
    var head = document.head, keepAt = head.querySelector("[data-ng-keep]");
    var next = [].filter.call(doc.head.children, function (n) { return n.tagName !== "SCRIPT"; });
    var nextHtml = next.map(function (n) { return n.outerHTML; });
    [].slice.call(head.children).forEach(function (n) {
      if (n.tagName === "SCRIPT" || n.hasAttribute("data-ng-keep")) return;
      var i = nextHtml.indexOf(n.outerHTML);
      if (i >= 0) nextHtml[i] = null; else head.removeChild(n);
    });
    next.forEach(function (n, i) { if (nextHtml[i] !== null) head.insertBefore(document.importNode(n, true), keepAt); });

    /* <body>：音楽のボタンと幕だけ残して、中身を入れ替える。ページの script は、最初に開いたときと同じ順に動かす */
    var body = document.body, nb = doc.body;
    [].slice.call(body.attributes).forEach(function (a) { body.removeAttribute(a.name); });
    [].forEach.call(nb.attributes, function (a) { body.setAttribute(a.name, a.value); });
    [].slice.call(body.childNodes).forEach(function (n) {
      if (!(n.nodeType === 1 && n.hasAttribute("data-ng-keep"))) body.removeChild(n);
    });
    var at = body.firstChild;
    [].slice.call(nb.childNodes).forEach(function (n) {
      if (n.nodeName !== "SCRIPT") { body.insertBefore(document.importNode(n, true), at); return; }
      if (/assets\/bgm\.js/.test(n.getAttribute("src") || "")) return;   // この仕組み自体は動かし直さない
      var s = document.createElement("script");
      [].forEach.call(n.attributes, function (a) { s.setAttribute(a.name, a.value); });
      if (s.src) s.async = false; else s.text = n.text;
      body.insertBefore(s, at);
    });

    var hash = new URL(href, location.href).hash, el = null;
    if (hash) { try { el = document.getElementById(decodeURIComponent(hash.slice(1))); } catch (e) {} }
    scrollNow(y, el);
    requestAnimationFrame(function () { scrollNow(y, el); });   // 前のページでなめらかに動いている途中に押されたときの、動きの残りを打ち消す
  }
  /* 戻る・進むで、そのページを見ていた高さへ戻す。ブラウザ任せにすると、入れ替える前の中身の上で勝手に動いて高さがずれるので、
     一度入れ替えたら、高さはこちらで覚えて戻す（止まって0.2秒たった高さを、その履歴に書いておく） */
  var taken = false, trackT = 0;
  function rememberNow() {
    try {
      var s = history.state && typeof history.state === "object" ? history.state : {}, o = {};
      for (var k in s) o[k] = s[k];
      o.ngY = window.scrollY;
      history.replaceState(o, "");
    } catch (e) {}
  }
  window.addEventListener("scroll", function () {
    clearTimeout(trackT);
    trackT = setTimeout(function () { if (!navBusy) rememberNow(); }, 200);
  }, { passive: true });
  try {
    if (history.scrollRestoration === "manual" && history.state && typeof history.state.ngY === "number") {
      window.addEventListener("load", function () { scrollNow(history.state.ngY); });   // 入れ替えたあとのページを読み直したとき
    }
  } catch (e) {}
  function go(href, push, y) {
    if (navBusy) return true;
    navBusy = true;
    clearTimeout(trackT);
    if (push) rememberNow();   // 戻ったときに、同じ高さへ戻すため
    if (!taken) { taken = true; try { history.scrollRestoration = "manual"; } catch (e) {} }
    var t0 = Date.now();
    function fallback() {
      if (!push || keyOf(location) === keyOf(new URL(href, location.href))) location.reload(); else location.href = href;
    }
    veilOn(true);
    fetch(href, { credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error("status"); return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        if (!doc.querySelector('script[src*="assets/bgm.js"]')) throw new Error("no-bgm");   // 音楽の無いページは普通に移る
        setTimeout(function () {
          try { swap(doc, href, push, y); } catch (e) { fallback(); return; }
          requestAnimationFrame(function () { veilOn(false); });
          navBusy = false;
          if (keyOf(location) !== curKey) go(location.href, false, 0);   // 入れ替えの最中に「戻る」が押されていたら、そちらへ
        }, Math.max(0, 300 - (Date.now() - t0)));
      })
      .catch(fallback);
    return true;
  }
  /* トップの「料金」の効果音の仕組みからも呼ぶ。引き受けたら true を返す */
  window.__ngNav = function (href) {
    var u;
    try { u = new URL(href, location.href); } catch (e) { return false; }
    if (!window.fetch || !window.DOMParser || !history.pushState || !ours(u) || keyOf(u) === curKey) return false;
    return go(u.href, true, 0);
  };
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    if (window.__ngNav(a.href)) e.preventDefault();
  });
  window.addEventListener("popstate", function (e) {
    if (navBusy) return;
    var y = e.state && typeof e.state.ngY === "number" ? e.state.ngY : null;
    if (keyOf(location) !== curKey) { go(location.href, false, y || 0); return; }
    /* 同じページの中の移動（#contact など）。高さをこちらで預かっているときだけ、こちらで戻す */
    if (!taken) return;
    var el = null;
    if (y === null && location.hash) { try { el = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (er) {} }
    if (y !== null || el) scrollNow(y, el);
  });

  if (root.classList.contains("ng-gate")) {
    if (document.body) buildGate(); else document.addEventListener("DOMContentLoaded", buildGate);
  } else if (!off) {
    play();
  }
})();
