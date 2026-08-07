/**
 * Chess.com Clone - Full Chess Engine + UI
 * Features: Complete chess rules, Minimax AI with alpha-beta pruning,
 * timers, move history, captured pieces, promotions, animations.
 */

'use strict';

// ============================================================
// CONSTANTS & PIECE DEFINITIONS
// ============================================================
const PIECES = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
};

const PIECE_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

// Piece-square tables for AI evaluation (from white's perspective, row 0 = rank 8)
const PST = {
  P: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [ 5,  5, 10, 25, 25, 10,  5,  5],
    [ 0,  0,  0, 20, 20,  0,  0,  0],
    [ 5, -5,-10,  0,  0,-10, -5,  5],
    [ 5, 10, 10,-20,-20, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0]
  ],
  N: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  B: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  R: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [ 0,  0,  0,  5,  5,  0,  0,  0]
  ],
  Q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  K: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20]
  ]
};

const PST_ENDGAME_K = [
  [-50,-40,-30,-20,-20,-30,-40,-50],
  [-30,-20,-10,  0,  0,-10,-20,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-30,  0,  0,  0,  0,-30,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50]
];

// ============================================================
// GAME STATE
// ============================================================
let state = {
  board: [],
  turn: 'w',
  castlingRights: { wK: true, wQ: true, bK: true, bQ: true },
  enPassantTarget: null,
  halfMoveClock: 0,
  fullMoveNumber: 1,
  selectedSquare: null,
  legalMoves: [],
  history: [],
  capturedPieces: { w: [], b: [] },
  gameOver: false,
  gameMode: 'pvp',      // 'pvp', 'pvc', 'demo'
  playerColor: 'w',
  aiDepth: 3,
  timers: { w: 0, b: 0 },
  timerActive: false,
  timerInterval: null,
  timeControl: null,
  inCheck: false,
  lastMove: null,
  boardFlipped: false,
  moveHistoryList: [],
};

// ============================================================
// INITIAL BOARD SETUP
// ============================================================
function createInitialBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  const backRank = ['R','N','B','Q','K','B','N','R'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = 'b' + backRank[c];
    board[1][c] = 'bP';
    board[6][c] = 'wP';
    board[7][c] = 'w' + backRank[c];
  }
  return board;
}

// ============================================================
// BOARD UTILITIES
// ============================================================
function cloneBoard(board) {
  return board.map(row => [...row]);
}

function cloneState(s) {
  return {
    board: cloneBoard(s.board),
    turn: s.turn,
    castlingRights: { ...s.castlingRights },
    enPassantTarget: s.enPassantTarget ? [...s.enPassantTarget] : null,
    halfMoveClock: s.halfMoveClock,
    fullMoveNumber: s.fullMoveNumber,
  };
}

function opponent(color) { return color === 'w' ? 'b' : 'w'; }
function pieceColor(piece) { return piece ? piece[0] : null; }
function pieceType(piece) { return piece ? piece[1] : null; }

