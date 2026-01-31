// src/academy.js
import { loadProgress, saveProgress } from "./storage.js";
import { setPositionFromKey, setTurn, getState, tryMoveUci } from "./engine.js";
import { renderBoard } from "./render.js";

const LESSONS = [
  {
    id: "basics_knight_1",
    title: "Knight moves",
    desc: "Move the knight to the highlighted square.",
    setup: {
      // super simple “position key” you define in engine (or later replace with FEN)
      positionKey: "lesson_knight_1",
      turn: "w",
      allowedUci: ["b1a3"], // only allow this move
    },
    hint: "Knights move in an L shape. Two squares then one.",
    explain: "Nice. Knights jump over pieces, so blocking doesn’t matter.",
    xp: 10
  },
];

let activeLesson = null;

export function initAcademyScreen(){
  const screen = document.getElementById("screen-academy");
  if(!screen) return;

  screen.innerHTML = `
    <div class="side">
      <div class="label">Academy</div>
      <div class="small">Learn by doing. Short drills, instant feedback.</div>
      <div id="academyList" style="margin-top:12px; display:grid; gap:10px"></div>
      <div id="academyCard" style="margin-top:14px"></div>
    </div>
  `;

  renderLessonList();

  screen.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-lesson]");
    if(!btn) return;
    startLesson(btn.dataset.lesson);
  });
}

function renderLessonList(){
  const list = document.getElementById("academyList");
  if(!list) return;

  const prog = loadProgress();
  list.innerHTML = LESSONS.map(lsn => {
    const done = !!prog.academyDone?.[lsn.id];
    return `
      <button class="menuBtn" data-lesson="${lsn.id}">
        ${lsn.title} ${done ? "✓" : ""}
        <div class="menuBtnSmall">${lsn.desc}</div>
      </button>
    `;
  }).join("");
}

function startLesson(id){
  const lsn = LESSONS.find(x => x.id === id);
  if(!lsn) return;

  activeLesson = lsn;

  // Set board + turn
  setPositionFromKey(lsn.setup.positionKey);
  setTurn(lsn.setup.turn);

  // Mark engine as “academy mode” (we read allowed moves from lesson)
  const st = getState();
  st.mode = "academy";
  st.academyAllowedUci = lsn.setup.allowedUci;

  renderBoard();
  renderLessonCard("active");
}

function renderLessonCard(state){
  const card = document.getElementById("academyCard");
  if(!card || !activeLesson) return;

  const html =
    state === "active" ? `
      <div class="menuCard">
        <div class="menuTitle">${activeLesson.title}</div>
        <div class="menuSub">${activeLesson.desc}</div>
        <div class="menuHint">Hint: ${activeLesson.hint}</div>
      </div>
    ` : `
      <div class="menuCard">
        <div class="menuTitle">Completed</div>
        <div class="menuSub">${activeLesson.explain}</div>
        <div class="menuHint">XP +${activeLesson.xp}</div>
      </div>
    `;

  card.innerHTML = html;
}

// called by engine/render when a move is made in academy mode
export function onAcademyMoveResult(ok){
  if(!activeLesson) return;

  if(ok){
    const prog = loadProgress();
    prog.academyDone = prog.academyDone || {};
    prog.academyDone[activeLesson.id] = true;
    prog.xp = (prog.xp || 0) + activeLesson.xp;
    saveProgress(prog);

    renderLessonList();
    renderLessonCard("done");
  } else {
    // keep it simple for now: just re-render hint card
    renderLessonCard("active");
  }
}
