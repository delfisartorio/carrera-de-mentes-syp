/* =========================================================
   CARRERA DE MENTE — lógica del juego
   (No hace falta tocar este archivo para cambiar lo visual:
    usá js/config.js y css/styles.css)
   ========================================================= */
(() => {
  'use strict';

  const C = CONFIG;
  const LAST = C.TOTAL_CELLS - 1;
  const $ = (s, el = document) => el.querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const avatarById = id => C.AVATARS.find(a => a.id === id) || C.AVATARS[0];

  let state = null;     // { teams:[{id,name,avatar,color,pos,rings}], turn, winners:[] }
  let busy = false;     // true mientras una ficha se está moviendo
  let dice = null;      // valor elegido del dado
  let history = [];     // para "Deshacer"
  let draft = [];       // equipos en la pantalla de setup
  const cells = [];     // elementos .cell en orden de recorrido
  const tokens = new Map(); // teamId -> elemento .token

  /* ---------------- Persistencia ---------------- */
  function save() {
    try { localStorage.setItem(C.STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* sin storage */ }
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(C.STORAGE_KEY));
      if (s && Array.isArray(s.teams) && s.teams.length >= 2) return s;
    } catch (e) { /* dato corrupto */ }
    return null;
  }
  function clearSave() {
    try { localStorage.removeItem(C.STORAGE_KEY); } catch (e) { /* nada */ }
  }
  function normalize(s) {
    s.teams.forEach(t => {
      t.pos = Math.max(0, Math.min(LAST, t.pos | 0));
      t.rings = Math.max(0, t.rings | 0);
    });
    s.turn = Math.max(0, Math.min(s.teams.length - 1, s.turn | 0));
    s.winners = Array.isArray(s.winners) ? s.winners : [];
    return s;
  }

  /* ---------------- Sonido (opcional) ---------------- */
  let actx;
  function blip(freq = 660, dur = 0.08, type = 'triangle') {
    if (!C.SOUND) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.15, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
      o.connect(g).connect(actx.destination);
      o.start(); o.stop(actx.currentTime + dur);
    } catch (e) { /* sin audio */ }
  }
  const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'square'), i * 140));

  /* ---------------- Avatares ---------------- */
  // Si la imagen no carga, se reemplaza por el emoji.
  window.avatarFallback = img => {
    const span = img.parentNode;
    span.classList.remove('is-img');
    span.textContent = img.dataset.emoji;
  };
  function avatarHTML(id) {
    const a = avatarById(id);
    if (a.img) {
      return `<span class="av is-img"><img src="${esc(a.img)}" alt="${esc(a.name)}" data-emoji="${a.emoji}" onerror="avatarFallback(this)"></span>`;
    }
    return `<span class="av">${a.emoji}</span>`;
  }

  /* ---------------- Pantallas / modales ---------------- */
  function show(screen) {
    $('#screen-setup').hidden = screen !== 'setup';
    $('#screen-game').hidden = screen !== 'game';
  }
  const openModal = id => { $(id).hidden = false; };
  const closeModal = id => { $(id).hidden = true; };
  const anyModalOpen = () => [...document.querySelectorAll('.modal')].some(m => !m.hidden);

  let toastTimer;
  function toast(msg, ms = 1800) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  /* =========================================================
     SETUP
     ========================================================= */
  function newDraftTeam(i) {
    return {
      name: '',
      avatar: C.AVATARS[i % C.AVATARS.length].id,
      color: C.TEAM_COLORS[i % C.TEAM_COLORS.length],
    };
  }

  function showSetup() {
    state = null;
    draft = [newDraftTeam(0), newDraftTeam(1)];
    renderSetup();
    show('setup');
  }

  function renderSetup() {
    $('#team-list').innerHTML = draft.map((t, i) => `
      <div class="team-row" data-i="${i}" style="--team:${t.color}">
        <div class="team-row-head">
          <div class="avatar-preview">${avatarHTML(t.avatar)}</div>
          <input class="team-name" type="text" maxlength="22" placeholder="Equipo ${i + 1}" value="${esc(t.name)}">
          <label class="color-pick" title="Color del equipo"><input type="color" class="team-color" value="${t.color}"></label>
          <button type="button" class="btn-icon team-remove" title="Quitar equipo" ${draft.length <= C.MIN_TEAMS ? 'disabled' : ''}>✖</button>
        </div>
        <div class="avatar-picker">
          ${C.AVATARS.map(a => `
            <button type="button" class="avatar-opt ${a.id === t.avatar ? 'selected' : ''}" data-avatar="${a.id}" title="${esc(a.name)}">${avatarHTML(a.id)}</button>
          `).join('')}
        </div>
      </div>`).join('');
  }

  function bindSetup() {
    const list = $('#team-list');
    list.addEventListener('input', e => {
      const row = e.target.closest('.team-row'); if (!row) return;
      const t = draft[+row.dataset.i];
      if (e.target.classList.contains('team-name')) t.name = e.target.value;
      if (e.target.classList.contains('team-color')) {
        t.color = e.target.value;
        row.style.setProperty('--team', t.color);
      }
    });
    list.addEventListener('click', e => {
      const row = e.target.closest('.team-row'); if (!row) return;
      const i = +row.dataset.i;
      const opt = e.target.closest('.avatar-opt');
      if (opt) { draft[i].avatar = opt.dataset.avatar; renderSetup(); return; }
      if (e.target.closest('.team-remove') && draft.length > C.MIN_TEAMS) { draft.splice(i, 1); renderSetup(); }
    });
    $('#btn-add-team').addEventListener('click', () => {
      draft.push(newDraftTeam(draft.length));
      renderSetup();
      const inputs = list.querySelectorAll('.team-name');
      inputs[inputs.length - 1].focus();
    });
    $('#btn-start').addEventListener('click', startNewGame);
  }

  function startNewGame() {
    const stamp = Date.now().toString(36);
    state = {
      version: 1,
      teams: draft.map((t, i) => ({
        id: `t${i}_${stamp}`,
        name: t.name.trim() || `Equipo ${i + 1}`,
        avatar: t.avatar,
        color: t.color,
        pos: 0,
        rings: 0,
      })),
      turn: 0,
      winners: [],
    };
    history = [];
    save();
    enterGame();
  }

  /* =========================================================
     TABLERO
     ========================================================= */
  function buildBoard() {
    const board = $('#board');
    board.querySelectorAll('.cell').forEach(c => c.remove());
    cells.length = 0;

    const cols = C.COLUMNS;
    const rows = Math.ceil(C.TOTAL_CELLS / cols);
    board.style.setProperty('--cols', cols);
    board.style.setProperty('--rows', rows);
    if (C.BOARD_BACKGROUND) board.style.backgroundImage = `url("${C.BOARD_BACKGROUND}")`;

    const frag = document.createDocumentFragment();
    for (let i = 0; i < C.TOTAL_CELLS; i++) {
      // Serpentina: filas pares de izquierda a derecha, impares al revés
      const row = Math.floor(i / cols);
      const k = i % cols;
      const col = row % 2 === 0 ? k : cols - 1 - k;

      const el = document.createElement('div');
      el.className = 'cell';
      el.dataset.index = i;
      el.style.gridRow = row + 1;
      el.style.gridColumn = col + 1;

      const sp = C.SPECIAL_CELLS[i];
      const type = sp && C.SPECIAL_TYPES[sp.type];
      let html;
      if (i === 0) {
        el.classList.add('cell-start');
        html = `<span class="cell-num">🚩</span><span class="cell-label">Salida</span>`;
      } else if (i === LAST) {
        el.classList.add('cell-goal');
        html = `<span class="cell-num">🏁</span><span class="cell-label">Meta</span>`;
      } else if (type) {
        el.classList.add('cell-special', `cell-${sp.type}`);
        html = `<span class="cell-num">${i}</span><span class="cell-icon">${type.icon}</span>
                <span class="cell-label">${esc(type.label)}${sp.value ? ' ' + sp.value : ''}</span>`;
      } else {
        el.classList.add(`cell-c${i % 4}`);
        html = `<span class="cell-num">${i}</span>`;
      }
      el.innerHTML = html;
      cells.push(el);
      frag.appendChild(el);
    }
    board.insertBefore(frag, $('#tokens'));
  }

  function measure() {
    if (!cells.length) return;
    $('#board').style.setProperty('--cell', cells[0].offsetWidth + 'px');
  }

  /* =========================================================
     FICHAS Y ANILLOS
     ========================================================= */
  function buildTokens() {
    const layer = $('#tokens');
    layer.innerHTML = '';
    tokens.clear();
    state.teams.forEach(t => {
      const el = document.createElement('div');
      el.className = 'token';
      el.style.setProperty('--team', t.color);
      el.innerHTML = `
        <div class="token-body">
          <div class="token-shadow"></div>
          <div class="rings"></div>
          <div class="token-avatar">${avatarHTML(t.avatar)}</div>
          <div class="ring-badge"></div>
        </div>`;
      layer.appendChild(el);
      tokens.set(t.id, el);
      renderRings(t, false);
    });
  }

  // Dibuja la pila de anillos. Los nuevos caen con animación.
  function renderRings(team, animateNew = true) {
    const el = tokens.get(team.id);
    if (!el) return;
    const wrap = el.querySelector('.rings');
    const prev = wrap.children.length;
    const vis = Math.min(team.rings, C.MAX_VISIBLE_RINGS);

    let html = '';
    for (let i = 0; i < vis; i++) {
      const color = C.RING_COLOR_MODE === 'team' ? team.color : C.RING_COLORS[i % C.RING_COLORS.length];
      const cls = ['ring'];
      if (animateNew && i >= prev) cls.push('ring-new');
      if (C.RING_IMAGE) cls.push('ring-img');
      const bg = C.RING_IMAGE ? `background-image:url('${C.RING_IMAGE}');` : '';
      html += `<div class="${cls.join(' ')}" style="--i:${i};--rc:${color};${bg}"></div>`;
    }
    wrap.innerHTML = html;
    el.style.setProperty('--vis', vis);
    el.style.setProperty('--has', vis > 0 ? 1 : 0);
    el.querySelector('.ring-badge').textContent = team.rings > 0 ? `×${team.rings}` : '';
  }

  // Ubica cada ficha sobre su casilla (con o sin transición).
  // Si varias fichas comparten casilla, se reparten de costado.
  function layoutTokens(animate = true, movingId = null) {
    if (!cells.length || !state) return;
    const groups = {};
    state.teams.forEach(t => (groups[t.pos] = groups[t.pos] || []).push(t));
    const cw = cells[0].offsetWidth;
    const cur = currentTeam();

    state.teams.forEach(t => {
      const el = tokens.get(t.id);
      const cell = cells[t.pos];
      const g = groups[t.pos], n = g.length, k = g.indexOf(t);
      const dx = n > 1 ? (k / (n - 1) - 0.5) * cw * 0.55 : 0;
      const dy = n > 1 ? (k % 2) * cw * 0.1 : 0;
      const x = cell.offsetLeft + cell.offsetWidth / 2 + dx;
      const y = cell.offsetTop + cell.offsetHeight * 0.8 + dy;

      if (!animate) el.classList.add('no-anim');
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.zIndex = t.id === movingId ? 1000 : Math.round(y) + k;
      el.classList.toggle('is-turn', !!cur && t.id === cur.id && !busy);
    });

    if (!animate) {
      void $('#tokens').offsetWidth; // fuerza reflow para aplicar sin transición
      tokens.forEach(el => el.classList.remove('no-anim'));
    }
  }

  function hop(el) {
    const body = el.querySelector('.token-body');
    body.classList.remove('hop');
    void body.offsetWidth; // reinicia la animación
    body.classList.add('hop');
  }

  /* =========================================================
     TURNOS Y MOVIMIENTO
     ========================================================= */
  const currentTeam = () => state && state.teams[state.turn];
  const allFinished = () => state.teams.every(t => t.pos >= LAST);

  function nextTurn() {
    const n = state.teams.length;
    for (let i = 1; i <= n; i++) {
      const idx = (state.turn + i) % n;
      if (state.teams[idx].pos < LAST) { state.turn = idx; return; }
    }
  }

  function pushHistory() {
    history.push(JSON.stringify(state));
    if (history.length > 30) history.shift();
  }

  // Mueve la ficha casilla por casilla (steps puede ser negativo).
  async function walk(team, steps) {
    let dir = Math.sign(steps);
    let left = Math.abs(steps);
    const el = tokens.get(team.id);

    while (left > 0) {
      let next = team.pos + dir;
      if (next > LAST) {
        if (!C.BOUNCE_AT_END) break;
        dir = -1;
        next = team.pos - 1;
      }
      if (next < 0) break;
      team.pos = next;
      left--;
      hop(el);
      layoutTokens(true, team.id);
      blip(dir > 0 ? 520 + team.pos * 6 : 380, 0.07);
      save(); // guardado en cada paso: si se recarga a mitad, no se pierde
      await sleep(C.STEP_MS);
    }
    const land = cells[team.pos];
    land.classList.remove('cell-land'); void land.offsetWidth; land.classList.add('cell-land');
    layoutTokens(true);
  }

  async function resolveCell(team, depth) {
    if (team.pos === 0 || team.pos === LAST || depth > 3) return;
    const sp = C.SPECIAL_CELLS[team.pos];
    const type = sp && C.SPECIAL_TYPES[sp.type];
    if (!type) return;

    const cell = cells[team.pos];
    cell.classList.remove('cell-trigger'); void cell.offsetWidth; cell.classList.add('cell-trigger');

    switch (sp.type) {
      case 'forward':
        toast(`${type.icon} ¡${team.name} avanza ${sp.value}!`);
        await sleep(800);
        await walk(team, sp.value);
        return resolveCell(team, depth + 1);
      case 'back':
        toast(`${type.icon} ¡${team.name} retrocede ${sp.value}!`);
        await sleep(800);
        await walk(team, -sp.value);
        return resolveCell(team, depth + 1);
      case 'prize':
        toast(`${type.icon} ¡${team.name} gana un anillo!`);
        await sleep(300);
        changeRings(team, 1);
        await sleep(900);
        return;
      case 'challenge': {
        const ok = await askChallenge(team);
        if (ok) { changeRings(team, 1); await sleep(900); }
        return;
      }
    }
  }

  async function playTurn() {
    if (busy || !dice || !state) return;
    const team = currentTeam();
    if (!team || team.pos >= LAST) return;

    pushHistory();
    busy = true;
    const steps = dice;
    dice = null;
    renderPanel();

    await walk(team, steps);
    await resolveCell(team, 0);

    if (team.pos === LAST && !state.winners.includes(team.id)) {
      state.winners.push(team.id);
      showVictory(team);
    }
    nextTurn();
    busy = false;
    save();
    renderPanel(true);
    layoutTokens(true);
  }

  function changeRings(team, delta) {
    team.rings = Math.max(0, team.rings + delta);
    renderRings(team, delta > 0);
    if (delta > 0) [880, 1175].forEach((f, i) => setTimeout(() => blip(f, 0.12, 'sine'), i * 90));
    save();
    renderPanel();
  }

  function undo() {
    if (busy || !history.length) { if (!history.length) toast('Nada para deshacer'); return; }
    state = normalize(JSON.parse(history.pop()));
    state.teams.forEach(t => renderRings(t, false));
    save();
    layoutTokens(true);
    renderPanel(true);
    toast('↩️ Acción deshecha', 1200);
  }

  /* =========================================================
     PANEL
     ========================================================= */
  function renderPanel(turnChanged = false) {
    const cur = currentTeam();
    const card = $('#turn-card');
    if (allFinished()) {
      card.style.setProperty('--team', '#2b1d52');
      card.innerHTML = `<div class="turn-avatar"><span class="av">🏆</span></div>
        <div><div class="turn-label">Fin</div><div class="turn-name">¡Partida terminada!</div></div>`;
    } else {
      card.style.setProperty('--team', cur.color);
      card.innerHTML = `
        <div class="turn-avatar">${avatarHTML(cur.avatar)}</div>
        <div>
          <div class="turn-label">Turno de</div>
          <div class="turn-name">${esc(cur.name)}</div>
          <div class="turn-meta">Casilla ${cur.pos} · 💍 ${cur.rings}</div>
        </div>`;
    }
    if (turnChanged) { card.classList.remove('changed'); void card.offsetWidth; card.classList.add('changed'); }

    // Dado
    const finished = allFinished();
    document.querySelectorAll('.dice-btn').forEach(b => {
      b.classList.toggle('selected', +b.dataset.value === dice);
      b.disabled = busy || finished;
    });
    $('#btn-move').disabled = busy || !dice || finished;
    $('#btn-move').textContent = dice ? `¡Mover ${dice}!` : '¡Mover!';
    $('#btn-ring').disabled = busy || finished;
    $('#btn-skip').disabled = busy || finished;
    $('#btn-undo').disabled = busy;

    // Tabla de equipos
    $('#score-list').innerHTML = state.teams.map(t => `
      <li class="score-item ${cur && t.id === cur.id && !finished ? 'current' : ''} ${t.pos >= LAST ? 'finished' : ''}" style="--team:${t.color}" data-id="${t.id}">
        <div class="score-avatar">${avatarHTML(t.avatar)}</div>
        <div class="score-info">
          <div class="score-name">${esc(t.name)}</div>
          <div class="score-pos">${t.pos >= LAST ? '🏁 ¡En la meta!' : `Casilla ${t.pos}`}</div>
        </div>
        <span class="score-rings">💍 ${t.rings}</span>
        <button type="button" class="btn-icon" data-ring="-1" title="Quitar anillo" ${busy || !t.rings ? 'disabled' : ''}>−</button>
        <button type="button" class="btn-icon" data-ring="1" title="Dar anillo" ${busy ? 'disabled' : ''}>+</button>
      </li>`).join('');

    layoutTokens(true);
  }

  function bindGame() {
    const diceBox = $('#dice-buttons');
    diceBox.innerHTML = [1, 2, 3, 4, 5, 6].map(n =>
      `<button type="button" class="dice-btn" data-value="${n}">${n}</button>`).join('');
    diceBox.addEventListener('click', e => {
      const b = e.target.closest('.dice-btn'); if (!b || busy) return;
      dice = +b.dataset.value;
      blip(440 + dice * 40, 0.05);
      renderPanel();
    });

    $('#btn-move').addEventListener('click', playTurn);
    $('#btn-ring').addEventListener('click', () => {
      if (busy) return;
      pushHistory();
      changeRings(currentTeam(), 1);
    });
    $('#btn-skip').addEventListener('click', () => {
      if (busy) return;
      pushHistory();
      nextTurn(); dice = null; save(); renderPanel(true);
    });
    $('#btn-undo').addEventListener('click', undo);
    $('#btn-new').addEventListener('click', () => {
      if (busy) return;
      if (confirm('¿Empezar una nueva partida? Se borrará la partida actual.')) { clearSave(); showSetup(); }
    });

    $('#score-list').addEventListener('click', e => {
      const b = e.target.closest('[data-ring]'); if (!b || busy) return;
      const team = state.teams.find(t => t.id === b.closest('.score-item').dataset.id);
      pushHistory();
      changeRings(team, +b.dataset.ring);
    });

    // Atajos de teclado
    document.addEventListener('keydown', e => {
      if ($('#screen-game').hidden || anyModalOpen() || busy) return;
      if (e.target.matches('input, textarea')) return;
      if (/^[1-6]$/.test(e.key)) { dice = +e.key; renderPanel(); }
      else if (e.key === 'Enter' && dice) { e.preventDefault(); playTurn(); }
    });

    // Recalcular posiciones si cambia el tamaño
    new ResizeObserver(() => { measure(); layoutTokens(false); }).observe($('#board'));
  }

  function enterGame() {
    dice = null;
    busy = false;
    show('game');
    buildBoard();
    buildTokens();
    measure();
    renderPanel(true);
    layoutTokens(false);
  }

  /* =========================================================
     MODALES: desafío, victoria, continuar
     ========================================================= */
  function askChallenge(team) {
    return new Promise(resolve => {
      $('#challenge-text').innerHTML = `<strong style="color:${team.color}">${esc(team.name)}</strong> responde una pregunta.<br>¿La respuesta fue correcta?`;
      openModal('#modal-challenge');
      const done = ok => {
        closeModal('#modal-challenge');
        $('#btn-challenge-ok').onclick = $('#btn-challenge-fail').onclick = null;
        resolve(ok);
      };
      $('#btn-challenge-ok').onclick = () => done(true);
      $('#btn-challenge-fail').onclick = () => done(false);
    });
  }

  function showVictory(team) {
    const place = state.winners.length;
    $('#victory-avatar').innerHTML = avatarHTML(team.avatar);
    $('#modal-victory').style.setProperty('--team', team.color);
    $('#victory-title').textContent = place === 1 ? `¡Ganó ${team.name}!` : `¡${team.name} llegó a la meta!`;
    $('#victory-text').textContent = `Puesto #${place} · con ${team.rings} anillo${team.rings === 1 ? '' : 's'} 💍`;
    $('#btn-victory-continue').hidden = allFinished();
    openModal('#modal-victory');
    launchConfetti();
    fanfare();
  }

  function launchConfetti() {
    const box = $('#confetti');
    box.innerHTML = '';
    const colors = [...C.TEAM_COLORS, ...C.RING_COLORS];
    for (let i = 0; i < 120; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
      p.style.setProperty('--rot', (Math.random() * 1080 - 540) + 'deg');
      p.style.animationDuration = (2.2 + Math.random() * 2.5) + 's';
      p.style.animationDelay = (Math.random() * 1.2) + 's';
      box.appendChild(p);
    }
  }

  function bindModals() {
    $('#btn-victory-continue').addEventListener('click', () => closeModal('#modal-victory'));
    $('#btn-victory-new').addEventListener('click', () => { closeModal('#modal-victory'); clearSave(); showSetup(); });
  }

  function offerResume(saved) {
    $('#resume-summary').innerHTML = saved.teams.map(t => `
      <li style="--team:${t.color}">${avatarHTML(t.avatar)}
        <strong>${esc(t.name)}</strong> — casilla ${t.pos} · 💍 ${t.rings}</li>`).join('');
    openModal('#modal-resume');
    $('#btn-resume').onclick = () => {
      closeModal('#modal-resume');
      state = normalize(saved);
      history = [];
      enterGame();
    };
    $('#btn-resume-new').onclick = () => {
      closeModal('#modal-resume');
      clearSave();
      showSetup();
    };
  }

  /* ---------------- Inicio ---------------- */
  function init() {
    document.documentElement.style.setProperty('--step-ms', C.STEP_MS + 'ms');
    bindSetup();
    bindGame();
    bindModals();
    const saved = load();
    if (saved) offerResume(saved);
    else showSetup();
  }

  init();
})();