// ============================================================
// MOVE GENERATION
// ============================================================
function isInBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function getRawMoves(board, r, c, castlingRights, enPassantTarget, color) {
  const piece = board[r][c];
  if (!piece || piece[0] !== color) return [];
  const type = piece[1];
  const moves = [];
  const opp = opponent(color);

  const addSliding = (dirs) => {
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (isInBounds(nr, nc)) {
        if (!board[nr][nc]) {
          moves.push([nr, nc]);
        } else {
          if (board[nr][nc][0] === opp) moves.push([nr, nc]);
          break;
        }
        nr += dr; nc += dc;
      }
    }
  };

  const addJump = (jumps) => {
    for (const [dr, dc] of jumps) {
      const nr = r + dr, nc = c + dc;
      if (isInBounds(nr, nc) && board[nr][nc]?.[0] !== color) {
        moves.push([nr, nc]);
      }
    }
  };

  switch (type) {
    case 'P': {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      // Forward
      if (isInBounds(r + dir, c) && !board[r + dir][c]) {
        moves.push([r + dir, c]);
        // Double advance
        if (r === startRow && !board[r + 2 * dir][c]) {
          moves.push([r + 2 * dir, c]);
        }
      }
      // Captures
      for (const dc of [-1, 1]) {
        const nr = r + dir, nc = c + dc;
        if (isInBounds(nr, nc)) {
          if (board[nr][nc]?.[0] === opp) moves.push([nr, nc]);
          // En passant
          if (enPassantTarget && enPassantTarget[0] === nr && enPassantTarget[1] === nc) {
            moves.push([nr, nc, 'ep']);
          }
        }
      }
      break;
    }
    case 'N':
      addJump([[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]);
      break;
    case 'B':
      addSliding([[1,1],[1,-1],[-1,1],[-1,-1]]);
      break;
    case 'R':
      addSliding([[1,0],[-1,0],[0,1],[0,-1]]);
      break;
    case 'Q':
      addSliding([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
      break;
    case 'K':
      addJump([[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]);
      // Castling
      if (color === 'w' && r === 7 && c === 4) {
        if (castlingRights.wK && !board[7][5] && !board[7][6] &&
            board[7][7] === 'wR') {
          moves.push([7, 6, 'castle']);
        }
        if (castlingRights.wQ && !board[7][3] && !board[7][2] && !board[7][1] &&
            board[7][0] === 'wR') {
          moves.push([7, 2, 'castle']);
        }
      }
      if (color === 'b' && r === 0 && c === 4) {
        if (castlingRights.bK && !board[0][5] && !board[0][6] &&
            board[0][7] === 'bR') {
          moves.push([0, 6, 'castle']);
        }
        if (castlingRights.bQ && !board[0][3] && !board[0][2] && !board[0][1] &&
            board[0][0] === 'bR') {
          moves.push([0, 2, 'castle']);
        }
      }
      break;
  }
  return moves;
}

function isSquareAttacked(board, r, c, byColor) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || piece[0] !== byColor) continue;
      // Use simplified attack check (no castling/ep needed)
      const moves = getRawMoves(board, row, col, { wK:false,wQ:false,bK:false,bQ:false }, null, byColor);
      if (moves.some(m => m[0] === r && m[1] === c)) return true;
    }
  }
  return false;
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] === color + 'K') return [r, c];
  return null;
}

function isInCheckState(board, color) {
  const kPos = findKing(board, color);
  if (!kPos) return false;
  return isSquareAttacked(board, kPos[0], kPos[1], opponent(color));
}

function applyMove(board, fromR, fromC, toR, toC, special, promoteTo, castlingRights, enPassantTarget) {
  const newBoard = cloneBoard(board);
  const piece = newBoard[fromR][fromC];
  const color = piece[0];
  const type = piece[1];
  let captured = newBoard[toR][toC];
  let newEP = null;
  const newCR = { ...castlingRights };

  // En passant capture
  if (special === 'ep') {
    const capRow = color === 'w' ? toR + 1 : toR - 1;
    captured = newBoard[capRow][toC];
    newBoard[capRow][toC] = null;
  }

  // Castling
  if (special === 'castle') {
    if (toC === 6) { // Kingside
      newBoard[fromR][5] = newBoard[fromR][7];
      newBoard[fromR][7] = null;
    } else { // Queenside
      newBoard[fromR][3] = newBoard[fromR][0];
      newBoard[fromR][0] = null;
    }
  }

  // Move piece
  newBoard[toR][toC] = promoteTo ? (color + promoteTo) : piece;
  newBoard[fromR][fromC] = null;

  // Update castling rights
  if (type === 'K') { newCR[color + 'K'] = false; newCR[color + 'Q'] = false; }
  if (fromR === 7 && fromC === 0) newCR.wQ = false;
  if (fromR === 7 && fromC === 7) newCR.wK = false;
  if (fromR === 0 && fromC === 0) newCR.bQ = false;
  if (fromR === 0 && fromC === 7) newCR.bK = false;
  if (toR === 7 && toC === 0) newCR.wQ = false;
  if (toR === 7 && toC === 7) newCR.wK = false;
  if (toR === 0 && toC === 0) newCR.bQ = false;
  if (toR === 0 && toC === 7) newCR.bK = false;

  // En passant target
  if (type === 'P' && Math.abs(toR - fromR) === 2) {
    newEP = [(fromR + toR) / 2, fromC];
  }

  return { newBoard, captured, newEP, newCR };
}

function getLegalMoves(s, r, c) {
  const piece = s.board[r][c];
  if (!piece || piece[0] !== s.turn) return [];
  const rawMoves = getRawMoves(s.board, r, c, s.castlingRights, s.enPassantTarget, s.turn);
  const legal = [];

  for (const move of rawMoves) {
    const [toR, toC, special] = move;
    // Don't allow castling through/into check
    if (special === 'castle') {
      // King must not be in check
      if (isInCheckState(s.board, s.turn)) continue;
      // King must not pass through attacked square
      const passCol = toC === 6 ? 5 : 3;
      const tempBoard = cloneBoard(s.board);
      tempBoard[r][passCol] = tempBoard[r][c];
      tempBoard[r][c] = null;
      if (isSquareAttacked(tempBoard, r, passCol, opponent(s.turn))) continue;
    }
    const { newBoard } = applyMove(s.board, r, c, toR, toC, special, null, s.castlingRights, s.enPassantTarget);
    if (!isInCheckState(newBoard, s.turn)) {
      legal.push(move);
    }
  }
  return legal;
}

