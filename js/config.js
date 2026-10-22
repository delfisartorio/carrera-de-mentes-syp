/* =========================================================
   CONFIGURACIÓN DEL JUEGO
   Este es el ÚNICO archivo que necesitás tocar para cambiar
   personajes, tablero, temáticas y colores.
   ========================================================= */
const CONFIG = {
  // ---- Tablero (viborita) ----
  // La pista va en zigzag: LANES filas de COLUMNS casillas unidas por
  // codos, y vuelve a la Salida por la columna de la izquierda.
  // LANES tiene que ser par (2, 4 o 6).
  //   9 col × 4 filas → 40 casillas    8 × 4 → 36    10 × 4 → 44    7 × 6 → 48
  COLUMNS: 9,
  LANES: 4,
  BOARD_BACKGROUND: 'assets/tablero/fondo.jpg', // null = sin imagen

  // Zona libre del fondo donde se dibuja la pista, en % del alto/ancho
  // de la imagen. Si cambiás de fondo, ajustá estos 4 números.
  BOARD_AREA: { top: 21, right: 18, bottom: 12, left: 18 },

  // La casilla 0 (Salida): si caen justo ahí, eligen la temática.
  START_IS_WILD: true,

  // ---- Corral (cárcel) ----
  // Casillas de corral repartidas por la pista. Quien cae ahí no responde
  // nada y pierde JAIL_TURNS turno(s).
  JAIL_CELLS: 1,
  JAIL_TURNS: 1,
  // Foto de la casilla. Si no existe, se dibuja un corral de madera.
  JAIL_IMAGE: 'assets/tablero/corral.jpg',

  // ---- Reglas ----
  // Si responden bien siguen tirando el dado (hasta que fallen).
  CORRECT_KEEPS_TURN: true,
  // Pregunta difícil bien respondida = anillo directo.
  // Preguntas fáciles: hacen falta EASY_FOR_RING de la misma temática.
  EASY_FOR_RING: 3,
  // Comodines con los que arranca cada equipo (se usan dentro de la pregunta).
  //   eliminar: saca opciones incorrectas (no sirve en Verdadero/Falso)
  //   cambiar:  cambia la pregunta por otra de la misma temática y dificultad
  JOKERS: { eliminar: 1, cambiar: 1 },

  // ---- Temáticas ----
  // Salen del CSV (columna "tematica"). El tablero usa las primeras
  // MAX_THEMES que aparecen. Para ganar hay que juntar un anillo de cada una.
  MIN_THEMES: 2,
  MAX_THEMES: 6,

  // Color de las temáticas conocidas (mayúsculas y tildes no
  // importan: "geografia" = "Geografía"). Las que no estén acá reciben
  // un color de RING_COLORS.
  THEMES: {
    'Historia':        { color: '#b83a3a' },
    'Ciencia':         { color: '#4a90a4' },
    'Geografía':       { color: '#3a8a58' },
    'Arte':            { color: '#a569bd' },
    'Deportes':        { color: '#e07b39' },
    'Matemática':      { color: '#2e6f8e' },
    'Lengua':          { color: '#c9a227' },
    'Entretenimiento': { color: '#d36b9b' },
  },
  RING_COLORS: ['#b83a3a', '#4a90a4', '#3a8a58', '#a569bd', '#e07b39', '#c9a227', '#d36b9b', '#5d8aa8'],
  RING_IMAGE: null, // Ej: 'assets/anillos/anillo.png' (reemplaza el anillo dibujado por CSS)

  // ---- Animación ----
  STEP_MS: 380,     // Duración de cada saltito entre casillas (ms)
  SOUND: true,      // Pitiditos al moverse

  // ---- Equipos ----
  MIN_TEAMS: 2,
  STORAGE_KEY: 'carreraDeMentes.partida.v4',
  BANK_STORAGE_KEY: 'carreraDeMentes.banco.v1',

  // ---- Personajes / fichas ----
  // img: ruta a tu imagen (PNG/SVG con fondo transparente). Si es null
  //      o la imagen no existe, se muestra la inicial del nombre.
  AVATARS: [
    { id: 'clasico',     name: 'Clásico',      img: 'assets/avatars/01_classic.png' },
    { id: 'piloto',      name: 'Piloto',       img: 'assets/avatars/03_pilot.png' },
    { id: 'estudioso',   name: 'Estudioso',    img: 'assets/avatars/05_scholar.png' },
    { id: 'canchero',    name: 'Canchero',     img: 'assets/avatars/06_cool_dude.png' },
    { id: 'picaro',      name: 'Pícaro',       img: 'assets/avatars/08_saucy.png' },
    { id: 'bailarina',   name: 'Bailarina',    img: 'assets/avatars/09_ballerina.png' },
    { id: 'cientifico',  name: 'Científico',   img: 'assets/avatars/11_scientist.png' },
    { id: 'cientifico2', name: 'Científico 2', img: 'assets/avatars/12_scientist_2.png' },
    { id: 'panadero',    name: 'Panadero',     img: 'assets/avatars/13_baker.png' },
    { id: 'dama',        name: 'Dama vintage', img: 'assets/avatars/14_vintage_belle.png' },
    { id: 'jardinero',   name: 'Jardinero',    img: 'assets/avatars/16_gardener.png' },
  ],

  // Colores sugeridos que se asignan a cada equipo nuevo (paleta retro)
  TEAM_COLORS: ['#e8a33d', '#d9534f', '#4a90a4', '#6aa84f', '#a569bd', '#e07b39', '#c9a227', '#5d8aa8'],
};
