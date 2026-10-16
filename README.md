# Carrera de Mentes — guía rápida

## Cómo abrirlo
Doble clic en `index.html` (Chrome o Edge). No necesita internet ni servidor
(solo la tipografía Fredoka viene de Google Fonts; sin internet usa una de sistema).

## Estructura

```
index.html                ← estructura de pantallas (no hace falta tocarlo)
css/styles.css            ← estética retro: colores, tamaños, animaciones
js/config.js              ← ⭐ TODO lo configurable: personajes, tablero, casillas, temáticas
js/app.js                 ← lógica (no hace falta tocarlo)
js/preguntas-ejemplo.js   ← copia embebida del CSV de ejemplo (botón "Usar preguntas de ejemplo")
preguntas/ejemplo.csv     ← banco de ejemplo para usar de modelo
assets/
  avatars/                ← tus personajes (pollito.png, ...)
  tablero/fondo.jpg       ← fondo del tablero (el de "Carrera de Mentes")
  anillos/                ← imagen del anillo (opcional)
```

## Banco de preguntas (CSV)

En la pantalla inicial, sección **📚 Banco de preguntas** → **Cargar CSV**.
También se puede cambiar en plena partida con el botón **📚 Preguntas**.
El banco queda guardado en el navegador: no hay que cargarlo cada clase.

**Formato** (lo podés armar en Excel o Google Sheets y "Guardar como CSV"):

| tematica | pregunta | respuesta | opciones |
|---|---|---|---|
| Historia | ¿En qué año llegó Colón a América? | 1492 | 1492\|1810\|1516\|1776 |
| Ciencia | ¿Cuántos huesos tiene el cuerpo humano? | 206 | |

- Separador `;` o `,` (se detecta solo). Acentos OK (UTF-8 o el CSV común de Excel).
- `opciones` es **opcional**: si está, se muestran como A/B/C/D separadas por `|`.
  También sirven columnas `opcion_a`, `opcion_b`, ...
- `respuesta` es lo que ve el moderador al tocar **👁️ Mostrar respuesta**
  (si coincide con una opción, esa opción se pinta de verde).
- **Descargar plantilla** te baja un CSV listo para completar.

**En el juego:** al caer en una casilla ❓ sale una pregunta al azar
(no se repite hasta agotar las de esa temática). El moderador marca
**✅ Correcto** → el equipo gana **un anillo del color de esa temática**,
o **❌ Incorrecto** → no gana nada. El botón **❓ Hacer una pregunta** saca una
pregunta para el equipo del turno sin moverse.

**Casillas de temática fija:** en `config.js` → `SPECIAL_CELLS`:
```js
14: { type: 'challenge', theme: 'Historia' },
```
La casilla toma el ícono y color de la temática y solo saca preguntas de esa.

## Temáticas y colores de anillo
En `config.js` → `THEMES`: nombre → `{ color, icon }`. Si el CSV trae una
temática que no está ahí, igual funciona y se le asigna un color automático.
Mayúsculas y tildes no importan (`geografia` = `Geografía`).
- `PRIZE_THEME`: el anillo que dan las casillas ⭐ Premio.
- **+1 Anillo** y el botón **+** de cada equipo preguntan de qué temática es el anillo.
- El botón **−** quita el último anillo ganado.

## Lo visual que hacés vos

### 1. Personajes / fichas → `assets/avatars/`
- PNG (o SVG) con **fondo transparente**, cuadrado de **512×512 px** (mínimo 256).
- El personaje centrado y **con los pies tocando el borde de abajo**
  (así queda bien "parado" encima de los anillos).
- En `js/config.js`, dentro de `AVATARS`:
  ```js
  { id: 'pollito', name: 'Pollito', emoji: '🐣', img: 'assets/avatars/pollito.png' },
  ```
  Si la imagen falta, aparece el emoji. Con imagen propia se quita el círculo
  de color y queda el contorno de tinta estilo caricatura.

### 2. Fondo del tablero → `assets/tablero/fondo.jpg`
- Ya está puesto. Las casillas se dibujan **solo en la zona de arena** del medio,
  definida en `config.js`:
  ```js
  BOARD_AREA: { top: 25, right: 24.5, bottom: 12.5, left: 27.5 },
  ```
  (porcentajes del alto/ancho de la imagen). Si cambiás el dibujo o las casillas
  tapan algo, ajustá esos números.
- La proporción del tablero se toma sola del tamaño real de la imagen.

### 3. Anillo → `assets/anillos/` (opcional)
- Por defecto se dibujan con CSS (con contorno de tinta y color de la temática).
- Si querés el tuyo: PNG transparente, elipse vista un poco desde arriba, 3:1
  (ej. 300×100). `RING_IMAGE: 'assets/anillos/anillo.png'`.
  Ojo: con imagen propia los anillos ya no cambian de color por temática.

### 4. Colores → `css/styles.css`
En `:root`: `--card` (pergamino), `--ink` (tinta), `--accent`, colores de
casillas `--cell-*` y fondo `--bg-1`/`--bg-2`.

## Otras opciones de `config.js`
| Opción | Qué hace |
|---|---|
| `TOTAL_CELLS` / `COLUMNS` | Cantidad de casillas y casillas por fila (serpentina). |
| `STEP_MS` | Velocidad del saltito por casilla. |
| `BOUNCE_AT_END` | `true`: si se pasa de la meta, rebota. |
| `MAX_VISIBLE_RINGS` | Altura máxima de la pila (el contador `×N` sigue sumando). |

## Cómo se juega (moderador)
1. Cargar el banco de preguntas, registrar equipos → **Empezar partida**.
2. Tirar el dado físico → tocar el número (o tecla `1`–`6`) → **Mover** (o `Enter`).
3. Casilla ❓ → leer la pregunta → **Mostrar respuesta** → Correcto / Incorrecto.
4. **Deshacer** revierte la última acción. **Pasar turno** salta al siguiente.
5. Todo se guarda solo. Si se cierra la pestaña, al volver ofrece **Continuar partida guardada**.
