'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
const STAR_TTL       = 10;   // segundos de vida antes de desaparecer
const STAR_SPEED     = 200;  // px/s (los normales van de 32 a 85)
const STAR_POINTS    = 150;  // puntos al destruirla
const STAR_SPAWN_MIN = 15;   // intervalo de aparición (s)
const STAR_SPAWN_MAX = 25;

class ShootingStar extends Asteroid {
  constructor(x, y) {
    super(x, y, 1);
    const angle = rand(0, Math.PI * 2);
    const speed = STAR_SPEED + rand(-20, 20);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-3, 3);
    this.ttl  = STAR_TTL;
    this.dead = false;
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  split() {
    return [];
  }

  draw() {
    // Estela de cometa hacia atrás
    const speed = Math.hypot(this.vx, this.vy) || 1;
    const nx = -this.vx / speed;
    const ny = -this.vy / speed;
    const tail = 40;
    const grad = ctx.createLinearGradient(this.x, this.y, this.x + nx * tail, this.y + ny * tail);
    grad.addColorStop(0, 'rgba(255, 221, 68, 0.9)');
    grad.addColorStop(1, 'rgba(255, 221, 68, 0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + nx * tail, this.y + ny * tail);
    ctx.stroke();

    // Atenuación en los últimos 3 segundos
    const alpha = Math.min(1, this.ttl / 3);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fd4';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
// Skins: misma geometría de nariz (x≈20) para que NOSE de tryShoot() siga
// siendo coherente. `scale` multiplica el tamaño visual y el hitbox; `pointMult`
// multiplica los puntos obtenidos mientras se usa esa skin.
const SHIP_RADIUS = 12;
const SHIP_NOSE   = 21;

const SKINS = [
  { name: 'CLÁSICA', stroke: '#fff',  flame: 'rgba(255, 130, 0, 0.85)',
    verts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]] },
  { name: 'DELGADA', stroke: '#4df', flame: 'rgba(80, 220, 255, 0.85)',
    verts: [[22, 0], [-10, -6], [-6, 0], [-10, 6]] },
  { name: 'DELTA',   stroke: '#fd4', flame: 'rgba(255, 180, 0, 0.85)',
    verts: [[21, 0], [-14, -11], [-8, 0], [-14, 11]] },
  { name: 'ROMBO',   stroke: '#f4a', flame: 'rgba(255, 80, 200, 0.85)',
    verts: [[20, 0], [0, -10], [-14, 0], [0, 10]] },
  { name: 'CAZA',    stroke: '#8f8', flame: 'rgba(140, 255, 120, 0.85)',
    verts: [[22, 0], [6, -5], [-2, -12], [-10, -6], [-8, 0],
            [-10, 6], [-2, 12], [6, 5]] },
  // Nave morada: el doble de grande y otorga el doble de puntos.
  { name: 'MORADA',  stroke: '#a855f7', flame: 'rgba(200, 80, 255, 0.85)',
    verts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]], scale: 2, pointMult: 2 },
];
for (const s of SKINS) s.rearX = Math.min(...s.verts.map(v => v[0]));

const SKIN_KEY = 'asteroids.skin';
let skinNameTimer = 0;   // aviso temporal de cambio de skin en el HUD

function loadSkin() {
  try {
    const i = parseInt(localStorage.getItem(SKIN_KEY), 10);
    return Number.isInteger(i) && i >= 0 && i < SKINS.length ? i : 0;
  } catch (e) { return 0; }
}

function saveSkin() {
  try { localStorage.setItem(SKIN_KEY, String(currentSkin)); } catch (e) {}
}

let currentSkin = loadSkin();

const skinScale = () => SKINS[currentSkin].scale || 1;
const skinMult  = () => SKINS[currentSkin].pointMult || 1;

