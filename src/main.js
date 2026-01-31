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
      <div id="gameOver" class="gameOver hidden"></div>

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
const gameOverEl = document.getElementById("gameOver");
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
// Become a Chess Master - v2: real chess rules (castling, en passant, promotion choice, draws)

const PIECES = {
  w: { K:"♔", Q:"♕", R:"♖", B:"♗", N:"♘", P:"♙" },
  b: { K:"♚", Q:"♛", R:"♜", B:"♝", N:"♞", P:"♟" },
};

(function mountAppShell(){
  document.body.innerHTML = `
    <div class="app">
      <div class="header">
        <div>
          <h1>Become a Chess Master</h1>
          <div class="sub">Local 2-player • legal moves • real rules</div>
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
          Includes: castling, en passant, promotion choice, 50-move, repetition, insufficient material. <br/>
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
    </div>
  `;
})();

const boardNode = document.getElementById("board");
const turnLabel = document.getElementById("turnLabel");
const stateLabel = document.getElementById("stateLabel");
const statusTop = document.getElementById("statusTop");
const lastMoveEl = document.getElementById("lastMove");
const promoModal = document.getElementById("promoModal");
const promoBtns = document.getElementById("promoBtns");

document.getElementById("btnUndo").addEventListener("click", undo);
document.getElementById("btnReset").addEventListener("click", reset);
document.getElementById("btnFlip").addEventListener("click", () => {
  viewFlipped = !viewFlipped;
  render();
});

let viewFlipped = false;

// piece: {c:'w'|'b', t:'P'|'N'|'B'|'R'|'Q'|'K'}
let state;

reset();

function reset(){
  state = {
    board: startPosition(),
    turn: "w",
    selected: null,
    legalTargets: [],
    history: [],
    lastMove: null,
    castling: { w:{K:true,Q:true}, b:{K:true,Q:true} },
    enPassant: null, // {r,c} square that can be captured into
    halfmove: 0, // for 50-move rule
    fullmove: 1,
    repetition: new Map(), // position key -> count
    gameOver: null, // {type:'checkmate'|'stalemate'|'draw', reason?:string}
    pendingPromotion: null, // {from,to,color}
  };

  bumpRepetition();
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
  const b = state.board;

  const inCheck = isKingInCheck(b, state.turn, state);
  const anyMoves = hasAnyLegalMove(b, state.turn, state);

  if(!state.gameOver){
    // determine end states
    if(!anyMoves){
      state.gameOver = inCheck ? {type:"checkmate"} : {type:"stalemate"};
    } else {
      const draw = checkDraws();
      if(draw) state.gameOver = {type:"draw", reason: draw};
    }
  }

  const status =
    state.gameOver?.type === "checkmate" ? "Checkmate" :
    state.gameOver?.type === "stalemate" ? "Stalemate" :
    state.gameOver?.type === "draw" ? `Draw (${state.gameOver.reason})` :
    (inCheck ? "Check" : "Playing");

  turnLabel.textContent = state.turn === "w" ? "White" : "Black";
  stateLabel.textContent = status;
  statusTop.textContent = (status === "Playing" ? "" : status);
  lastMoveEl.textContent = state.lastMove ? state.lastMove : "—";

  // Highlight king in check
  const kingPos = findKing(b, state.turn);
  const kingKey = kingPos ? `${kingPos.r},${kingPos.c}` : null;

  for(const sq of oriented){
    const {r,c} = sq;
    const cell = document.createElement("div");
    cell.className = "square " + (((r + c) % 2 === 0) ? "light" : "dark");
    cell.dataset.r = r;
    cell.dataset.c = c;

    const p = b[r][c];
    if(p) cell.textContent = PIECES[p.c][p.t];

    if(state.selected && state.selected.r === r && state.selected.c === c) cell.classList.add("selected");

    const target = state.legalTargets.find(m => m.r === r && m.c === c);
    if(target){
      if(b[r][c] || target.special === "ep") cell.classList.add("captureHint");
      else cell.classList.add("hint");
    }

    if(kingKey === `${r},${c}` && isKingInCheck(b, state.turn, state)) cell.classList.add("check");

    cell.addEventListener("click", onSquareClick);
    boardNode.appendChild(cell);
  }

  // disable interaction if game over or promotion pending
  const locked = !!state.gameOver || !!state.pendingPromotion;
  boardNode.style.pointerEvents = locked ? "none" : "auto";
}

function getOrientedSquares(){
  const squares = [];
  if(!viewFlipped){
    for(let r=0;r<8;r++) for(let c=0;c<8;c++) squares.push({r,c});
  } else {
    for(let r=7;r>=0;r--) for(let c=7;c>=0;c--) squares.push({r,c});
  }
  return squares;
}

