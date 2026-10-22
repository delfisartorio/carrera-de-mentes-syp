# Carrera de Mentes — guía rápida

## Cómo abrirlo
Doble clic en `index.html` (Chrome o Edge). No necesita internet ni servidor
(solo la tipografía Fredoka viene de Google Fonts; sin internet usa una de sistema).

## Dinámica
- La pista es una **viborita en zigzag** (40 casillas) que vuelve a la Salida por la
  columna de la izquierda: las fichas dan vueltas, no hay casilla final.
- **Cada casilla es de una temática** (las temáticas salen del CSV).
- Al caer en una casilla eligen **Fácil o Difícil** y sale una pregunta de esa temática:
  - **Difícil correcta** → ganan el **anillo de esa temática**.
  - **Fácil correcta** → suman 1 de 3 (puntitos en la lista de equipos);
    con **3 fáciles de la misma temática** ganan el anillo.
  - **Siempre que responden bien siguen tirando** (en el panel aparece "Sigue tirando").
    Si responden mal, pasa el turno.
  - Las preguntas acertadas **no vuelven a salir**; las falladas sí.
- **Robo de anillos:** si caen en la misma casilla que otro equipo y responden bien,
  pueden robarle el anillo que quieran (de los que no tienen). El otro se queda sin él.
- **Corral (cárcel):** quien cae ahí no responde y **pierde el próximo turno**
  (su ficha se ve gris y en la lista dice "En el corral").
- **Comodines:** cada equipo arranca con 2, que se usan dentro de la pregunta:
  - **Eliminar opciones**: tacha opciones incorrectas y quedan 2 (no se puede en
    Verdadero/Falso ni en preguntas sin opciones).
  - **Cambiar pregunta**: sale otra de la misma temática y dificultad.
- **Gana el primer equipo que junta un anillo de cada temática.** Con "Seguir jugando"
  los demás siguen compitiendo por el 2.º puesto, etc.
- La **Salida**: si caen justo ahí, eligen de qué temática es la pregunta.
- Si se agotan las preguntas de una temática, se vuelven a habilitar todas.

## Estructura

```
index.html                ← estructura de pantallas (no hace falta tocarlo)
css/styles.css            ← estética retro: colores, tamaños, animaciones
js/config.js              ← TODO lo configurable
js/app.js                 ← lógica (no hace falta tocarlo)
js/preguntas-ejemplo.js   ← copia del CSV de ejemplo (botón "Usar preguntas de ejemplo")
preguntas/ejemplo.csv     ← banco de ejemplo: 5 temáticas × 9 preguntas (fáciles y difíciles)
assets/
  avatars/                ← tus personajes (pollito.png, ...)
  tablero/fondo.jpg       ← fondo del tablero
  anillos/                ← imagen del anillo (opcional)
```

## Banco de preguntas (CSV)

En la pantalla inicial, sección **Banco de preguntas** → **Cargar CSV**.
**Sin banco no se puede empezar** (las temáticas del tablero salen de ahí).
Queda guardado en el navegador: no hay que cargarlo cada clase.

**Formato** (Excel o Google Sheets → "Guardar como CSV"):

| tematica | dificultad | pregunta | respuesta | opciones |
|---|---|---|---|---|
| Historia | facil | ¿En qué año llegó Colón a América? | 1492 | 1492\|1810\|1516\|1776 |
| Ciencia | dificil | ¿Cuántos huesos tiene el cuerpo humano? | 206 | |
| Ciencia | facil | El Sol es una estrella. | Verdadero | Verdadero\|Falso |

- `dificultad`: `facil` o `dificil`. Si está vacía, la pregunta sirve para las dos.
- **Verdadero/Falso**: poné `Verdadero|Falso` como opciones.

- **Las temáticas del tablero = las que aparecen en la columna `tematica`**, en el orden
  en que aparecen por primera vez. Se usan hasta `MAX_THEMES` (6 por defecto).
  Ej.: un CSV con 5 temáticas → 5 anillos para ganar.
- Conviene que cada temática tenga **varias preguntas** (al menos 6–10), porque las acertadas
  ya no se repiten.
