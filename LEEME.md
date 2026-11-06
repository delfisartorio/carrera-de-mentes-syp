# Polli-Run — guía rápida

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
  - **Si responden bien siguen tirando** (en el panel aparece "Sigue tirando"), salvo que
    ganen o roben un anillo: ahí termina su turno. Si responden mal, también pasa el turno.
  - Las preguntas acertadas **no vuelven a salir**.
- **Robo de anillos:** si caen en la misma casilla que otro equipo y responden bien una **difícil**,
  pueden robarle el anillo que quieran (de los que no tienen). El otro se queda sin él.
- **Corral (cárcel):** quien cae ahí no responde y **pierde el próximo turno**
  (su ficha se ve gris y en la lista dice "En el corral").
- **Comodines:** cada equipo arranca con 2, que se usan dentro de la pregunta. Al pasar o caer
  en la **Salida** se reinician (vuelven a la cantidad inicial, no se acumulan):
  - **Eliminar opciones**: tacha opciones incorrectas y quedan 2 (no se puede en
    Verdadero/Falso ni en preguntas sin opciones).
  - **Cambiar pregunta**: sale otra de la misma temática y dificultad.
- **El juego no termina solo:** al juntar un anillo de cada temática se festeja y se sigue
  jugando (esos anillos todavía se pueden robar). El botón **Finalizar juego** muestra el
  podio de ese momento: gana quien tiene más anillos; si empatan, quien los completó
  antes y después quien tiene más fáciles acertadas.
- La **Salida**: si caen justo ahí, eligen de qué temática es la pregunta.
- Si se agotan las preguntas de una temática, se repiten las **falladas o salteadas con el comodín**.
- Si se **acertaron todas** las fáciles o las difíciles de una temática, esa dificultad queda
  desactivada: un cartel avisa que elijan la otra o pierdan el turno. Si no queda ninguna de las
  dos, pierden el turno (y en la Salida esa temática no se puede elegir).

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

| tematica | pregunta | respuesta | opciones | opcion_correcta | dificultad | id_imagen |
|---|---|---|---|---|---|---|
| Historia | ¿En qué año llegó Colón a América? | 1492 | 1492\|1810\|1516\|1776 | A | facil | |
| Ciencia | ¿Cuántos huesos tiene el cuerpo humano? | 206 | | | dificil | |
| Ciencia | El Sol es una estrella. | Verdadero | Verdadero\|Falso | A | facil | |
| Geografía | ¿De qué país es esta bandera? | Italia | Italia\|Irlanda\|México | A | facil | bandera-1 |

- `opcion_correcta`: cuál de las opciones es la buena. Puede ser la letra (`B`),
  el número (`2` = la segunda) o el texto de la opción. El comodín
  **Eliminar opciones nunca saca la correcta**; si no se puede saber cuál es,
  el comodín queda desactivado para esa pregunta.
- `dificultad`: `facil` o `dificil`. Si está vacía, la pregunta sirve para las dos.
- **Verdadero/Falso**: poné `Verdadero|Falso` como opciones.
- `id_imagen` (opcional): para las preguntas con imagen. Poné el archivo en `assets/imagenes/`
  con ese nombre (`bandera-1.jpg`). La extensión no hace falta si es jpg, jpeg, png, webp o gif.
  Si falta el archivo, la pregunta sale con un aviso en rojo.

- **Las temáticas del tablero = las que aparecen en la columna `tematica`**, en el orden
  en que aparecen por primera vez. Se usan hasta `MAX_THEMES` (6 por defecto).
  Ej.: un CSV con 5 temáticas → 5 anillos para ganar.
- Conviene que cada temática tenga **varias preguntas** (al menos 6–10), porque las acertadas
  ya no se repiten.
- Separador `;`, `,` o tabulación (se detecta solo). Acentos OK.
- Las columnas `respuesta`, `opciones` y `opcion_correcta` son **opcionales**. Las opciones
  se muestran como A/B/C/D; la respuesta no se muestra. El moderador decide con
  **Correcto** / **Incorrecto**.
- **Descargar plantilla** baja un CSV listo para completar.
- El juego viene **precargado** con las preguntas de `preguntas/preguntas-SYP2026-aprobadas (1).csv`
  (copiadas en `js/preguntas-syp2026.js`). Se usan si el navegador no tiene otro banco guardado;
  cargar otro CSV las reemplaza. Si se modifica ese CSV, hay que regenerar el `.js`.

## Configuración (`js/config.js`)

| Opción | Qué hace |
|---|---|
| `COLUMNS`, `LANES` | Tamaño de la viborita: LANES filas (par) de COLUMNS casillas. **9×4 = 40** (por defecto), 8×4 = 36, 10×4 = 44, 7×6 = 48. |
| `JAIL_CELLS`, `JAIL_TURNS` | Cuántas casillas de corral hay y cuántos turnos se pierden. |
| `JAIL_POSITIONS` | Casillas exactas de los corrales (ahora 10, 26 y 37; la Salida es la 0). Con `null` se reparten solos. |
| `JAIL_IMAGE` | Foto del corral (`assets/tablero/corral.jpg`). Si no está, se ve un corral dibujado. |
| `CORRECT_KEEPS_TURN` | `true`: si responden bien siguen tirando (salvo que ganen o roben un anillo). |
| `EASY_FOR_RING` | Cuántas fáciles de una temática hacen falta para el anillo (3). |
| `JOKERS` | Comodines iniciales de cada equipo: `{ eliminar: 1, cambiar: 1 }`. |
| `MAX_THEMES` / `MIN_THEMES` | Cuántas temáticas del CSV se usan como máximo / mínimo. |
| `START_IS_WILD` | `true`: en la Salida eligen la temática. |
| `THEMES` | Color de temáticas conocidas. Las que no estén reciben color de `RING_COLORS`. Mayúsculas y tildes no importan. |
| `BOARD_AREA` | Zona del fondo donde va la pista (% de la imagen). Ajustar si cambiás el fondo. |
| `STEP_MS` | Velocidad del saltito por casilla. |

Cada temática tiene casillas **en proporción a sus preguntas** en el CSV (el doble de
preguntas, el doble de casillas; como mínimo 1). Se reparten mezcladas a lo largo de la
vuelta. Dos iguales seguidas solo aparecen si es inevitable (una temática con cerca de la
mitad de las casillas o más), y las menos posibles. El reparto cambia en cada partida
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