function onSquareClick(e){
  if(state.gameOver || state.pendingPromotion) return;

  const r = +e.currentTarget.dataset.r;
  const c = +e.currentTarget.dataset.c;
  const b = state.board;
  const p = b[r][c];

  // move attempt
  if(state.selected){
    const target = state.legalTargets.find(m => m.r === r && m.c === c);
    if(target){
      makeMove(state.selected, {r,c}, target.special || null);
      return;
    }
  }

  // select piece
  if(p && p.c === state.turn){
    state.selected = {r,c};
    state.legalTargets = legalMovesFrom(b, state.turn, r, c, state);
  } else {
    state.selected = null;
    state.legalTargets = [];
  }

  render();
}

function makeMove(from, to, special=null, promoChoice=null){
  const snap = snapshotState();
  state.history.push(snap);

  const b = state.board;
  const moving = b[from.r][from.c];
  const targetPiece = b[to.r][to.c];

  // halfmove reset on capture or pawn move
  const isPawnMove = moving.t === "P";
  const isCapture = !!targetPiece || special === "ep";
  state.halfmove = (isPawnMove || isCapture) ? 0 : (state.halfmove + 1);

  // clear en passant unless set again
  state.enPassant = null;

  // update castling rights (king/rook move or rook captured)
  updateCastlingRightsOnMove(from, to, moving, targetPiece, special);

  // execute special moves
  if(special === "castleK" || special === "castleQ"){
    // move king
    b[to.r][to.c] = moving;
    b[from.r][from.c] = null;

    // move rook
    const row = moving.c === "w" ? 7 : 0;
    if(special === "castleK"){
      // rook h -> f
      b[row][5] = b[row][7];
      b[row][7] = null;
    } else {
      // rook a -> d
      b[row][3] = b[row][0];
      b[row][0] = null;
    }
  } else if(special === "ep"){
    // pawn moves to target and captures pawn behind
    b[to.r][to.c] = moving;
    b[from.r][from.c] = null;
    const dir = moving.c === "w" ? 1 : -1;
    b[to.r + dir][to.c] = null;
  } else {
    // normal
    b[to.r][to.c] = moving;
    b[from.r][from.c] = null;
  }

  // set en passant target after a double pawn push
  if(moving.t === "P" && Math.abs(to.r - from.r) === 2){
    const midR = (to.r + from.r) / 2;
    state.enPassant = { r: midR, c: from.c };
  }

  // promotion
  if(moving.t === "P"){
    if((moving.c === "w" && to.r === 0) || (moving.c === "b" && to.r === 7)){
      if(!promoChoice){
        // pause game to choose piece
        state.pendingPromotion = { from, to, color: moving.c };
        openPromotionModal(moving.c);
        state.selected = null;
        state.legalTargets = [];
        render();
        return;
      } else {
        moving.t = promoChoice; // Q/R/B/N
      }
    }
  }

  // last move string (simple)
  state.lastMove = formatMove(from, to, moving, special, promoChoice, isCapture);

  // switch turn
  state.selected = null;
  state.legalTargets = [];
  state.turn = (state.turn === "w") ? "b" : "w";
  if(state.turn === "w") state.fullmove += 1;

  // update repetition + end checks
  bumpRepetition();
  state.gameOver = null; // recompute on render
  render();
}

function updateCastlingRightsOnMove(from, to, moving, captured, special){
  const side = moving.c;
  const other = side === "w" ? "b" : "w";

  // king moved => lose both
  if(moving.t === "K"){
    state.castling[side].K = false;
    state.castling[side].Q = false;
  }

  // rook moved from starting squares => lose that side
  if(moving.t === "R"){
    if(side === "w" && from.r === 7 && from.c === 0) state.castling.w.Q = false;
    if(side === "w" && from.r === 7 && from.c === 7) state.castling.w.K = false;
    if(side === "b" && from.r === 0 && from.c === 0) state.castling.b.Q = false;
    if(side === "b" && from.r === 0 && from.c === 7) state.castling.b.K = false;
  }

  // rook captured on starting squares => lose that side
  if(captured && captured.t === "R"){
    if(captured.c === "w" && to.r === 7 && to.c === 0) state.castling.w.Q = false;
    if(captured.c === "w" && to.r === 7 && to.c === 7) state.castling.w.K = false;
    if(captured.c === "b" && to.r === 0 && to.c === 0) state.castling.b.Q = false;
    if(captured.c === "b" && to.r === 0 && to.c === 7) state.castling.b.K = false;
  }

  // en passant captures don't capture on "to" square, so handle captured pawn not rook: ignore
  // castling special already handled via king move above
}

function undo(){
  if(state.history.length === 0) return;
  state = state.history.pop();
  closePromotionModal();
  render();
}

