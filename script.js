const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

const FIREWORK_COLORS = [
  '#22d3ee',
  '#f43f5e',
  '#34d399',
  '#fbbf24',
  '#a855f7',
  '#38bdf8',
  '#ec4899',
  '#ffffff'
];

let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameMode = 'pvp';
let difficulty = 'medium';
let isGameOver = false;
let isComputerThinking = false;
let winningLine = null;
let computerTimeoutId = null;
const scores = {
  X: 0,
  O: 0,
  ties: 0
};

let fireworksCanvas = null;
let fireworksCtx = null;
let fireworksActive = false;
let fireworksAnimationId = null;
let fireworksIntervalId = null;
let fireworksTimeoutId = null;
let fireworksParticles = [];
let fireworksRockets = [];

function dismissIntro() {
  const intro = document.getElementById('intro-screen');
  if (!intro || intro.classList.contains('opacity-0')) return;
  intro.classList.add('opacity-0', 'scale-105', 'pointer-events-none');
  setTimeout(() => {
    intro.classList.add('hidden');
  }, 700);
}

function initIntroScreen() {
  const intro = document.getElementById('intro-screen');
  if (!intro) return;
  intro.addEventListener('click', dismissIntro);
  setTimeout(dismissIntro, 1600);
}

function renderMark(player) {
  if (player === 'X') {
    return '<svg class="w-12 h-12 sm:w-14 sm:h-14 stroke-cyan-400 animate-pop drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  }
  if (player === 'O') {
    return '<svg class="w-12 h-12 sm:w-14 sm:h-14 stroke-rose-400 animate-pop drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"></circle></svg>';
  }
  return '';
}

function renderBoard() {
  const cellElements = document.querySelectorAll('.cell');
  cellElements.forEach((cell, idx) => {
    const mark = board[idx];
    if (cell.dataset.mark !== mark) {
      cell.dataset.mark = mark;
      cell.innerHTML = renderMark(mark);
    }

    let classes = 'cell aspect-square rounded-2xl flex items-center justify-center transition-all duration-200 ';

    if (winningLine && winningLine.includes(idx)) {
      classes += 'bg-emerald-500/20 border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.35)] scale-[1.03] animate-pulse';
    } else if (mark !== '') {
      classes += 'bg-slate-800/80 border border-slate-700/60 cursor-default';
    } else if (isGameOver || isComputerThinking) {
      classes += 'bg-slate-800/80 border border-slate-700/60 cursor-not-allowed opacity-70';
    } else {
      classes += 'bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 hover:border-slate-500 cursor-pointer active:scale-95';
    }

    cell.className = classes;
  });
}

function renderStatus() {
  const indicator = document.getElementById('status-indicator');
  const text = document.getElementById('status-text');

  if (isGameOver) {
    if (winningLine) {
      const winner = board[winningLine[0]];
      indicator.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
      if (gameMode === 'pve') {
        text.innerText = winner === 'X' ? 'You Win!' : 'Computer Wins!';
      } else {
        text.innerText = 'Player ' + winner + ' Wins!';
      }
      text.className = 'text-emerald-300 font-bold';
    } else {
      indicator.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]';
      text.innerText = "It's a Draw!";
      text.className = 'text-amber-300 font-bold';
    }
  } else if (isComputerThinking) {
    indicator.className = 'w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping';
    text.innerText = 'Computer is thinking...';
    text.className = 'text-rose-300 font-medium animate-pulse';
  } else {
    if (currentPlayer === 'X') {
      indicator.className = 'w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]';
      text.innerText = gameMode === 'pve' ? 'Your Turn (X)' : "Player X's Turn";
      text.className = 'text-cyan-300 font-medium';
    } else {
      indicator.className = 'w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]';
      text.innerText = "Player O's Turn";
      text.className = 'text-rose-300 font-medium';
    }
  }
}

function renderScoreboard() {
  const labelX = document.getElementById('score-label-x');
  const labelO = document.getElementById('score-label-o');
  const valX = document.getElementById('score-val-x');
  const valO = document.getElementById('score-val-o');
  const valTies = document.getElementById('score-val-ties');

  if (gameMode === 'pve') {
    labelX.innerText = 'YOU (X)';
    labelO.innerText = 'CPU (O)';
  } else {
    labelX.innerText = 'PLAYER X';
    labelO.innerText = 'PLAYER O';
  }

  valX.innerText = scores.X;
  valO.innerText = scores.O;
  valTies.innerText = scores.ties;
}