function getAllLegalMoves(s) {
  const moves = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (s.board[r][c]?.[0] === s.turn)
        for (const mv of getLegalMoves(s, r, c))
          moves.push([r, c, ...mv]);
  return moves;
}

// ============================================================
// ALGEBRAIC NOTATION
// ============================================================
const FILES = 'abcdefgh';
const RANKS = '87654321';

function toAlgebraic(fromR, fromC, toR, toC, piece, captured, special, promoteTo, board, isCheck, isMate) {
  const type = pieceType(piece);
  let notation = '';

  if (special === 'castle') {
    notation = toC === 6 ? 'O-O' : 'O-O-O';
  } else {
    if (type !== 'P') {
      notation += type;
      // Disambiguation
      const ambiguous = [];
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
          if (board[r][c] === piece && !(r === fromR && c === fromC)) {
            const moves = getRawMoves(board, r, c, state.castlingRights, state.enPassantTarget, piece[0]);
            if (moves.some(m => m[0] === toR && m[1] === toC)) ambiguous.push([r, c]);
          }
      if (ambiguous.length > 0) {
        if (ambiguous.every(([ar]) => ar !== fromR)) notation += RANKS[fromR];
        else notation += FILES[fromC];
      }
    } else if (captured) {
      notation += FILES[fromC];
    }
    if (captured || special === 'ep') notation += 'x';
    notation += FILES[toC] + RANKS[toR];
    if (promoteTo) notation += '=' + promoteTo;
  }

  if (isMate) notation += '#';
  else if (isCheck) notation += '+';
  return notation;
}

// ============================================================
// AI ENGINE (Minimax + Alpha-Beta)
// ============================================================
function evaluateBoard(s) {
  let score = 0;
  let pieceCount = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = s.board[r][c];
      if (!piece) continue;
      pieceCount++;
      const color = piece[0];
      const type = piece[1];
      const val = PIECE_VALUES[type];
      const pstRow = color === 'w' ? r : 7 - r;
      const pstVal = type === 'K' && pieceCount < 14 ? PST_ENDGAME_K[pstRow][c] : (PST[type]?.[pstRow]?.[c] ?? 0);
      const total = val + pstVal;
      score += color === 'w' ? total : -total;
    }
  }
  return score;
}

function orderMoves(moves, s) {
  return moves.sort((a, b) => {
    const [, , aToR, aToC, aSpec] = a;
    const [, , bToR, bToC, bSpec] = b;
    const aCapVal = s.board[aToR]?.[aToC] ? PIECE_VALUES[pieceType(s.board[aToR][aToC])] : 0;
    const bCapVal = s.board[bToR]?.[bToC] ? PIECE_VALUES[pieceType(s.board[bToR][bToC])] : 0;
    return bCapVal - aCapVal;
  });
}