function snapshotState(){
  // deep copy board
  const b = state.board.map(row => row.map(p => p ? ({c:p.c, t:p.t}) : null));
  // deep copy repetition map (small)
  const rep = new Map(state.repetition);
  return {
    board: b,
    turn: state.turn,
    selected: null,
    legalTargets: [],
    history: state.history.slice(0),
    lastMove: state.lastMove,
    castling: { w:{...state.castling.w}, b:{...state.castling.b} },
    enPassant: state.enPassant ? {...state.enPassant} : null,
    halfmove: state.halfmove,
    fullmove: state.fullmove,
    repetition: rep,
    gameOver: state.gameOver ? {...state.gameOver} : null,
    pendingPromotion: null
  };
}

// ---------------- RULES ----------------

function legalMovesFrom(b, side, r, c, st){
  const p = b[r][c];
  if(!p || p.c !== side) return [];

  const pseudo = pseudoMoves(b, r, c, p, st, false);
  const legal = [];

  for(const m of pseudo){
    const bb = applyMoveCopy(b, {r,c}, m, p, st);
    // also need castling/enPassant state changes for check validation? For check legality we only need resulting board.
    if(!isKingInCheck(bb, side, st, m)) legal.push(m);
  }

  return legal;
}

function hasAnyLegalMove(b, side, st){
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const p = b[r][c];
      if(p && p.c === side){
        if(legalMovesFrom(b, side, r, c, st).length > 0) return true;
      }
    }
  }
  return false;
}

function applyMoveCopy(b, from, toMove, movingPiece, st){
  const copy = b.map(row => row.map(p => p ? ({c:p.c, t:p.t}) : null));
  const fromP = copy[from.r][from.c];
  const to = {r: toMove.r, c: toMove.c};
  const special = toMove.special || null;

  if(special === "castleK" || special === "castleQ"){
    copy[to.r][to.c] = fromP;
    copy[from.r][from.c] = null;
    const row = fromP.c === "w" ? 7 : 0;
    if(special === "castleK"){
      copy[row][5] = copy[row][7];
      copy[row][7] = null;
    } else {
      copy[row][3] = copy[row][0];
      copy[row][0] = null;
    }
    return copy;
  }

  if(special === "ep"){
    copy[to.r][to.c] = fromP;
    copy[from.r][from.c] = null;
    const dir = fromP.c === "w" ? 1 : -1;
    copy[to.r + dir][to.c] = null;
    return copy;
  }

  // normal
  copy[to.r][to.c] = fromP;
  copy[from.r][from.c] = null;

  // promo in copy not needed for check legality (except it could matter in rare cases),
  // but we can just auto-queen for legality filter so we don't allow illegal due to underpromotion.
  if(fromP.t === "P" && ((fromP.c === "w" && to.r === 0) || (fromP.c === "b" && to.r === 7))){
    fromP.t = "Q";
  }

  return copy;
}