function renderModeSelector() {
  const pvpBtn = document.getElementById('mode-pvp-btn');
  const pveBtn = document.getElementById('mode-pve-btn');
  const diffContainer = document.getElementById('difficulty-container');

  const activeClass = 'flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25 transition-all duration-200';
  const inactiveClass = 'flex-1 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all duration-200';

  if (gameMode === 'pvp') {
    pvpBtn.className = activeClass;
    pveBtn.className = inactiveClass;
    diffContainer.classList.add('hidden');
    diffContainer.classList.remove('flex');
  } else {
    pvpBtn.className = inactiveClass;
    pveBtn.className = activeClass;
    diffContainer.classList.remove('hidden');
    diffContainer.classList.add('flex');
  }
}

function renderDifficultySelector() {
  const easyBtn = document.getElementById('diff-easy-btn');
  const medBtn = document.getElementById('diff-medium-btn');
  const hardBtn = document.getElementById('diff-hard-btn');

  const activeClass = 'flex-1 py-1.5 text-xs font-bold rounded-lg bg-violet-600 text-white shadow-md shadow-violet-600/30 transition-all duration-200';
  const inactiveClass = 'flex-1 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all duration-200';

  easyBtn.className = difficulty === 'easy' ? activeClass : inactiveClass;
  medBtn.className = difficulty === 'medium' ? activeClass : inactiveClass;
  hardBtn.className = difficulty === 'hard' ? activeClass : inactiveClass;
}

function render() {
  renderBoard();
  renderStatus();
  renderScoreboard();
  renderModeSelector();
  renderDifficultySelector();
}

function checkWin(currentBoard, player) {
  for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
    const [a, b, c] = WINNING_COMBINATIONS[i];
    if (
      currentBoard[a] === player &&
      currentBoard[b] === player &&
      currentBoard[c] === player
    ) {
      return WINNING_COMBINATIONS[i];
    }
  }
  return null;
}

function checkDraw(currentBoard) {
  return currentBoard.every(cell => cell !== '');
}

function getEmptyIndices(currentBoard) {
  const empty = [];
  for (let i = 0; i < currentBoard.length; i++) {
    if (currentBoard[i] === '') {
      empty.push(i);
    }
  }
  return empty;
}

function getEasyMove(currentBoard) {
  const empty = getEmptyIndices(currentBoard);
  if (empty.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * empty.length);
  return empty[randomIndex];
}

function getMediumMove(currentBoard) {
  const empty = getEmptyIndices(currentBoard);

  for (let i = 0; i < empty.length; i++) {
    const idx = empty[i];
    currentBoard[idx] = 'O';
    if (checkWin(currentBoard, 'O')) {
      currentBoard[idx] = '';
      return idx;
    }
    currentBoard[idx] = '';
  }

  for (let i = 0; i < empty.length; i++) {
    const idx = empty[i];
    currentBoard[idx] = 'X';
    if (checkWin(currentBoard, 'X')) {
      currentBoard[idx] = '';
      return idx;
    }
    currentBoard[idx] = '';
  }

  return getEasyMove(currentBoard);
}

function minimax(tempBoard, depth, isMaximizing) {
  if (checkWin(tempBoard, 'O')) {
    return { score: 10 - depth };
  }
  if (checkWin(tempBoard, 'X')) {
    return { score: depth - 10 };
  }
  const emptyMoves = getEmptyIndices(tempBoard);
  if (emptyMoves.length === 0) {
    return { score: 0 };
  }

  if (isMaximizing) {
    let bestScore = -Infinity;
    let bestMove = null;
    for (let i = 0; i < emptyMoves.length; i++) {
      const move = emptyMoves[i];
      tempBoard[move] = 'O';
      const result = minimax(tempBoard, depth + 1, false);
      tempBoard[move] = '';
      if (result.score > bestScore) {
        bestScore = result.score;
        bestMove = move;
      }
    }
    return { score: bestScore, index: bestMove };
  } else {
    let bestScore = Infinity;
    let bestMove = null;
    for (let i = 0; i < emptyMoves.length; i++) {
      const move = emptyMoves[i];
      tempBoard[move] = 'X';
      const result = minimax(tempBoard, depth + 1, true);
      tempBoard[move] = '';
      if (result.score < bestScore) {
        bestScore = result.score;
        bestMove = move;
      }
    }
    return { score: bestScore, index: bestMove };
  }
}

