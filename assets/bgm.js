/* サイト全体のBGM（ハル 2026-11-20「サイトに来るとこの音源が小さく流れるようにしてほしい。どのページでも」）
   曲: BGMer「角砂糖をもうひとつ」（https://bgmer.net/ 商用利用可・クレジット任意）
   - ブラウザは、見ている人がまだ何も操作していないページで音を鳴らすのを止めるので、
     鳴らせなかったときは、最初にどこかを押した・キーを押した瞬間から流す
   - ページを移っても続きから流れるように、再生位置を sessionStorage に残す
   - 右下のボタンで止められる。止めたことは localStorage に残し、次からは流さない
   - タブを裏に回したら止め、戻ったら続きから流す */
(function () {
  "use strict";
  var me = document.currentScript;
  if (!me || !window.Audio) return;
  var SRC = new URL("sound/bgm.mp3", me.src).href;
  var VOL = 0.12;            // 小さく
  var KEY_OFF = "ng-bgm-off";
  var KEY_POS = "ng-bgm-pos";

  function get(store, k) { try { return window[store].getItem(k); } catch (e) { return null; } }
  function set(store, k, v) { try { window[store].setItem(k, v); } catch (e) {} }
  function del(store, k) { try { window[store].removeItem(k); } catch (e) {} }

  var audio = new Audio();
  audio.src = SRC;
  audio.loop = true;
  audio.preload = "auto";
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
    ".bgm-btn svg{width:20px;height:20px;display:block}" +
    ".bgm-btn .w{transition:opacity .2s}" +
    ".bgm-btn[aria-pressed=false] .w{opacity:0}" +
    ".bgm-btn[aria-pressed=true] .x{opacity:0}" +
    "@media print{.bgm-btn{display:none}}";
  document.head.appendChild(css);
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "bgm-btn";
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/>' +
    '<path class="w" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>' +
    '<path class="x" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
  function show(playing) {
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
    if (e && e.target && e.target.closest && e.target.closest(".bgm-btn")) return;
    if (!off && audio.paused) play();
  }
  ["pointerdown", "keydown", "touchend"].forEach(function (ev) {
    document.addEventListener(ev, firstTouch, { capture: true, passive: true });
  });
  audio.addEventListener("playing", function () {
    ["pointerdown", "keydown", "touchend"].forEach(function (ev) {
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
  setInterval(savePos, 2000);

  if (!off) play();
})();
