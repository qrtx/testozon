(() => {
  const term = document.getElementById('terminal');
  const menu = document.getElementById('menu');
  const gameOverMenu = document.getElementById('gameover-menu');
  const btnStart = document.getElementById('btn-start');
  const btnRestart = document.getElementById('btn-restart');
  const btnBack = document.getElementById('btn-back');

  let cols, rows, grid;
  let shipPos, gameTimer, spawnTimer;
  let state = 'intro';
  let startTime = 0;
  const asteroids = [];
  const spawnInterval = 400, gameFPS = 100;

  function measureGrid() {
    const span = document.createElement('span');
    span.textContent = 'M';
    span.style.font = window.getComputedStyle(term).font;
    span.style.position = 'absolute';
    span.style.visibility = 'hidden';
    document.body.appendChild(span);
    const rect = span.getBoundingClientRect();
    const charW = rect.width, charH = rect.height;
    document.body.removeChild(span);
    const tRect = term.getBoundingClientRect();
    cols = Math.floor(tRect.width / charW);
    rows = Math.floor(tRect.height / charH);
  }

  function initGrid() {
    grid = Array.from({length: rows}, () => ' '.repeat(cols));
  }

  function clearGrid() {
    for (let i = 0; i < rows; i++) {
      grid[i] = ' '.repeat(cols);
    }
  }
  function drawGrid() {
    term.textContent = grid.join('\n');
  }
  function setCell(r, c, ch) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    grid[r] = grid[r].substr(0, c) + ch + grid[r].substr(c + 1);
  }

  function resizeHandler() {
    measureGrid();
    initGrid();
    if (state === 'intro') drawIntro();
    if (state === 'menu') showMenu();
    if (state === 'playing') drawGrid();
    if (state === 'gameover') showGameOverMenu();
  }

  function drawIntro() {
    clearGrid();
    const title = 'QRTX_COSMO.EXE';
    const off = Math.floor((cols - title.length) / 2);
    const row = Math.floor(rows / 4);
    for (let i = 0; i < title.length; i++) {
      setCell(row, off + i, title[i]);
    }
    drawGrid();
  }

  function showMenu() {
    state = 'menu';
    menu.classList.remove('hidden');
    gameOverMenu.classList.add('hidden');
  }
  function startGame() {
    menu.classList.add('hidden');
    gameOverMenu.classList.add('hidden');
    state = 'playing';
    clearGrid();
    drawGrid();
    asteroids.length = 0;
    shipPos = Math.floor(cols / 2);
    startTime = Date.now();
    gameTimer = setInterval(gameLoop, gameFPS);
    spawnTimer = setInterval(spawnAsteroid, spawnInterval);
  }

  function spawnAsteroid() {
    // spawn multiple asteroids with sizes
    const count = 3 + Math.floor(Math.random() * 3); // 3-5
    for (let i = 0; i < count; i++) {
      const col = Math.floor(Math.random() * (cols - 2));
      const size = (Math.random() < 0.5 ? 1 : 2);
      asteroids.push({r: 0, c: col, size});
    }
  }

  function gameLoop() {
    // move and remove
    for (let a of asteroids) a.r++;
    while (asteroids.length && asteroids[0].r >= rows) asteroids.shift();
    clearGrid();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const scoreText = 'Score: ' + elapsed + 's';
    for (let i = 0; i < scoreText.length; i++) setCell(0, i, scoreText[i]);
    // draw asteroids
    for (let a of asteroids) {
      for (let dx = 0; dx < a.size; dx++) {
        setCell(a.r, a.c + dx, 'O');
      }
    }
    // draw ship
    setCell(rows - 1, shipPos, 'A');
    drawGrid();
    // collision
    for (let a of asteroids) {
      if (a.r === rows - 1 && shipPos >= a.c && shipPos < a.c + a.size) {
        endGame();
        return;
      }
    }
  }

  function endGame() {
    clearInterval(gameTimer);
    clearInterval(spawnTimer);
    state = 'gameover';
    gameOverMenu.classList.remove('hidden');
  }

  // Controls
  document.addEventListener('keydown', e => {
    if (state !== 'playing') return;
    if (e.code === 'ArrowLeft') shipPos = Math.max(0, shipPos - 1);
    if (e.code === 'ArrowRight') shipPos = Math.min(cols - 1, shipPos + 1);
  });
  document.addEventListener('mousedown', e => {
    if (state !== 'playing') return;
    const x = e.clientX;
    if (x < window.innerWidth / 2) shipPos = Math.max(0, shipPos - 1);
    else shipPos = Math.min(cols - 1, shipPos + 1);
  });
  document.addEventListener('touchstart', e => {
    if (state !== 'playing') return;
    const x = e.touches[0].clientX;
    if (x < window.innerWidth / 2) shipPos = Math.max(0, shipPos - 1);
    else shipPos = Math.min(cols - 1, shipPos + 1);
  });

  btnStart.addEventListener('click', startGame);
  btnRestart.addEventListener('click', startGame);
  btnBack.addEventListener('click', () => window.location = 'index.html');

  window.addEventListener('resize', resizeHandler);

  // Init
  resizeHandler();
  state = 'intro';
  drawIntro();
  setTimeout(() => { state = 'menu'; showMenu(); }, 1000);
})();