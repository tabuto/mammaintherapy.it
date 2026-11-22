// Mamma in Therapy - Runner v7
// Gioco a scorrimento: la mamma corre, salta e lancia imprecazioni censurate contro gli ostacoli.
// Uso:
//   var game = MammaRunner(canvas, { mum: 'images/mum-hd.png', baby: 'images/monster.png', baby2: 'images/monster2.png', poop: 'images/poop3.png' });
//   MammaRunner.enableFullscreen(game, containerEl, openBtn, closeBtn);
// Il canvas deve stare dentro un contenitore dedicato (il suo parentElement).
// Pausa e chiusura dello schermo intero sono disegnate dentro al canvas: restano
// visibili anche dove i pulsanti HTML sopra al canvas non si vedono.
(function (global) {
  'use strict';

  // Area di gioco base: il gameplay vive sempre in questo rettangolo logico.
  // In schermi più alti/larghi il mondo si "espande" (stile Phaser EXPAND) senza cambiare le distanze di gioco.
  var BW = 720, BH = 320;
  var BW_PORTRAIT = 540; // in verticale l'area base è più stretta, così sprite e ostacoli restano grandi
  var FONT = "'Indie Flower', cursive";
  var MUM_W = 100, MUM_H = 104; // misura a cui viene disegnato lo sprite della mamma

  var CURSES = [
    'Mannaggia a #@%!', 'P*****a miseria!', 'Ma che c***o!', 'Porc@#&!!',
    'Santa p*******a!', 'Ma vaff@#%!', 'Cristof@#o!', 'Ma porca p***!',
    'Cribbio $%#!', 'Accid€nti!!'
  ];
  var STRIKES = ['SCIOPERO', 'SCIOPERO SCUOLE', 'SCIOPERO MEZZI', 'ASILO CHIUSO'];
  var VACATION_SIGNS = ['CALAMITÀ NATURALE', 'BLOCCO STRADALE', 'SCIOPERO MEZZI', 'GUERRA', 'PANDEMIA'];

  // Come si chiama il guaio nella schermata finale: "Esaurita per virus", "Esaurita per pannolino"...
  // I cartelli non stanno qui: usano la scritta che portano addosso.
  var CAUSE_LABELS = {
    baby: 'crisi', diaper: 'pannolino', virus: 'rotavirus', staph: 'stafilococco', rain: 'pioggia'
  };

  // Come si chiama ogni bonus delle ferie quando viene raccolto
  var BONUS_LABELS = { cocktail: 'spritz', beer: 'birrozza', book: 'libro' };

  var WORD_HIT = '#e03131';   // rosso: guaio preso
  var WORD_BONUS = '#2b8a3e'; // verde: bonus raccolto

  // ================= PARAMETRI DI TUNING =================
  // Tutti i valori di bilanciamento in un unico punto. Tempi in secondi, distanze in pixel logici.
  var CONFIG = {
    // Fisica della mamma
    gravity: 2200,            // accelerazione verso il basso
    jumpVelocity: -840,       // spinta iniziale del salto (più negativo = salto più alto)

    // Velocità di scorrimento
    speedStart: 320,          // velocità iniziale
    speedMax: 700,            // velocità massima
    speedGainPerPx: 1 / 40,   // incremento di velocità per pixel percorso

    // Generazione ostacoli
    spawnFirstDelay: 1.2,     // attesa prima del primo ostacolo
    spawnGapBase: 0.35,       // intervallo minimo fisso tra ostacoli
    spawnGapSpeedFactor: 0.75,// parte dell'intervallo che si accorcia con la velocità
    spawnGapRandom: 1.1,      // variazione casuale aggiunta all'intervallo
    spawnWeights: {           // probabilità relative di ogni ostacolo
      baby: 20, diaper: 18, virus: 17, staph: 17, strike: 28
    },

    // Imprecazioni
    shoutCooldown: 0.55,      // "fiato" tra un'imprecazione e l'altra
    shoutSpeedBonus: 380,     // velocità dell'imprecazione oltre lo scorrimento
    bigWordLife: 1.1,         // durata dell'animazione a tutto schermo

    // Punteggio
    pointsJumped: { baby: 5, diaper: 5, virus: 5, staph: 5, strike: 2, vacation: 2 }, // ostacolo superato
    pointsStrikeShot: 20,     // cartello abbattuto con un'imprecazione

    // Stress
    stressMax: 100,           // oltre questo valore la partita finisce
    stressPerHit: {           // stress aggiunto per ostacolo preso (100 = 3-4 colpi)
      baby: 25, diaper: 25, virus: 30, staph: 30, strike: 35, vacation: 35
    },
    shootableTypes: ['strike', 'vacation'], // ostacoli che si abbattono con le imprecazioni
    stressDecayPerSec: 0,     // recupero di stress al secondo (0 = nessun recupero)
    hitInvulnerability: 1.2,  // secondi di invulnerabilità dopo un colpo
    hitShake: 0.3,            // durata della scossa quando si prende un colpo
    gameOverShake: 1.6,       // durata del terremoto finale, poi lo schermo si ferma

    // Malattia (virus e batterio)
    sickTypes: ['virus', 'staph'], // ostacoli che fanno ammalare
    sickDuration: 10,         // secondi senza poter saltare

    // Alternanza livelli
    workDuration: 30,         // durata del livello normale
    bonusDuration: 15,        // durata del livello bonus (ferie)
    phaseSpawnPause: 1.2,     // pausa negli arrivi al cambio di livello

    // Livello bonus (ferie)
    bonus: {
      spawnWeights: {         // bonus frequenti, malus più rari
        cocktail: 22, beer: 22, book: 18, virus: 8, staph: 8, vacation: 14
      },
      spawnGapFactor: 0.8,    // moltiplicatore dell'intervallo tra arrivi (più basso = più fitto)
      items: {                // oggetti raccoglibili: stress tolto e punti
        cocktail: { stress: 20, points: 3 },
        beer:     { stress: 15, points: 3 },
        book:     { stress: 10, points: 3 }
      },
      itemMaxLift: 110,       // altezza massima da terra a cui fluttuano gli oggetti (0 = tutti a terra)
      cloudChancePerSec: 0.08,// probabilità al secondo che arrivi la nuvola
      cloudDuration: 5,       // secondi di pioggia
      cloudStressPerSec: 1,   // stress aggiunto al secondo sotto la pioggia
      cloudCooldown: 6        // secondi minimi tra una nuvola e l'altra
    }
  };
  // =======================================================

  function MammaRunner(canvas, assetPaths) {
    var ctx = canvas.getContext('2d');
    var container = canvas.parentElement;

    // --- Dimensioni vista logica (aggiornate da resize) ---
    var viewW = BW, viewH = BH, scale = 1, GROUND = 270;
    var buttons = null; // pulsanti on-canvas, presenti solo se c'è spazio sotto il terreno

    // --- Caricamento immagini ---
    var img = {};
    Object.keys(assetPaths).forEach(function (k) {
      var i = new Image();
      i.src = assetPaths[k];
      img[k] = i;
    });

    // --- Stato del gioco ---
    var state = 'ready'; // ready | play | pause | over
    var mum, obstacles, shouts, particles, popups, bigWords, speed, distance, score, spawnTimer, shoutCooldown, t = 0;
    var stress, sickTimer, invuln, shake, shakeDur, stressFlash, blockedMsgCd, lastCause;
    var phase, phaseTimer, bonusAlpha = 0, cloud, cloudCd;
    var pressed = { jump: 0, shout: 0 }; // feedback visivo dei pulsanti
    var best = 0, overAt = 0, startedAt = 0;
    try { best = parseInt(localStorage.getItem('mit_runner_best') || '0', 10) || 0; } catch (e) {}

    function reset() {
      mum = { x: 50, y: GROUND, vy: 0, w: MUM_W, h: MUM_H, onGround: true, shoutAnim: 0 };
      obstacles = []; shouts = []; particles = []; popups = []; bigWords = [];
      speed = CONFIG.speedStart; distance = 0; score = 0; spawnTimer = CONFIG.spawnFirstDelay; shoutCooldown = 0;
      stress = 0; sickTimer = 0; invuln = 0; shake = 0; shakeDur = CONFIG.hitShake; stressFlash = 0;
      blockedMsgCd = 0; lastCause = '';
      phase = 'work'; phaseTimer = CONFIG.workDuration; cloud = null; cloudCd = 0;
    }
    reset();

    // Agganci allo schermo intero, impostati da MammaRunner.enableFullscreen
    var fs = null;
    function isFullscreen() { return !!(fs && fs.isOpen()); }

    // Scossa dello schermo: durata e intensità vanno insieme, così il terremoto si spegne da solo
    function setShake(dur) { shake = dur; shakeDur = dur; }

    // --- Comandi ---
    function jump() {
      if (state === 'pause') return;
      pressed.jump = 0.15;
      if (state !== 'play') return start();
      if (sickTimer > 0) { // malata: niente salti
        if (blockedMsgCd <= 0) {
          mumPopup('Non ce la faccio...', '#5c940d', 0.9);
          blockedMsgCd = 1;
        }
        return;
      }
      if (mum.onGround) { mum.vy = CONFIG.jumpVelocity; mum.onGround = false; }
    }
    function shout() {
      if (state === 'pause') return;
      pressed.shout = 0.15;
      if (state !== 'play') return start();
      if (shoutCooldown > 0) return;
      shoutCooldown = CONFIG.shoutCooldown;
      mum.shoutAnim = 0.3;
      var txt = CURSES[(Math.random() * CURSES.length) | 0];
      ctx.font = 'bold 20px ' + FONT;
      // L'imprecazione parte all'altezza del petto, così colpisce anche gli ostacoli bassi
      shouts.push({ x: mum.x + mum.w * 0.8, y: mum.y - 30, txt: txt, w: ctx.measureText(txt).width, life: 1.6 });
    }
    function start() {
      if (state === 'over' && performance.now() - overAt < 600) return; // evita restart accidentale
      reset(); state = 'play'; startedAt = performance.now();
      track('start');
    }
    function gameOver() {
      state = 'over'; overAt = performance.now();
      setShake(CONFIG.gameOverShake);
      var wasRecord = score > best;
      if (wasRecord) { best = score; try { localStorage.setItem('mit_runner_best', String(best)); } catch (e) {} }
      track('gameOver', String(score));
      // Avvisa la pagina (classifica): punteggio, record personale e durata della partita.
      try {
        canvas.dispatchEvent(new CustomEvent('mit:gameover', { detail: {
          score: score, best: best, isRecord: wasRecord,
          durationMs: startedAt ? Math.round(overAt - startedAt) : 0
        } }));
      } catch (e) {}
    }
    // Pausa: il mondo si ferma e compaiono "Riprendi" ed "Esci"
    function pause() {
      if (state !== 'play') return;
      state = 'pause';
      track('pause');
    }
    function resume() {
      if (state !== 'pause') return;
      state = 'play';
      last = performance.now(); // niente salto temporale alla ripresa
    }
    function togglePause() {
      if (state === 'play') pause(); else if (state === 'pause') resume();
    }
    // Esci: partita abbandonata, si torna alla schermata iniziale e si lascia lo schermo intero
    function quit() {
      reset(); state = 'ready';
      track('quit');
      if (isFullscreen()) fs.close();
    }
    // Integrazione con Google Analytics del sito, se presente
    function track(action, label) {
      if (typeof global.gaSendEvent === 'function') { try { global.gaSendEvent('game', action, label || ''); } catch (e) {} }
    }

    // Tastiera: Spazio/Su = salto, X/Invio/Destra = imprecazione, P = pausa
    global.addEventListener('keydown', function (e) {
      if (!isVisible()) return;
      if (e.code === 'KeyP') { e.preventDefault(); return togglePause(); }
      if (state === 'pause') { // in pausa la tastiera non gioca: riprende e basta
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); resume(); }
        return;
      }
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); jump(); }
      else if (e.code === 'KeyX' || e.code === 'Enter' || e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); shout(); }
    });

    // Touch/mouse: prima i pulsanti disegnati sul canvas, poi i pulsantoni,
    // altrimenti metà sinistra = salto, metà destra = imprecazione
    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var r = canvas.getBoundingClientRect();
      var lx = (e.clientX - r.left) / scale, ly = (e.clientY - r.top) / scale;
      var hud = hudButtons();
      if (hud.pause && inRect(lx, ly, hud.pause)) return togglePause();
      if (hud.close && inRect(lx, ly, hud.close)) return fs.close();
      if (state === 'pause') {
        var pb = pauseButtons();
        if (inRect(lx, ly, pb.resume)) return resume();
        if (inRect(lx, ly, pb.exit)) return quit();
        return; // in pausa il resto del canvas non gioca
      }
      if (buttons) {
        if (inRect(lx, ly, buttons.jump)) return jump();
        if (inRect(lx, ly, buttons.shout)) return shout();
      }
      if (lx < viewW / 2) jump(); else shout();
    });
    canvas.style.touchAction = 'none';

    function inRect(x, y, b) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
    function isVisible() {
      var r = canvas.getBoundingClientRect();
      return r.bottom > 0 && r.top < (global.innerHeight || 0);
    }

    // --- Ostacoli ---
    // Estrazione pesata in base a CONFIG.spawnWeights
    function pickType() {
      var w = phase === 'bonus' ? CONFIG.bonus.spawnWeights : CONFIG.spawnWeights, tot = 0, k;
      for (k in w) tot += w[k];
      var r = Math.random() * tot;
      for (k in w) { r -= w[k]; if (r <= 0) return k; }
      return 'strike';
    }

    // Scritte sopra la testa della mamma, impilate per non sovrapporsi
    function mumPopup(txt, color, life) {
      var stack = popups.filter(function (p) { return p.mum; }).length;
      popups.push({ x: mum.x + mum.w + 50, y: mum.y - mum.h + 20 - stack * 22, txt: txt, life: life, c: color, mum: true });
    }

    // Scritta che parte dal punto dell'urto, vola al centro e si ingrandisce:
    // la stessa animazione delle imprecazioni, usata anche per guai e bonus.
    function flashWord(txt, x, y, color) {
      ctx.font = 'bold 20px ' + FONT;
      bigWords.push({
        txt: txt, w20: ctx.measureText(txt).width, x0: x, y0: y,
        life: CONFIG.bigWordLife, total: CONFIG.bigWordLife,
        rot: (Math.random() - 0.5) * 0.12, color: color
      });
    }

    // Nome del guaio per la schermata finale: i cartelli usano la propria scritta
    function causeOf(o) {
      if (o.label) return o.label.toLowerCase();
      return CAUSE_LABELS[o.type] || 'troppo stress';
    }

    // Ostacolo preso: stress, eventuale malattia, game over se si supera il limite
    function takeHit(o) {
      var add = CONFIG.stressPerHit[o.type] || 0;
      stress = Math.min(CONFIG.stressMax, stress + add);
      invuln = CONFIG.hitInvulnerability;
      lastCause = causeOf(o);
      setShake(CONFIG.hitShake); stressFlash = 0.5;
      burst(o.x + o.w / 2, o.y - o.h / 2, '#e03131');
      flashWord(lastCause.toUpperCase(), o.x + o.w / 2, o.y - o.h / 2, WORD_HIT);
      mumPopup('+' + add + ' stress', '#e03131', 1);
      if (CONFIG.sickTypes.indexOf(o.type) >= 0) {
        sickTimer = CONFIG.sickDuration;
        mumPopup('Bleah!', '#5c940d', 1.2);
      }
      if (stress >= CONFIG.stressMax) gameOver();
    }

    // Oggetto ferie raccolto: abbassa lo stress
    function collect(o) {
      var it = CONFIG.bonus.items[o.type];
      var before = stress;
      stress = Math.max(0, stress - it.stress);
      score += it.points;
      for (var i = 0; i < 12; i++) {
        particles.push({ x: o.x + o.w / 2, y: o.y - o.h / 2, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 300, life: 0.6, c: '#fab005' });
      }
      flashWord((BONUS_LABELS[o.type] || o.type).toUpperCase(), o.x + o.w / 2, o.y - o.h / 2, WORD_BONUS);
      mumPopup(before > 0 ? '-' + Math.round(before - stress) + ' stress' : '+' + it.points, '#2b8a3e', 1);
    }

    // Cambio di livello: lavoro <-> ferie, con scritta a tutto schermo
    function switchPhase() {
      phase = phase === 'work' ? 'bonus' : 'work';
      phaseTimer = phase === 'bonus' ? CONFIG.bonusDuration : CONFIG.workDuration;
      spawnTimer = Math.max(spawnTimer, CONFIG.phaseSpawnPause);
      cloud = null; cloudCd = 2;
      var txt = phase === 'bonus' ? 'FERIE!' : 'Si torna al lavoro!';
      ctx.font = 'bold 20px ' + FONT;
      bigWords.push({ txt: txt, w20: ctx.measureText(txt).width, x0: viewW / 2, y0: viewH * 0.42, life: CONFIG.bigWordLife * 1.5, total: CONFIG.bigWordLife * 1.5, rot: 0,
        color: phase === 'bonus' ? '#f08c00' : '#495057' });
    }

    function spawn() {
      // pts = punti se l'ostacolo viene saltato; i cartelli danno più punti se abbattuti con un'imprecazione
      var type = pickType(), o;
      if (type === 'baby') {
        o = { type: 'baby', w: 40, h: 40, variant: Math.random() < 0.5 ? 'baby' : 'baby2', pts: 5 };
      } else if (type === 'diaper') {
        o = { type: 'diaper', w: 44, h: 34, pts: 5 };
      } else if (type === 'virus') {
        o = { type: 'virus', w: 40, h: 40, pts: 5 };
      } else if (type === 'staph') {
        o = { type: 'staph', w: 46, h: 36, pts: 5 };
      } else if (CONFIG.bonus.items[type]) {
        // Oggetto raccoglibile: fluttua a un'altezza casuale, da prendere al volo
        o = { type: type, w: 32, h: 40, collectible: true, lift: Math.random() < 0.4 ? 0 : Math.random() * CONFIG.bonus.itemMaxLift };
      } else if (type === 'vacation') {
        var vl = VACATION_SIGNS[(Math.random() * VACATION_SIGNS.length) | 0];
        ctx.font = 'bold 20px ' + FONT;
        o = { type: 'vacation', w: Math.max(96, ctx.measureText(vl).width + 22), h: 100, label: vl, color: '#1971c2' };
      } else {
        var label = STRIKES[(Math.random() * STRIKES.length) | 0];
        ctx.font = 'bold 20px ' + FONT;
        o = { type: 'strike', w: Math.max(96, ctx.measureText(label).width + 22), h: 100, label: label, pts: 2, shotPts: 20 };
      }
      o.pts = CONFIG.pointsJumped[o.type] || 0;
      o.shotPts = CONFIG.pointsStrikeShot;
      o.lift = o.lift || 0;
      o.x = viewW + 20; o.y = GROUND - o.lift; o.passed = !!o.collectible; o.phase = Math.random() * 6;
      obstacles.push(o);
    }

    // Hitbox leggermente ridotte per un gioco più indulgente
    function boxOf(o) { return { x: o.x + 4, y: o.y - o.h + 4, w: o.w - 8, h: o.h - 6 }; }
    function mumBox() {
      return { x: mum.x + mum.w * 0.22, y: mum.y - mum.h * 0.82, w: mum.w * 0.56, h: mum.h * 0.8 };
    }
    function hit(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }

    function burst(x, y, color) {
      for (var i = 0; i < 14; i++) {
        particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 380, vy: -Math.random() * 380, life: 0.6, c: color });
      }
    }

    // --- Aggiornamento ---
    function update(dt) {
      if (state === 'pause') return; // in pausa il mondo sta fermo
      t += dt;
      pressed.jump = Math.max(0, pressed.jump - dt);
      pressed.shout = Math.max(0, pressed.shout - dt);
      // Fuori dal blocco di gioco: così il terremoto finale dura poco e poi si ferma,
      // e la mamma smette di lampeggiare sulla schermata di fine partita
      shake = Math.max(0, shake - dt);
      stressFlash = Math.max(0, stressFlash - dt);
      invuln = Math.max(0, invuln - dt);
      bigWords.forEach(function (b) { b.life -= dt; });
      bigWords = bigWords.filter(function (b) { return b.life > 0; });
      // Dissolvenza dello sfondo delle ferie
      var target = (state === 'play' && phase === 'bonus') ? 1 : 0;
      bonusAlpha += (target - bonusAlpha) * Math.min(1, dt * 2);
      if (state !== 'play') return;

      speed = Math.min(CONFIG.speedMax, CONFIG.speedStart + distance * CONFIG.speedGainPerPx);
      distance += speed * dt;
      shoutCooldown = Math.max(0, shoutCooldown - dt);
      mum.shoutAnim = Math.max(0, mum.shoutAnim - dt);
      sickTimer = Math.max(0, sickTimer - dt);
      blockedMsgCd = Math.max(0, blockedMsgCd - dt);
      stress = Math.max(0, stress - CONFIG.stressDecayPerSec * dt);

      // Alternanza livelli
      phaseTimer -= dt;
      if (phaseTimer <= 0) switchPhase();

      // Nuvola di pioggia (solo in ferie): segue la mamma e aggiunge stress poco alla volta
      cloudCd = Math.max(0, cloudCd - dt);
      if (phase === 'bonus' && !cloud && cloudCd <= 0 && Math.random() < CONFIG.bonus.cloudChancePerSec * dt) {
        cloud = { timer: CONFIG.bonus.cloudDuration, x: viewW + 60 };
        mumPopup('Piove...', '#495057', 1.2);
      }
      if (cloud) {
        cloud.timer -= dt;
        cloud.x += (mum.x + mum.w / 2 - cloud.x) * Math.min(1, dt * 4); // arriva da destra e si piazza sulla testa
        stress = Math.min(CONFIG.stressMax, stress + CONFIG.bonus.cloudStressPerSec * dt);
        if (cloud.timer <= 0) { cloud = null; cloudCd = CONFIG.bonus.cloudCooldown; }
        if (stress >= CONFIG.stressMax) { lastCause = CAUSE_LABELS.rain; gameOver(); return; }
      }

      // Fisica della mamma
      mum.vy += CONFIG.gravity * dt;
      mum.y += mum.vy * dt;
      if (mum.y >= GROUND) { mum.y = GROUND; mum.vy = 0; mum.onGround = true; }

      // Generazione ostacoli: intervallo che si accorcia con la velocità
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawn();
        spawnTimer = (CONFIG.spawnGapSpeedFactor * (CONFIG.speedStart / speed) + CONFIG.spawnGapBase + Math.random() * CONFIG.spawnGapRandom)
          * (phase === 'bonus' ? CONFIG.bonus.spawnGapFactor : 1);
      }

      // Imprecazioni in volo
      for (var i = shouts.length - 1; i >= 0; i--) {
        var s = shouts[i];
        s.x += (speed + CONFIG.shoutSpeedBonus) * dt;
        s.life -= dt;
        var sb = { x: s.x, y: s.y - 14, w: s.w, h: 24 };
        var used = false;
        for (var j = obstacles.length - 1; j >= 0; j--) {
          var o = obstacles[j];
          if (CONFIG.shootableTypes.indexOf(o.type) < 0) continue; // le imprecazioni funzionano solo contro i cartelli
          if (hit(sb, boxOf(o))) {
            score += o.shotPts;
            var cx = Math.max(s.x, o.x), cy = s.y; // punto di collisione
            burst(o.x + o.w / 2, o.y - o.h / 2, o.color || '#c0392b');
            popups.push({ x: o.x + o.w / 2, y: o.y - o.h - 8, txt: '+' + o.shotPts, life: 0.8 });
            // L'imprecazione esplode a tutto schermo partendo dal punto di collisione
            flashWord(s.txt, cx + s.w / 2, cy);
            obstacles.splice(j, 1);
            used = true;
            break;
          }
        }
        if (used || s.life <= 0 || s.x > viewW) shouts.splice(i, 1);
      }

      // Ostacoli
      var mb = mumBox();
      for (var k = obstacles.length - 1; k >= 0; k--) {
        var ob = obstacles[k];
        ob.x -= speed * dt;
        if (!ob.passed && ob.x + ob.w < mum.x) {
          ob.passed = true; score += ob.pts;
          popups.push({ x: ob.x + ob.w / 2, y: ob.y - ob.h - 8, txt: '+' + ob.pts, life: 0.6 });
        }
        if (ob.x + ob.w < -10) { obstacles.splice(k, 1); continue; }
        if (ob.collectible) {
          if (hit(mb, boxOf(ob))) { obstacles.splice(k, 1); collect(ob); }
          continue;
        }
        if (invuln <= 0 && hit(mb, boxOf(ob))) {
          obstacles.splice(k, 1);
          takeHit(ob);
          if (state !== 'play') return;
        }
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
      ctx.beginPath(); ctx.moveTo(0, GROUND + 1); ctx.lineTo(viewW, GROUND + 1); ctx.stroke();
      ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1.5;
      var off = distance % 60;
      for (var x = -off; x < viewW; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, GROUND + 10); ctx.lineTo(x + 14, GROUND + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 32, GROUND + 20); ctx.lineTo(x + 40, GROUND + 20); ctx.stroke();
      }
    }

    function drawMum() {
      // Sprite ad alta risoluzione ridotto a misura di gioco: qui serve l'interpolazione,
      // non il pixel netto. Leggero rimbalzo in corsa.
      var bob = (state === 'play' && mum.onGround) ? Math.abs(Math.sin(t * 14)) * 4 : 0;
      var x = mum.x, y = mum.y - mum.h - bob;
      if (mum.shoutAnim > 0) { x += (Math.random() - 0.5) * 5; y += (Math.random() - 0.5) * 5; }
      var sh = Math.max(0.3, 1 - (GROUND - mum.y) / 220);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.ellipse(mum.x + mum.w / 2, GROUND + 3, 32 * sh, 4, 0, 0, Math.PI * 2); ctx.fill();
      if (invuln > 0 && Math.floor(t * 12) % 2 === 0) return; // lampeggio dopo un colpo
      ctx.imageSmoothingEnabled = true;
      if (sickTimer > 0) {
        // Ondeggia barcollando con lo sprite tinto di verde
        var sway = Math.sin(t * 4) * 0.06;
        ctx.save();
        ctx.translate(x + mum.w / 2, mum.y);
        ctx.rotate(sway);
        ctx.translate(-(x + mum.w / 2), -mum.y);
        var sickImg = getSickSprite();
        if (sickImg) ctx.drawImage(sickImg, x, y, mum.w, mum.h);
        else drawImg(img.mum, x, y, mum.w, mum.h);
        ctx.restore();
        // Gocce di sudore verdastre e spirale di nausea sopra la testa
        ctx.fillStyle = '#82c91e';
        for (var i = 0; i < 2; i++) {
          var p = (t * 1.5 + i * 0.5) % 1;
          ctx.globalAlpha = 1 - p;
          ctx.beginPath(); ctx.arc(x + mum.w * (0.2 + i * 0.6), y + 20 + p * 30, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#5c940d'; ctx.lineWidth = 2;
        ctx.beginPath();
        for (var a = 0; a < Math.PI * 4; a += 0.3) {
          var rr = a * 1.6, px = x + mum.w / 2 + Math.cos(a + t * 5) * rr, py = y - 12 + Math.sin(a + t * 5) * rr * 0.4;
          if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      } else {
        drawImg(img.mum, x, y, mum.w, mum.h);
      }
    }

    // Versione verdina dello sprite, generata una volta sola e tenuta in cache
    var sickSprite = null;
    function getSickSprite() {
      if (sickSprite) return sickSprite;
      var src = img.mum;
      if (!src || !src.complete || !src.naturalWidth) return null;
      var c = document.createElement('canvas');
      c.width = src.naturalWidth; c.height = src.naturalHeight;
      var g = c.getContext('2d');
      g.drawImage(src, 0, 0);
      g.globalCompositeOperation = 'source-atop'; // colora solo i pixel dello sprite
      g.fillStyle = 'rgba(116, 184, 22, 0.55)';
      g.fillRect(0, 0, c.width, c.height);
      sickSprite = c;
      return c;
    }

    function drawBaby(o) {
      var shake = Math.sin(t * 30 + o.phase) * 1.5;
      drawImg(img[o.variant], o.x + shake, o.y - o.h, o.w, o.h);
      ctx.fillStyle = '#4aa3df';
      for (var i = 0; i < 2; i++) {
        var p = ((t * 2 + o.phase + i * 0.5) % 1);
        ctx.beginPath(); ctx.arc(o.x + 10 - p * 10, o.y - o.h + 14 + p * 14, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(o.x + o.w - 10 + p * 10, o.y - o.h + 14 + p * 14, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.font = 'bold 14px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText('UEEEH!', o.x + o.w / 2, o.y - o.h - 6 + Math.sin(t * 12 + o.phase) * 2);
    }

    function drawDiaper(o) {
      var x = o.x, y = o.y - 22, w = o.w;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y);
      ctx.quadraticCurveTo(x + w - 6, y + 22, x + w / 2 + 6, y + 22);
      ctx.lineTo(x + w / 2 - 6, y + 22);
      ctx.quadraticCurveTo(x + 6, y + 22, x, y);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a8d8f0'; ctx.fillRect(x + 3, y + 2, 6, 5); ctx.fillRect(x + w - 9, y + 2, 6, 5);
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

    // Faccina cattiva comune a virus e batterio
    function drawAngryFace(cx, cy, r) {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx - r * 0.35, cy - r * 0.1, r * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + r * 0.35, cy - r * 0.1, r * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.05, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + r * 0.3, cy - r * 0.05, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy - r * 0.45); ctx.lineTo(cx - r * 0.15, cy - r * 0.28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + r * 0.6, cy - r * 0.45); ctx.lineTo(cx + r * 0.15, cy - r * 0.28); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy + r * 0.45, r * 0.25, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    }

    // Virus gastrointestinale: corpo tondo con spuntoni a pallino, rotola e pulsa
    function drawVirus(o) {
      var r = 15, cx = o.x + o.w / 2, cy = o.y - o.h / 2 - Math.abs(Math.sin(t * 6 + o.phase)) * 3;
      var rot = -t * 3 + o.phase, puls = 1 + Math.sin(t * 10 + o.phase) * 0.06;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = '#2f7d32'; ctx.fillStyle = '#c0392b'; ctx.lineWidth = 2;
      for (var i = 0; i < 10; i++) {
        var a = rot + i * Math.PI / 5;
        var x1 = Math.cos(a) * r, y1 = Math.sin(a) * r, x2 = Math.cos(a) * (r + 7) * puls, y2 = Math.sin(a) * (r + 7) * puls;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x2, y2, 2.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#8bc34a'; ctx.strokeStyle = '#2f7d32';
      ctx.beginPath(); ctx.arc(0, 0, r * puls, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#689f38'; // macchie
      ctx.beginPath(); ctx.arc(-6, 7, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(8, 6, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      drawAngryFace(cx, cy, r);
      ctx.fillStyle = '#2f7d32'; ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('GASTRO!', cx, o.y - o.h - 8);
    }

    // Stafilococco: grappolo di sfere dorate che tremolano
    function drawStaph(o) {
      var base = o.y, cx = o.x + o.w / 2;
      var cells = [[-15, -9], [0, -10], [15, -9], [-8, -22], [8, -22], [0, -33]];
      ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.5;
      cells.forEach(function (c, i) {
        var j = Math.sin(t * 9 + o.phase + i) * 1.2;
        ctx.fillStyle = i % 2 ? '#f4c542' : '#e8b023';
        ctx.beginPath(); ctx.arc(cx + c[0] + j, base + c[1], 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
      drawAngryFace(cx, base - 20, 10);
      ctx.fillStyle = '#b8860b'; ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('STAFILO!', cx, o.y - o.h - 8);
    }

    // Sfondo delle ferie: sole che ruota e scritta FERIE in trasparenza
    function drawBonusBackground() {
      if (bonusAlpha < 0.01) return;
      ctx.save();
      ctx.globalAlpha = bonusAlpha;
      // Scritta FERIE grande sullo sfondo
      var fs = Math.min(viewW * 0.3, (GROUND - 60) * 0.7);
      ctx.font = 'bold ' + fs + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(250, 176, 5, 0.18)';
      ctx.fillText('FERIE', viewW / 2, GROUND - 20);
      // Sole con raggi
      var sx = viewW - 90, sy = 110, r = 30;
      ctx.translate(sx, sy); ctx.rotate(t * 0.4);
      ctx.strokeStyle = '#fcc419'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (var i = 0; i < 12; i++) {
        var a = i * Math.PI / 6, l = i % 2 ? 14 : 22;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6)); ctx.lineTo(Math.cos(a) * (r + 6 + l), Math.sin(a) * (r + 6 + l)); ctx.stroke();
      }
      ctx.rotate(-t * 0.4);
      ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = '#f59f00'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Occhiali da sole e sorriso
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.ellipse(-11, -4, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(11, -4, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-3, -5); ctx.lineTo(3, -5); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 6, 10, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
      ctx.restore();
    }

    // Oggetti delle ferie, con leggero galleggiamento
    function drawItem(o) {
      var bob = Math.sin(t * 5 + o.phase) * 3;
      var x = o.x, top = o.y - o.h + bob, cx = x + o.w / 2;
      // Alone luminoso per farli riconoscere come bonus
      ctx.fillStyle = 'rgba(255, 212, 59, 0.25)';
      ctx.beginPath(); ctx.arc(cx, top + o.h / 2, 26, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#333';
      if (o.type === 'cocktail') {
        // Coppa da cocktail con ombrellino e ciliegina
        ctx.fillStyle = '#ff8787';
        ctx.beginPath(); ctx.moveTo(x + 2, top + 8); ctx.lineTo(x + o.w - 2, top + 8); ctx.lineTo(cx, top + 26); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, top + 26); ctx.lineTo(cx, top + 36); ctx.moveTo(cx - 8, top + 37); ctx.lineTo(cx + 8, top + 37); ctx.stroke();
        ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(x + 8, top + 7, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#7a5230'; ctx.beginPath(); ctx.moveTo(cx + 3, top + 14); ctx.lineTo(cx + 10, top - 2); ctx.stroke();
        ctx.fillStyle = '#4dabf7'; ctx.beginPath(); ctx.moveTo(cx + 2, top); ctx.quadraticCurveTo(cx + 10, top - 12, cx + 18, top); ctx.closePath(); ctx.fill();
      } else if (o.type === 'beer') {
        // Boccale di birra con schiuma
        ctx.fillStyle = '#fab005'; ctx.fillRect(x + 4, top + 10, o.w - 14, o.h - 12); ctx.strokeRect(x + 4, top + 10, o.w - 14, o.h - 12);
        ctx.beginPath(); ctx.arc(x + o.w - 10, top + 22, 7, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        ctx.fillStyle = '#fff';
        for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + 8 + i * 6, top + 9, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath(); ctx.arc(x + 10, top + 22, 1.5, 0, Math.PI * 2); ctx.arc(x + 15, top + 30, 1.5, 0, Math.PI * 2); ctx.fill();
      } else {
        // Libro con segnalibro
        ctx.fillStyle = '#7048e8'; ctx.fillRect(x + 2, top + 6, o.w - 4, o.h - 10); ctx.strokeRect(x + 2, top + 6, o.w - 4, o.h - 10);
        ctx.fillStyle = '#fff'; ctx.fillRect(x + o.w - 7, top + 8, 4, o.h - 14);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x + 7, top + 14); ctx.lineTo(x + o.w - 11, top + 14); ctx.moveTo(x + 7, top + 19); ctx.lineTo(x + o.w - 14, top + 19); ctx.stroke();
        ctx.fillStyle = '#e03131'; ctx.fillRect(x + 12, top + o.h - 6, 4, 8);
      }
    }

    // Nuvoletta con la pioggia sopra la mamma
    function drawCloud() {
      if (!cloud) return;
      var cx = cloud.x, cy = GROUND - mum.h - 45; // quota fissa sopra la testa: saltando non si sfugge alla pioggia
      var a = Math.min(1, cloud.timer / 0.5, (CONFIG.bonus.cloudDuration - cloud.timer) / 0.3 + 0.2);
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      // Pioggia
      ctx.strokeStyle = '#4dabf7'; ctx.lineWidth = 2;
      for (var i = 0; i < 9; i++) {
        var px = cx - 36 + i * 9, p = ((t * 2.5 + i * 0.37) % 1);
        var py = cy + 12 + p * (GROUND - cy - 20);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 2, py + 8); ctx.stroke();
      }
      // Nuvola
      ctx.fillStyle = '#adb5bd'; ctx.strokeStyle = '#495057';
      [[-24, 4, 16], [-6, -6, 20], [16, 0, 17], [30, 8, 12], [0, 10, 16]].forEach(function (c) {
        ctx.beginPath(); ctx.arc(cx + c[0], cy + c[1], c[2], 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }

    function drawStrike(o) {
      var cx = o.x + o.w / 2, top = o.y - o.h;
      var sway = Math.sin(t * 5 + o.phase) * 0.06;
      ctx.save();
      ctx.translate(cx, o.y); ctx.rotate(sway); ctx.translate(-cx, -o.y);
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(cx, o.y); ctx.lineTo(cx, top + 44); ctx.stroke();
      var col = o.color || '#c0392b';
      ctx.fillStyle = '#fff'; ctx.strokeStyle = col; ctx.lineWidth = 3;
      ctx.fillRect(o.x, top, o.w, 46); ctx.strokeRect(o.x, top, o.w, 46);
      ctx.fillStyle = col; ctx.font = 'bold 20px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(o.label, cx, top + 30);
      ctx.restore();
    }

    function drawShout(s) {
      ctx.save();
      ctx.font = 'bold 20px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      var wob = Math.sin(t * 25) * 1.5;
      ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round';
      ctx.strokeText(s.txt, s.x, s.y + wob);
      ctx.fillStyle = '#d6336c';
      ctx.fillText(s.txt, s.x, s.y + wob);
      ctx.restore();
    }

    // Imprecazione che vola dal punto di collisione al centro, ingrandendosi fino a tutta larghezza e svanendo
    function drawBigWord(b) {
      var p = 1 - b.life / b.total; // 0 -> 1
      var e = 1 - Math.pow(1 - Math.min(1, p / 0.45), 3); // easing di crescita, completa al 45%
      var targetSize = Math.min(20 * (viewW * 0.9) / b.w20, viewH * 0.28);
      var size = 20 + (targetSize - 20) * e;
      var x = b.x0 + (viewW / 2 - b.x0) * e;
      var y = b.y0 + (viewH * 0.42 - b.y0) * e;
      var alpha = p < 0.5 ? 1 : Math.max(0, 1 - (p - 0.5) / 0.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y); ctx.rotate(b.rot * e);
      ctx.font = 'bold ' + size.toFixed(1) + 'px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, size * 0.12); ctx.strokeStyle = '#fff';
      ctx.strokeText(b.txt, 0, 0);
      ctx.fillStyle = b.color || '#d6336c';
      ctx.fillText(b.txt, 0, 0);
      ctx.restore();
    }

    // Barra dello stress in alto al centro: verde -> giallo -> rosso
    function drawStressBar() {
      var bw = Math.min(240, viewW * 0.4), bh = 18, bx = (viewW - bw) / 2, by = 14;
      var ratio = Math.min(1, stress / CONFIG.stressMax);
      var hue = 120 - 120 * ratio; // 120 = verde, 0 = rosso
      var fx = stressFlash > 0 ? (Math.random() - 0.5) * 4 : 0;
      ctx.save();
      ctx.translate(fx, 0);
      ctx.fillStyle = '#f1f3f5'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = 'hsl(' + hue + ', 75%, 50%)'; ctx.fillRect(bx, by, bw * ratio, bh);
      ctx.strokeStyle = stressFlash > 0 ? '#e03131' : '#222'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = '#222'; ctx.font = 'bold 14px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('STRESS', bx + bw / 2, by + bh / 2 + 1);
      if (sickTimer > 0) {
        ctx.fillStyle = '#5c940d'; ctx.font = 'bold 16px ' + FONT; ctx.textBaseline = 'alphabetic';
        ctx.fillText('Malata: niente salti per ' + Math.ceil(sickTimer) + 's', bx + bw / 2, by + bh + 20);
      }
      ctx.restore();
    }

    function drawHud() {
      drawStressBar();
      ctx.fillStyle = '#222'; ctx.font = '22px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('Punti: ' + score, 16, 30);
      // Record sotto i punti, così l'angolo in alto a destra resta libero per il tasto di chiusura
      ctx.font = '18px ' + FONT; ctx.fillStyle = '#666';
      ctx.fillText('Record: ' + best, 16, 70);
      if (state === 'play') {
        ctx.font = 'bold 18px ' + FONT;
        if (phase === 'bonus') { ctx.fillStyle = '#f08c00'; ctx.fillText('Ferie: ancora ' + Math.ceil(phaseTimer) + 's', 16, 95); }
        else { ctx.fillStyle = '#868e96'; ctx.fillText('Ferie tra ' + Math.ceil(phaseTimer) + 's', 16, 95); }
      }
      if (state === 'play') { // barra del "fiato" per la prossima imprecazione
        var f = 1 - shoutCooldown / CONFIG.shoutCooldown;
        ctx.strokeStyle = '#999'; ctx.lineWidth = 1; ctx.strokeRect(16, 40, 80, 6);
        ctx.fillStyle = f >= 1 ? '#d6336c' : '#ccc'; ctx.fillRect(16, 40, 80 * f, 6);
      }
    }

    function drawButton(b, label, color, isPressed, ready) {
      var r = 22;
      ctx.save();
      ctx.globalAlpha = ready ? 1 : 0.45;
      ctx.fillStyle = isPressed ? color : '#fff';
      ctx.strokeStyle = color; ctx.lineWidth = 4;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(b.x, b.y, b.w, b.h, r); else ctx.rect(b.x, b.y, b.w, b.h);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = isPressed ? '#fff' : color;
      ctx.font = 'bold ' + Math.min(52, b.h * 0.4, b.w * 0.16) + 'px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 2);
      ctx.restore();
    }

    // n pixel CSS espressi in unità logiche: i pulsanti restano grandi al dito
    // anche quando la vista è molto scalata (schermo intero in verticale).
    function px(n) { return n / scale; }

    // Pulsanti sempre disegnati dentro il canvas: a schermo intero i pulsanti HTML
    // della pagina possono non vedersi (Chrome su macOS), questi sì.
    function hudButtons() {
      var r = {}, size = Math.max(34, px(44)), pad = Math.max(10, px(12));
      var x = viewW - pad - size;
      if (isFullscreen()) { r.close = { x: x, y: pad, w: size, h: size }; x -= size + px(8); }
      if (state === 'play' || state === 'pause') r.pause = { x: x, y: pad, w: size, h: size };
      return r;
    }

    function overlayCy() { return Math.min(GROUND - 150, viewH * 0.4); }

    function pauseButtons() {
      var w = Math.min(viewW * 0.42, Math.max(150, px(170)));
      var h = Math.max(46, px(52)), gap = Math.max(14, px(16)), y = overlayCy() + Math.max(52, px(52));
      return {
        resume: { x: viewW / 2 - w - gap / 2, y: y, w: w, h: h },
        exit: { x: viewW / 2 + gap / 2, y: y, w: w, h: h }
      };
    }

    // Pulsante tondo con icona: pausa (due sbarre), ripresa (triangolo) o chiusura (croce)
    function drawIconButton(b, icon, color) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, b.w * 0.07);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(b.x, b.y, b.w, b.h, b.w / 2); else ctx.rect(b.x, b.y, b.w, b.h);
      ctx.fill(); ctx.stroke();
      var cx = b.x + b.w / 2, cy = b.y + b.h / 2, u = b.w * 0.22;
      ctx.lineWidth = Math.max(2.5, b.w * 0.09); ctx.lineCap = 'round';
      if (icon === 'pause') {
        ctx.beginPath();
        ctx.moveTo(cx - u * 0.55, cy - u); ctx.lineTo(cx - u * 0.55, cy + u);
        ctx.moveTo(cx + u * 0.55, cy - u); ctx.lineTo(cx + u * 0.55, cy + u);
        ctx.stroke();
      } else if (icon === 'play') {
        ctx.fillStyle = color; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - u * 0.6, cy - u); ctx.lineTo(cx + u, cy); ctx.lineTo(cx - u * 0.6, cy + u);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(cx - u, cy - u); ctx.lineTo(cx + u, cy + u);
        ctx.moveTo(cx + u, cy - u); ctx.lineTo(cx - u, cy + u);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Promemoria dei comandi: senza i pulsantoni, a schermo intero non si saprebbe cosa premere
    function drawControlsHint() {
      if (!isFullscreen() || buttons || state !== 'play') return;
      var txt = ('ontouchstart' in global)
        ? 'Tocca a sinistra: salta · a destra: impreca'
        : 'SPAZIO salta · X impreca · P pausa';
      // A mezza altezza fra il terreno e il bordo, con un alone bianco:
      // altrimenti la scritta finisce sopra i trattini del terreno
      var y = Math.min(viewH - Math.max(10, px(10)), GROUND + Math.max(42, (viewH - GROUND) * 0.55));
      ctx.save();
      ctx.font = Math.max(15, px(15)) + 'px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, px(4)); ctx.strokeStyle = '#fff';
      ctx.strokeText(txt, viewW / 2, y);
      ctx.fillStyle = 'rgba(73, 80, 87, 0.85)';
      ctx.fillText(txt, viewW / 2, y);
      ctx.restore();
    }

    function drawOverlay(title, lines) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(0, 0, viewW, viewH);
      var cy = overlayCy();
      ctx.fillStyle = '#222'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.font = 'bold 34px ' + FONT; ctx.fillText(title, viewW / 2, cy);
      ctx.font = '20px ' + FONT;
      lines.forEach(function (l, i) { ctx.fillText(l, viewW / 2, cy + 40 + i * 28); });
    }

    function render() {
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      ctx.clearRect(0, 0, viewW, viewH);
      // Intensità proporzionale a quanto resta: la scossa sfuma invece di tagliarsi di netto
      if (shake > 0) {
        var amp = 8 * (shake / (shakeDur || CONFIG.hitShake));
        ctx.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
      }

      drawBonusBackground();
      drawGround();
      obstacles.forEach(function (o) {
        if (o.collectible) drawItem(o);
        else if (o.type === 'baby') drawBaby(o);
        else if (o.type === 'diaper') drawDiaper(o);
        else if (o.type === 'virus') drawVirus(o);
        else if (o.type === 'staph') drawStaph(o);
        else drawStrike(o);
      });
      drawMum();
      drawCloud();
      shouts.forEach(drawShout);
      particles.forEach(function (p) {
        ctx.globalAlpha = Math.max(0, p.life / 0.6); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 4, 4);
      });
      ctx.globalAlpha = 1;
      popups.forEach(function (p) {
        ctx.globalAlpha = Math.max(0, p.life / 0.8);
        ctx.fillStyle = p.c || '#2b8a3e'; ctx.font = 'bold 18px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(p.txt, p.x, p.y);
      });
      ctx.globalAlpha = 1;
      bigWords.forEach(drawBigWord);
      drawHud();

      if (buttons) {
        var sick = state === 'play' && sickTimer > 0;
        drawButton(buttons.jump, sick ? 'KO ' + Math.ceil(sickTimer) + 's' : 'SALTA', sick ? '#5c940d' : '#1971c2',
          pressed.jump > 0, state !== 'play' || (mum.onGround && !sick));
        drawButton(buttons.shout, 'IMPRECA', '#d6336c', pressed.shout > 0, state !== 'play' || shoutCooldown === 0);
      }

      drawControlsHint();

      var touch = 'ontouchstart' in global;
      if (state === 'ready') {
        drawOverlay('Mamma in Therapy: la fuga', buttons
          ? ['Salta i guai, abbatti gli scioperi', 'a suon di imprecazioni', 'Premi un pulsante per iniziare']
          : touch
            ? ['Tocca a sinistra per saltare', 'Tocca a destra per imprecare', 'Tocca per iniziare']
            : ['SPAZIO / ↑ per saltare', 'X / → per imprecare', 'Premi un tasto per iniziare']);
      } else if (state === 'pause') {
        drawOverlay('In pausa', ['Punti: ' + score]);
        var pb = pauseButtons();
        drawButton(pb.resume, 'RIPRENDI', '#1b6969', false, true);
        drawButton(pb.exit, 'ESCI', '#d6336c', false, true);
      } else if (state === 'over') {
        drawOverlay('Esaurita per ' + (lastCause || 'troppo stress'),
          ['Punti: ' + score + (score >= best && score > 0 ? '  (nuovo record!)' : ''),
           touch || buttons ? 'Tocca per riprovare' : 'Premi SPAZIO per riprovare']);
      }

      // Pausa e chiusura stanno sopra a tutto, overlay compresi
      var hud = hudButtons();
      if (hud.pause) drawIconButton(hud.pause, state === 'pause' ? 'play' : 'pause', '#1b6969');
      if (hud.close) drawIconButton(hud.close, 'close', '#d6336c');
    }

    // --- Ridimensionamento "EXPAND" ---
    // Scala scelta perché l'area base BWxBH entri sempre; lo spazio in più allunga il mondo.
    // Fuori da schermo intero il canvas segue la larghezza del contenitore con proporzione fissa.
    var dpr = 1;
    function resize() {
      var fs = container.classList.contains('mit-fs');
      var cssW = container.clientWidth || BW;
      var cssH = fs ? (container.clientHeight || BH) : Math.min(cssW, 900) * BH / BW;
      if (!fs) cssW = Math.min(cssW, 900);
      dpr = global.devicePixelRatio || 1;
      var baseW = (fs && cssH > cssW) ? BW_PORTRAIT : BW;
      scale = Math.min(cssW / baseW, cssH / BH);
      viewW = cssW / scale; viewH = cssH / scale;

      // Spazio extra in verticale: un po' di cielo sopra, il resto sotto per i pulsanti
      var extra = viewH - BH;
      GROUND = 270 + extra * 0.35;
      var below = viewH - GROUND - 40;
      if (below >= 110) {
        var gap = 24, bh = Math.min(170, below - 30), by = GROUND + 40 + (below - bh) / 2;
        var bw = (viewW - gap * 3) / 2;
        buttons = { jump: { x: gap, y: by, w: bw, h: bh }, shout: { x: gap * 2 + bw, y: by, w: bw, h: bh } };
      } else {
        buttons = null;
      }

      // Riallinea gli oggetti a terra al nuovo livello del suolo
      if (mum.onGround) mum.y = GROUND;
      obstacles.forEach(function (o) { o.y = GROUND - (o.lift || 0); });

      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    global.addEventListener('resize', resize);
    if (global.visualViewport) global.visualViewport.addEventListener('resize', resize);
    if (global.ResizeObserver) new ResizeObserver(resize).observe(container);
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

    return {
      resize: resize,
      container: container,
      pause: pause,
      resume: resume,
      togglePause: togglePause,
      // Usato da MammaRunner.enableFullscreen per far chiudere lo schermo intero
      // al pulsante disegnato sul canvas.
      setFullscreen: function (hooks) { fs = hooks; }
    };
  }

  // --- Schermo intero ---
  // "Pseudo fullscreen" con contenitore fisso a 100dvh: funziona anche su iPhone, dove l'API Fullscreen non esiste per i div.
  // Dove l'API è disponibile (Android, iPad, desktop) viene richiesta in aggiunta.
  MammaRunner.enableFullscreen = function (game, container, openBtn, closeBtn) {
    var realFs = false;
    function open() {
      container.classList.add('mit-fs');
      document.documentElement.classList.add('mit-fs-lock');
      var req = container.requestFullscreen || container.webkitRequestFullscreen;
      if (req) {
        try {
          var pr = req.call(container);
          if (pr && pr.then) pr.then(function () { realFs = true; }).catch(function () {});
        } catch (e) {}
      }
      game.resize();
    }
    function close() {
      container.classList.remove('mit-fs');
      document.documentElement.classList.remove('mit-fs-lock');
      var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl) {
        var ex = document.exitFullscreen || document.webkitExitFullscreen;
        try { var pr = ex.call(document); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
      }
      realFs = false;
      game.resize();
    }
    // Uscita dal fullscreen reale (tasto indietro / Esc): chiude anche lo pseudo fullscreen
    function onFsChange() {
      var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (!fsEl && realFs) close();
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Escape' && container.classList.contains('mit-fs')) close();
    });
    if (openBtn) openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    // Il gioco disegna da sé il tasto di chiusura dentro il canvas: qui gli diamo come chiudere
    if (game.setFullscreen) {
      game.setFullscreen({
        isOpen: function () { return container.classList.contains('mit-fs'); },
        close: close
      });
    }
    return { open: open, close: close };
  };

  MammaRunner.CONFIG = CONFIG; // modificabile dall'esterno per il tuning, prima di avviare la partita
  global.MammaRunner = MammaRunner;
})(window);

// Avvio automatico sul canvas #mit-runner, se presente nella pagina.
// Le immagini sono quelle in images/ (gli sprite originali del gioco).
document.addEventListener('DOMContentLoaded', function () {
  var canvas = document.getElementById('mit-runner');
  if (!canvas) return;
  var game = MammaRunner(canvas, {
    mum: 'images/mum-hd.png',
    baby: 'images/monster.png',
    baby2: 'images/monster2.png',
    poop: 'images/poop3.png'
  });
  // Il tasto di chiusura dello schermo intero lo disegna il gioco dentro al canvas,
  // così resta visibile ovunque: qui serve solo quello di apertura.
  MammaRunner.enableFullscreen(game, game.container, document.getElementById('mit-game-open'), null);
});