function isKingInCheck(b, side, st, lastAppliedMove=null){
  const k = findKing(b, side);
  if(!k) return false;
  const enemy = (side === "w") ? "b" : "w";
  return isSquareAttacked(b, k.r, k.c, enemy, st);
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

function isSquareAttacked(b, r, c, bySide, st){
  for(let rr=0; rr<8; rr++){
    for(let cc=0; cc<8; cc++){
      const p = b[rr][cc];
      if(p && p.c === bySide){
        const moves = pseudoMoves(b, rr, cc, p, st, true);
        if(moves.some(m => m.r === r && m.c === c)) return true;
      }
    }
  }
  return false;
}

function pseudoMoves(b, r, c, p, st, attackOnly=false){
  const res = [];
  const side = p.c;
  const enemy = side === "w" ? "b" : "w";

  const inside = (rr,cc) => rr>=0 && rr<8 && cc>=0 && cc<8;
  const at = (rr,cc) => b[rr][cc];

  if(p.t === "P"){
    const dir = (side === "w") ? -1 : 1;
    const startRow = (side === "w") ? 6 : 1;

    // pawn attacks
    for(const dc of [-1, 1]){
      const rr = r + dir, cc = c + dc;
      if(!inside(rr,cc)) continue;
      if(attackOnly){
        res.push({r:rr, c:cc});
      } else {
        const target = at(rr,cc);
        if(target && target.c === enemy) res.push({r:rr, c:cc});
        // en passant
        if(st.enPassant && st.enPassant.r === rr && st.enPassant.c === cc){
          // only if there is an enemy pawn adjacent that just moved two squares
          res.push({r:rr, c:cc, special:"ep"});
        }
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
    const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
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

    if(attackOnly) return res;

    // castling (only when generating real moves)
    const homeRow = side === "w" ? 7 : 0;
    if(r === homeRow && c === 4){
      const rights = st.castling[side];

      // can't castle out of / through check
      if(!isSquareAttacked(b, homeRow, 4, enemy, st)){
        // king side: squares f,g empty and not attacked; rook at h
        if(rights.K && !at(homeRow,5) && !at(homeRow,6) && at(homeRow,7)?.t === "R" && at(homeRow,7)?.c === side){
          if(!isSquareAttacked(b, homeRow, 5, enemy, st) && !isSquareAttacked(b, homeRow, 6, enemy, st)){
            res.push({r:homeRow, c:6, special:"castleK"});
          }
        }
        // queen side: squares d,c,b empty; d,c not attacked; rook at a
        if(rights.Q && !at(homeRow,3) && !at(homeRow,2) && !at(homeRow,1) && at(homeRow,0)?.t === "R" && at(homeRow,0)?.c === side){
          if(!isSquareAttacked(b, homeRow, 3, enemy, st) && !isSquareAttacked(b, homeRow, 2, enemy, st)){
            res.push({r:homeRow, c:2, special:"castleQ"});
          }
        }
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

// ---------------- DRAWS ----------------

function checkDraws(){
  if(state.halfmove >= 100) return "50-move";
  if(isThreefold()) return "threefold";
  const ins = insufficientMaterial(state.board);
  if(ins) return ins;
  return null;
}

function bumpRepetition(){
  const key = positionKey();
  const prev = state.repetition.get(key) || 0;
  state.repetition.set(key, prev + 1);
}

function isThreefold(){
  const key = positionKey();
  return (state.repetition.get(key) || 0) >= 3;
}

function positionKey(){
  // FEN-like minimal: pieces + turn + castling + en-passant file (only file matters for repetition)
  const b = state.board;
  let s = "";
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const p = b[r][c];
      if(!p) s += ".";
      else s += (p.c === "w" ? p.t : p.t.toLowerCase());
    }
    s += "/";
  }
  const turn = state.turn;
  const cst =
    (state.castling.w.K ? "K" : "") +
    (state.castling.w.Q ? "Q" : "") +
    (state.castling.b.K ? "k" : "") +
    (state.castling.b.Q ? "q" : "") || "-";

  const ep = state.enPassant ? String.fromCharCode(97 + state.enPassant.c) : "-";
  return `${s} ${turn} ${cst} ${ep}`;
}

function insufficientMaterial(b){
  // quick/common cases:
  // K vs K
  // K+N vs K
  // K+B vs K
  // K+B vs K+B on same color squares
  const pieces = [];
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const p = b[r][c];
      if(p) pieces.push({r,c,...p});
    }
  }

  const nonKings = pieces.filter(x => x.t !== "K");
  if(nonKings.length === 0) return "insufficient";

  const hasPawnRookQueen = nonKings.some(x => x.t === "P" || x.t === "R" || x.t === "Q");
  if(hasPawnRookQueen) return null;

  // only bishops/knights
  if(nonKings.length === 1) return "insufficient"; // single minor piece

  // bishops only
  const allBishops = nonKings.every(x => x.t === "B");
  if(allBishops){
    const colors = nonKings.map(x => (x.r + x.c) % 2);
    const allSame = colors.every(v => v === colors[0]);
    if(allSame) return "insufficient";
  }

  return null;
}

// ---------------- PROMOTION UI ----------------

function openPromotionModal(color){
  promoBtns.innerHTML = "";
  const choices = ["Q","R","B","N"];
  for(const t of choices){
    const btn = document.createElement("button");
    btn.className = "promoBtn";
    btn.textContent = PIECES[color][t];
    btn.addEventListener("click", () => choosePromotion(t));
    promoBtns.appendChild(btn);
  }
  promoModal.classList.remove("hidden");
}

function closePromotionModal(){
  promoModal.classList.add("hidden");
  promoBtns.innerHTML = "";
  state.pendingPromotion = null;
}

function choosePromotion(t){
  const pend = state.pendingPromotion;
  if(!pend) return;
  closePromotionModal();
  // now finish the move with chosen piece
  makeMove(pend.from, pend.to, null, t);
}

// ---------------- MOVE TEXT ----------------

function formatMove(from, to, moving, special, promoChoice, isCapture){
  // simple readable, not full SAN
  const file = c => String.fromCharCode(97 + c);
  const rank = r => String(8 - r);

  if(special === "castleK") return "O-O";
  if(special === "castleQ") return "O-O-O";

  const pieceLetter = moving.t === "P" ? "" : moving.t;
  const capture = isCapture ? "x" : "-";
  const s = `${pieceLetter}${file(from.c)}${rank(from.r)}${capture}${file(to.c)}${rank(to.r)}`;

  if(moving.t === "P" && (to.r === 0 || to.r === 7)){
    return `${s}=${promoChoice || "Q"}`;
  }
  if(special === "ep") return `${s} e.p.`;
  return s;
}

