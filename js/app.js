/* =========================================================
   CARRERA DE MENTES — lógica del juego
   Dinámica: pista en zigzag que da la vuelta. Cada casilla es de una
   temática. Al caer eligen pregunta fácil o difícil de esa temática:
   difícil bien = anillo; 3 fáciles bien = anillo. Si aciertan siguen
   tirando. Gana quien junte todos los anillos.
   (No hace falta tocar este archivo: usá js/config.js y css/styles.css)
   ========================================================= */
(() => {
  'use strict';

  const C = CONFIG;
  const JAIL = '#corral'; // marca de la casilla corral en cellThemes

  // Recorrido de la viborita: lista de { row, col } de la grilla.
  // Fila 1 de izquierda a derecha, codo, la siguiente de vuelta, etc.
  // La última fila llega hasta la columna 1 y se sube por ahí a la Salida
  // (la columna 2 queda libre para que se vea el camino de vuelta).
  function buildPath() {
    const W = Math.max(4, C.COLUMNS | 0);
    const L = Math.max(2, (C.LANES | 0) + ((C.LANES | 0) % 2)); // par
    const path = [];
    for (let k = 0; k < L; k++) {
      const row = 2 * k + 1;
      const right = k % 2 === 0;
      const from = k === 0 || k === L - 1 ? 1 : 3;
      if (right) for (let c = from; c <= W; c++) path.push({ row, col: c });
      else for (let c = W; c >= from; c--) path.push({ row, col: c });
      if (k < L - 1) path.push({ row: row + 1, col: right ? W : 3 }); // codo
    }
    for (let row = 2 * L - 2; row >= 2; row--) path.push({ row, col: 1 }); // vuelta
    return { path, cols: W, rows: 2 * L - 1 };
  }
  const TRACK = buildPath();
  const TOTAL = TRACK.path.length; // casillas de la vuelta
  const $ = (s, el = document) => el.querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const avatarById = id => C.AVATARS.find(a => a.id === id) || C.AVATARS[0];
  // "Geografía " -> "geografia" (para comparar sin tildes ni mayúsculas)
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

  /* state = {
       themes:     ['Historia', ...]   temáticas de esta partida (= anillos a juntar)
       cellThemes: [null, 'Ciencia', '#corral', ...] temática de cada casilla (0 = Salida)
       teams:      [{ id, name, avatar, color, pos, rings:['Historia', ...],
                      easy:{ historia: 2 }  fáciles acertadas por temática (sin anillo aún)
                      jokers:{ eliminar: 1, cambiar: 1 }, jail: turnos que pierde }]
       turn, bonus (sigue tirando), winners:[teamId], used:[questionId respondidas bien], lastQ
     } */
  let state = null;
  let bank = { name: '', questions: [] }; // banco de preguntas cargado
  let busy = false;     // true mientras se mueve una ficha o hay una pregunta
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
      if (s && Array.isArray(s.teams) && s.teams.length >= 2 && Array.isArray(s.themes)
          && Array.isArray(s.cellThemes) && s.cellThemes.length === TOTAL) return s;
    } catch (e) { /* dato corrupto */ }
    return null;
  }
  function clearSave() {
    try { localStorage.removeItem(C.STORAGE_KEY); } catch (e) { /* nada */ }
  }
  function normalize(s) {
    s.teams.forEach(t => {
      t.pos = ((t.pos | 0) % TOTAL + TOTAL) % TOTAL;
      t.rings = Array.isArray(t.rings) ? t.rings : [];
      t.easy = t.easy && typeof t.easy === 'object' ? t.easy : {};
      t.jokers = t.jokers && typeof t.jokers === 'object' ? t.jokers : { ...C.JOKERS };
      t.jail = Math.max(0, t.jail | 0);
    });
    s.turn = Math.max(0, Math.min(s.teams.length - 1, s.turn | 0));
    s.winners = Array.isArray(s.winners) ? s.winners : [];
    s.used = Array.isArray(s.used) ? s.used : [];
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
  const sadTone = () => [330, 262].forEach((f, i) => setTimeout(() => blip(f, 0.2, 'sawtooth'), i * 180));

  /* ---------------- Avatares ---------------- */
  // Si la imagen no carga (o no hay), se muestra la inicial del personaje.
  window.avatarFallback = img => {
    const span = img.parentNode;
    span.classList.remove('is-img');
    span.classList.add('av-initial');
    span.textContent = img.dataset.initial;
  };
  function avatarHTML(id) {
    const a = avatarById(id);
    const initial = esc(a.name.charAt(0).toUpperCase());
    if (a.img) {
      return `<span class="av is-img"><img src="${esc(a.img)}" alt="${esc(a.name)}" data-initial="${initial}" onerror="avatarFallback(this)"></span>`;
    }
    return `<span class="av av-initial">${initial}</span>`;
  }

  /* =========================================================
     TEMÁTICAS
     Cada temática tiene { name, color }. Las que están en
     CONFIG.THEMES usan esos valores; las demás reciben colores
     libres de la paleta (sin repetir dentro de la partida).
     ========================================================= */
  let themeMap = new Map();
  function configTheme(name) {
    const key = norm(name);
    const found = Object.keys(C.THEMES).find(k => norm(k) === key);
    return found ? { name: found, ...C.THEMES[found] } : null;
  }
  function setThemeList(list) {
    themeMap = new Map();
    const usedColors = new Set();
    const unknown = [];
    list.forEach(n => {
      const t = configTheme(n);
      if (t) { themeMap.set(norm(n), t); usedColors.add(t.color); } else unknown.push(n);
    });
    const free = C.RING_COLORS.filter(c => !usedColors.has(c));
    unknown.forEach((n, i) => themeMap.set(norm(n), {
      name: String(n).trim(),
      color: (free.length ? free : C.RING_COLORS)[i % (free.length || C.RING_COLORS.length)],
    }));
  }
  function themeInfo(name) {
    return themeMap.get(norm(name)) || configTheme(name) || { name: String(name || '').trim() || '?', color: '#9a8c73' };
  }
  function themeChip(name, extra = '', cls = '') {
    const t = themeInfo(name);
    return `<span class="theme-chip ${cls}" style="--theme:${t.color}">${esc(t.name)}${extra}</span>`;
  }
  const hasRing = (team, theme) => team.rings.some(r => norm(r) === norm(theme));
  const isWinner = team => state.winners.includes(team.id);

  /* =========================================================
     BANCO DE PREGUNTAS (CSV)
     Columnas: tematica ; pregunta ; respuesta ; opciones ; opcion_correcta ; dificultad
       - separador , ; o tabulación (se detecta solo)
       - dificultad: facil / dificil (opcional; vacía = sirve para las dos)
       - opciones: opcional, separadas por |   (ej: París|Roma|Lima)
         o en columnas opcion_a, opcion_b, ...
         Verdadero|Falso = pregunta de verdadero o falso
       - opcion_correcta: texto, letra (B) o número (2) de la opción correcta.
         El comodín "eliminar opciones" nunca saca esa.
     ========================================================= */
  function parseLevel(s) {
    const v = norm(s);
    if (/^(d|alta|alto|2)/.test(v)) return 'dificil';
    if (/^(f|baja|bajo|1)/.test(v)) return 'facil';
    return '';
  }
  const LEVEL_NAME = { facil: 'Fácil', dificil: 'Difícil' };
  const isTF = q => {
    const o = q.options.map(norm);
    if (!o.length) return ['verdadero', 'falso'].includes(norm(q.a));
    return o.length === 2 && o.every(x => ['verdadero', 'falso', 'v', 'f'].includes(x));
  };
  // Posición de un texto entre las opciones (-1 si no está o es ambiguo)
  function textIndex(options, text) {
    const a = norm(text);
    if (!a) return -1;
    const o = options.map(norm);
    const exact = o.indexOf(a);
    if (exact >= 0) return exact;
    const near = o.map((x, i) => (x && (a.includes(x) || x.includes(a)) ? i : -1)).filter(i => i >= 0);
    return near.length === 1 ? near[0] : -1;
  }
  // Interpreta la columna opcion_correcta: el texto de la opción,
  // una letra (A, b, "B)", "Opción C") o un número (1 = la primera).
  // Si hay dudas, gana la lectura que coincide con la columna respuesta.
  function correctIndex(options, value, answer) {
    const v = norm(value);
    const byAnswer = textIndex(options, answer);
    if (!v) return byAnswer;
    const cands = [];
    const exact = options.map(norm).indexOf(v);
    if (exact >= 0) cands.push(exact);
    const letter = v.match(/^(?:opcion\s*)?([a-j])\s*[).:-]?$/);
    if (letter) cands.push(letter[1].charCodeAt(0) - 97);
    const num = v.match(/^(?:opcion\s*)?(\d+)\s*[).:-]?$/);
    if (num) cands.push(+num[1] - 1);
    const valid = cands.filter(i => i >= 0 && i < options.length);
    if (valid.includes(byAnswer)) return byAnswer;
    if (valid.length) return valid[0];
    const near = textIndex(options, value);
    return near >= 0 ? near : byAnswer;
  }
  // Posición de la respuesta correcta entre las opciones (-1 si no se sabe)
  function answerIndex(q) {
    if (Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length) return q.correct;
    return textIndex(q.options, q.a);
  }
  const canRemoveOptions = q => !!q && q.options.length >= 3 && !isTF(q) && answerIndex(q) >= 0;
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const count = ch => first.split(ch).length - 1;
    const delim = [';', ',', '\t'].sort((a, b) => count(b) - count(a))[0];

    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
        } else field += c;
      } else if (c === '"') quoted = true;
      else if (c === delim) { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(f => f.trim()));
  }

  function buildBank(rows, name) {
    if (!rows.length) throw new Error('El archivo está vacío.');
    const head = rows[0].map(norm);
    const find = (...names) => head.findIndex(h => names.includes(h));
    let iTheme = find('tematica', 'tema', 'categoria', 'materia');
    let iQ = find('pregunta', 'preguntas');
    let iA = find('respuesta', 'respuestas', 'respuesta correcta');
    let iLevel = find('dificultad', 'nivel');
    let iRight = find('opcion_correcta', 'opcion correcta', 'opcioncorrecta', 'correcta');
    let iOpts = head.map((h, i) => (h.startsWith('opcion') && i !== iRight ? i : -1)).filter(i => i >= 0);
    let data = rows.slice(1);
    if (iQ < 0) { // sin encabezado: se asume el orden tematica, pregunta, respuesta, opciones, opcion_correcta, dificultad
      iTheme = 0; iQ = 1; iA = 2; iOpts = [3]; iRight = 4; iLevel = 5; data = rows;
    }
    if (iTheme < 0) throw new Error('Falta la columna "tematica".');

    // El nombre de cada temática se toma tal cual aparece la primera vez
    const canon = new Map();
    const questions = [];
    data.forEach(r => {
      const q = (r[iQ] || '').trim();
      const rawTheme = (r[iTheme] || '').trim();
      if (!q || !rawTheme) return;
      if (!canon.has(norm(rawTheme))) canon.set(norm(rawTheme), (configTheme(rawTheme) || { name: rawTheme }).name);
      const options = iOpts
        .flatMap(i => String(r[i] || '').split('|'))
        .map(s => s.trim())
        .filter(Boolean);
      const a = iA >= 0 ? (r[iA] || '').trim() : '';
      questions.push({
        id: questions.length,
        theme: canon.get(norm(rawTheme)),
        q,
        a,
        options,
        correct: correctIndex(options, iRight >= 0 ? r[iRight] : '', a),
        level: iLevel >= 0 ? parseLevel(r[iLevel]) : '',
      });
    });
    if (!questions.length) throw new Error('No se encontró ninguna pregunta. Revisá las columnas "tematica" y "pregunta".');
    return { name, questions };
  }

  // Temáticas del banco en orden de aparición
  function bankThemes() {
    const seen = new Set(), list = [];
    bank.questions.forEach(q => {
      if (!seen.has(norm(q.theme))) { seen.add(norm(q.theme)); list.push(q.theme); }
    });
    return list;
  }
  const boardThemesFromBank = () => bankThemes().slice(0, C.MAX_THEMES);

  function saveBank() {
    try { localStorage.setItem(C.BANK_STORAGE_KEY, JSON.stringify(bank)); } catch (e) { toast('El banco es muy grande para guardarse', 2500); }
  }
  function loadBank() {
    try {
      const b = JSON.parse(localStorage.getItem(C.BANK_STORAGE_KEY));
      if (b && Array.isArray(b.questions)) bank = b;
    } catch (e) { /* nada */ }
  }
  function setBank(newBank) {
    bank = newBank;
    saveBank();
    if (state) {
      state.used = [];
      save();
      const missing = state.themes.filter(t => !bank.questions.some(q => norm(q.theme) === norm(t)));
      if (missing.length) toast(`El nuevo banco no tiene preguntas de: ${missing.join(', ')}`, 3500);
      else toast(`${bank.questions.length} preguntas cargadas`);
    } else {
      setThemeList(boardThemesFromBank());
      renderBank();
      toast(`${bank.questions.length} preguntas cargadas`);
    }
  }

  // Lee el archivo como UTF-8; si viene de Excel en Windows-1252, lo reintenta.
  async function readFileText(file) {
    const buf = await file.arrayBuffer();
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
    catch (e) { return new TextDecoder('windows-1252').decode(buf); }
  }

  async function onBankFile(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      setBank(buildBank(parseCSV(await readFileText(file)), file.name));
      $('#bank-error').hidden = true;
    } catch (err) {
      $('#bank-error').textContent = err.message;
      $('#bank-error').hidden = false;
      toast(err.message, 3000);
    }
  }

  function renderBank() {
    const n = bank.questions.length;
    const all = bankThemes();
    const used = all.slice(0, C.MAX_THEMES);
    const status = $('#bank-status');
    const err = $('#bank-error');
    status.classList.toggle('empty', !n);
    status.textContent = n
      ? `${n} preguntas cargadas${bank.name ? ` (${bank.name})` : ''} · ${used.length} temáticas = ${used.length} anillos para ganar`
      : 'Cargá un banco de preguntas para poder jugar (o usá el de ejemplo).';
    $('#bank-themes').innerHTML = used.map(t => {
      const qs = bank.questions.filter(q => norm(q.theme) === norm(t));
      const f = qs.filter(q => q.level === 'facil').length, d = qs.filter(q => q.level === 'dificil').length;
      return themeChip(t, ` <small>${f || d ? `${f} fáciles · ${d} difíciles` : qs.length}</small>`);
    }).join('');

    if (n && !bank.questions.some(q => q.level)) {
      err.textContent = 'El CSV no tiene columna "dificultad": cualquier pregunta sale como fácil o difícil.';
      err.hidden = false;
    } else if (all.length > C.MAX_THEMES) {
      err.textContent = `El CSV tiene ${all.length} temáticas; se usan las primeras ${C.MAX_THEMES}. Quedan afuera: ${all.slice(C.MAX_THEMES).join(', ')}.`;
      err.hidden = false;
    } else if (n && all.length < C.MIN_THEMES) {
      err.textContent = `Hacen falta al menos ${C.MIN_THEMES} temáticas.`;
      err.hidden = false;
    } else err.hidden = true;
    $('#btn-bank-clear').disabled = !n;
  }

  function downloadTemplate() {
    const csv = '﻿tematica;pregunta;respuesta;opciones;opcion_correcta;dificultad\n' +
      'Historia;¿En qué año llegó Colón a América?;1492;1492|1810|1516|1776;A;facil\n' +
      'Historia;¿En qué año cayó el Muro de Berlín?;1989;1961|1989|1991|1975;B;dificil\n' +
      'Ciencia;El Sol es una estrella.;Verdadero;Verdadero|Falso;A;facil\n' +
      'Ciencia;¿Cuántos huesos tiene el cuerpo humano adulto?;206;;;dificil\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'plantilla-preguntas.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // Preguntas de una temática y dificultad (las sin dificultad sirven
  // para las dos). Si no hay de esa dificultad, todas las de la temática.
  function questionPool(theme, level) {
    const all = bank.questions.filter(q => norm(q.theme) === norm(theme));
    const pool = all.filter(q => !q.level || q.level === level);
    return pool.length ? pool : all;
  }

  // Pregunta al azar entre las que todavía no se respondieron bien.
  // Si se agotaron, se vuelven a habilitar todas. `skip` = id a evitar
  // (la pregunta que se está cambiando con el comodín).
  function pickQuestion(theme, level, skip = null) {
    const pool = questionPool(theme, level);
    if (!pool.length) return null;
    let fresh = pool.filter(q => !state.used.includes(q.id) && q.id !== skip);
    if (!fresh.length) {
      state.used = state.used.filter(id => !pool.some(q => q.id === id));
      fresh = pool.filter(q => q.id !== skip);
      if (!fresh.length) fresh = pool;
      toast(`Se usaron todas las preguntas de ${theme}: vuelven a salir`, 2500);
    }
    // evita repetir justo la última pregunta (si hay otra opción)
    if (fresh.length > 1) fresh = fresh.filter(q => q.id !== state.lastQ);
    const q = fresh[Math.floor(Math.random() * fresh.length)];
    state.lastQ = q.id;
    return q;
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
    setThemeList(boardThemesFromBank());
    renderSetup();
    renderBank();
    show('setup');
  }

  function renderSetup() {
    $('#team-list').innerHTML = draft.map((t, i) => `
      <div class="team-row" data-i="${i}" style="--team:${t.color}">
        <div class="team-row-head">
          <div class="avatar-preview">${avatarHTML(t.avatar)}</div>
          <input class="team-name" type="text" maxlength="22" placeholder="Equipo ${i + 1}" value="${esc(t.name)}">
          <label class="color-pick" title="Color del equipo"><input type="color" class="team-color" value="${t.color}"></label>
          <button type="button" class="btn-icon team-remove" title="Quitar equipo" ${draft.length <= C.MIN_TEAMS ? 'disabled' : ''}>&times;</button>
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

    // Banco de preguntas
    $('#bank-file').addEventListener('change', onBankFile);
    $('#btn-bank-load').addEventListener('click', () => $('#bank-file').click());
    $('#btn-bank-sample').addEventListener('click', () => setBank(buildBank(parseCSV(SAMPLE_CSV), 'ejemplo')));
    $('#btn-bank-template').addEventListener('click', downloadTemplate);
    $('#btn-bank-clear').addEventListener('click', () => {
      bank = { name: '', questions: [] };
      saveBank();
      setThemeList([]);
      renderBank();
    });
  }

  // Casillas de corral, repartidas a lo largo de la vuelta
  function jailIndexes() {
    const n = Math.max(0, C.JAIL_CELLS | 0), out = [];
    for (let k = 1; k <= n; k++) out.push(Math.round(TOTAL * k / (n + 1)));
    return out;
  }

  // Reparte las temáticas en las casillas: en bloques mezclados para que
  // haya de todas a lo largo de la vuelta y nunca dos iguales seguidas.
  function buildCellThemes(themes) {
    const out = [null]; // casilla 0 = Salida
    const jails = new Set(jailIndexes());
    let block = [], prev = null;
    for (let i = 1; i < TOTAL; i++) {
      if (jails.has(i)) { out.push(JAIL); continue; }
      if (!block.length) {
        block = [...themes];
        for (let a = block.length - 1; a > 0; a--) {
          const b = Math.floor(Math.random() * (a + 1));
          [block[a], block[b]] = [block[b], block[a]];
        }
        if (block.length > 1 && block[0] === prev) [block[0], block[1]] = [block[1], block[0]];
      }
      prev = block.shift();
      out.push(prev);
    }
    return out;
  }

  function startNewGame() {
    const themes = boardThemesFromBank();
    if (themes.length < C.MIN_THEMES) {
      toast(themes.length ? `Hacen falta al menos ${C.MIN_THEMES} temáticas` : 'Primero cargá un banco de preguntas', 3000);
      $('#btn-bank-load').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const stamp = Date.now().toString(36);
    state = {
      version: 4,
      themes,
      cellThemes: buildCellThemes(themes),
      teams: draft.map((t, i) => ({
        id: `t${i}_${stamp}`,
        name: t.name.trim() || `Equipo ${i + 1}`,
        avatar: t.avatar,
        color: t.color,
        pos: 0,
        rings: [],
        easy: {},
        jokers: { ...C.JOKERS },
        jail: 0,
      })),
      turn: 0,
      bonus: false,
      winners: [],
      used: [],
      lastQ: null,
    };
    history = [];
    save();
    enterGame();
  }

  /* =========================================================
     TABLERO (viborita en zigzag, ver buildPath)
     ========================================================= */
  function buildBoard() {
    const board = $('#board');
    board.querySelectorAll('.cell, .board-center').forEach(c => c.remove());
    cells.length = 0;

    board.style.setProperty('--cols', TRACK.cols);
    board.style.setProperty('--rows', TRACK.rows);
    if (C.BOARD_BACKGROUND) {
      board.style.backgroundImage = `url("${C.BOARD_BACKGROUND}")`;
      const area = C.BOARD_AREA || {};
      ['top', 'right', 'bottom', 'left'].forEach(side =>
        board.style.setProperty(`--area-${side[0]}`, area[side] || 0));
      // La proporción del tablero se toma de la imagen real
      const img = new Image();
      img.onload = () => board.style.setProperty('--ratio', img.naturalWidth / img.naturalHeight);
      img.src = C.BOARD_BACKGROUND;
    } else {
      board.style.setProperty('--ratio', TRACK.cols / TRACK.rows);
    }

    const frag = document.createDocumentFragment();
    for (let i = 0; i < TOTAL; i++) {
      const { row, col } = TRACK.path[i];
      const el = document.createElement('div');
      el.className = 'cell';
      el.dataset.index = i;
      el.style.gridRow = row;
      el.style.gridColumn = col;
      if (i === 0) {
        el.classList.add('cell-start');
        el.innerHTML = `<span class="cell-label">Salida</span>${C.START_IS_WILD ? '<span class="cell-sub">Elegís temática</span>' : ''}`;
      } else if (state.cellThemes[i] === JAIL) {
        el.classList.add('cell-jail');
        if (C.JAIL_IMAGE) el.style.setProperty('--jail-img', `url("${C.JAIL_IMAGE}")`);
        el.innerHTML = '<span class="cell-label">Corral</span>';
      } else {
        const t = themeInfo(state.cellThemes[i]);
        el.classList.add('cell-theme');
        el.style.setProperty('--theme', t.color);
        el.innerHTML = `<span class="cell-ring"></span><span class="cell-label">${esc(t.name)}</span>`;
      }
      cells.push(el);
      frag.appendChild(el);
    }
    board.insertBefore(frag, $('#tokens'));

    // Leyenda de temáticas (los anillos a juntar) en el panel
    $('#ring-legend').innerHTML = `
      <p class="panel-label">Juntá los ${state.themes.length} anillos</p>
      <div class="theme-chips">${state.themes.map(t => themeChip(t)).join('')}</div>`;
  }

  function measure() {
    if (!cells.length) return;
    const board = $('#board');
    board.style.setProperty('--cell', cells[0].offsetWidth + 'px');
    board.style.setProperty('--cell-min', Math.min(cells[0].offsetWidth, cells[0].offsetHeight) + 'px');
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
        </div>`;
      layer.appendChild(el);
      tokens.set(t.id, el);
      renderRings(t, false);
    });
  }

  // Dibuja la pila de anillos (cada uno del color de su temática).
  // Los nuevos caen con animación.
  function renderRings(team, animateNew = true) {
    const el = tokens.get(team.id);
    if (!el) return;
    const wrap = el.querySelector('.rings');
    const prev = wrap.children.length;
    const n = team.rings.length;

    wrap.innerHTML = team.rings.map((theme, i) => {
      const t = themeInfo(theme);
      const cls = ['ring'];
      if (animateNew && i >= prev) cls.push('ring-new');
      if (C.RING_IMAGE) cls.push('ring-img');
      const bg = C.RING_IMAGE ? `background-image:url('${C.RING_IMAGE}');` : '';
      return `<div class="${cls.join(' ')}" title="${esc(t.name)}" style="--i:${i};--rc:${t.color};${bg}"></div>`;
    }).join('');
    el.style.setProperty('--vis', n);
    el.style.setProperty('--has', n > 0 ? 1 : 0);
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
      el.classList.toggle('in-jail', t.jail > 0);
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
  const allFinished = () => state.teams.every(isWinner);

  // Pasa al siguiente equipo que no haya ganado. Los que están en el
  // corral pierden ese turno (se les descuenta y se sigue de largo).
  function nextTurn() {
    state.bonus = false;
    const n = state.teams.length;
    const skipped = [];
    let idx = state.turn;
    for (let guard = 0; guard < n * (1 + Math.max(1, C.JAIL_TURNS | 0)) + 1; guard++) {
      idx = (idx + 1) % n;
      const t = state.teams[idx];
      if (isWinner(t)) continue;
      if (t.jail > 0) { t.jail--; skipped.push(t.name); continue; }
      state.turn = idx;
      break;
    }
    if (skipped.length) toast(`${skipped.join(', ')}: ${skipped.length > 1 ? 'pierden' : 'pierde'} el turno en el corral`, 2600);
  }

  function pushHistory() {
    history.push(JSON.stringify(state));
    if (history.length > 30) history.shift();
  }

  // Avanza casilla por casilla dando la vuelta.
  async function walk(team, steps) {
    const el = tokens.get(team.id);
    for (let s = 0; s < steps; s++) {
      team.pos = (team.pos + 1) % TOTAL;
      hop(el);
      layoutTokens(true, team.id);
      blip(team.pos === 0 ? 990 : 520 + team.pos * 8, 0.07);
      save(); // guardado en cada paso: si se recarga a mitad, no se pierde
      await sleep(C.STEP_MS);
    }
    const land = cells[team.pos];
    land.classList.remove('cell-land'); void land.offsetWidth; land.classList.add('cell-land');
    layoutTokens(true);
  }

  // Escena del corral: el pollito en grande, caen las rejas encima y
  // aparece el cartel. Se cierra sola o con un clic.
  function jailScene(team) {
    return new Promise(resolve => {
      const BARS = 7;
      const lost = team.jail > 1 ? `${team.jail} turnos` : 'el próximo turno';
      const el = document.createElement('div');
      el.className = 'jail-scene';
      el.style.setProperty('--team', team.color);
      el.innerHTML = `
        <div class="jail-stage">
          <div class="jail-avatar">${avatarHTML(team.avatar)}</div>
          <div class="jail-gate">
            ${Array.from({ length: BARS }, (_, i) => `<i class="jail-bar" style="--i:${i}"></i>`).join('')}
            <b class="jail-cross top"></b><b class="jail-cross bottom"></b>
          </div>
        </div>
        <div class="jail-sign">
          <strong>¡Al corral!</strong>
          <span>${esc(team.name)} pierde ${lost}</span>
        </div>`;
      document.body.appendChild(el);

      // Un golpe seco por cada reja que cae y el lamento al final
      for (let i = 0; i < BARS; i++) setTimeout(() => blip(110 - i * 6, 0.12, 'square'), 380 + i * 70);
      setTimeout(() => { blip(70, 0.35, 'square'); el.classList.add('slammed'); }, 380 + BARS * 70 + 120);
      setTimeout(sadTone, 1500);

      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        el.classList.add('leaving');
        setTimeout(() => { el.remove(); resolve(); }, 350);
      };
      el.addEventListener('click', close);
      setTimeout(close, 3600);
    });
  }

  // Qué pasa al caer en una casilla
  async function resolveCell(team) {
    const cell = cells[team.pos];
    cell.classList.remove('cell-trigger'); void cell.offsetWidth; cell.classList.add('cell-trigger');
    await sleep(450);

    let theme = state.cellThemes[team.pos];
    if (theme === JAIL) {
      team.jail = Math.max(1, C.JAIL_TURNS | 0);
      save();
      await jailScene(team);
      return 'jail';
    }
    if (!theme) { // Salida
      if (!C.START_IS_WILD) return;
      toast('Salida: elijan la temática');
      theme = await chooseTheme(team, '¿De qué temática quieren la pregunta?');
      if (!theme) return;
    }
    return runQuestion(team, theme);
  }

  async function playTurn() {
    if (busy || !dice || !state) return;
    const team = currentTeam();
    if (!team || isWinner(team)) return;

    pushHistory();
    busy = true;
    state.bonus = false;
    const steps = dice;
    dice = null;
    renderPanel();

    await walk(team, steps);
    const result = await resolveCell(team);
    afterTurn(team, result);
    busy = false;
    save();
    renderPanel(true);
  }

  // Si respondió bien sigue tirando; si no, pasa el turno
  function afterTurn(team, result) {
    if (result === 'ok' && C.CORRECT_KEEPS_TURN && !isWinner(team)) {
      state.bonus = true;
      toast(`¡Correcto! ${team.name} sigue tirando`, 2200);
    } else {
      nextTurn();
    }
  }

  function addRing(team, theme) {
    if (hasRing(team, theme)) return false;
    team.rings.push(themeInfo(theme).name);
    delete team.easy[norm(theme)];
    renderRings(team, true);
    [880, 1175].forEach((f, i) => setTimeout(() => blip(f, 0.12, 'sine'), i * 90));
    save();
    renderPanel();
    return true;
  }
  function removeRing(team) {
    if (!team.rings.length) return;
    team.rings.pop();
    state.winners = state.winners.filter(id => id !== team.id);
    renderRings(team, false);
    save();
    renderPanel();
  }

  // Si comparte casilla con otros equipos, puede robarles un anillo
  // que no tenga (el otro equipo se queda sin ese anillo).
  async function offerSteal(team) {
    const loot = [];
    state.teams.forEach(o => {
      if (o.id === team.id || o.pos !== team.pos) return;
      o.rings.forEach(r => { if (!hasRing(team, r)) loot.push({ from: o, ring: r }); });
    });
    if (!loot.length) return;
    const pick = await pickOption(
      '¿Qué anillo roban?',
      `<strong>${esc(team.name)}</strong> comparte casilla y respondió bien: puede robar un anillo.`,
      loot.map(l => {
        const t = themeInfo(l.ring);
        return { value: l, color: t.color, html: `${esc(t.name)}<small>de ${esc(l.from.name)}</small>` };
      }),
      'No robar');
    if (!pick) return;
    const { from, ring } = pick;
    from.rings = from.rings.filter(r => norm(r) !== norm(ring));
    state.winners = state.winners.filter(id => id !== from.id);
    renderRings(from, false);
    addRing(team, ring);
    toast(`¡${team.name} le robó el anillo de ${themeInfo(ring).name} a ${from.name}!`, 2600);
    await sleep(1000);
  }

  function checkWin(team) {
    if (isWinner(team)) return;
    if (state.themes.every(t => hasRing(team, t))) {
      state.winners.push(team.id);
      save();
      showVictory(team);
    }
  }

  function undo() {
    if (busy || !history.length) { if (!history.length) toast('Nada para deshacer'); return; }
    state = normalize(JSON.parse(history.pop()));
    state.teams.forEach(t => renderRings(t, false));
    save();
    renderPanel(true);
    toast('Acción deshecha', 1200);
  }

  /* =========================================================
     PREGUNTAS
     ========================================================= */
  // Elige dificultad, pregunta y aplica el resultado.
  // Devuelve 'ok' (respondió bien) o 'fail'.
  async function runQuestion(team, theme) {
    const info = themeInfo(theme);
    const owned = hasRing(team, theme);
    const k = team.easy[norm(theme)] || 0;
    const rivals = state.teams.filter(o => o.id !== team.id && o.pos === team.pos && o.rings.length);
    const notes = [
      owned ? 'Ya tienen este anillo: si aciertan, siguen tirando.' : '',
      rivals.length ? `Si aciertan pueden robarle un anillo a ${rivals.map(o => esc(o.name)).join(' o ')}.` : '',
    ].filter(Boolean).map(s => `<br><small>${s}</small>`).join('');
    const level = await pickOption(
      info.name,
      `<strong>${esc(team.name)}</strong>: ¿pregunta fácil o difícil?${notes}`,
      [
        { value: 'facil', color: 'var(--ok)', html: `Fácil<small>${owned ? 'sigue tirando' : `${C.EASY_FOR_RING} fáciles = anillo (llevan ${k})`}</small>` },
        { value: 'dificil', color: 'var(--danger)', html: `Difícil<small>${owned ? 'sigue tirando' : 'anillo directo'}</small>` },
      ],
      null, info.color);

    const { ok, q } = await askQuestion(team, theme, level);
    if (!ok) {
      sadTone();
      save();
      return 'fail';
    }
    if (q) state.used.push(q.id); // respondida bien: no vuelve a salir

    if (owned) {
      [660, 880, 1100].forEach((f, i) => setTimeout(() => blip(f, 0.1, 'sine'), i * 90));
      await sleep(400);
    } else if (level === 'dificil' || k + 1 >= C.EASY_FOR_RING) {
      addRing(team, theme);
      toast(`¡Anillo de ${info.name} para ${team.name}!`);
      await sleep(1000);
    } else {
      team.easy[norm(theme)] = k + 1;
      [660, 880].forEach((f, i) => setTimeout(() => blip(f, 0.1, 'sine'), i * 90));
      toast(`Fácil correcta: ${k + 1} de ${C.EASY_FOR_RING} para el anillo de ${info.name}`, 2200);
      renderPanel();
      await sleep(900);
    }
    await offerSteal(team);
    checkWin(team);
    save();
    return 'ok';
  }

  // Pregunta (con opciones si las tiene), comodines y Correcto / Incorrecto.
  // El borde superior toma el color de la temática.
  // Devuelve { ok, q } según decida el moderador.
  function askQuestion(team, themeName, level) {
    return new Promise(resolve => {
      const theme = themeInfo(themeName);
      let q = pickQuestion(themeName, level);
      let removed = [];
      const btnRemove = $('#btn-joker-remove'), btnSwap = $('#btn-joker-swap');

      const render = () => {
        $('#q-meta').textContent = `${theme.name} · ${LEVEL_NAME[level]}`;
        $('#q-text').textContent = q ? q.q : `No hay preguntas de ${theme.name} en el banco: el moderador hace una.`;
        const opts = q ? q.options : [];
        // Con opciones y correcta conocida se responde tocando la opción;
        // si no (pregunta abierta), decide el moderador con Correcto / Incorrecto
        const clickable = opts.length > 0 && answerIndex(q) >= 0;
        $('#q-judge').hidden = clickable;
        $('#q-options').hidden = !opts.length;
        $('#q-options').innerHTML = opts.map((o, i) => {
          const off = removed.includes(i);
          const body = `<b>${'ABCDEFGHIJ'[i] || i + 1}</b>${esc(o)}`;
          return `<li class="${off ? 'removed' : ''}">${clickable
            ? `<button type="button" class="q-opt" data-i="${i}" ${off ? 'disabled' : ''}>${body}</button>` : body}</li>`;
        }).join('');

        const left = team.jokers;
        btnRemove.textContent = `Eliminar opciones (${left.eliminar | 0})`;
        btnRemove.disabled = !(left.eliminar > 0) || removed.length > 0 || !canRemoveOptions(q);
        btnRemove.title = q && isTF(q) ? 'No se puede en Verdadero/Falso' : '';
        btnSwap.textContent = `Cambiar pregunta (${left.cambiar | 0})`;
        btnSwap.disabled = !(left.cambiar > 0) || !q || questionPool(themeName, level).length < 2;
      };

      btnRemove.onclick = () => {
        const right = answerIndex(q);
        if (btnRemove.disabled || right < 0) return; // sin correcta conocida no se elimina nada
        team.jokers.eliminar--;
        const wrong = q.options.map((_, i) => i).filter(i => i !== right).sort(() => Math.random() - 0.5);
        removed = wrong.slice(0, q.options.length - 2); // quedan la correcta y una incorrecta
        blip(300, 0.15, 'square');
        save(); render(); renderPanel();
      };
      btnSwap.onclick = () => {
        if (btnSwap.disabled) return;
        team.jokers.cambiar--;
        q = pickQuestion(themeName, level, q.id);
        removed = [];
        blip(500, 0.12, 'square');
        save(); render(); renderPanel();
      };

      render();
      $('#question-card').style.setProperty('--theme', theme.color);
      openModal('#modal-question');
      const done = ok => {
        closeModal('#modal-question');
        $('#btn-q-ok').onclick = $('#btn-q-fail').onclick = btnRemove.onclick = btnSwap.onclick = null;
        $('#q-options').onclick = null;
        resolve({ ok, q });
      };
      $('#btn-q-ok').onclick = () => done(true);
      $('#btn-q-fail').onclick = () => done(false);
      // Al tocar una opción: se marca la correcta (y la elegida si falló),
      // se bloquea todo y la ventana se cierra sola
      $('#q-options').onclick = e => {
        const b = e.target.closest('.q-opt');
        if (!b || b.disabled) return;
        const pick = +b.dataset.i, right = answerIndex(q), ok = pick === right;
        $('#q-options').onclick = null;
        btnRemove.disabled = btnSwap.disabled = true;
        document.querySelectorAll('#q-options .q-opt').forEach(o => {
          o.disabled = true;
          const i = +o.dataset.i;
          if (i === right) o.classList.add('right');
          else if (i === pick) o.classList.add('wrong');
        });
        ok ? [660, 880].forEach((f, i) => setTimeout(() => blip(f, 0.12, 'sine'), i * 90)) : blip(180, 0.25, 'square');
        setTimeout(() => done(ok), ok ? 1100 : 1800);
      };
    });
  }

  // Ventana de elección genérica: opciones = [{ value, color, html, disabled }].
  // cancelLabel = null oculta el botón de cancelar. Devuelve value o null.
  function pickOption(title, sub, opts, cancelLabel = 'Cancelar', accent = null) {
    return new Promise(resolve => {
      $('#pick-card').style.setProperty('--theme', accent || 'var(--ink)');
      $('#pick-title').textContent = title;
      $('#pick-sub').innerHTML = sub;
      $('#pick-options').innerHTML = opts.map((o, i) =>
        `<button type="button" class="btn ${o.cls || ''}" data-i="${i}" style="--theme:${o.color}" ${o.disabled ? 'disabled' : ''}>${o.html}</button>`).join('');
      const cancel = $('#btn-pick-cancel');
      cancel.hidden = !cancelLabel;
      cancel.textContent = cancelLabel || '';
      openModal('#modal-pick');
      const done = val => {
        closeModal('#modal-pick');
        $('#pick-options').onclick = cancel.onclick = null;
        resolve(val);
      };
      $('#pick-options').onclick = e => {
        const b = e.target.closest('[data-i]');
        if (b && !b.disabled) done(opts[+b.dataset.i].value);
      };
      cancel.onclick = () => done(null);
    });
  }

  // Selector de temática (Salida o anillo manual).
  // Las temáticas cuyo anillo ya tiene el equipo se muestran marcadas.
  function chooseTheme(team, title = '¿Anillo de qué temática?', onlyMissing = false) {
    return pickOption(title, `Equipo: <strong>${esc(team.name)}</strong>`, state.themes.map(name => {
      const t = themeInfo(name);
      const owned = hasRing(team, name);
      return {
        value: t.name, color: t.color, cls: owned ? 'owned' : '', disabled: owned && onlyMissing,
        html: `${esc(t.name)}${owned ? '<small>ya lo tienen</small>' : ''}`,
      };
    }));
  }

  async function giveRingManually(team) {
    if (busy || !team) return;
    const theme = await chooseTheme(team, '¿Anillo de qué temática?', true);
    if (!theme) return;
    pushHistory();
    addRing(team, theme);
    checkWin(team);
  }

  /* =========================================================
     PANEL
     ========================================================= */
  // Fila de anillos de un equipo: los que tiene a color, los que faltan
  // apagados (con puntitos por las fáciles acertadas de esa temática)
  function ringProgress(team) {
    return state.themes.map(t => {
      if (hasRing(team, t)) return themeChip(t);
      const k = (team.easy && team.easy[norm(t)]) || 0;
      const pips = k ? `<span class="pips" title="${k} de ${C.EASY_FOR_RING} fáciles">${
        Array.from({ length: C.EASY_FOR_RING }, (_, i) => `<i class="${i < k ? 'on' : ''}"></i>`).join('')}</span>` : '';
      return themeChip(t, pips, k ? 'missing has-easy' : 'missing');
    }).join('');
  }
  function jokerBadges(team) {
    const j = team.jokers || {};
    return [['eliminar', 'Eliminar'], ['cambiar', 'Cambiar']].map(([k, label]) =>
      `<span class="joker-badge ${j[k] > 0 ? '' : 'used'}" title="Comodín ${label.toLowerCase()}${j[k] > 0 ? '' : ' (usado)'}">${label}</span>`).join('');
  }

  function renderPanel(turnChanged = false) {
    const cur = currentTeam();
    const card = $('#turn-card');
    const finished = allFinished();
    if (finished) {
      card.style.setProperty('--team', '#e5b842');
      card.innerHTML = `<div class="turn-avatar"><span class="av av-initial">FIN</span></div>
        <div><div class="turn-label">Fin</div><div class="turn-name">¡Partida terminada!</div></div>`;
    } else {
      card.style.setProperty('--team', cur.color);
      card.innerHTML = `
        <div class="turn-avatar">${avatarHTML(cur.avatar)}</div>
        <div>
          <div class="turn-label">${state.bonus ? 'Sigue tirando' : 'Turno de'}</div>
          <div class="turn-name">${esc(cur.name)}</div>
          <div class="turn-meta">Anillos: ${cur.rings.length} de ${state.themes.length}</div>
        </div>`;
    }
    if (turnChanged) { card.classList.remove('changed'); void card.offsetWidth; card.classList.add('changed'); }

    // Dado y acciones
    document.querySelectorAll('.dice-btn').forEach(b => {
      b.classList.toggle('selected', +b.dataset.value === dice);
      b.disabled = busy || finished;
    });
    $('#btn-move').disabled = busy || !dice || finished;
    $('#btn-move').textContent = dice ? `¡Mover ${dice}!` : '¡Mover!';
    $('#btn-ring').disabled = busy || finished;
    $('#btn-skip').disabled = busy || finished;
    $('#btn-ask').disabled = busy || finished;
    $('#btn-undo').disabled = busy;

    // Tabla de equipos (ordenada por cantidad de anillos)
    const order = [...state.teams].sort((a, b) => b.rings.length - a.rings.length);
    $('#score-list').innerHTML = order.map(t => `
      <li class="score-item ${cur && t.id === cur.id && !finished ? 'current' : ''} ${isWinner(t) ? 'finished' : ''}" style="--team:${t.color}" data-id="${t.id}">
        <div class="score-avatar">${avatarHTML(t.avatar)}</div>
        <div class="score-info">
          <div class="score-name">${esc(t.name)}${isWinner(t) ? ' <span class="winner-tag">Ganador</span>' : ''}${t.jail > 0 ? ' <span class="jail-tag">En el corral</span>' : ''}</div>
          <div class="score-pos">Anillos: ${t.rings.length} de ${state.themes.length} ${jokerBadges(t)}</div>
        </div>
        <button type="button" class="btn-icon" data-ring="-1" title="Quitar último anillo" ${busy || !t.rings.length ? 'disabled' : ''}>−</button>
        <button type="button" class="btn-icon" data-ring="1" title="Dar anillo" ${busy || t.rings.length >= state.themes.length ? 'disabled' : ''}>+</button>
        <div class="score-rings">${ringProgress(t)}</div>
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
    $('#btn-ring').addEventListener('click', () => giveRingManually(currentTeam()));
    // Repetir la pregunta de la casilla actual (sin moverse)
    $('#btn-ask').addEventListener('click', async () => {
      if (busy) return;
      if (state.cellThemes[currentTeam().pos] === JAIL) { toast('Están en el corral: no hay pregunta'); return; }
      pushHistory();
      busy = true; renderPanel();
      await resolveCell(currentTeam());
      busy = false; renderPanel();
    });
    $('#btn-skip').addEventListener('click', () => {
      if (busy) return;
      pushHistory();
      state.bonus = false;
      nextTurn(); dice = null; save(); renderPanel(true);
    });
    $('#btn-undo').addEventListener('click', undo);
    $('#btn-game-bank').addEventListener('click', () => {
      if (!busy && confirm(`Banco actual: ${bank.questions.length} preguntas.\n¿Cargar otro archivo CSV?\n(Las temáticas del tablero no cambian hasta la próxima partida)`)) $('#bank-file').click();
    });
    $('#btn-new').addEventListener('click', () => {
      if (busy) return;
      if (confirm('¿Empezar una nueva partida? Se borrará la partida actual.')) { clearSave(); showSetup(); }
    });

    $('#score-list').addEventListener('click', e => {
      const b = e.target.closest('[data-ring]'); if (!b || busy) return;
      const team = state.teams.find(t => t.id === b.closest('.score-item').dataset.id);
      if (+b.dataset.ring > 0) giveRingManually(team);
      else { pushHistory(); removeRing(team); }
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
    setThemeList(state.themes);
    show('game');
    buildBoard();
    buildTokens();
    measure();
    renderPanel(true);
    layoutTokens(false);
  }

  /* =========================================================
     VICTORIA Y CONTINUAR
     ========================================================= */
  function showVictory(team) {
    const place = state.winners.length;
    $('#victory-avatar').innerHTML = avatarHTML(team.avatar);
    $('#modal-victory').style.setProperty('--team', team.color);
    $('#victory-title').textContent = place === 1 ? `¡Ganó ${team.name}!` : `¡${team.name} completó los anillos!`;
    $('#victory-text').textContent = `Puesto #${place} · juntó los ${state.themes.length} anillos`;
    $('#victory-rings').innerHTML = ringProgress(team);
    $('#btn-victory-continue').hidden = allFinished();
    openModal('#modal-victory');
    launchConfetti();
    fanfare();
  }

  function launchConfetti() {
    const box = $('#confetti');
    box.innerHTML = '';
    const colors = [...C.TEAM_COLORS, ...state.themes.map(t => themeInfo(t).color)];
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
    saved = normalize(saved);
    $('#resume-summary').innerHTML = saved.teams.map(t => `
      <li style="--team:${t.color}">${avatarHTML(t.avatar)}
        <strong>${esc(t.name)}</strong> — ${t.rings.length} de ${saved.themes.length} anillos</li>`).join('');
    openModal('#modal-resume');
    $('#btn-resume').onclick = () => {
      closeModal('#modal-resume');
      state = saved;
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
    $('#boot-msg').hidden = true;
    document.documentElement.style.setProperty('--step-ms', C.STEP_MS + 'ms');
    loadBank();
    bindSetup();
    bindGame();
    bindModals();
    const saved = load();
    if (saved) offerResume(saved);
    else showSetup();
  }

  init();
})();
