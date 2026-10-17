# Carrera de Mentes — guía rápida

## Cómo abrirlo
Doble clic en `index.html` (Chrome o Edge). No necesita internet ni servidor
(solo la tipografía Fredoka viene de Google Fonts; sin internet usa una de sistema).

## Dinámica
- La pista es **circular**: las fichas dan vueltas, no hay casilla final.
- **Cada casilla es de una temática** (las temáticas salen del CSV).
- Al caer en una casilla aparece una **pregunta al azar de esa temática**:
  - **Correcta** → el equipo gana el **anillo de esa temática** y esa pregunta
    **no vuelve a salir** en la partida.
  - **Incorrecta** → no gana nada y la pregunta **puede volver a salir**.
  - Si ya tenían ese anillo, igual responden (sirve de repaso) pero no suman otro.
- **Gana el primer equipo que junta un anillo de cada temática.** Con "Seguir jugando"
  los demás siguen compitiendo por el 2.º puesto, etc.
- La **Salida** es comodín: si caen justo ahí, eligen de qué temática es la pregunta.
- Si se agotan las preguntas de una temática, se vuelven a habilitar todas.

## Estructura

```
index.html                ← estructura de pantallas (no hace falta tocarlo)
css/styles.css            ← estética retro: colores, tamaños, animaciones
js/config.js              ← TODO lo configurable
js/app.js                 ← lógica (no hace falta tocarlo)
js/preguntas-ejemplo.js   ← copia del CSV de ejemplo (botón "Usar preguntas de ejemplo")
preguntas/ejemplo.csv     ← banco de ejemplo: 5 temáticas × 6 preguntas
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

| tematica | pregunta | respuesta | opciones |
|---|---|---|---|
| Historia | ¿En qué año llegó Colón a América? | 1492 | 1492\|1810\|1516\|1776 |
| Ciencia | ¿Cuántos huesos tiene el cuerpo humano? | 206 | |

- **Las temáticas del tablero = las que aparecen en la columna `tematica`**, en el orden
  en que aparecen por primera vez. Se usan hasta `MAX_THEMES` (6 por defecto).
  Ej.: un CSV con 5 temáticas → 5 anillos para ganar.
- Conviene que cada temática tenga **varias preguntas** (al menos 6–10), porque las acertadas
  ya no se repiten.
- Separador `;` o `,` (se detecta solo). Acentos OK.
- Las columnas `respuesta` y `opciones` son **opcionales** y no se muestran en pantalla:
  la pantalla de pregunta muestra solo la pregunta y los botones **Correcto** / **Incorrecto**.
  (Sirven como ayuda para el moderador si mira el CSV.)
- **Descargar plantilla** baja un CSV listo para completar.

## Configuración (`js/config.js`)

| Opción | Qué hace |
|---|---|
| `COLUMNS`, `ROWS` | Tamaño de la vuelta. Casillas = 2×COLUMNS + 2×(ROWS−2). **7×5 = 20** (por defecto), 6×4 = 16, 8×5 = 22. |
| `MAX_THEMES` / `MIN_THEMES` | Cuántas temáticas del CSV se usan como máximo / mínimo. |
| `START_IS_WILD` | `true`: la Salida es comodín (eligen temática). |
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
- Ya está puesto. La pista se dibuja en la zona de arena (`BOARD_AREA`) y en el centro
  aparece la leyenda "¡Juntá los N anillos!" con los colores de cada temática.

### 3. Anillo → `assets/anillos/` (opcional)
- Por defecto se dibujan con CSS, del color de cada temática.
- Si querés el tuyo: PNG transparente, elipse vista un poco desde arriba, 3:1.
  `RING_IMAGE: 'assets/anillos/anillo.png'` (ojo: así pierden el color por temática).

### 4. Colores → `css/styles.css`
En `:root`: `--card` (pergamino), `--ink` (tinta), `--accent`, fondo `--bg-1`/`--bg-2`.

## Cómo se juega (moderador)
1. Cargar el banco de preguntas, registrar equipos → **Empezar partida**.
2. Tirar el dado físico → tocar el número (o tecla `1`–`6`) → **Mover** (o `Enter`).
3. Leer la pregunta → **Correcto** / **Incorrecto**.
4. Botones extra:
   - **Pregunta de esta casilla**: vuelve a sacar una pregunta donde está el equipo.
   - **+1 Anillo** / **+** en la lista: dar un anillo a mano (eligiendo temática).
   - **−** en la lista: quitar el último anillo.
   - **Deshacer**, **Pasar turno**.
5. Todo se guarda solo. Si se cierra la pestaña, al volver ofrece **Continuar partida guardada**.