class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.thrusting       = false;
    this.invincible      = 3;
    this.shootCooldown   = 0;
    this.speedTimer      = 0;
    this.shieldHits      = 0;
    this.shieldTimer     = 0;
    this.tripleShotTimer = 0;
    this.dead            = false;
  }

  // El hitbox escala con el tamaño de la skin (la MORADA es el doble de grande).
  get radius() { return SHIP_RADIUS * skinScale(); }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown   > 0) this.shootCooldown   -= dt;
    if (this.speedTimer      > 0) this.speedTimer      = Math.max(0, this.speedTimer - dt);
    if (this.tripleShotTimer > 0) this.tripleShotTimer -= dt;
    if (this.shieldHits > 0) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.shieldHits  = 0;
        this.shieldTimer = 0;
      }
    }

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;
    const mult   = this.speedTimer > 0 ? SPEED_MULT : 1;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * mult * dt;
      this.vy += Math.sin(this.angle) * THRUST * mult * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = SHIP_NOSE * skinScale();
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShotTimer > 0) {
      const spread = TRIPLE_SPREAD;
      return [
        new Bullet(ox, oy, this.angle - spread),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + spread),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;

    // Dibujo del escudo activo alrededor de la nave
    if (this.shieldHits > 0) {
      const r = this.radius + 5;
      ctx.save();
      ctx.translate(this.x, this.y);
      let alpha = 0.5;
      if (this.shieldTimer < 2) {
        alpha = 0.4 + Math.sin(performance.now() / 80) * 0.3;
      }
      ctx.strokeStyle = `rgba(68, 221, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[currentSkin];

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.scale(skin.scale || 1, skin.scale || 1);
    ctx.strokeStyle = skin.stroke;
    ctx.lineWidth   = 1.5 / (skin.scale || 1);
    ctx.lineJoin    = 'round';

    // Silueta de la skin activa
    ctx.beginPath();
    ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
    for (let i = 1; i < skin.verts.length; i++)
      ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(skin.rearX, -4);
      ctx.lineTo(skin.rearX - rand(6, 14), 0);
      ctx.lineTo(skin.rearX,  4);
      ctx.strokeStyle = skin.flame;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-up Velocidad ───────────────────────────────────────────────────────
const POWERUP_RADIUS    = 13;
const POWERUP_DURATION  = 5;    // segundos de efecto por recogida
const POWERUP_TTL       = 10;   // cuánto flota en pantalla antes de expirar
const POWERUP_SPAWN_MIN = 8;    // intervalo de aparición (s)
const POWERUP_SPAWN_MAX = 14;
const SPEED_MULT        = 2;    // x2 velocidad de la nave

// ── Power-up Escudo ─────────────────────────────────────────────────────────
const SHIELD_POWERUP_RADIUS    = 13;
const SHIELD_POWERUP_TTL       = 10;   // cuánto flota en pantalla antes de expirar
const SHIELD_POWERUP_SPAWN_MIN = 12;   // intervalo de aparición (s)
const SHIELD_POWERUP_SPAWN_MAX = 18;
const SHIELD_HITS_MAX          = 2;    // golpes que absorbe
const SHIELD_DURATION          = 10;   // TTL del escudo activo (s)

// ── Power-up Triple Shot ─────────────────────────────────────────────────────
const TRIPLE_RADIUS     = 13;
const TRIPLE_DURATION   = 5;    // segundos de efecto
const TRIPLE_TTL        = 10;   // cuánto flota en pantalla antes de expirar
const TRIPLE_SPAWN_MIN  = 12;   // intervalo de aparición (s)
const TRIPLE_SPAWN_MAX  = 18;
const TRIPLE_SPREAD     = 0.14; // ±8° para tres disparos en línea recta

class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = POWERUP_RADIUS;
    this.ttl = POWERUP_TTL;
    this.dead = false;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo en los últimos 2 segundos
    if (this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0) return;

    const pulse = 1 + Math.sin(performance.now() / 180) * 0.1;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);

    // Círculo
    ctx.strokeStyle = '#4df';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Rayo
    ctx.fillStyle = '#4df';
    ctx.beginPath();
    ctx.moveTo( 2, -8);
    ctx.lineTo(-4,  1);
    ctx.lineTo( 0,  1);
    ctx.lineTo(-2,  8);
    ctx.lineTo( 5, -1);
    ctx.lineTo( 1, -1);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

class ShieldPowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = SHIELD_POWERUP_RADIUS;
    this.ttl = SHIELD_POWERUP_TTL;
    this.dead = false;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo en los últimos 2 segundos
    if (this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0) return;

    const pulse = 1 + Math.sin(performance.now() / 180) * 0.1;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);

    // Círculo
    ctx.strokeStyle = '#4df';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Símbolo de escudo (arcos)
    ctx.strokeStyle = '#4df';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, -2, this.radius * 0.4, 0, Math.PI);
    ctx.arc(0, -2, this.radius * 0.6, Math.PI, 0);
    ctx.stroke();

    ctx.restore();
  }
}

// ── Power-up Triple Shot ─────────────────────────────────────────────────────
class TripleShot {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = TRIPLE_RADIUS;
    this.ttl = TRIPLE_TTL;
    this.dead = false;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo en los últimos 2 segundos
    if (this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0) return;

    const pulse = 1 + Math.sin(performance.now() / 180) * 0.1;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);

    // Círculo
    ctx.strokeStyle = '#f93';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Tres balas alineadas
    ctx.fillStyle = '#f93';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(i * 5, -2, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Pequeñas líneas hacia delante
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 5 + 2, -2);
      ctx.lineTo(i * 5 + 5, -2);
      ctx.strokeStyle = '#f93';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps, shieldPowers, tripleShots, shootingStars;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let powerupTimer;
let shieldPowerTimer;
let starTimer;
let tripleShotTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnPowerUp() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
  powerUps.push(new PowerUp(x, y));
}

function spawnShieldPowerUp() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
  shieldPowers.push(new ShieldPowerUp(x, y));
}

function spawnShootingStar() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
  shootingStars.push(new ShootingStar(x, y));
}

function spawnTripleShot() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
  tripleShots.push(new TripleShot(x, y));
}

function initGame() {
  ship          = new Ship();
  bullets       = [];
  asteroids     = [];
  particles     = [];
  powerUps      = [];
  shieldPowers  = [];
  shootingStars = [];
  tripleShots   = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  powerupTimer    = rand(POWERUP_SPAWN_MIN, POWERUP_SPAWN_MAX);
  shieldPowerTimer = rand(SHIELD_POWERUP_SPAWN_MIN, SHIELD_POWERUP_SPAWN_MAX);
  starTimer       = rand(STAR_SPAWN_MIN, STAR_SPAWN_MAX);
  tripleShotTimer = rand(TRIPLE_SPAWN_MIN, TRIPLE_SPAWN_MAX);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps     = [];
  shieldPowers = [];
  shootingStars = [];
  tripleShots  = [];
  shieldPowerTimer = rand(SHIELD_POWERUP_SPAWN_MIN, SHIELD_POWERUP_SPAWN_MAX);
  starTimer        = rand(STAR_SPAWN_MIN, STAR_SPAWN_MAX);
  tripleShotTimer  = rand(TRIPLE_SPAWN_MIN, TRIPLE_SPAWN_MAX);
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

// Aplica el multiplicador de puntos de la skin activa (MORADA = x2)
function addScore(base) {
  score += base * skinMult();
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.shieldHits = 0;
  ship.shieldTimer = 0;
  ship.speedTimer = 0;
  ship.tripleShotTimer = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Cambio de skin: funciona en cualquier estado (playing, dead, gameover)
  if (pressed('KeyC')) {
    currentSkin = (currentSkin + 1) % SKINS.length;
    skinNameTimer = 1.5;
    saveSkin();
  }
  if (skinNameTimer > 0) skinNameTimer = Math.max(0, skinNameTimer - dt);

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    shootingStars.forEach(s => s.update(dt));
    shootingStars = shootingStars.filter(s => !s.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Aparición periódica del power-up (máx. 1 en pantalla)
  powerupTimer -= dt;
  if (powerupTimer <= 0) {
    if (powerUps.length === 0) spawnPowerUp();
    powerupTimer = rand(POWERUP_SPAWN_MIN, POWERUP_SPAWN_MAX);
  }

  // Aparición periódica del power-up de escudo (máx. 1 en pantalla)
  shieldPowerTimer -= dt;
  if (shieldPowerTimer <= 0) {
    if (shieldPowers.length === 0) spawnShieldPowerUp();
    shieldPowerTimer = rand(SHIELD_POWERUP_SPAWN_MIN, SHIELD_POWERUP_SPAWN_MAX);
  }

  // Aparición periódica de la estrella fugaz (máx. 1 en pantalla)
  starTimer -= dt;
  if (starTimer <= 0) {
    if (shootingStars.length === 0) spawnShootingStar();
    starTimer = rand(STAR_SPAWN_MIN, STAR_SPAWN_MAX);
  }

  // Aparición periódica del triple shot (máx. 1 en pantalla)
  tripleShotTimer -= dt;
  if (tripleShotTimer <= 0) {
    if (tripleShots.length === 0) spawnTripleShot();
    tripleShotTimer = rand(TRIPLE_SPAWN_MIN, TRIPLE_SPAWN_MAX);
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));
  shieldPowers.forEach(p => p.update(dt));
  shootingStars.forEach(s => s.update(dt));
  tripleShots.forEach(t => t.update(dt));

  bullets       = bullets.filter(b => !b.dead);
  particles     = particles.filter(p => !p.dead);
  powerUps      = powerUps.filter(p => !p.dead);
  shieldPowers  = shieldPowers.filter(p => !p.dead);
  shootingStars = shootingStars.filter(s => !s.dead);
  tripleShots   = tripleShots.filter(t => !t.dead);

  // Nave vs power-up: acumula +5s de efecto
  for (const p of powerUps) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      ship.speedTimer += POWERUP_DURATION;
      explode(p.x, p.y, 6);
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Nave vs power-up de escudo
  for (const p of shieldPowers) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      ship.shieldHits = SHIELD_HITS_MAX;
      ship.shieldTimer = SHIELD_DURATION;
      explode(p.x, p.y, 6);
    }
  }
  shieldPowers = shieldPowers.filter(p => !p.dead);

  // Nave vs triple shot: acumula +5s de efecto
  for (const t of tripleShots) {
    if (!t.dead && dist(ship, t) < ship.radius + t.radius) {
      t.dead = true;
      ship.tripleShotTimer += TRIPLE_DURATION;
      explode(t.x, t.y, 6);
    }
  }
  tripleShots = tripleShots.filter(t => !t.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        addScore(POINTS[a.size]);
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs estrella fugaz: da puntos y desaparece sin partirse
  for (const b of bullets) {
    for (const s of shootingStars) {
      if (!s.dead && !b.dead && dist(b, s) < s.radius) {
        b.dead = true;
        s.dead = true;
        addScore(STAR_POINTS);
        explode(s.x, s.y, 10);
      }
    }
  }
  shootingStars = shootingStars.filter(s => !s.dead);
  bullets       = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    const newAsteroidsFromShield = [];
    for (const a of asteroids) {
      if (!a.dead && dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shieldHits > 0) {
          ship.shieldHits--;
          if (ship.shieldHits <= 0) {
            ship.shieldTimer = 0;
          }
          a.dead = true;
          addScore(POINTS[a.size]);
          explode(a.x, a.y, a.size * 5);
          newAsteroidsFromShield.push(...a.split());
          break;
        } else {
          killShip();
          break;
        }
      }
    }
    if (newAsteroidsFromShield.length > 0) {
      asteroids = asteroids.filter(a => !a.dead).concat(newAsteroidsFromShield);
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = SKINS[currentSkin];
  const S = 0.45;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(S, S);
  ctx.strokeStyle = skin.stroke;
  ctx.lineWidth   = 1.2 / S;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
  for (let i = 1; i < skin.verts.length; i++)
    ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Indicadores de power-up apilados para que nunca se solapen
  let hudY = 48;
  const HUD_STEP = 20;

  if (ship.speedTimer > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4df';
    ctx.fillText(`VEL x2  ${ship.speedTimer.toFixed(1)}s`, 14, hudY);
    hudY += HUD_STEP;
  }

  if (ship.tripleShotTimer > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f93';
    ctx.fillText(`TRIPLE  ${ship.tripleShotTimer.toFixed(1)}s`, 14, hudY);
    hudY += HUD_STEP;
  }

  if (ship.shieldHits > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4df';
    ctx.fillText(`ESCUDO ${ship.shieldHits}/${SHIELD_HITS_MAX}  ${ship.shieldTimer.toFixed(1)}s`, 14, hudY);
    hudY += HUD_STEP;
  }

  // Aviso de bonus de puntos de la skin activa (MORADA x2)
  if (skinMult() > 1) {
    ctx.textAlign = 'left';
    ctx.fillStyle = SKINS[currentSkin].stroke;
    ctx.fillText(`PUNTOS x${skinMult()}`, 14, hudY);
    hudY += HUD_STEP;
  }

  // Aviso temporal al cambiar de skin
  if (skinNameTimer > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = SKINS[currentSkin].stroke;
    ctx.fillText(`CAMBIO DE SKIN: ${SKINS[currentSkin].name} (C)`, W / 2, 48);
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  shootingStars.forEach(s => s.draw());
  powerUps.forEach(p => p.draw());
  shieldPowers.forEach(p => p.draw());
  tripleShots.forEach(t => t.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
