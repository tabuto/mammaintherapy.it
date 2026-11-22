# Task 02 — Classifica del gioco (record utenti + top 10)

**Branch:** `release/v2.4`
**Data:** 22 novembre 2026
**Stato:** implementato (in attesa della prova a video sul server con PHP)

---

## 1. Istruzione ricevuta

> vorrei poter salvare il record degli utenti e visualizzare una classifica…
> che opzioni ho a costo zero? […] crea un nuovo task con la proposta per la
> gestione della classifica tramite php+json

## 2. Punto di partenza

Oggi il gioco (`js/game_v3.js`) tiene il record personale in `localStorage`
sotto la chiave `mit_runner_best` (riga ~132 in lettura, ~185 in scrittura):
è **per-browser e invisibile agli altri**. Una classifica condivisa richiede
per forza uno store lato server che accetti scritture.

## 3. Opzioni valutate (tutte a costo zero)

| opzione | costo | il problema |
|---|---|---|
| **PHP + file JSON sull'hosting attuale** | 0 reale | introduce PHP in un sito "statico" |
| Supabase (Postgres + REST) | free tier | il progetto free va in pausa dopo ~1 settimana di inattività |
| Firebase Firestore (Spark) | free tier | dipendenza esterna + ~100 KB di SDK sulla home |
| Cloudflare Workers + D1/KV | free tier | infrastruttura separata da manutenere |
| Google Apps Script su uno Sheet | 0 | lento (1-2 s), quote, fragile |
| GA4 (già integrato) | 0 | **non adatto**: latenza di ore, campionamento, dati non leggibili dal browser |

**Scelta: PHP + file JSON sull'hosting attuale.** Motivi:

- zero costi *e* zero account nuovi: l'hosting (nginx + Plesk, `web.titano.vhosting-it.com`) è già pagato;
- non va in pausa per inattività, al contrario del free tier di Supabase;
- i dati restano sul dominio → la privacy policy non cambia (nessun trasferimento a terzi da dichiarare);
- il frontend resta a dipendenze zero (vincolo di `AGENT.md`): una sola `fetch()`.

