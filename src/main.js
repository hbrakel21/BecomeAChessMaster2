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
  return b;
}

function render(){
  boardNode.innerHTML = "";
  const oriented = getOrientedSquares();

  const inCheck = isKingInCheck(board, turn);
  const anyMoves = hasAnyLegalMove(board, turn);
  const state = !anyMoves
    ? (inCheck ? "Checkmate" : "Stalemate")
    : (inCheck ? "Check" : "Playing");

  turnLabel.textContent = turn === "w" ? "White" : "Black";
  stateLabel.textContent = state;
  statusTop.textContent = (state === "Playing" ? "" : state);

  // Highlight king in check
  const kingPos = findKing(board, turn);
  const kingKey = kingPos ? `${kingPos.r},${kingPos.c}` : null;

  for(const sq of oriented){
    const {r,c} = sq;
    const btn = document.createElement("div");
    btn.className = "square " + (((r + c) % 2 === 0) ? "light" : "dark");
    btn.dataset.r = r;
    btn.dataset.c = c;

    const p = board[r][c];
    if(p) btn.textContent = PIECES[p.c][p.t];

    // selection
    if(selected && selected.r === r && selected.c === c) btn.classList.add("selected");

    // hints
    const key = `${r},${c}`;
    const target = legalTargets.find(m => m.r === r && m.c === c);
    if(target){
      if(board[r][c]) btn.classList.add("captureHint");
      else btn.classList.add("hint");
    }

    // check highlight
    if(kingKey === key && isKingInCheck(board, turn)) btn.classList.add("check");

    btn.addEventListener("click", onSquareClick);
    boardNode.appendChild(btn);
  }
}

function getOrientedSquares(){
  // returns array of {r,c} in render order
  const squares = [];
  if(!viewFlipped){
    for(let r=0;r<8;r++) for(let c=0;c<8;c++) squares.push({r,c});
  } else {
    for(let r=7;r>=0;r--) for(let c=7;c>=0;c--) squares.push({r,c});
  }
  return squares;
}

function onSquareClick(e){
  const r = +e.currentTarget.dataset.r;
  const c = +e.currentTarget.dataset.c;

  const p = board[r][c];

  // If something selected, try move
  if(selected){
    const target = legalTargets.find(m => m.r === r && m.c === c);
    if(target){
      makeMove(selected, {r,c});
      return;
    }
  }

  // Select your own piece
  if(p && p.c === turn){
    selected = {r,c};
    legalTargets = legalMovesFrom(board, turn, r, c);
  } else {
    selected = null;
    legalTargets = [];
  }
  render();
}

function makeMove(from, to){
  const snap = snapshot(board, turn);
  history.push(snap);

  const moving = board[from.r][from.c];
  board[to.r][to.c] = moving;
  board[from.r][from.c] = null;

  // promotion (simple: auto queen)
  if(moving.t === "P"){
    if(moving.c === "w" && to.r === 0) moving.t = "Q";
    if(moving.c === "b" && to.r === 7) moving.t = "Q";
  }

  selected = null;
  legalTargets = [];

  // switch turn
  turn = (turn === "w") ? "b" : "w";
  render();
}

function undo(){
  if(history.length === 0) return;
  const prev = history.pop();
  board = prev.board;
  turn = prev.turn;
  selected = null;
  legalTargets = [];
  render();
}

function snapshot(b, t){
  // deep copy pieces
  const copy = b.map(row => row.map(p => p ? ({c:p.c, t:p.t}) : null));
  return { board: copy, turn: t };
}

// --- Rules (no castling/en-passant yet) ---

function legalMovesFrom(b, side, r, c){
  const p = b[r][c];
  if(!p || p.c !== side) return [];

  const pseudo = pseudoMoves(b, r, c, p);
  // filter moves that leave your king in check
  const legal = [];
  for(const m of pseudo){
    const bb = applyMoveCopy(b, {r,c}, m);
    if(!isKingInCheck(bb, side)) legal.push(m);
  }
  return legal;
}

