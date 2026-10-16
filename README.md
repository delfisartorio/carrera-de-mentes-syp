# Carrera de Mente — guía rápida

## Cómo abrirlo
Doble clic en `index.html` (Chrome o Edge). No necesita internet ni servidor
(solo la tipografía Fredoka viene de Google Fonts; sin internet usa una de sistema).

## Estructura

```
index.html            ← estructura de pantallas (no hace falta tocarlo)
css/styles.css        ← colores, tamaños, animaciones
js/config.js          ← ⭐ TODO lo configurable: personajes, tablero, casillas, anillos
js/app.js             ← lógica (no hace falta tocarlo)
assets/
  avatars/            ← tus personajes (pollito.png, auto.png, ...)
  tablero/            ← imagen de fondo del tablero (opcional)
  anillos/            ← imagen del anillo/moneda (opcional)
```

## Lo visual que vos hacés

### 1. Personajes / fichas → `assets/avatars/`
- **Formato:** PNG (o SVG) con **fondo transparente**.
- **Tamaño:** cuadrado, **512×512 px** (mínimo 256×256).
- **Encuadre:** el personaje centrado y **con los pies tocando el borde de abajo**
  (así queda bien "parado" encima de los anillos). Dejá ~5% de margen a los costados.
- **Nombre del archivo:** en minúsculas sin espacios, ej. `pollito.png`.
- **Conectarlo:** en `js/config.js`, dentro de `AVATARS`, poné la ruta en `img`:
  ```js
  { id: 'pollito', name: 'Pollito', emoji: '🐣', img: 'assets/avatars/pollito.png' },
  ```
  Podés agregar o quitar personajes de esa lista. Si la imagen falta, aparece el emoji.
- Con imagen propia se quita el círculo de color y el personaje lleva un brillo del color del equipo.

### 2. Fondo del tablero → `assets/tablero/` (opcional)
- **Proporción:** igual a columnas:filas. Con la config por defecto (40 casillas, 8 columnas → 5 filas)
  es **8:5**, por ejemplo **1600×1000 px**. JPG o PNG.
- Las casillas se dibujan encima, así que sirve más un fondo/escenario que un tablero con casillas dibujadas.
- **Conectarlo:** `BOARD_BACKGROUND: 'assets/tablero/fondo.jpg'`.

### 3. Anillo / moneda → `assets/anillos/` (opcional)
- Por defecto los anillos se dibujan con CSS (no necesitás imagen).
- Si querés el tuyo: PNG transparente, **vista de frente levemente desde arriba** (una elipse),
  proporción **3:1**, ej. **300×100 px**. Se apila uno encima del otro.
- **Conectarlo:** `RING_IMAGE: 'assets/anillos/anillo.png'`.

### 4. Colores de las casillas → `css/styles.css`
Al principio del archivo, en `:root`: `--cell-c0..c3` (casillas normales),
`--cell-forward`, `--cell-back`, `--cell-prize`, `--cell-challenge`, y el fondo `--bg-1`/`--bg-2`.

## Configurar el juego (`js/config.js`)
| Opción | Qué hace |
|---|---|
| `TOTAL_CELLS` | Cantidad de casillas (incluye Salida y Meta). |
| `COLUMNS` | Casillas por fila del recorrido en serpentina. |
| `STEP_MS` | Velocidad del saltito por casilla. |
| `BOUNCE_AT_END` | `true`: si se pasa de la meta, rebota. `false`: se queda en la meta. |
| `SPECIAL_CELLS` | Qué casillas son especiales: `forward` (avanza N), `back` (retrocede N), `prize` (anillo automático), `challenge` (el moderador marca si respondió bien → anillo). |
| `RING_COLOR_MODE` | `'palette'` (anillos multicolor) o `'team'` (del color del equipo). |
| `MAX_VISIBLE_RINGS` | Altura máxima de la pila (el contador `×N` sigue sumando). |

## Cómo se juega (moderador)
1. Registrar equipos → **Empezar partida**.
2. Tirar el dado físico → tocar el número (o tecla `1`–`6`) → **Mover** (o `Enter`).
3. **+1 Anillo** da un anillo al equipo del turno; en la lista de equipos están `+`/`−` para cualquiera.
4. **Deshacer** revierte la última acción. **Pasar turno** salta al siguiente.
5. Todo se guarda solo. Si se cierra la pestaña, al volver ofrece **Continuar partida guardada**.
