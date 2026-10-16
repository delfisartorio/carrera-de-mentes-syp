/* =========================================================
   CONFIGURACIÓN DEL JUEGO
   Este es el ÚNICO archivo que necesitás tocar para cambiar
   personajes, tablero, temáticas y colores.
   ========================================================= */
const CONFIG = {
  // ---- Tablero (pista circular) ----
  // Las casillas forman una vuelta alrededor del borde de una grilla
  // COLUMNS × ROWS. Total de casillas = 2×COLUMNS + 2×(ROWS−2).
  //   7 × 5 → 20 casillas    8 × 5 → 22    6 × 4 → 16    9 × 5 → 24
  COLUMNS: 7,
  ROWS: 5,
  BOARD_BACKGROUND: 'assets/tablero/fondo.jpg', // null = sin imagen

  // Zona libre del fondo donde se dibuja la pista, en % del alto/ancho
  // de la imagen. Si cambiás de fondo, ajustá estos 4 números.
  BOARD_AREA: { top: 20, right: 20, bottom: 14, left: 20 },

  // La casilla 0 (Salida) es comodín: si caen justo ahí, eligen la temática.
  START_IS_WILD: true,

  // ---- Temáticas ----
  // Salen del CSV (columna "tematica"). El tablero usa las primeras
  // MAX_THEMES que aparecen. Para ganar hay que juntar un anillo de cada una.
  MIN_THEMES: 2,
  MAX_THEMES: 6,

  // Color e ícono para las temáticas conocidas (mayúsculas y tildes no
  // importan: "geografia" = "Geografía"). Las que no estén acá reciben
  // un color de RING_COLORS y un ícono de AUTO_ICONS.
  THEMES: {
    'Historia':        { color: '#b83a3a', icon: '🏛️' },
    'Ciencia':         { color: '#4a90a4', icon: '🔬' },
    'Geografía':       { color: '#3a8a58', icon: '🌎' },
    'Arte':            { color: '#a569bd', icon: '🎨' },
    'Deportes':        { color: '#e07b39', icon: '⚽' },
    'Matemática':      { color: '#2e6f8e', icon: '➗' },
    'Lengua':          { color: '#c9a227', icon: '📚' },
    'Entretenimiento': { color: '#d36b9b', icon: '🎬' },
  },
  RING_COLORS: ['#b83a3a', '#4a90a4', '#3a8a58', '#a569bd', '#e07b39', '#c9a227', '#d36b9b', '#5d8aa8'],
  AUTO_ICONS: ['⭐', '💡', '🎯', '🧩', '🔮', '🎵', '🌟', '🍀'],
  RING_IMAGE: null, // Ej: 'assets/anillos/anillo.png' (reemplaza el anillo dibujado por CSS)

  // ---- Animación ----
  STEP_MS: 380,     // Duración de cada saltito entre casillas (ms)
  SOUND: true,      // Pitiditos al moverse

  // ---- Equipos ----
  MIN_TEAMS: 2,
  STORAGE_KEY: 'carreraDeMentes.partida.v3',
  BANK_STORAGE_KEY: 'carreraDeMentes.banco.v1',

  // ---- Personajes / fichas ----
  // img: ruta a tu imagen (PNG/SVG con fondo transparente). Si es null
  //      o la imagen no existe, se usa el emoji como respaldo.
  AVATARS: [
    { id: 'clasico',     name: 'Clásico',      emoji: '🐣', img: 'assets/avatars/01_classic.png' },
    { id: 'piloto',      name: 'Piloto',       emoji: '🐣', img: 'assets/avatars/03_pilot.png' },
    { id: 'estudioso',   name: 'Estudioso',    emoji: '🐣', img: 'assets/avatars/05_scholar.png' },
    { id: 'canchero',    name: 'Canchero',     emoji: '🐣', img: 'assets/avatars/06_cool_dude.png' },
    { id: 'picaro',      name: 'Pícaro',       emoji: '🐣', img: 'assets/avatars/08_saucy.png' },
    { id: 'bailarina',   name: 'Bailarina',    emoji: '🐣', img: 'assets/avatars/09_ballerina.png' },
    { id: 'cientifico',  name: 'Científico',   emoji: '🐣', img: 'assets/avatars/11_scientist.png' },
    { id: 'cientifico2', name: 'Científico 2', emoji: '🐣', img: 'assets/avatars/12_scientist_2.png' },
    { id: 'panadero',    name: 'Panadero',     emoji: '🐣', img: 'assets/avatars/13_baker.png' },
    { id: 'dama',        name: 'Dama vintage', emoji: '🐣', img: 'assets/avatars/14_vintage_belle.png' },
    { id: 'jardinero',   name: 'Jardinero',    emoji: '🐣', img: 'assets/avatars/16_gardener.png' },
  ],

  // Colores sugeridos que se asignan a cada equipo nuevo (paleta retro)
  TEAM_COLORS: ['#e8a33d', '#d9534f', '#4a90a4', '#6aa84f', '#a569bd', '#e07b39', '#c9a227', '#5d8aa8'],
};
