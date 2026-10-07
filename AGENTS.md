# AGENTS.md

## Qué es esto

Clon de Asteroids en canvas HTML5 puro. **Sin toolchain**: no hay package.json, dependencias, bundler, tests ni lint/typecheck. No añadas herramientas ni busques scripts que no existen.

Archivos:

- `index.html` — canvas + CSS inline, carga `game.js` con un `<script>` simple
- `game.js` — toda la lógica del juego (un solo archivo, clases: Bullet, Asteroid, Ship, Particle)
- `favicon.svg`

## Cómo ejecutarlo

Abre `index.html` directamente, o usa `npx serve .` (visita `http://localhost:3000`).

## Trampas

- **El tamaño del canvas está duplicado**: `W = 800` / `H = 600` en `game.js` Y `width="800" height="600"` en `index.html`. Cambia ambos o el render se rompe. Toda la lógica de movimiento/wrap depende de `W`/`H`.
- **El README no es del todo preciso**: menciona power-ups y tipos especiales de asteroides (estrella fugaz) que *no están implementados* en `game.js`. Confía en el código.
- **Idioma**: los textos de UI, comentarios y el README están en español. Mantén los nuevos textos/comentarios en español.
- **Patrón de input**: el estado de tecla mantenida vive en `keys`; los pulsados únicos usan `justPressed` + `pressed(code)` (`game.js:20`), que *consume* el flag. Usa `pressed()` para lo que debe dispararse una sola vez por pulsación (disparo, reinicio) y `keys[]` para acciones continuas (propulsión, giro).
- **Máquina de estados del juego**: `state` es `'playing' | 'dead' | 'gameover'`, gestionado al inicio de `update()`. `dead` es un temporizador de reaparición de 2s, no fin de partida.
- **Mundo toroidal**: cada entidad envuelve con `wrap(v, max)` — las colisiones ignoran los bordes de la pantalla, así que objetos cerca de bordes opuestos pueden interactuar visualmente/entre sí; es intencional, no lo "corrijas".
- La física usa `dt` en segundos con un tope de 0.05s en `loop()`; el movimiento nuevo debe basarse en `dt`, no por frame.

## Convenciones

- Las constantes de balance viven en tablas al inicio de su sección (`RADII`, `SPEEDS`, `POINTS` en `game.js:61`) y en locales por método (`ROT`, `THRUST`, `DRAG`). Extiende esas en lugar de hardcodear números.
- Las entidades siguen la misma forma: `update(dt)`, `draw()`, flag `dead` filtrado tras cada frame.
