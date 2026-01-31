// src/main.js
// Become a Chess Master - main (boot + routing + wiring only)

import { BUILD, resetGame, undoGame, canUndo } from "./engine.js";
import { renderBoard, setViewFlipped } from "./render.js";
import { initAcademyScreen } from "./academy.js";

if (window.__chessLoaded) throw new Error("main.js loaded twice");
window.__chessLoaded = true;

console.log("[BUILD]", BUILD);

let currentScreen = "home";

/* =========================
   Boot
   ========================= */

injectShellStyles();
mountAppShell();
setBuildLabels();

initTopNav();
initMainMenu();
initKeyboardShortcuts();
initRouteFromHash();

wirePlayButtons();
initAcademyScreen();

resetGame();
renderIfPlay();

/* =========================
   Router
   ========================= */

function routeTo(screen) {
  currentScreen = screen;

  document.querySelectorAll(".screen").forEach((s) => {
    s.classList.toggle("active", s.id === "screen-" + screen);
  });

  document.querySelectorAll(".navBtn").forEach((b) => {
    const on = b.dataset.screen === screen;
    b.classList.toggle("active", on);
    b.setAttribute("aria-current", on ? "page" : "false");
  });

  // hide nav on home for a cleaner first impression
  const topNav = document.getElementById("topNav");
  if (topNav) topNav.classList.toggle("hidden", screen === "home");

  // remember for Continue
  try { localStorage.setItem("lastScreen", screen); } catch {}

  // update URL
  history.replaceState(null, "", "#" + screen);

  renderIfPlay();
}

function renderIfPlay() {
  if (currentScreen !== "play") return;
  renderBoard();
}

/* =========================
   Wiring
   ========================= */

function initTopNav() {
  const nav = document.getElementById("topNav");
  if (!nav) return;

  nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".navBtn");
    if (!btn) return;
    routeTo(btn.dataset.screen);
  });
}

function initMainMenu() {
  const home = document.getElementById("screen-home");
  if (!home) return;

  home.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]")?.dataset?.go;
    if (go) routeTo(go);
  });

  const btnContinue = document.getElementById("btnContinue");
  const continueHint = document.getElementById("continueHint");

  function refreshContinueLabel() {
    const last = safeLastScreen();
    if (continueHint) continueHint.textContent = `Resume: ${last}`;
  }

  refreshContinueLabel();

  btnContinue?.addEventListener("click", () => {
    routeTo(safeLastScreen());
  });
}

function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") routeTo("home");
  });
}

function initRouteFromHash() {
  const h = (location.hash || "#home").replace("#", "").trim();
  const valid = new Set(["home", "play", "academy", "quick", "ladder", "unlocks", "settings"]);
  routeTo(valid.has(h) ? h : "home");
}

function wirePlayButtons() {
  document.getElementById("btnReset")?.addEventListener("click", () => {
    resetGame();
    renderIfPlay();
  });

  document.getElementById("btnUndo")?.addEventListener("click", () => {
    if (!canUndo()) return;
    undoGame();
    renderIfPlay();
  });

  document.getElementById("btnFlip")?.addEventListener("click", () => {
    setViewFlipped((v) => !v);
    renderIfPlay();
  });
}

/* =========================
   Helpers
   ========================= */

function safeLastScreen() {
  let last = "play";
  try { last = localStorage.getItem("lastScreen") || "play"; } catch {}
  if (!last || last === "home") last = "play";
  return last;
}

function setBuildLabels() {
  const buildLabel = document.getElementById("buildLabel");
  if (buildLabel) buildLabel.textContent = "Build " + BUILD;

  const buildLabelHome = document.getElementById("buildLabelHome");
  if (buildLabelHome) buildLabelHome.textContent = "Build " + BUILD;
}

/* =========================
   Shell
   ========================= */