function getHardMove(currentBoard) {
  const result = minimax([...currentBoard], 0, true);
  return result.index;
}

function resizeFireworksCanvas() {
  if (fireworksCanvas) {
    fireworksCanvas.width = window.innerWidth;
    fireworksCanvas.height = window.innerHeight;
  }
}

function initFireworks() {
  fireworksCanvas = document.getElementById('fireworks-canvas');
  if (fireworksCanvas) {
    fireworksCtx = fireworksCanvas.getContext('2d');
    resizeFireworksCanvas();
    window.addEventListener('resize', resizeFireworksCanvas);
  }
}

function createBurst(x, y, count, color) {
  const selectedColor = color || FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 1.5;
    fireworksParticles.push({
      x: x,
      y: y,
      prevX: x,
      prevY: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: selectedColor,
      alpha: 1,
      decay: Math.random() * 0.015 + 0.012,
      size: Math.random() * 2.5 + 1.5
    });
  }
}

function launchRocket() {
  if (!fireworksActive || !fireworksCanvas) return;
  const startX = Math.random() * (fireworksCanvas.width * 0.8) + (fireworksCanvas.width * 0.1);
  const targetY = Math.random() * (fireworksCanvas.height * 0.45) + (fireworksCanvas.height * 0.15);
  const speed = Math.random() * 3 + 9;
  const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

  fireworksRockets.push({
    x: startX,
    y: fireworksCanvas.height,
    prevX: startX,
    prevY: fireworksCanvas.height,
    vx: (Math.random() - 0.5) * 2,
    vy: -speed,
    targetY: targetY,
    color: color
  });
}

function updateFireworks() {
  if (!fireworksCanvas || !fireworksCtx) return;

  fireworksCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);

  for (let i = fireworksRockets.length - 1; i >= 0; i--) {
    const r = fireworksRockets[i];
    r.prevX = r.x;
    r.prevY = r.y;
    r.x += r.vx;
    r.y += r.vy;
    r.vy += 0.05;

    fireworksCtx.save();
    fireworksCtx.strokeStyle = r.color;
    fireworksCtx.lineWidth = 2.5;
    fireworksCtx.beginPath();
    fireworksCtx.moveTo(r.prevX, r.prevY);
    fireworksCtx.lineTo(r.x, r.y);
    fireworksCtx.stroke();
    fireworksCtx.restore();

    if (r.y <= r.targetY || r.vy >= 0) {
      createBurst(r.x, r.y, 55, r.color);
      fireworksRockets.splice(i, 1);
    }
  }

  for (let i = fireworksParticles.length - 1; i >= 0; i--) {
    const p = fireworksParticles[i];
    p.prevX = p.x;
    p.prevY = p.y;
    p.vx *= 0.96;
    p.vy = p.vy * 0.96 + 0.07;
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;

    if (p.alpha <= 0) {
      fireworksParticles.splice(i, 1);
      continue;
    }

    fireworksCtx.save();
    fireworksCtx.globalAlpha = Math.max(0, p.alpha);
    fireworksCtx.strokeStyle = p.color;
    fireworksCtx.lineWidth = p.size;
    fireworksCtx.beginPath();
    fireworksCtx.moveTo(p.prevX, p.prevY);
    fireworksCtx.lineTo(p.x, p.y);
    fireworksCtx.stroke();
    fireworksCtx.restore();
  }

  if (fireworksActive || fireworksParticles.length > 0 || fireworksRockets.length > 0) {
    fireworksAnimationId = requestAnimationFrame(updateFireworks);
  } else {
    fireworksCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
  }
}

function startFireworks() {
  stopFireworks();
  fireworksActive = true;
  resizeFireworksCanvas();

  createBurst(fireworksCanvas.width * 0.25, fireworksCanvas.height * 0.35, 50);
  createBurst(fireworksCanvas.width * 0.5, fireworksCanvas.height * 0.25, 65);
  createBurst(fireworksCanvas.width * 0.75, fireworksCanvas.height * 0.35, 50);

  launchRocket();
  fireworksIntervalId = setInterval(() => {
    launchRocket();
  }, 320);

  fireworksTimeoutId = setTimeout(() => {
    if (fireworksIntervalId) {
      clearInterval(fireworksIntervalId);
      fireworksIntervalId = null;
    }
    fireworksActive = false;
  }, 3500);

  fireworksAnimationId = requestAnimationFrame(updateFireworks);
}

