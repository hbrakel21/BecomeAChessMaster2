// engine.js (add these exports)
export function getState(){ return state; }
export function setTurn(t){ state.turn = t; }
export function setPositionFromKey(key){
  // temporary: hardcode a few lesson setups.
  // later you replace this with FEN parsing.
  if(key === "lesson_knight_1"){
    state.board = Array.from({length:8}, () => Array(8).fill(null));
    state.board[7][1] = { c:"w", t:"N" }; // b1
  }
}

// in your move application pipeline, add this check:
function academyAllowsMove(uci){
  if(state.mode !== "academy") return true;
  const allowed = state.academyAllowedUci || [];
  return allowed.includes(uci);
}