function hasAnyLegalMove(b, side){
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const p = b[r][c];
      if(p && p.c === side){
        if(legalMovesFrom(b, side, r, c).length > 0) return true;
      }
    }
  }
  return false;
}

function applyMoveCopy(b, from, to){
  const copy = b.map(row => row.map(p => p ? ({c:p.c, t:p.t}) : null));
  const moving = copy[from.r][from.c];
  copy[to.r][to.c] = moving;
  copy[from.r][from.c] = null;

  // promo
  if(moving.t === "P"){
    if(moving.c === "w" && to.r === 0) moving.t = "Q";
    if(moving.c === "b" && to.r === 7) moving.t = "Q";
  }

  return copy;
}

function isKingInCheck(b, side){
  const k = findKing(b, side);
  if(!k) return false;
  const enemy = (side === "w") ? "b" : "w";
  return isSquareAttacked(b, k.r, k.c, enemy);
}

function findKing(b, side){
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const p = b[r][c];
      if(p && p.c === side && p.t === "K") return {r,c};
    }
  }
  return null;
}

function isSquareAttacked(b, r, c, bySide){
  for(let rr=0; rr<8; rr++){
    for(let cc=0; cc<8; cc++){
      const p = b[rr][cc];
      if(p && p.c === bySide){
        const moves = pseudoMoves(b, rr, cc, p, true);
        if(moves.some(m => m.r === r && m.c === c)) return true;
      }
    }
  }
  return false;
}

// pseudoMoves: generate moves ignoring check rule
// attackOnly=true makes pawn moves use only capture attacks
function pseudoMoves(b, r, c, p, attackOnly=false){
  const res = [];
  const side = p.c;
  const enemy = side === "w" ? "b" : "w";

  const inside = (rr,cc) => rr>=0 && rr<8 && cc>=0 && cc<8;
  const at = (rr,cc) => b[rr][cc];

  if(p.t === "P"){
    const dir = (side === "w") ? -1 : 1;
    const startRow = (side === "w") ? 6 : 1;

    // captures
    for(const dc of [-1, 1]){
      const rr = r + dir, cc = c + dc;
      if(!inside(rr,cc)) continue;
      if(attackOnly){
        res.push({r:rr, c:cc});
      } else {
        const target = at(rr,cc);
        if(target && target.c === enemy) res.push({r:rr, c:cc});
      }
    }

    if(attackOnly) return res;

    // forward
    const one = r + dir;
    if(inside(one,c) && !at(one,c)){
      res.push({r:one, c});
      // two squares
      const two = r + 2*dir;
      if(r === startRow && inside(two,c) && !at(two,c)){
        res.push({r:two, c});
      }
    }
    return res;
  }

  if(p.t === "N"){
    const jumps = [
      [-2,-1],[-2,1],[-1,-2],[-1,2],
      [1,-2],[1,2],[2,-1],[2,1]
    ];
    for(const [dr,dc] of jumps){
      const rr=r+dr, cc=c+dc;
      if(!inside(rr,cc)) continue;
      const t = at(rr,cc);
      if(!t || t.c === enemy) res.push({r:rr, c:cc});
    }
    return res;
  }

  if(p.t === "K"){
    for(let dr=-1; dr<=1; dr++){
      for(let dc=-1; dc<=1; dc++){
        if(dr===0 && dc===0) continue;
        const rr=r+dr, cc=c+dc;
        if(!inside(rr,cc)) continue;
        const t = at(rr,cc);
        if(!t || t.c === enemy) res.push({r:rr, c:cc});
      }
    }
    return res;
  }

  const sliders = {
    B: [[-1,-1],[-1,1],[1,-1],[1,1]],
    R: [[-1,0],[1,0],[0,-1],[0,1]],
    Q: [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]
  };

  if(sliders[p.t]){
    for(const [dr,dc] of sliders[p.t]){
      let rr=r+dr, cc=c+dc;
      while(inside(rr,cc)){
        const t = at(rr,cc);
        if(!t){
          res.push({r:rr, c:cc});
        } else {
          if(t.c === enemy) res.push({r:rr, c:cc});
          break;
        }
        rr += dr; cc += dc;
      }
    }
    return res;
  }

  return res;
}