Il file JSON basta per i volumi attesi; con `flock` in scrittura regge senza
corruzione. Se un giorno cresce, si passa a MySQL **senza toccare il JS**
(cambia solo l'interno di `score.php`).

**Prerequisito da verificare:** che l'hosting serva PHP. Prova: caricare un
`ping.php` con `<?php echo PHP_VERSION;` e aprirlo. Se non c'è PHP, ripiego su
Cloudflare Workers + D1 (seconda scelta: non dorme, gratis a questi volumi, ma
è un pezzo di infrastruttura in più).

## 4. Disegno proposto

Un solo endpoint: **`api/score.php`**.

- `GET  /api/score.php` → JSON con la **top 10**: `[{ "n": "nick", "p": 1234, "t": 1700000000 }, …]`
- `POST /api/score.php` con body `{ "nickname": "...", "punti": 1234 }` → inserisce
  se il punteggio entra in classifica, risponde con la top 10 aggiornata.

Store: `api/scores.json` (fuori dalla sitemap, non indicizzato). In scrittura
`flock(LOCK_EX)`; si tiene una top-N corta (es. 50) e si pubblica la top 10.

Lato gioco (`js/game_v3.js`): al game over, se il punteggio supera il record,
chiedere un **nickname** (pre-compilato dall'ultimo salvato in `localStorage`,
così non si ridigita), fare il `POST`, poi mostrare la classifica. La classifica
si può mostrare nella schermata di game over e/o in un pannellino nella home
sotto il canvas.

## 5. Nodi da decidere (non dopo: insieme al codice)

### 5.1 Identità
Niente login. Un nickname chiesto al game over e ricordato in `localStorage`.
Da filtrare: lunghezza massima (es. 16), caratteri ammessi, e una lista di
parolacce/nomi offensivi — su un sito di mamme ci scriveranno di tutto.

### 5.2 Barare (importante)
Una classifica alimentata dal browser è **falsificabile per definizione**:
chiunque apre la console e fa il `POST` a mano. Non si risolve, si mitiga.
Mitigazioni proposte, dalla più leggera alla più solida:

- tetto a un punteggio massimo plausibile (scarto i valori assurdi);
- controllo di coerenza punti/durata della partita (il `POST` manda anche la
  durata; un punteggio troppo alto per il tempo trascorso si rifiuta);
- rate limit per IP (poche scritture al minuto);
- HMAC calcolato a fine partita con un segreto lato server, rispedito nel `POST`
  e riverificato: alza l'asticella senza renderla invalicabile.

Per un gioco di intrattenimento la proposta è: **mitigazioni leggere** (tetto +
coerenza + rate limit) e la possibilità di **cancellare a mano** una riga
assurda dal JSON. L'HMAC si aggiunge solo se compaiono punteggi gonfiati.

### 5.3 Privacy
Il nickname è un dato inserito liberamente; niente email, niente dato personale
obbligatorio. I dati restano sul dominio. Nessun trasferimento a terzi → la
privacy policy attuale copre già il caso. Da valutare solo se si logga l'IP per
il rate limit: in tal caso va menzionato (IP tecnico, conservazione breve).

## 6. File previsti

- `api/score.php` — endpoint GET/POST
- `api/scores.json` — store (creato al primo avvio; **escluso** da sitemap e deploy se si vuole non sovrascriverlo a ogni push — da decidere)
- `js/game_v3.js` — invio punteggio + richiesta nickname + resa classifica
- `index.html` — eventuale pannello classifica sotto il canvas
- aggiornare `AGENT.md`, `README.md`, `sitemap.xml`/`llms.txt` secondo le regole

**Attenzione al deploy:** il workflow FTP carica i file cambiati. `api/scores.json`
vive **solo sul server** e si riempie lì: non va sovrascritto dal deploy. Va
escluso dall'upload (come già `.md`, `.github/`, ecc.) o tenuto fuori dal repo,
altrimenti ogni push lo riporta vuoto. Da definire in fase di implementazione.

## 7. Da verificare prima di partire

- [ ] L'hosting serve PHP? (`ping.php` con `PHP_VERSION`)
- [ ] Dove può scrivere PHP con permessi corretti (cartella `api/` scrivibile)
- [ ] Decidere: classifica solo nel game over, o anche pannello in home
- [ ] Decidere la politica anti-cheat (leggera vs HMAC)
- [ ] Decidere la gestione di `scores.json` rispetto al deploy FTP

## 8. Rimandato / fuori scope di questo task

- Passaggio a MySQL (solo se il volume lo richiede; credenziali del nuovo
  hosting, **non** quelle vecchie di `pycustomers`)
- Profili utente, login, condivisione social del punteggio

---

## Nota collegata — sicurezza (fatto in questa sessione)

Durante l'analisi è emerso che `pycustomers/.htaccess` era tracciato nel repo
pubblico con credenziali in chiaro (MySQL, SMTP, due secret Flask). Rimosso in
`733744b`. La password MySQL risulta nei corpus pubblici di *Pwned Passwords*
(5 riscontri); la SMTP è stata aggiornata. Il file resta nella **history** del
repo: toglierlo di lì richiede `git filter-repo` + force-push, non fatto.
Da ruotare/dismettere, se ancora esistono: DB e utente MySQL `dm4r2ot1_pycustomers`,
e i secret dell'app Flask se gira ancora da qualche parte.

---

## 9. Decisioni prese e implementazione (22 novembre 2026)

**Check PHP (prerequisito §7): superato.** `ping.php` temporaneo caricato in
`httpdocs/` → **PHP 8.4.28** (PHP-FPM, `cgi-fcgi`), scrittura su cartella `ok`,
estensione JSON presente. Probe poi rimosso. Via PHP + JSON confermata.

Risposte ai nodi della §5:

| nodo | scelta |
|---|---|
| 5.1 identità | **niente login**: solo nickname, salvato in `localStorage` (`mit_lb_nick`), pre-compilato al game over |
| 5.2 anti-cheat | solo **mitigazioni leggere**: tetto assoluto al punteggio, coerenza punti/durata, nickname ripulito e filtrato. **Niente** rate limit per IP |
| 5.3 privacy | **nessun IP** registrato né filtrato. Si salva solo nickname + punteggio → nessun dato personale, policy invariata |
| guardia DoS | corpo POST limitato (1 KB), classifica tenuta a **max 10** voci (file di dimensione costante), scrittura su disco **solo** se il punteggio entra davvero |
| parità di nick | una sola voce per nickname: va in **update** solo se è un record personale (punteggio più alto) |
| deploy | `api/data/**` escluso dal workflow FTP e in `.gitignore`: `scores.json` vive solo sul server |

### File

- **`api/score.php`** — `GET` top 10, `POST {nickname, punti, durata_ms}`.
  Store `api/data/scores.json` (creato da sé al primo punteggio). Parametri
  tunabili in testa (`MAX_POINTS`, `MAX_POINTS_PER_SEC`, `MIN_DURATION_MS`,
  `MAX_BODY_BYTES`, `TOP_N`, `BLOCKLIST`). Scrittura con `flock(LOCK_EX)`.
- **`js/game_v3.js`** — `start()` registra l'istante d'avvio; `gameOver()` emette
  l'evento `mit:gameover` sul canvas con `score`, `best`, `isRecord`, `durationMs`.
- **`index.html`** — pannello `.mit-leaderboard` sotto al gioco + script inline:
  carica la top 10, al game over chiede il nickname se il punteggio qualifica,
  invia il `POST`, ridisegna. Nickname reso con `textContent` (niente XSS).
  Se PHP non risponde (server locale senza PHP) il pannello resta nascosto.
- **`css/style.css`** — stili del pannello e della lista.
- **`.github/workflows/deploy-ftp.yml`** — aggiunto `api/data/**` all'`exclude`.
- **`.gitignore`** (nuovo) — ignora `api/data/`.
- **`README.md`, `AGENT.md`, `sitemap.xml`** — aggiornati (struttura, nota deploy,
  `lastmod` della home).

### Dove si mostra la classifica

Deciso un **pannello HTML sotto al canvas** (sempre visibile in home) invece del
disegno dentro al canvas: più semplice, accessibile, e permette un vero campo di
testo per il nickname (il game over nel canvas non lo consentirebbe senza codice
di input su misura). Il form compare solo quando il punteggio entra tra i primi 10.

### Da verificare sul server (non fattibile in locale: niente PHP qui)

- [ ] `GET /api/score.php` → `{"ok":true,"top":[]}` al primo colpo
- [ ] una partita vera: il form appare, il `POST` salva, il pannello si aggiorna
- [ ] `api/data/scores.json` creato con permessi giusti e **non** sovrascritto dal deploy
- [ ] mbstring attivo (c'è il ripiego `lc()`, ma meglio confermarlo)