function minimax(s, depth, alpha, beta, maximizing) {
  if (depth === 0) return evaluateBoard(s);

  const allMoves = getAllLegalMoves(s);
  if (allMoves.length === 0) {
    if (isInCheckState(s.board, s.turn)) {
      return maximizing ? -100000 - depth : 100000 + depth;
    }
    return 0; // stalemate
  }

  const ordered = orderMoves(allMoves, s);

  if (maximizing) {
    let best = -Infinity;
    for (const move of ordered) {
      const [fromR, fromC, toR, toC, special] = move;
      const { newBoard, newEP, newCR } = applyMove(s.board, fromR, fromC, toR, toC, special, null, s.castlingRights, s.enPassantTarget);
      const newS = { board: newBoard, turn: opponent(s.turn), castlingRights: newCR, enPassantTarget: newEP };
      best = Math.max(best, minimax(newS, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of ordered) {
      const [fromR, fromC, toR, toC, special] = move;
      const { newBoard, newEP, newCR } = applyMove(s.board, fromR, fromC, toR, toC, special, null, s.castlingRights, s.enPassantTarget);
      const newS = { board: newBoard, turn: opponent(s.turn), castlingRights: newCR, enPassantTarget: newEP };
      best = Math.min(best, minimax(newS, depth - 1, alpha, beta, true));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBestMove(s, depth) {
  const allMoves = getAllLegalMoves(s);
  if (allMoves.length === 0) return null;

  const ordered = orderMoves(allMoves, s);
  let bestMove = ordered[0];
  let bestScore = s.turn === 'w' ? -Infinity : Infinity;

  for (const move of ordered) {
    const [fromR, fromC, toR, toC, special] = move;
    const { newBoard, newEP, newCR } = applyMove(s.board, fromR, fromC, toR, toC, special, null, s.castlingRights, s.enPassantTarget);
    const newS = { board: newBoard, turn: opponent(s.turn), castlingRights: newCR, enPassantTarget: newEP };
    const score = minimax(newS, depth - 1, -Infinity, Infinity, s.turn !== 'w');
    if ((s.turn === 'w' && score > bestScore) || (s.turn === 'b' && score < bestScore)) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

// ============================================================
// TIMER SYSTEM
// ============================================================
function startTimer() {
  if (!state.timeControl || state.gameOver) return;
  clearInterval(state.timerInterval);
  state.timerActive = true;
  state.timerInterval = setInterval(() => {
    if (state.gameOver) { clearInterval(state.timerInterval); return; }
    state.timers[state.turn] -= 100;
    if (state.timers[state.turn] <= 0) {
      state.timers[state.turn] = 0;
      clearInterval(state.timerInterval);
      endGame('timeout', opponent(state.turn));
    }
    updateTimerDisplay(state.turn);
  }, 100);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerActive = false;
}

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (ms < 60000) return `${total}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function updateTimerDisplay(color) {
  const el = document.getElementById(`timer-${color}`);
  if (!el) return;
  const ms = state.timers[color];
  el.textContent = formatTime(ms);
  el.className = 'player-timer';
  if (ms < 10000) el.classList.add('critical');
  else if (ms < 30000) el.classList.add('warning');
}

// ============================================================
// SOUND EFFECTS
// ============================================================
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'move':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        break;
      case 'capture':
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        break;
      case 'check':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        break;
      case 'castle':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.07);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        break;
      case 'gameover':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        break;
    }

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) { /* ignore */ }
}

// ============================================================
// GAME EXECUTION
// ============================================================
let pendingPromotion = null;

function executeMove(fromR, fromC, toR, toC, special, promoteTo) {
  const piece = state.board[fromR][fromC];
  const { newBoard, captured, newEP, newCR } = applyMove(
    state.board, fromR, fromC, toR, toC, special, promoteTo,
    state.castlingRights, state.enPassantTarget
  );

  // Update captured pieces (stored under the capturing player's color)
  if (captured) {
    state.capturedPieces[state.turn].push(captured);
  }

  // Check for check/checkmate/stalemate
  const nextTurn = opponent(state.turn);
  const nextState = { board: newBoard, turn: nextTurn, castlingRights: newCR, enPassantTarget: newEP };
  const nextMoves = getAllLegalMoves(nextState);
  const isCheck = isInCheckState(newBoard, nextTurn);
  const isMate = nextMoves.length === 0 && isCheck;
  const isStale = nextMoves.length === 0 && !isCheck;

  // Build notation
  const notation = toAlgebraic(fromR, fromC, toR, toC, piece, captured, special, promoteTo, state.board, isCheck, isMate);

  // Record move
  state.moveHistoryList.push({ notation, fromR, fromC, toR, toC, special, promoteTo, board: cloneBoard(state.board), notation });

  // Update state
  state.board = newBoard;
  state.enPassantTarget = newEP;
  state.castlingRights = newCR;
  state.lastMove = [fromR, fromC, toR, toC];
  state.inCheck = isCheck;

  // Half-move clock
  if (pieceType(piece) === 'P' || captured) state.halfMoveClock = 0;
  else state.halfMoveClock++;

  if (state.turn === 'b') state.fullMoveNumber++;

  // Push to history
  if (state.turn === 'w') {
    state.history.push({ white: notation, black: null, num: state.fullMoveNumber });
  } else {
    if (state.history.length > 0) state.history[state.history.length - 1].black = notation;
  }

  state.turn = nextTurn;

  // Sound
  if (isMate || isStale) playSound('gameover');
  else if (isCheck) playSound('check');
  else if (special === 'castle') playSound('castle');
  else if (captured) playSound('capture');
  else playSound('move');

  // Clear selection
  state.selectedSquare = null;
  state.legalMoves = [];

  renderBoard();
  renderSidebars();

  if (isMate) {
    endGame('checkmate', opponent(state.turn)); // state.turn is now the mated player; winner is opponent
    return;
  }
  if (isStale) { endGame('stalemate', null); return; }
  if (state.halfMoveClock >= 100) { endGame('draw', null); return; }

  updateStatus();
  startTimer();

  // AI turn
  if (!state.gameOver && state.gameMode === 'pvc' && state.turn !== state.playerColor) {
    scheduleAIMove();
  } else if (!state.gameOver && state.gameMode === 'demo') {
    scheduleAIMove();
  }
}

function handleSquareClick(r, c) {
  if (state.gameOver) return;
  if (state.gameMode === 'pvc' && state.turn !== state.playerColor) return;
  if (state.gameMode === 'demo') return;

  const piece = state.board[r][c];

  if (state.selectedSquare) {
    const [selR, selC] = state.selectedSquare;

    // Check if clicked a legal move
    const move = state.legalMoves.find(m => m[0] === r && m[1] === c);
    if (move) {
      const [toR, toC, special] = move;
      const fromPiece = state.board[selR][selC];
      // Check pawn promotion
      if (pieceType(fromPiece) === 'P' && (toR === 0 || toR === 7)) {
        pendingPromotion = { fromR: selR, fromC: selC, toR, toC, special };
        showPromotionModal(fromPiece[0]);
        return;
      }
      executeMove(selR, selC, toR, toC, special, null);
      return;
    }

    // Clicked same square — deselect
    if (selR === r && selC === c) {
      state.selectedSquare = null;
      state.legalMoves = [];
      renderBoard();
      return;
    }

    // Clicked own piece — reselect
    if (piece && piece[0] === state.turn) {
      state.selectedSquare = [r, c];
      state.legalMoves = getLegalMoves(state, r, c);
      renderBoard();
      return;
    }

    state.selectedSquare = null;
    state.legalMoves = [];
    renderBoard();
    return;
  }

  // No selection — select piece
  if (piece && piece[0] === state.turn) {
    state.selectedSquare = [r, c];
    state.legalMoves = getLegalMoves(state, r, c);
    renderBoard();
  }
}

let aiMoveTimeout = null;

function scheduleAIMove() {
  clearTimeout(aiMoveTimeout);
  showAIThinking(true);
  const delay = state.gameMode === 'demo' ? 600 : 400;
  aiMoveTimeout = setTimeout(() => {
    doAIMove();
  }, delay);
}

function doAIMove() {
  const move = getBestMove(state, state.aiDepth);
  showAIThinking(false);
  if (!move) return;
  const [fromR, fromC, toR, toC, special] = move;
  const piece = state.board[fromR][fromC];

  // AI promotion — always promote to Queen
  if (pieceType(piece) === 'P' && (toR === 0 || toR === 7)) {
    executeMove(fromR, fromC, toR, toC, special, 'Q');
  } else {
    executeMove(fromR, fromC, toR, toC, special, null);
  }
}

function endGame(reason, winner) {
  state.gameOver = true;
  stopTimer();
  showAIThinking(false);

  let title, subtitle, icon;
  if (reason === 'checkmate') {
    icon = winner === 'w' ? '👑' : '🏆';
    title = winner === 'w' ? 'White Wins!' : 'Black Wins!';
    subtitle = 'by Checkmate';
    spawnSparkles();
  } else if (reason === 'stalemate') {
    icon = '🤝';
    title = 'Draw';
    subtitle = 'by Stalemate';
  } else if (reason === 'timeout') {
    icon = '⏰';
    title = winner === 'w' ? 'White Wins!' : 'Black Wins!';
    subtitle = 'on Time';
    spawnSparkles();
  } else {
    icon = '🤝';
    title = 'Draw';
    subtitle = 'by 50-Move Rule';
  }

  updateStatus(title + ' ' + subtitle);
  setTimeout(() => showGameOverModal(icon, title, subtitle), 600);
}

// ============================================================
// RENDERING
// ============================================================
function renderBoard() {
  const boardEl = document.getElementById('chess-board');
  boardEl.innerHTML = '';

  for (let rowIdx = 0; rowIdx < 8; rowIdx++) {
    for (let colIdx = 0; colIdx < 8; colIdx++) {
      const r = state.boardFlipped ? 7 - rowIdx : rowIdx;
      const c = state.boardFlipped ? 7 - colIdx : colIdx;

      const square = document.createElement('div');
      square.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
      square.dataset.r = r;
      square.dataset.c = c;
      square.id = `sq-${r}-${c}`;

      // Highlights
      if (state.selectedSquare && state.selectedSquare[0] === r && state.selectedSquare[1] === c) {
        square.classList.add('selected');
      }

      if (state.lastMove) {
        const [fr, fc, tr, tc] = state.lastMove;
        if ((r === fr && c === fc) || (r === tr && c === tc)) square.classList.add('last-move');
      }

      const isLegal = state.legalMoves.find(m => m[0] === r && m[1] === c);
      if (isLegal) {
        if (state.board[r][c]) square.classList.add('legal-capture');
        else square.classList.add('legal-move');
      }

      // Check highlight
      if (state.inCheck) {
        const kingPos = findKing(state.board, state.turn);
        if (kingPos && kingPos[0] === r && kingPos[1] === c) square.classList.add('in-check');
      }

      // Piece
      const piece = state.board[r][c];
      if (piece) {
        const pieceEl = document.createElement('span');
        pieceEl.className = 'piece';
        pieceEl.textContent = PIECES[piece];
        pieceEl.setAttribute('aria-label', piece);
        square.appendChild(pieceEl);
      }

      square.addEventListener('click', () => handleSquareClick(r, c));
      boardEl.appendChild(square);
    }
  }
}

function renderSidebars() {
  // Captured pieces
  renderCaptured('w');
  renderCaptured('b');
  // Move history
  renderHistory();
  // Update timer displays
  updateTimerDisplay('w');
  updateTimerDisplay('b');
  // Player active state
  updatePlayerActive();
}

function renderCaptured(color) {
  const el = document.getElementById(`captured-${color}`);
  if (!el) return;

  // capturedPieces[color] = pieces captured BY 'color' (the opponent's pieces taken)
  const piecesToShow = state.capturedPieces[color];

  el.innerHTML = '';
  piecesToShow.forEach(p => {
    const span = document.createElement('span');
    span.className = 'captured-piece';
    span.textContent = PIECES[p];
    el.appendChild(span);
  });

  // Material advantage for this player
  const scoreEl = el.closest('.player-info')?.querySelector('.score-diff');
  if (scoreEl) {
    const wGain = state.capturedPieces.w.reduce((acc, p) => acc + (PIECE_VALUES[pieceType(p)] || 0), 0);
    const bGain = state.capturedPieces.b.reduce((acc, p) => acc + (PIECE_VALUES[pieceType(p)] || 0), 0);
    const diff = color === 'w' ? wGain - bGain : bGain - wGain;
    scoreEl.textContent = diff > 0 ? `+${diff}` : '';
  }
}

function renderHistory() {
  const el = document.getElementById('move-history');
  if (!el) return;
  el.innerHTML = '';
  state.history.forEach((entry, i) => {
    const row = document.createElement('div');
    row.className = 'move-row';
    row.innerHTML = `
      <span class="move-num">${entry.num}.</span>
      <span class="move-white">${entry.white || ''}</span>
      <span class="move-black">${entry.black || ''}</span>
    `;
    el.appendChild(row);
  });
  el.scrollTop = el.scrollHeight;
}

function updatePlayerActive() {
  ['w', 'b'].forEach(color => {
    const el = document.getElementById(`player-${color}`);
    if (!el) return;
    el.classList.toggle('active', state.turn === color && !state.gameOver);
    el.classList.toggle('in-check', state.inCheck && state.turn === color);

    const dot = el.querySelector('.active-indicator');
    if (dot) dot.style.display = (state.turn === color && !state.gameOver) ? 'block' : 'none';
  });
}

function updateStatus(msg) {
  const el = document.getElementById('game-status');
  if (!el) return;
  el.className = 'game-status';
  if (msg) {
    el.textContent = msg;
    if (msg.toLowerCase().includes('check')) el.classList.add('check');
    if (msg.toLowerCase().includes('wins') || msg.toLowerCase().includes('mate')) el.classList.add('checkmate');
  } else {
    if (state.inCheck) {
      el.textContent = (state.turn === 'w' ? 'White' : 'Black') + ' is in Check!';
      el.classList.add('check');
    } else {
      el.textContent = (state.turn === 'w' ? '⬜ White' : '⬛ Black') + "'s Turn";
    }
  }
}

// ============================================================
// MODALS
// ============================================================
function showPromotionModal(color) {
  const modal = document.getElementById('promotion-modal');
  modal.classList.remove('hidden');
  const pieces = color === 'w'
    ? { Q: '♕', R: '♖', B: '♗', N: '♘' }
    : { Q: '♛', R: '♜', B: '♝', N: '♞' };
  document.getElementById('promo-pieces').innerHTML = Object.entries(pieces)
    .map(([type, sym]) => `<span class="promo-piece" onclick="completePromotion('${type}')">${sym}</span>`)
    .join('');
}

function completePromotion(type) {
  document.getElementById('promotion-modal').classList.add('hidden');
  if (!pendingPromotion) return;
  const { fromR, fromC, toR, toC, special } = pendingPromotion;
  pendingPromotion = null;
  executeMove(fromR, fromC, toR, toC, special, type);
}

function showGameOverModal(icon, title, subtitle) {
  document.getElementById('gameover-icon').textContent = icon;
  document.getElementById('gameover-title').textContent = title;
  document.getElementById('gameover-subtitle').textContent = subtitle;
  document.getElementById('gameover-modal').classList.remove('hidden');
}

function hideModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function showAIThinking(visible) {
  const el = document.getElementById('ai-thinking');
  if (el) el.classList.toggle('visible', visible);
}

// ============================================================
// SPARKLE EFFECT
// ============================================================
function spawnSparkles() {
  const emojis = ['✨','🌟','⭐','💫','🎉','🏆','👑'];
  for (let i = 0; i < 12; i++) {
    const sp = document.createElement('div');
    sp.className = 'sparkle';
    sp.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    sp.style.left = Math.random() * 100 + 'vw';
    sp.style.top = Math.random() * 100 + 'vh';
    sp.style.animationDelay = (Math.random() * 0.5) + 's';
    document.body.appendChild(sp);
    sp.addEventListener('animationend', () => sp.remove());
  }
}

// ============================================================
// SCREEN MANAGEMENT
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ============================================================
// GAME START
// ============================================================
let selectedTimeControl = null;

function selectTimeControl(tc) {
  selectedTimeControl = tc;
  document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll(`.time-btn[data-tc="${tc.label}"]`).forEach(b => b.classList.add('selected'));
}

const TIME_CONTROLS = {
  bullet1: { label: '1 min', ms: 60000, icon: '⚡', type: 'Bullet' },
  bullet3: { label: '3 min', ms: 180000, icon: '⚡', type: 'Bullet' },
  blitz5:  { label: '5 min', ms: 300000, icon: '🔥', type: 'Blitz' },
  rapid10: { label: '10 min', ms: 600000, icon: '⏱', type: 'Rapid' },
  rapid15: { label: '15 min', ms: 900000, icon: '⏱', type: 'Rapid' },
  rapid30: { label: '30 min', ms: 1800000, icon: '⏳', type: 'Classical' },
  classical: { label: '60 min', ms: 3600000, icon: '♟', type: 'Classical' },
  unlimited: { label: '∞', ms: null, icon: '🎭', type: 'Unlimited' },
};

function startGame(mode, tcKey, playerColor) {
  const tc = TIME_CONTROLS[tcKey || 'blitz5'];
  state = {
    board: createInitialBoard(),
    turn: 'w',
    castlingRights: { wK: true, wQ: true, bK: true, bQ: true },
    enPassantTarget: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    selectedSquare: null,
    legalMoves: [],
    history: [],
    capturedPieces: { w: [], b: [] },
    gameOver: false,
    gameMode: mode,
    playerColor: playerColor || 'w',
    aiDepth: currentAIDepth,
    timers: { w: tc.ms || 0, b: tc.ms || 0 },
    timerActive: false,
    timerInterval: null,
    timeControl: tc.ms ? tc : null,
    inCheck: false,
    lastMove: null,
    boardFlipped: (mode === 'pvc' && playerColor === 'b'),
    moveHistoryList: [],
  };

  // Update player names
  document.getElementById('player-w-name').textContent = mode === 'pvc' && playerColor === 'b' ? 'Stockfish AI' : 'White';
  document.getElementById('player-b-name').textContent = mode === 'pvc' && playerColor === 'w' ? 'Stockfish AI' : 'Black';
  document.getElementById('player-w-rating').textContent = mode === 'pvc' && playerColor === 'b' ? `Depth ${currentAIDepth}` : '♟ Human';
  document.getElementById('player-b-rating').textContent = mode === 'pvc' && playerColor === 'w' ? `Depth ${currentAIDepth}` : '♟ Human';

  // Timer display
  const noTimer = !tc.ms;
  ['w', 'b'].forEach(c => {
    const el = document.getElementById(`timer-${c}`);
    if (el) el.textContent = noTimer ? '∞' : formatTime(tc.ms);
  });

  showScreen('game-screen');
  renderBoard();
  renderSidebars();
  updateStatus();

  if (mode === 'pvc' && playerColor === 'b') {
    scheduleAIMove();
  } else if (mode === 'demo') {
    scheduleAIMove();
  }
}

// ============================================================
// GAME CONTROLS
// ============================================================
function undoMove() {
  // Simple undo: restart from scratch up to N-1 moves
  // (For a real implementation, store full history snapshots)
  // We'll store snapshots in moveHistoryList
  if (state.moveHistoryList.length === 0) return;

  // Remove last 1-2 moves (if AI, remove 2)
  const remove = (state.gameMode === 'pvc' && !state.gameOver) ? 2 : 1;
  const remaining = state.moveHistoryList.slice(0, Math.max(0, state.moveHistoryList.length - remove));

  // Restart from beginning and replay
  const savedMode = state.gameMode;
  const savedPColor = state.playerColor;
  const savedDepth = state.aiDepth;
  const savedTC = state.timeControl;
  const savedTimers = { ...state.timers };
  const savedFlipped = state.boardFlipped;

  state = {
    board: createInitialBoard(),
    turn: 'w',
    castlingRights: { wK: true, wQ: true, bK: true, bQ: true },
    enPassantTarget: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    selectedSquare: null,
    legalMoves: [],
    history: [],
    capturedPieces: { w: [], b: [] },
    gameOver: false,
    gameMode: savedMode,
    playerColor: savedPColor,
    aiDepth: savedDepth,
    timers: savedTimers,
    timerActive: false,
    timerInterval: null,
    timeControl: savedTC,
    inCheck: false,
    lastMove: null,
    boardFlipped: savedFlipped,
    moveHistoryList: [],
  };

  stopTimer();

  // Replay moves silently
  for (const entry of remaining) {
    const { fromR, fromC, toR, toC, special, promoteTo } = entry;
    const piece = state.board[fromR][fromC];
    const { newBoard, captured, newEP, newCR } = applyMove(
      state.board, fromR, fromC, toR, toC, special, promoteTo, state.castlingRights, state.enPassantTarget
    );
    if (captured) state.capturedPieces[opponent(captured[0])].push(captured);
    state.board = newBoard;
    state.enPassantTarget = newEP;
    state.castlingRights = newCR;
    state.lastMove = [fromR, fromC, toR, toC];
    if (pieceType(piece) === 'P' || captured) state.halfMoveClock = 0;
    else state.halfMoveClock++;
    if (state.turn === 'b') state.fullMoveNumber++;
    if (state.turn === 'w') {
      state.history.push({ white: entry.notation, black: null, num: state.fullMoveNumber });
    } else {
      if (state.history.length > 0) state.history[state.history.length - 1].black = entry.notation;
    }
    state.turn = opponent(state.turn);
    state.inCheck = isInCheckState(state.board, state.turn);
    state.moveHistoryList.push(entry);
  }

  renderBoard();
  renderSidebars();
  updateStatus();
}

function flipBoard() {
  state.boardFlipped = !state.boardFlipped;
  renderBoard();
}

function resignGame() {
  if (state.gameOver) return;
  endGame('checkmate', opponent(state.turn));
}

let currentAIDepth = 3;

function setAIDepth(depth) {
  currentAIDepth = depth;
  state.aiDepth = depth;
  document.querySelectorAll('.diff-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.depth) === depth);
  });
}

// ============================================================
// HOME SCREEN FLOW
// ============================================================
let pendingMode = null;
let pendingTC = 'blitz5';

function selectMode(mode) {
  pendingMode = mode;
  if (mode === 'demo') {
    startGame('demo', 'rapid10', 'w');
    return;
  }
  // If pvp/pvc: show time control overlay (already visible, just start)
  startGame(mode, pendingTC, 'w');
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  showScreen('home-screen');

  // Time control buttons
  Object.entries(TIME_CONTROLS).forEach(([key, tc]) => {
    document.querySelectorAll(`.time-btn[data-tc="${key}"]`).forEach(btn => {
      btn.addEventListener('click', () => {
        pendingTC = key;
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  });

  // Default selection
  document.querySelector('.time-btn[data-tc="blitz5"]')?.classList.add('selected');
  pendingTC = 'blitz5';

  // AI difficulty
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => setAIDepth(parseInt(btn.dataset.depth)));
  });
  setAIDepth(3);

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') undoMove();
    if (e.key === 'f' || e.key === 'F') flipBoard();
    if (e.key === 'Escape') {
      hideModal('promotion-modal');
      hideModal('gameover-modal');
    }
  });
});