function mountAppShell() {
  document.body.innerHTML = `
    <div class="app">
      <div class="header">
        <div>
          <h1>Become a Chess Master</h1>
          <div class="sub">Local 2-player • legal moves • real rules • <span id="buildLabel"></span></div>

          <div class="topNav" id="topNav">
            <button class="navBtn" data-screen="home">Menu</button>
            <button class="navBtn" data-screen="play">Play</button>
            <button class="navBtn" data-screen="academy">Academy</button>
            <button class="navBtn" data-screen="quick">Quick Match</button>
            <button class="navBtn" data-screen="ladder">Ladder</button>
            <button class="navBtn" data-screen="unlocks">Unlocks</button>
            <button class="navBtn" data-screen="settings">Settings</button>
          </div>
        </div>

        <div class="sub" id="statusTop"></div>
      </div>

      <main>
        <section class="screen" id="screen-home">
          <div class="menuWrap">
            <div class="menuCard">
              <h2 class="menuTitle">Main Menu</h2>
              <p class="menuSub">Jump in fast, no clutter. Your current build is <span id="buildLabelHome"></span>.</p>

              <div class="menuRow">
                <button class="menuBtn menuBtnWide" id="btnContinue">
                  Continue
                  <div class="menuBtnSmall" id="continueHint">Resume where you left off</div>
                </button>
              </div>

              <div class="menuGrid" style="margin-top:10px">
                <button class="menuBtn" data-go="play">Play<div class="menuBtnSmall">Local 2-player, real rules</div></button>
                <button class="menuBtn" data-go="quick">Quick Match<div class="menuBtnSmall">AI buttons later</div></button>
                <button class="menuBtn" data-go="academy">Academy<div class="menuBtnSmall">Learn by doing</div></button>
                <button class="menuBtn" data-go="ladder">Ladder<div class="menuBtnSmall">Progression later</div></button>
                <button class="menuBtn" data-go="unlocks">Unlocks<div class="menuBtnSmall">Rewards later</div></button>
                <button class="menuBtn" data-go="settings">Settings<div class="menuBtnSmall">Helpers and visuals</div></button>
              </div>

              <div class="menuHint">Tip: press Escape anytime to return here.</div>
            </div>
          </div>
        </section>

        <section class="screen" id="screen-play">
          <div class="boardWrap">
            <div id="board"></div>
            <div id="gameOver" class="gameOver hidden"></div>
          </div>

          <aside class="side">
            <div class="row">
              <div>
                <div class="label">Turn</div>
                <div class="value" id="turnLabel">—</div>
              </div>
              <div>
                <div class="label">State</div>
                <div class="value" id="stateLabel">—</div>
              </div>
            </div>

            <div class="row">
              <div>
                <div class="label">Last move</div>
                <div class="value" id="lastMove">—</div>
              </div>
            </div>

            <div class="btnRow">
              <button id="btnUndo">Undo</button>
              <button id="btnReset">Reset</button>
              <button id="btnFlip">Flip board</button>
            </div>

            <div class="small">
              Includes: castling, en passant, promotion choice, 50-move, repetition, insufficient material.<br/>
              Not yet: clocks, PGN export, AI, learn mode.
            </div>
          </aside>

          <div id="promoModal" class="modal hidden" role="dialog" aria-modal="true">
            <div class="modalCard">
              <div class="modalTitle">Promote to</div>
              <div class="modalBtns" id="promoBtns"></div>
              <div class="modalHint">Click a piece</div>
            </div>
          </div>
        </section>

        <section class="screen" id="screen-academy"></section>

        <section class="screen" id="screen-quick">
          <div class="side">
            <div class="label">Quick Match</div>
            <div class="small">Next: Easy, Medium, Hard buttons + start game.</div>
          </div>
        </section>

        <section class="screen" id="screen-ladder">
          <div class="side">
            <div class="label">Ladder</div>
            <div class="small">Next: rank progression + scaling AI.</div>
          </div>
        </section>

        <section class="screen" id="screen-unlocks">
          <div class="side">
            <div class="label">Unlocks</div>
            <div class="small">Next: registry-driven list, locked/unlocked states.</div>
          </div>
        </section>

        <section class="screen" id="screen-settings">
          <div class="side">
            <div class="label">Settings</div>
            <div class="small">Next: toggles like show legal moves, flip default, theme.</div>
          </div>
        </section>
      </main>
    </div>
  `;
}

function injectShellStyles() {
  const css = `
    .topNav{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 0}
    .navBtn{padding:8px 10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.04);color:#fff;border-radius:10px;cursor:pointer}
    .navBtn.active{border-color:rgba(212,175,55,.7);box-shadow:0 0 0 2px rgba(212,175,55,.15) inset}
    .screen{display:none}
    .screen.active{display:block}
    .hidden{display:none !important}

    .menuWrap{min-height:calc(100vh - 140px);display:grid;place-items:center;padding:18px}
    .menuCard{width:min(820px,100%);padding:22px;border-radius:18px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);box-shadow:0 12px 50px rgba(0,0,0,.35)}
    .menuTitle{font-size:22px;font-weight:800;letter-spacing:.2px;margin:0 0 10px}
    .menuSub{opacity:.85;margin:0 0 16px;line-height:1.35}
    .menuGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .menuBtn{padding:14px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;cursor:pointer;text-align:left}
    .menuBtn:hover{border-color:rgba(212,175,55,.55)}
    .menuBtnSmall{opacity:.85;font-size:12px;margin-top:6px}
    .menuRow{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
    .menuBtnWide{flex:1;min-width:220px}
    .menuHint{opacity:.75;font-size:12px;margin-top:12px}
  `;
  const style = document.createElement("style");
  style.id = "mainShellStyles";
  style.textContent = css;
  document.head.appendChild(style);
}

