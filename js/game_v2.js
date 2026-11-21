// Mamma in Therapy - Runner v2
// Gioco a scorrimento: la mamma corre, salta e lancia imprecazioni censurate contro gli ostacoli.
// Uso: MammaRunner(canvasElement, { mum: 'images/mum.png', baby: 'images/monster.png', baby2: 'images/monster2.png', poop: 'images/poop3.png' })
(function (global) {
  'use strict';

  function MammaRunner(canvas, assetPaths) {
    var ctx = canvas.getContext('2d');

    // Risoluzione logica fissa: il canvas viene scalato sulla larghezza del contenitore
    var W = 800, H = 320, GROUND = 270;
    var GRAVITY = 2200, JUMP_V = -820;
    var FONT = "'Indie Flower', cursive";

    // Imprecazioni censurate
    var CURSES = [
      'Mannaggia a #@%!', 'P*****a miseria!', 'Ma che c***o!', 'Porc@#&!!',
      'Santa p*******a!', 'Ma vaff@#%!', 'Cristof@#o!', 'Ma porca p***!',
      'Cribbio $%#!', 'Accid€nti!!'
    ];
    var STRIKES = ['SCIOPERO', 'SCIOPERO SCUOLE', 'SCIOPERO MEZZI', 'ASILO CHIUSO'];

    // --- Caricamento immagini ---
    var img = {}, toLoad = 0;
    Object.keys(assetPaths).forEach(function (k) {
      toLoad++;
      var i = new Image();
      i.onload = function () { toLoad--; };
      i.onerror = function () { toLoad--; };
      i.src = assetPaths[k];
      img[k] = i;
    });

    // --- Stato del gioco ---
    var state = 'ready'; // ready | play | over
    var mum, obstacles, shouts, particles, popups, speed, distance, score, spawnTimer, shoutCooldown, t;
    var best = 0;
    try { best = parseInt(localStorage.getItem('mit_runner_best') || '0', 10) || 0; } catch (e) {}

    function reset() {
      mum = { x: 90, y: GROUND, vy: 0, w: 50, h: 52, onGround: true, shoutAnim: 0 };
      obstacles = []; shouts = []; particles = []; popups = [];
      speed = 320; distance = 0; score = 0; spawnTimer = 1.2; shoutCooldown = 0; t = 0;
    }
    reset();

    // --- Comandi ---
    function jump() {
      if (state !== 'play') return start();
      if (mum.onGround) { mum.vy = JUMP_V; mum.onGround = false; }
    }
    function shout() {
      if (state !== 'play') return start();
      if (shoutCooldown > 0) return;
      shoutCooldown = 0.55;
      mum.shoutAnim = 0.3;
      var txt = CURSES[(Math.random() * CURSES.length) | 0];
      ctx.font = 'bold 20px ' + FONT;
      shouts.push({ x: mum.x + mum.w, y: mum.y - mum.h * 0.75, txt: txt, w: ctx.measureText(txt).width, life: 1.6 });
    }
    function start() {
      if (state === 'over' && performance.now() - overAt < 600) return; // evita restart accidentale
      reset(); state = 'play';
      track('start');
    }

    var overAt = 0;
    function gameOver() {
      state = 'over'; overAt = performance.now();
      if (score > best) { best = score; try { localStorage.setItem('mit_runner_best', String(best)); } catch (e) {} }
      track('gameOver', String(score));
    }

    // Integrazione con Google Analytics del sito, se presente
    function track(action, label) {
      if (typeof global.gaSendEvent === 'function') { try { global.gaSendEvent('game', action, label || ''); } catch (e) {} }
    }

    // Tastiera: Spazio/Su = salto, X/Invio/Destra = imprecazione
    global.addEventListener('keydown', function (e) {
      if (!isVisible()) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); jump(); }
      else if (e.code === 'KeyX' || e.code === 'Enter' || e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); shout(); }
    });
    // Touch/mouse: metà sinistra = salto, metà destra = imprecazione
    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var r = canvas.getBoundingClientRect();
      if (e.clientX - r.left < r.width / 2) jump(); else shout();
    });
    canvas.style.touchAction = 'manipulation';

    function isVisible() {
      var r = canvas.getBoundingClientRect();
      return r.bottom > 0 && r.top < (global.innerHeight || 0);
    }

    // --- Ostacoli ---
    // Ogni ostacolo: x, y (base), w, h, tipo. Le hitbox sono leggermente ridotte per un gioco più indulgente.
    function spawn() {
      var r = Math.random(), o;
      if (r < 0.4) {
        o = { type: 'baby', w: 40, h: 40, variant: Math.random() < 0.5 ? 'baby' : 'baby2', pts: 10 };
      } else if (r < 0.75) {
        o = { type: 'diaper', w: 44, h: 34, pts: 10 };
      } else {
        var label = STRIKES[(Math.random() * STRIKES.length) | 0];
        ctx.font = 'bold 15px ' + FONT;
        o = { type: 'strike', w: Math.max(70, ctx.measureText(label).width + 16), h: 78, label: label, pts: 20 };
      }
      o.x = W + 20; o.y = GROUND; o.passed = false; o.phase = Math.random() * 6;
      obstacles.push(o);
    }

    function boxOf(o) {
      return { x: o.x + 4, y: o.y - o.h + 4, w: o.w - 8, h: o.h - 6 };
    }
    function mumBox() {
      return { x: mum.x + 10, y: mum.y - mum.h + 8, w: mum.w - 20, h: mum.h - 10 };
    }
    function hit(a, b) {
      return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    }

    function burst(x, y, color) {
      for (var i = 0; i < 14; i++) {
        particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 380, vy: -Math.random() * 380, life: 0.6, c: color });
      }
    }

    // --- Aggiornamento ---
    function update(dt) {
      t += dt;
      if (state !== 'play') return;

      speed = Math.min(700, 320 + distance / 40);
      distance += speed * dt;
      shoutCooldown = Math.max(0, shoutCooldown - dt);
      mum.shoutAnim = Math.max(0, mum.shoutAnim - dt);

      // Fisica della mamma
      mum.vy += GRAVITY * dt;
      mum.y += mum.vy * dt;
      if (mum.y >= GROUND) { mum.y = GROUND; mum.vy = 0; mum.onGround = true; }

      // Generazione ostacoli: intervallo che si accorcia con la velocità
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawn();
        var minGap = 0.75 * (320 / speed) + 0.35;
        spawnTimer = minGap + Math.random() * 1.1;
      }

      // Imprecazioni in volo
      for (var i = shouts.length - 1; i >= 0; i--) {
        var s = shouts[i];
        s.x += (speed + 380) * dt;
        s.life -= dt;
        var sb = { x: s.x, y: s.y - 14, w: s.w, h: 22 };
        var used = false;
        for (var j = obstacles.length - 1; j >= 0; j--) {
          var o = obstacles[j];
          if (hit(sb, boxOf(o))) {
            score += o.pts;
            burst(o.x + o.w / 2, o.y - o.h / 2, o.type === 'diaper' ? '#8b5a2b' : o.type === 'strike' ? '#c0392b' : '#4aa3df');
            popups.push({ x: o.x + o.w / 2, y: o.y - o.h - 8, txt: '+' + o.pts, life: 0.8 });
            obstacles.splice(j, 1);
            used = true;
            break;
          }
        }
        if (used || s.life <= 0 || s.x > W) shouts.splice(i, 1);
      }

      // Ostacoli
      var mb = mumBox();
      for (var k = obstacles.length - 1; k >= 0; k--) {
        var ob = obstacles[k];
        ob.x -= speed * dt;
        if (!ob.passed && ob.x + ob.w < mum.x) { ob.passed = true; score += 2; }
        if (ob.x + ob.w < -10) { obstacles.splice(k, 1); continue; }
        if (hit(mb, boxOf(ob))) { gameOver(); }
      }

      // Particelle e punteggi volanti
      particles.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 1200 * dt; p.life -= dt; });
      particles = particles.filter(function (p) { return p.life > 0; });
      popups.forEach(function (p) { p.y -= 40 * dt; p.life -= dt; });
      popups = popups.filter(function (p) { return p.life > 0; });
    }

    // --- Disegno ---
    function drawImg(i, x, y, w, h) {
      if (i && i.complete && i.naturalWidth) ctx.drawImage(i, x, y, w, h);
    }

    function drawGround() {
      // Linea del terreno "a matita" che scorre
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, GROUND + 1); ctx.lineTo(W, GROUND + 1); ctx.stroke();
      ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1.5;
      var off = distance % 60;
      for (var x = -off; x < W; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, GROUND + 10); ctx.lineTo(x + 14, GROUND + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 32, GROUND + 20); ctx.lineTo(x + 40, GROUND + 20); ctx.stroke();
      }
    }

    function drawMum() {
      // Sprite originale mum.png, invariato; leggero rimbalzo in corsa
      var bob = (state === 'play' && mum.onGround) ? Math.abs(Math.sin(t * 14)) * 3 : 0;
      var x = mum.x, y = mum.y - mum.h - bob;
      if (mum.shoutAnim > 0) { // tremolio mentre impreca
        x += (Math.random() - 0.5) * 3; y += (Math.random() - 0.5) * 3;
      }
      drawImg(img.mum, x, y, mum.w, mum.h);
      // Ombra
      var sh = Math.max(0.3, 1 - (GROUND - mum.y) / 200);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.ellipse(mum.x + mum.w / 2, GROUND + 3, 18 * sh, 3, 0, 0, Math.PI * 2); ctx.fill();
    }

    function drawBaby(o) {
      var shake = Math.sin(t * 30 + o.phase) * 1.5;
      drawImg(img[o.variant], o.x + shake, o.y - o.h, o.w, o.h);
      // Lacrime
      ctx.fillStyle = '#4aa3df';
      for (var i = 0; i < 2; i++) {
        var p = ((t * 2 + o.phase + i * 0.5) % 1);
        ctx.beginPath(); ctx.arc(o.x + 10 - p * 10, o.y - o.h + 14 + p * 14, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(o.x + o.w - 10 + p * 10, o.y - o.h + 14 + p * 14, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#4aa3df'; ctx.font = 'bold 14px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText('UEEEH!', o.x + o.w / 2, o.y - o.h - 6 + Math.sin(t * 12 + o.phase) * 2);
    }

    function drawDiaper(o) {
      var x = o.x, y = o.y - 22, w = o.w;
      // Pannolino
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y);
      ctx.quadraticCurveTo(x + w - 6, y + 22, x + w / 2 + 6, y + 22);
      ctx.lineTo(x + w / 2 - 6, y + 22);
      ctx.quadraticCurveTo(x + 6, y + 22, x, y);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a8d8f0'; ctx.fillRect(x + 3, y + 2, 6, 5); ctx.fillRect(x + w - 9, y + 2, 6, 5);
      // Cacca sopra (sprite poop3)
      drawImg(img.poop, x + w / 2 - 12, y - 18, 25, 23);
      // Linee della puzza
      ctx.strokeStyle = '#7a9a3a'; ctx.lineWidth = 1.5;
      for (var i = 0; i < 3; i++) {
        var sx = x + 10 + i * 12, sy = y - 20, ph = t * 6 + o.phase + i;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(sx + 5 * Math.sin(ph), sy - 6, sx - 5 * Math.sin(ph), sy - 12, sx, sy - 18);
        ctx.stroke();
      }
    }

    function drawStrike(o) {
      var cx = o.x + o.w / 2, top = o.y - o.h;
      var sway = Math.sin(t * 5 + o.phase) * 0.06;
      ctx.save();
      ctx.translate(cx, o.y); ctx.rotate(sway); ctx.translate(-cx, -o.y);
      // Bastone
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx, o.y); ctx.lineTo(cx, top + 30); ctx.stroke();
      // Cartello
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3;
      ctx.fillRect(o.x, top, o.w, 34); ctx.strokeRect(o.x, top, o.w, 34);
      ctx.fillStyle = '#c0392b'; ctx.font = 'bold 15px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText(o.label, cx, top + 23);
      ctx.restore();
    }

    function drawShout(s) {
      ctx.save();
      ctx.font = 'bold 20px ' + FONT; ctx.textAlign = 'left';
      var wob = Math.sin(t * 25) * 1.5;
      ctx.lineWidth = 4; ctx.strokeStyle = '#fff';
      ctx.strokeText(s.txt, s.x, s.y + wob);
      ctx.fillStyle = '#d6336c';
      ctx.fillText(s.txt, s.x, s.y + wob);
      ctx.restore();
    }

    function drawHud() {
      ctx.fillStyle = '#222'; ctx.font = '22px ' + FONT; ctx.textAlign = 'left';
      ctx.fillText('Punti: ' + score, 16, 30);
      ctx.textAlign = 'right';
      ctx.fillText('Record: ' + best, W - 16, 30);
      // Barra del "fiato" per la prossima imprecazione
      if (state === 'play') {
        var f = 1 - shoutCooldown / 0.55;
        ctx.strokeStyle = '#999'; ctx.lineWidth = 1; ctx.strokeRect(16, 40, 80, 6);
        ctx.fillStyle = f >= 1 ? '#d6336c' : '#ccc'; ctx.fillRect(16, 40, 80 * f, 6);
      }
    }

    function drawOverlay(title, lines) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#222'; ctx.textAlign = 'center';
      ctx.font = 'bold 34px ' + FONT; ctx.fillText(title, W / 2, 110);
      ctx.font = '20px ' + FONT;
      lines.forEach(function (l, i) { ctx.fillText(l, W / 2, 150 + i * 28); });
    }

    function render() {
      ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, W, H);

      drawGround();
      obstacles.forEach(function (o) {
        if (o.type === 'baby') drawBaby(o);
        else if (o.type === 'diaper') drawDiaper(o);
        else drawStrike(o);
      });
      drawMum();
      shouts.forEach(drawShout);
      particles.forEach(function (p) {
        ctx.globalAlpha = Math.max(0, p.life / 0.6); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 4, 4);
      });
      ctx.globalAlpha = 1;
      popups.forEach(function (p) {
        ctx.globalAlpha = Math.max(0, p.life / 0.8);
        ctx.fillStyle = '#2b8a3e'; ctx.font = 'bold 18px ' + FONT; ctx.textAlign = 'center';
        ctx.fillText(p.txt, p.x, p.y);
      });
      ctx.globalAlpha = 1;
      drawHud();

      var touch = 'ontouchstart' in global;
      if (state === 'ready') {
        drawOverlay('Mamma in Therapy: la fuga', touch
          ? ['Tocca a sinistra per saltare', 'Tocca a destra per imprecare', 'Tocca per iniziare']
          : ['SPAZIO / ↑ per saltare', 'X / → per imprecare', 'Premi un tasto per iniziare']);
      } else if (state === 'over') {
        drawOverlay('Esaurita!', ['Punti: ' + score + (score >= best && score > 0 ? '  (nuovo record!)' : ''),
          touch ? 'Tocca per riprovare' : 'Premi SPAZIO per riprovare']);
      }
    }

    // --- Ridimensionamento responsive (rispetta il devicePixelRatio) ---
    function resize() {
      var cssW = canvas.parentElement ? canvas.parentElement.clientWidth : W;
      cssW = Math.min(cssW, 900);
      var cssH = cssW * H / W;
      var dpr = global.devicePixelRatio || 1;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    global.addEventListener('resize', resize);
    resize();

    // --- Loop principale ---
    var last = performance.now();
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000); // limita il delta dopo cambio tab
      last = now;
      update(dt);
      render();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  global.MammaRunner = MammaRunner;
})(window);

// Avvio automatico sul canvas #mit-runner, se presente nella pagina
document.addEventListener('DOMContentLoaded', function () {
  var el = document.getElementById('mit-runner');
  if (!el) return;
  MammaRunner(el, {
    mum: 'images/mum.png',
    baby: 'images/monster.png',
    baby2: 'images/monster2.png',
    poop: 'images/poop3.png'
  });
});
