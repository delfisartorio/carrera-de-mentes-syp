/* =========================================================
   CONFIGURACIÓN DEL JUEGO
   Este es el ÚNICO archivo que necesitás tocar para cambiar
   personajes, tablero, casillas especiales y colores.
   ========================================================= */
const CONFIG = {
  // ---- Tablero ----
  TOTAL_CELLS: 40,        // Total de casillas, incluye SALIDA (0) y META (la última)
  COLUMNS: 8,             // Casillas por fila (el recorrido es en serpentina)
  BOARD_BACKGROUND: null, // Ej: 'assets/tablero/fondo.jpg'  (null = sin imagen)

  // ---- Animación ----
  STEP_MS: 380,           // Duración de cada saltito entre casillas (ms)
  BOUNCE_AT_END: false,   // true = si se pasa de la META, rebota hacia atrás
  SOUND: true,            // Pitiditos al moverse

  // ---- Equipos ----
  MIN_TEAMS: 2,
  STORAGE_KEY: 'carreraDeMente.partida.v1',

  // ---- Personajes / fichas ----
  // img: ruta a tu imagen (PNG/SVG con fondo transparente). Si es null
  //      o la imagen no existe, se usa el emoji como respaldo.
  AVATARS: [
    { id: 'pollito',   name: 'Pollito',   emoji: '🐣', img: null /* 'assets/avatars/pollito.png' */ },
    { id: 'auto',      name: 'Auto',      emoji: '🚗', img: null },
    { id: 'alien',     name: 'Alien',     emoji: '👽', img: null },
    { id: 'dino',      name: 'Dino',      emoji: '🦖', img: null },
    { id: 'gato',      name: 'Gato',      emoji: '🐱', img: null },
    { id: 'cohete',    name: 'Cohete',    emoji: '🚀', img: null },
    { id: 'unicornio', name: 'Unicornio', emoji: '🦄', img: null },
    { id: 'rana',      name: 'Rana',      emoji: '🐸', img: null },
    { id: 'robot',     name: 'Robot',     emoji: '🤖', img: null },
    { id: 'panda',     name: 'Panda',     emoji: '🐼', img: null },
    { id: 'zorro',     name: 'Zorro',     emoji: '🦊', img: null },
    { id: 'pulpo',     name: 'Pulpo',     emoji: '🐙', img: null },
  ],

  // Colores sugeridos que se asignan a cada equipo nuevo
  TEAM_COLORS: ['#ff4d6d', '#3a86ff', '#06d6a0', '#ffb703', '#8338ec', '#fb5607', '#00b4d8', '#e63995'],

  // ---- Anillos ----
  RING_COLOR_MODE: 'palette',  // 'palette' = cada anillo de un color | 'team' = color del equipo
  RING_COLORS: ['#ffd60a', '#ff4d6d', '#3a86ff', '#06d6a0', '#c77dff', '#ff8c42'],
  RING_IMAGE: null,            // Ej: 'assets/anillos/anillo.png' (reemplaza el anillo dibujado por CSS)
  MAX_VISIBLE_RINGS: 10,       // A partir de acá la pila no crece más (el contador ×N sí)

  // ---- Casillas especiales ----
  // número de casilla -> { type, value }
  SPECIAL_CELLS: {
    3:  { type: 'challenge' },
    5:  { type: 'forward', value: 3 },
    8:  { type: 'prize' },
    11: { type: 'back', value: 3 },
    14: { type: 'challenge' },
    17: { type: 'forward', value: 2 },
    20: { type: 'prize' },
    23: { type: 'back', value: 4 },
    26: { type: 'challenge' },
    29: { type: 'forward', value: 3 },
    31: { type: 'prize' },
    34: { type: 'back', value: 5 },
    36: { type: 'challenge' },
  },

  // Cómo se ve cada tipo de casilla especial
  SPECIAL_TYPES: {
    forward:   { icon: '🚀', label: 'Avanzá' },
    back:      { icon: '🌀', label: 'Volvé' },
    prize:     { icon: '💍', label: 'Anillo' },
    challenge: { icon: '❓', label: 'Desafío' },
  },
};
