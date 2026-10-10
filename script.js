(() => {
  "use strict";

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");
  const startBtn = document.getElementById("startBtn");
  const touch = document.getElementById("touch");

  const COLS = 24;
  const ROWS = 24;
  const CELL = canvas.width / COLS;
  const STORAGE_KEY = "snake.best";
  const BASE_SPEED = 7; // клеток в секунду
  const SPEED_STEP = 0.28; // прирост скорости за каждую еду
  const MAX_SPEED = 22;

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const state = {
    snake: [],
    dir: DIRS.right,
    queue: [],
    food: { x: 0, y: 0 },
    score: 0,
    best: Number(localStorage.getItem(STORAGE_KEY)) || 0,
    running: false,
    gameOver: false,
    acc: 0,
    last: 0,
    speed: BASE_SPEED,
  };

  bestEl.textContent = state.best;

  function startGame() {
    state.snake = [
      { x: 8, y: 12 },
      { x: 7, y: 12 },
      { x: 6, y: 12 },
    ];
    state.dir = DIRS.right;
    state.queue = [];
    state.score = 0;
    state.speed = BASE_SPEED;
    state.running = true;
    state.gameOver = false;
    state.acc = 0;
    state.last = performance.now();
    spawnFood();
    scoreEl.textContent = "0";
    hideOverlay();
  }

  function endGame() {
    state.running = false;
    state.gameOver = true;
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem(STORAGE_KEY, String(state.best));
      bestEl.textContent = state.best;
    }
    showOverlay("Игра окончена", `Ваш счёт: <b>${state.score}</b>`, "Ещё раз");
  }

  function showOverlay(title, html, button) {
    overlayTitle.textContent = title;
    overlayText.innerHTML = html;
    startBtn.textContent = button;
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function spawnFood() {
    const empty = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!state.snake.some((s) => s.x === x && s.y === y)) {
          empty.push({ x, y });
        }
      }
    }
    if (!empty.length) return;
    state.food = empty[Math.floor(Math.random() * empty.length)];
  }

  function setDir(next) {
    // Учитываем последнее запланированное направление, а не текущее,
    // чтобы быстрые нажатия подряд не «съедались».
    const ref = state.queue.length ? state.queue[state.queue.length - 1] : state.dir;
    if (next.x === -ref.x && next.y === -ref.y) return; // разворот на 180°
    if (next.x === ref.x && next.y === ref.y) return; // то же направление
    state.queue.push(next);
    if (state.queue.length > 2) state.queue.shift();
  }

  function step() {
    if (state.queue.length) state.dir = state.queue.shift();

    const head = {
      x: state.snake[0].x + state.dir.x,
      y: state.snake[0].y + state.dir.y,
    };

    const hitWall =
      head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS;
    const hitSelf = state.snake.some((s) => s.x === head.x && s.y === head.y);

    if (hitWall || hitSelf) {
      endGame();
      return;
    }

    state.snake.unshift(head);

    if (head.x === state.food.x && head.y === state.food.y) {
      state.score += 1;
      scoreEl.textContent = state.score;
      state.speed = Math.min(MAX_SPEED, state.speed + SPEED_STEP);
      spawnFood();
    } else {
      state.snake.pop();
    }
  }

  function drawCell(x, y, color, inset) {
    const pad = inset || 0;
    const r = 6;
    const px = x * CELL + pad;
    const py = y * CELL + pad;
    const size = CELL - pad * 2;
    roundRect(px, py, size, size, Math.min(r, size / 2));
    ctx.fillStyle = color;
    ctx.fill();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    // Фон-шахматка
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#131a2b" : "#101625";
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }

    // Еда
    const fx = state.food.x * CELL + CELL / 2;
    const fy = state.food.y * CELL + CELL / 2;
    ctx.save();
    ctx.shadowColor = "#ff5b6e";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(fx, fy, CELL * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = "#ff5b6e";
    ctx.fill();
    ctx.restore();

    // Змейка
    for (let i = state.snake.length - 1; i >= 0; i--) {
      const s = state.snake[i];
      const isHead = i === 0;
      const t = i / Math.max(1, state.snake.length - 1);
      const color = isHead ? "#7ef58b" : shade(t);
      drawCell(s.x, s.y, color, isHead ? 1 : 2);
    }

    // Глаза
    if (state.snake.length) {
      const h = state.snake[0];
      const cx = h.x * CELL + CELL / 2;
      const cy = h.y * CELL + CELL / 2;
      const off = CELL * 0.16;
      const ex = state.dir.x * off;
      const ey = state.dir.y * off;
      const eyeR = CELL * 0.09;
      const px = state.dir.y !== 0 ? off : 0;
      const py = state.dir.x !== 0 ? off : 0;
      ctx.fillStyle = "#0e1220";
      for (const sign of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(cx + ex + sign * px, cy + ey + sign * py, eyeR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function lerp(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  function shade(t) {
    // От ярко-зелёного к более тёмному с синеватым оттенком
    const r = lerp(53, 32, t);
    const g = lerp(208, 150, t);
    const b = lerp(95, 120, t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function loop(now) {
    if (state.running) {
      const dt = Math.min(now - state.last, 250);
      state.last = now;
      state.acc += dt;
      const interval = 1000 / state.speed;
      while (state.acc >= interval && state.running) {
        state.acc -= interval;
        step();
      }
    } else {
      state.last = now;
    }
    draw();
    requestAnimationFrame(loop);
  }

  // --- Управление ---
  const KEYMAP = {
    ArrowUp: DIRS.up,
    ArrowDown: DIRS.down,
    ArrowLeft: DIRS.left,
    ArrowRight: DIRS.right,
    KeyW: DIRS.up,
    KeyS: DIRS.down,
    KeyA: DIRS.left,
    KeyD: DIRS.right,
  };

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter") {
      if (!state.running) {
        e.preventDefault();
        startGame();
      }
      return;
    }
    const dir = KEYMAP[e.code];
    if (!dir) return;
    e.preventDefault();
    if (state.running) setDir(dir);
  });

  touch.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest("[data-dir]");
    if (!btn || !state.running) return;
    e.preventDefault();
    setDir(DIRS[btn.dataset.dir]);
  });

  // Свайпы по полю
  let swipe = null;
  canvas.addEventListener("pointerdown", (e) => {
    swipe = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!swipe || !state.running) {
      swipe = null;
      return;
    }
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.hypot(dx, dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      setDir(dx > 0 ? DIRS.right : DIRS.left);
    } else {
      setDir(dy > 0 ? DIRS.down : DIRS.up);
    }
  });

  startBtn.addEventListener("click", startGame);

  // Стартовый экран
  state.snake = [
    { x: 8, y: 12 },
    { x: 7, y: 12 },
    { x: 6, y: 12 },
  ];
  spawnFood();
  requestAnimationFrame((t) => {
    state.last = t;
    requestAnimationFrame(loop);
  });
})();
