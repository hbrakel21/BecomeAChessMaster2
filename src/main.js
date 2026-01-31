// Become a Chess Master - v1: playable local 2-player chess (no AI yet)

const PIECES = {
  w: { K:"♔", Q:"♕", R:"♖", B:"♗", N:"♘", P:"♙" },
  b: { K:"♚", Q:"♛", R:"♜", B:"♝", N:"♞", P:"♟" },
};

const boardEl = document.getElementById("board");

// --- UI shell injected (so you don't have to edit HTML again right now)
(function mountAppShell(){
  const h1 = document.querySelector("h1");
  const body = document.body;

  // If you still have the simple HTML, upgrade it in-place
  body.innerHTML = `
    <div class="app">
      <div class="header">
        <div>
          <h1>Become a Chess Master</h1>
          <div class="sub">Local 2-player • click to move • legal moves only</div>
        </div>
        <div class="sub" id="statusTop"></div>
      </div>

      <div class="boardWrap">
        <div id="board"></div>
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

        <div class="btnRow">
          <button id="btnUndo">Undo</button>
          <button id="btnReset">Reset</button>
          <button id="btnFlip">Flip board</button>
        </div>

        <div class="small">
          Big rules included: legal moves, check rule, captures, promotion to queen. <br/>
          Not yet: castling, en passant, draw rules.
        </div>
      </aside>
    </div>
  `;
})();

// re-grab board after shell mount
const boardNode = document.getElementById("board");
const turnLabel = document.getElementById("turnLabel");
const stateLabel = document.getElementById("stateLabel");
const statusTop = document.getElementById("statusTop");

document.getElementById("btnUndo").addEventListener("click", undo);
document.getElementById("btnReset").addEventListener("click", reset);
document.getElementById("btnFlip").addEventListener("click", () => {
  viewFlipped = !viewFlipped;
  render();
});

let viewFlipped = false;

// Board model: 8x8, [r][c], r=0 is black back rank in standard orientation
// piece = {c:'w'|'b', t:'P'|'N'|'B'|'R'|'Q'|'K'}
let board, turn, selected, legalTargets, history;

reset();

function reset(){
  board = startPosition();
  turn = "w";
  selected = null;
  legalTargets = [];
  history = [];
  render();
}

function startPosition(){
  const empty = () => Array.from({length:8}, () => Array(8).fill(null));
  const b = empty();

  const back = ["R","N","B","Q","K","B","N","R"];
  for(let c=0;c<8;c++){
    b[0][c] = {c:"b", t:back[c]};
    b[1][c] = {c:"b", t:"P"};
    b[6][c] = {c:"w", t:"P"};
    b[7][c] = {c:"w", t:back[c]};
  }
