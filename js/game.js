// The side-scrolling game: physics, camera, rendering and station logic.
// The UI (ui.js) owns the question modal; the game tells it when a station opens via hooks.
window.BQ = window.BQ || {};

BQ.Game = class Game {
  constructor(canvas, player, levelId, hooks) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.player = player;
    this.hooks = hooks;
    this.level = BQ.Levels[levelId];
    this.state = BQ.Storage.levelState(player, levelId);
    this.world = this.level.build();

    this.maxHearts = 5;
    this.hearts = this.maxHearts;
    this.time = 0;
    this.timers = [];
    this.particles = [];
    this.entities = this.level.entities.map(e => Object.assign({ swell: 0, flash: 0 }, e));
    this.stations = this.level.stations.map(s => Object.assign({ solved: this.state.stationsDone.includes(s.id), progress: 0 }, s));
    this.stations.filter(s => s.solved).forEach(s => this.level.applySolve(this.world, s, this, true));

    this.resumed = this.state.stationsDone.length > 0;
    this.p = { x: 0, y: 0, w: 0.6, h: 1.75, vx: 0, vy: 0, onGround: false, facing: 1, walk: 0, stepOffset: 0 };
    this.respawn();
    this.cam = { x: 0, y: 0 };
    this.snapCamera = true;

    this.keys = { left: false, right: false, jump: false, use: false };
    this.useQueued = false;
    this.paused = true; // UI unpauses after the intro message
    this.activeStation = null;
    this.autoCooldown = 0;
    this.finished = false;
    this.sprite = document.createElement('canvas');
    this.sprite.width = 40;
    this.sprite.height = 72;

    this.onKey = this.onKey.bind(this);
    this.onResize = this.resize.bind(this);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
    window.addEventListener('resize', this.onResize);
    this.resize();

    this.last = performance.now();
    this.frame = this.frame.bind(this);
    this.raf = requestAnimationFrame(this.frame);
    this.emitHud();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
    window.removeEventListener('resize', this.onResize);
  }

  // ---------- Effects API (used by level scripts) ----------
  after(delay, fn) { this.timers.push({ at: this.time + delay, fn }); }
  sound(name) { BQ.Audio.play(name); }
  burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x, y, color,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 6 - 1,
        life: 0.6 + Math.random() * 0.5,
        size: 0.08 + Math.random() * 0.1,
      });
    }
  }

  // ---------- Input ----------
  onKey(e) {
    const down = e.type === 'keydown';
    const map = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyE: 'use', Enter: 'use',
    };
    if (this.activeStation || this.finished || this.paused) return; // menus and the quiz handle their own keys
    if (down && (e.code === 'Escape' || e.code === 'KeyP')) {
      this.hooks.onPauseRequest();
      return;
    }
    const k = map[e.code];
    if (!k) return;
    e.preventDefault();
    this.setKey(k, down);
  }

  setKey(k, down) {
    if (k === 'use' && down && !this.keys.use) this.useQueued = true;
    this.keys[k] = down;
  }

  clearKeys() {
    for (const k in this.keys) this.keys[k] = false;
    this.useQueued = false;
  }

  setPaused(paused) {
    this.paused = paused;
    this.clearKeys();
    // Drop focus from menu buttons so Space/Enter go to the game, not a hidden button.
    if (!paused && document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  // ---------- World helpers ----------
  fgAt(x, y) {
    const w = this.world;
    if (x < 0 || x >= w.w || y < 0 || y >= w.h) return 0;
    return w.fg[y * w.w + x];
  }
  bgAt(x, y) {
    const w = this.world;
    if (x < 0 || x >= w.w || y < 0 || y >= w.h) return 0;
    return w.bg[y * w.w + x];
  }
  solid(x, y) {
    if (x < 0 || x >= this.world.w) return true;
    if (y < 0 || y >= this.world.h) return false;
    return BQ.SOLID.has(this.fgAt(x, y));
  }
  boxFree(x, y, w, h) {
    const x0 = Math.floor(x + 0.001), x1 = Math.floor(x + w - 0.001);
    const y0 = Math.floor(y + 0.001), y1 = Math.floor(y + h - 0.001);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) if (this.solid(tx, ty)) return false;
    return true;
  }

  checkpointX() {
    const done = this.stations.filter(s => s.solved);
    return done.length ? done[done.length - 1].respawnX : this.level.spawnX;
  }

  respawn() {
    const p = this.p;
    const x = this.checkpointX();
    p.x = x + 0.2;
    const surf = this.world.surf[x] ?? 17;
    p.y = surf - p.h - 0.01;
    p.vx = p.vy = 0;
    this.snapCamera = true;
  }

  // ---------- Main loop ----------
  frame(now) {
    const dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.frame);
  }

  update(dt) {
    this.time += dt;
    this.timers = this.timers.filter(t => (t.at <= this.time ? (t.fn(), false) : true));
    this.updateParticles(dt);
    this.entities.forEach(e => {
      e.flash = Math.max(0, e.flash - dt * 3);
      const target = this.activeStation && this.activeStation.id === e.stationId && e.type === 'creeper' ? 0.5 + 0.5 * Math.sin(this.time * 6) : 0;
      e.swell += (target - e.swell) * Math.min(1, dt * 8);
    });
    if (!this.paused && !this.finished) this.updatePlayer(dt);
    this.updateCamera(dt);
  }

  updatePlayer(dt) {
    const p = this.p, k = this.keys;
    const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    p.vx = dir * 5.2;
    if (dir) p.facing = dir;
    if (k.jump && p.onGround) {
      p.vy = -9.6;
      p.onGround = false;
      this.sound('jump');
    }
    p.vy = Math.min(p.vy + 30 * dt, 20);

    // Sub-step so fast movement never tunnels through blocks.
    const steps = Math.ceil(Math.max(Math.abs(p.vx), Math.abs(p.vy)) * dt / 0.3) || 1;
    for (let i = 0; i < steps; i++) {
      this.moveX(p.vx * dt / steps);
      this.moveY(p.vy * dt / steps);
    }

    // Stations that block the way (like the creeper) until solved.
    for (const s of this.stations)
      if (!s.solved && s.barrierX && p.x + p.w > s.barrierX) p.x = s.barrierX - p.w;

    p.walk += dir ? dt * 12 : 0;
    p.stepOffset = Math.max(0, p.stepOffset - dt * 8);

    if (p.y > this.world.h + 2) {
      this.hooks.onToast('Whoa! You fell into the ravine. Back to the checkpoint!');
      this.sound('hurt');
      this.respawn();
    } else if (this.touchingHazard()) {
      this.hooks.onToast('Ouch, lava! Back to the checkpoint.');
      this.sound('lava');
      this.burst(p.x + p.w / 2, p.y + p.h, '#ff8a1f', 20);
      this.respawn();
    }

    // Stations
    this.autoCooldown = Math.max(0, this.autoCooldown - dt);
    const near = this.nearbyStation();
    if (near && near.trigger === 'auto' && this.autoCooldown === 0) this.openStation(near);
    else if (near && this.useQueued) this.openStation(near);
    this.useQueued = false;

    // Level exit
    const portal = this.level.portal;
    const lit = this.stations.find(s => s.id === 'portal').solved;
    if (lit && p.x + p.w > portal.left + 1 && p.x < portal.right && p.y + p.h > portal.top + 1) this.finish();
  }

  touchingHazard() {
    const p = this.p;
    for (let ty = Math.floor(p.y); ty <= Math.floor(p.y + p.h - 0.001); ty++)
      for (let tx = Math.floor(p.x); tx <= Math.floor(p.x + p.w - 0.001); tx++)
        if (BQ.HAZARD.has(this.fgAt(tx, ty))) return true;
    return false;
  }

  moveX(dx) {
    if (!dx) return;
    const p = this.p;
    p.x += dx;
    const y0 = Math.floor(p.y + 0.001), y1 = Math.floor(p.y + p.h - 0.001);
    const tx = dx > 0 ? Math.floor(p.x + p.w) : Math.floor(p.x);
    const hits = [];
    for (let ty = y0; ty <= y1; ty++) if (this.solid(tx, ty)) hits.push(ty);
    if (!hits.length) return;
    // Auto-step up single blocks so kids don't have to jump every little bump.
    const feetRow = y1;
    if (p.onGround && hits.length === 1 && hits[0] === feetRow && this.boxFree(p.x, feetRow - p.h, p.w, p.h)) {
      p.stepOffset = p.y - (feetRow - p.h);
      p.y = feetRow - p.h;
      return;
    }
    p.x = dx > 0 ? tx - p.w : tx + 1;
  }

  moveY(dy) {
    const p = this.p;
    p.onGround = false;
    p.y += dy;
    const x0 = Math.floor(p.x + 0.001), x1 = Math.floor(p.x + p.w - 0.001);
    if (dy > 0) {
      const ty = Math.floor(p.y + p.h);
      for (let tx = x0; tx <= x1; tx++)
        if (this.solid(tx, ty)) { p.y = ty - p.h; p.vy = 0; p.onGround = true; return; }
    } else if (dy < 0) {
      const ty = Math.floor(p.y);
      for (let tx = x0; tx <= x1; tx++)
        if (this.solid(tx, ty)) { p.y = ty + 1; p.vy = 0; return; }
    }
  }

  updateParticles(dt) {
    this.particles = this.particles.filter(pt => {
      pt.life -= dt;
      pt.vy += 18 * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      return pt.life > 0;
    });
  }

  // ---------- Stations ----------
  nearbyStation() {
    const cx = this.p.x + this.p.w / 2;
    for (const s of this.stations) {
      if (s.solved) continue;
      const d = Math.abs(cx - (s.x + 0.5));
      if (s.trigger === 'auto' ? d < 4.5 : d < 1.8) return s;
    }
    return null;
  }

  openStation(s) {
    this.activeStation = s;
    this.setPaused(true);
    if (s.kind === 'villager') this.sound('villager');
    if (s.kind === 'zombies') this.sound('zombie');
    if (s.kind === 'skeleton') this.sound('skeleton');
    if (s.kind === 'creeper') this.sound('hiss');
    this.hooks.onStation(s);
  }

  closeStation() {
    const s = this.activeStation;
    this.activeStation = null;
    if (s && s.trigger === 'auto' && !s.solved) {
      // Back away from the creeper so it doesn't re-trigger immediately.
      this.p.x = Math.max(0, s.x - 6);
      this.autoCooldown = 1.5;
    }
    this.setPaused(false);
  }

  // Extra data a station's questions depend on (e.g. the ore wall's real block counts).
  stationContext(s) {
    return s.context ? s.context(this.world) : null;
  }

  // Called by the UI after each answer. Returns true if the player fainted.
  recordAnswer(correct) {
    const pl = this.player;
    if (correct) {
      pl.stats.correct++;
      pl.emeralds += 1;
      pl.xp += 10;
      this.sound('correct');
    } else {
      pl.stats.wrong++;
      this.state.mistakes++;
      this.hearts--;
      this.sound('wrong');
      this.entities.filter(e => this.activeStation && e.stationId === this.activeStation.id).forEach(e => (e.flash = 1));
    }
    BQ.Storage.savePlayer(pl);
    this.emitHud();
    return this.hearts <= 0;
  }

  completeStation(s) {
    s.solved = true;
    if (!this.state.stationsDone.includes(s.id)) this.state.stationsDone.push(s.id);
    this.player.emeralds += 3;
    const pageId = s.page && `${this.level.id}/${s.id}`;
    const newPage = pageId && !this.player.recipes.includes(pageId);
    if (newPage) this.player.recipes.push(pageId);
    BQ.Storage.savePlayer(this.player);
    this.activeStation = null;
    this.setPaused(false);
    this.level.applySolve(this.world, s, this, false);
    this.hooks.onToast(s.solvedText + ' +3 bonus emeralds' + (newPage ? ` New Recipe Book page: "${s.page.title}"!` : ''));
    this.emitHud();
  }

  faint() {
    this.activeStation = null;
    this.stations.forEach(s => (s.progress = 0));
    this.hearts = this.maxHearts;
    this.sound('hurt');
    this.respawn();
    this.autoCooldown = 1.5;
    this.setPaused(false);
    this.emitHud();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.clearKeys();
    this.sound('levelup');
    const mistakes = this.state.mistakes;
    const stars = mistakes <= 2 ? 3 : mistakes <= 6 ? 2 : 1;
    const bonus = stars * 5;
    const st = this.state;
    st.completed = true;
    st.bestStars = Math.max(st.bestStars, stars);
    st.plays++;
    st.stationsDone = [];
    st.mistakes = 0;
    this.player.emeralds += bonus;
    this.player.xp += 50;
    BQ.Storage.savePlayer(this.player);
    this.emitHud();
    this.hooks.onComplete({ stars, mistakes, bonus });
  }

  emitHud() {
    this.hooks.onHud({
      hearts: this.hearts,
      maxHearts: this.maxHearts,
      emeralds: this.player.emeralds,
      stations: this.stations.map(s => ({ icon: s.icon, done: s.solved, title: s.title })),
    });
  }

  // ---------- Camera & rendering ----------
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ts = Math.max(16, Math.floor(Math.min(this.canvas.height / 15, this.canvas.width / 22)));
    this.snapCamera = true;
  }

  updateCamera(dt) {
    const viewW = this.canvas.width / this.ts, viewH = this.canvas.height / this.ts;
    const p = this.p;
    let tx = p.x + p.w / 2 - viewW / 2;
    let ty = p.y + p.h / 2 - viewH * 0.55;
    tx = viewW >= this.world.w ? (this.world.w - viewW) / 2 : Math.max(0, Math.min(this.world.w - viewW, tx));
    ty = Math.max(-2, Math.min(this.world.h - viewH, ty));
    if (this.snapCamera) {
      this.cam.x = tx;
      this.cam.y = ty;
      this.snapCamera = false;
    } else {
      const k = Math.min(1, dt * 6);
      this.cam.x += (tx - this.cam.x) * k;
      this.cam.y += (ty - this.cam.y) * k;
    }
  }

  render() {
    const g = this.g, ts = this.ts, cw = this.canvas.width, ch = this.canvas.height;
    g.imageSmoothingEnabled = false;
    const camX = Math.round(this.cam.x * ts), camY = Math.round(this.cam.y * ts);
    const sx = x => Math.round(x * ts) - camX;
    const sy = y => Math.round(y * ts) - camY;

    this.drawSky(g, cw, ch);

    const x0 = Math.max(0, Math.floor(this.cam.x)), x1 = Math.min(this.world.w - 1, Math.ceil(this.cam.x + cw / ts));
    const y0 = Math.max(0, Math.floor(this.cam.y)), y1 = Math.min(this.world.h - 1, Math.ceil(this.cam.y + ch / ts));
    const T = BQ.T;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = sx(x), py = sy(y), size = sx(x + 1) - px, sizeY = sy(y + 1) - py;
        const b = this.bgAt(x, y), f = this.fgAt(x, y);
        if (b && (!f || !BQ.SOLID.has(f) || f === T.IRON_BARS)) {
          if (b === T.PORTAL) {
            g.drawImage(BQ.Art.portalFrame(this.time), px, py, size, sizeY);
          } else {
            g.drawImage(BQ.Art.tile(b), px, py, size, sizeY);
            if (BQ.BG_DARK.has(b)) {
              g.fillStyle = 'rgba(0,0,0,0.5)';
              g.fillRect(px, py, size, sizeY);
            }
          }
        }
        if (f) g.drawImage(BQ.Art.tile(f), px, py, size, sizeY);
      }
    }

    // Torch and lava glow.
    g.globalCompositeOperation = 'lighter';
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (this.fgAt(x, y) === T.TORCH || this.fgAt(x, y) === T.LAVA) {
          const cx = sx(x + 0.5), cy = sy(y + 0.3), r = ts * (this.fgAt(x, y) === T.LAVA ? 1.6 : 2.5);
          const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
          grad.addColorStop(0, 'rgba(255,170,60,0.35)');
          grad.addColorStop(1, 'rgba(255,170,60,0)');
          g.fillStyle = grad;
          g.fillRect(cx - r, cy - r, r * 2, r * 2);
        }
    g.globalCompositeOperation = 'source-over';

    // Entities
    for (const e of this.entities) {
      const ex = sx(e.x + 0.5), ey = sy(e.feetY);
      const t = this.time + e.x; // offset so a group of mobs doesn't move in lockstep
      const flash = e.flash > 0.5;
      if (e.type === 'villager') this.blit(ex, ey, (c, s) => BQ.Art.drawVillager(c, 4, 4, s, this.time, e.style));
      if (e.type === 'creeper') this.blit(ex, ey, (c, s) => BQ.Art.drawCreeper(c, 4, 4, s, { swell: e.swell, flash: flash || (e.swell > 0.8 && Math.sin(this.time * 20) > 0) }));
      if (e.type === 'zombie') this.blit(ex, ey, (c, s) => BQ.Art.drawZombie(c, 4, 4, s, t), flash);
      if (e.type === 'skeleton') this.blit(ex, ey, (c, s) => BQ.Art.drawSkeleton(c, 4, 4, s, t), flash);
    }

    // Player
    const p = this.p;
    this.blit(sx(p.x + p.w / 2), sy(p.y + p.h + p.stepOffset), (c, s) =>
      BQ.Art.drawPlayer(c, 4, 4, s, this.player.look, { facing: p.facing, walk: p.walk, moving: p.vx !== 0 && p.onGround }));

    // Particles
    for (const pt of this.particles) {
      g.globalAlpha = Math.min(1, pt.life * 2);
      g.fillStyle = pt.color;
      const s = Math.max(2, pt.size * ts);
      g.fillRect(sx(pt.x) - s / 2, sy(pt.y) - s / 2, s, s);
    }
    g.globalAlpha = 1;

    this.drawStationMarkers(g, sx, sy);
  }

  // Draw a 16x32 art-pixel character into a small offscreen canvas, then scale it up crisply.
  // (cx, feetY) is the bottom-center of the character on screen.
  // `flash` tints the sprite white (a mob reacting to a wrong answer).
  blit(cx, feetY, draw, flash = false) {
    const c = this.sprite.getContext('2d');
    c.clearRect(0, 0, this.sprite.width, this.sprite.height);
    draw(c, 2);
    if (flash) {
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.fillRect(0, 0, this.sprite.width, this.sprite.height);
      c.globalCompositeOperation = 'source-over';
    }
    const k = this.ts / 18; // screen px per art px
    const w = (this.sprite.width / 2) * k, h = (this.sprite.height / 2) * k;
    this.g.drawImage(this.sprite, Math.round(cx - (8 + 2) * k), Math.round(feetY - (32 + 2) * k), Math.round(w), Math.round(h));
  }

  drawSky(g, cw, ch) {
    const grad = g.createLinearGradient(0, 0, 0, ch);
    grad.addColorStop(0, '#6b9bf5');
    grad.addColorStop(1, '#bcd4ff');
    g.fillStyle = grad;
    g.fillRect(0, 0, cw, ch);
    const ts = this.ts;
    // Sun
    g.fillStyle = '#fff6b0';
    g.fillRect(cw * 0.8 - this.cam.x * ts * 0.02, ts * 1.5, ts * 1.6, ts * 1.6);
    // Clouds (slow parallax)
    g.fillStyle = 'rgba(255,255,255,0.9)';
    const span = cw + ts * 12;
    for (let i = 0; i < 7; i++) {
      const base = i * 23 * ts + this.time * ts * 0.25 - this.cam.x * ts * 0.2;
      const x = ((base % span) + span) % span - ts * 6;
      const y = ts * (1 + (i * 37) % 5) - this.cam.y * ts * 0.2;
      g.fillRect(x, y, ts * (3 + (i % 3)), ts * 0.8);
      g.fillRect(x + ts, y - ts * 0.5, ts * 2, ts * 0.6);
    }
    // Distant blocky hills
    g.fillStyle = '#8fb5e8';
    const hillBase = (14 - this.cam.y) * ts * 0.9 + ch * 0.05;
    for (let i = -1; i < cw / ts + 2; i++) {
      const wx = i + Math.floor(this.cam.x * 0.4);
      const h = 3 + Math.round(2 * Math.sin(wx * 0.35) + Math.sin(wx * 0.9));
      const x = i * ts - ((this.cam.x * 0.4) % 1) * ts;
      g.fillRect(Math.floor(x), Math.floor(hillBase - h * ts), ts + 1, h * ts + ch);
    }
  }

  drawStationMarkers(g, sx, sy) {
    const ts = this.ts;
    const near = this.paused ? null : this.nearbyStation();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const s of this.stations) {
      if (s.solved || s.trigger === 'auto') continue;
      const cx = sx(s.x + 0.5);
      const top = sy(s.feetY - 2.6) + Math.sin(this.time * 4) * ts * 0.12;
      if (near === s) {
        const text = `E  ${s.action}`;
        g.font = `bold ${Math.round(ts * 0.45)}px "Courier New", monospace`;
        const w = g.measureText(text).width + ts * 0.6, h = ts * 0.75;
        g.fillStyle = 'rgba(0,0,0,0.75)';
        g.fillRect(cx - w / 2, top - h / 2, w, h);
        g.strokeStyle = '#fff';
        g.lineWidth = 2;
        g.strokeRect(cx - w / 2, top - h / 2, w, h);
        g.fillStyle = '#fff';
        g.fillText(text, cx, top + 1);
      } else {
        g.font = `bold ${Math.round(ts * 0.9)}px "Courier New", monospace`;
        g.fillStyle = '#3f3000';
        g.fillText('!', cx + 3, top + 3);
        g.fillStyle = '#ffdd55';
        g.fillText('!', cx, top);
      }
    }
  }
};