function stopFireworks() {
  fireworksActive = false;
  if (fireworksIntervalId) {
    clearInterval(fireworksIntervalId);
    fireworksIntervalId = null;
  }
  if (fireworksTimeoutId) {
    clearTimeout(fireworksTimeoutId);
    fireworksTimeoutId = null;
  }
  if (fireworksAnimationId) {
    cancelAnimationFrame(fireworksAnimationId);
    fireworksAnimationId = null;
  }
  fireworksParticles = [];
  fireworksRockets = [];
  if (fireworksCanvas && fireworksCtx) {
    fireworksCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
  }
}

function triggerComputerMove() {
  if (isGameOver || currentPlayer !== 'O' || gameMode !== 'pve') {
    isComputerThinking = false;
    render();
    return;
  }

  let move = null;
  if (difficulty === 'easy') {
    move = getEasyMove(board);
  } else if (difficulty === 'medium') {
    move = getMediumMove(board);
  } else {
    move = getHardMove(board);
  }

  if (move !== null && move !== undefined && board[move] === '') {
    isComputerThinking = false;
    executeMove(move, 'O');
  } else {
    isComputerThinking = false;
    render();
  }
}

function executeMove(index, player) {
  board[index] = player;
  const win = checkWin(board, player);

  if (win) {
    isGameOver = true;
    winningLine = win;
    scores[player]++;
    render();
    if (gameMode === 'pvp' || (gameMode === 'pve' && player === 'X')) {
      startFireworks();
    }
    return;
  }

  if (checkDraw(board)) {
    isGameOver = true;
    winningLine = null;
    scores.ties++;
    render();
    return;
  }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  render();

  if (gameMode === 'pve' && currentPlayer === 'O') {
    isComputerThinking = true;
    render();
    computerTimeoutId = setTimeout(() => {
      triggerComputerMove();
    }, 500);
  }
}

function handleCellClick(index) {
  if (isGameOver || isComputerThinking || board[index] !== '') {
    return;
  }
  executeMove(index, currentPlayer);
}

function startNewRound() {
  stopFireworks();
  if (computerTimeoutId) {
    clearTimeout(computerTimeoutId);
    computerTimeoutId = null;
  }
  board = ['', '', '', '', '', '', '', '', ''];
  currentPlayer = 'X';
  isGameOver = false;
  isComputerThinking = false;
  winningLine = null;
  const cellElements = document.querySelectorAll('.cell');
  cellElements.forEach(cell => {
    cell.dataset.mark = '';
    cell.innerHTML = '';
  });
  render();
}

function resetScores() {
  scores.X = 0;
  scores.O = 0;
  scores.ties = 0;
  startNewRound();
}

function setGameMode(mode) {
  if (gameMode === mode) return;
  gameMode = mode;
  resetScores();
}

function setDifficulty(diff) {
  if (difficulty === diff) return;
  difficulty = diff;
  resetScores();
}

function init() {
  initIntroScreen();
  initFireworks();

  document.querySelectorAll('.cell').forEach(cell => {
    cell.addEventListener('click', () => {
      const index = parseInt(cell.dataset.index, 10);
      handleCellClick(index);
    });
  });

  document.getElementById('mode-pvp-btn').addEventListener('click', () => {
    setGameMode('pvp');
  });

  document.getElementById('mode-pve-btn').addEventListener('click', () => {
    setGameMode('pve');
  });

  document.getElementById('diff-easy-btn').addEventListener('click', () => {
    setDifficulty('easy');
  });

  document.getElementById('diff-medium-btn').addEventListener('click', () => {
    setDifficulty('medium');
  });

  document.getElementById('diff-hard-btn').addEventListener('click', () => {
    setDifficulty('hard');
  });

  document.getElementById('new-round-btn').addEventListener('click', () => {
    startNewRound();
  });

  document.getElementById('reset-scores-btn').addEventListener('click', () => {
    resetScores();
  });

  render();
}

window.addEventListener('DOMContentLoaded', init);