- Separador `;` o `,` (se detecta solo). Acentos OK.
- Las columnas `respuesta` y `opciones` son **opcionales**. Las opciones se muestran
  como A/B/C/D; la respuesta no se muestra (la usa el comodín "Eliminar opciones",
  así que tiene que coincidir con una de las opciones). El moderador decide con
  **Correcto** / **Incorrecto**.
- **Descargar plantilla** baja un CSV listo para completar.

## Configuración (`js/config.js`)

| Opción | Qué hace |
|---|---|
| `COLUMNS`, `LANES` | Tamaño de la viborita: LANES filas (par) de COLUMNS casillas. **9×4 = 40** (por defecto), 8×4 = 36, 10×4 = 44, 7×6 = 48. |
| `JAIL_CELLS`, `JAIL_TURNS` | Cuántas casillas de corral hay y cuántos turnos se pierden. |
| `JAIL_IMAGE` | Foto del corral (`assets/tablero/corral.jpg`). Si no está, se ve un corral dibujado. |
| `CORRECT_KEEPS_TURN` | `true`: si responden bien siguen tirando. |
| `EASY_FOR_RING` | Cuántas fáciles de una temática hacen falta para el anillo (3). |
| `JOKERS` | Comodines iniciales de cada equipo: `{ eliminar: 1, cambiar: 1 }`. |
| `MAX_THEMES` / `MIN_THEMES` | Cuántas temáticas del CSV se usan como máximo / mínimo. |
| `START_IS_WILD` | `true`: en la Salida eligen la temática. |
| `THEMES` | Color de temáticas conocidas. Las que no estén reciben color de `RING_COLORS`. Mayúsculas y tildes no importan. |
| `BOARD_AREA` | Zona del fondo donde va la pista (% de la imagen). Ajustar si cambiás el fondo. |
| `STEP_MS` | Velocidad del saltito por casilla. |

Las temáticas se reparten en las casillas **mezcladas por bloques**: hay de todas
a lo largo de la vuelta y nunca dos iguales seguidas. El reparto cambia en cada partida
nueva y se mantiene si se recarga.

## Lo visual que hacés vos

### 1. Personajes → `assets/avatars/`
- PNG (o SVG) con **fondo transparente**, cuadrado de **512×512 px** (mínimo 256).
- El personaje centrado y **con los pies tocando el borde de abajo**
  (así queda "parado" encima de los anillos).
- En `config.js` → `AVATARS`: `img: 'assets/avatars/pollito.png'`.
  Si la imagen falta, aparece la inicial del nombre.

### 2. Fondo del tablero → `assets/tablero/fondo.jpg`
- Ya está puesto. La pista se dibuja en la zona de arena (`BOARD_AREA`). La leyenda
  "Juntá los N anillos" está en el panel de la derecha.

### 2b. Foto del corral → `assets/tablero/corral.jpg`
- Una foto de un corral (JPG, más o menos cuadrada). Mientras no esté, la casilla
  muestra un corral de madera dibujado.

### 3. Anillo → `assets/anillos/` (opcional)
- Por defecto se dibujan con CSS, del color de cada temática.
- Si querés el tuyo: PNG transparente, elipse vista un poco desde arriba, 3:1.
  `RING_IMAGE: 'assets/anillos/anillo.png'` (ojo: así pierden el color por temática).

### 4. Colores → `css/styles.css`
En `:root`: `--card` (pergamino), `--ink` (tinta), `--accent`, fondo `--bg-1`/`--bg-2`.

## Cómo se juega (moderador)
1. Cargar el banco de preguntas, registrar equipos → **Empezar partida**.
2. Tirar el dado físico → tocar el número (o tecla `1`–`6`) → **Mover** (o `Enter`).
3. Elegir **Fácil** o **Difícil**, leer la pregunta (si piden un comodín, tocarlo)
   → **Correcto** / **Incorrecto**.
4. Botones extra:
   - **Pregunta de esta casilla**: vuelve a sacar una pregunta donde está el equipo.
   - **+1 Anillo** / **+** en la lista: dar un anillo a mano (eligiendo temática).
   - **−** en la lista: quitar el último anillo.
   - **Deshacer**, **Pasar turno**.
5. Todo se guarda solo. Si se cierra la pestaña, al volver ofrece **Continuar partida guardada**.
