# AGENT.md — istruzioni operative del sito

Regole per chi lavora su `mammaintherapy.it`, persone o agenti. Valgono per
ogni modifica, anche minima. Il contesto (struttura dei file, come girare in
locale) è nel [README](README.md); le decisioni passate e il perché sono in
`backlog/`.

Il sito è **statico e senza build step**: HTML scritto a mano, un CSS, due JS.
Niente framework, niente generatore, niente dipendenze. Non introdurne senza
che sia stato chiesto.

---

## 1. Le tre regole che non si saltano

### 1.1 SEO e metadati curati su ogni pagina

Ogni pagina `.html` pubblicata deve avere, nel `<head>`, tutti questi campi
compilati e **coerenti tra loro** — mai lasciati al valore del template:

```html
<html lang="it">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>mammaintherapy - TITOLO DELLA PAGINA</title>
  <meta name="description" content="UNA FRASE, 120-160 caratteri">
  <meta name="author" content="Beatrice Santucci">
  <meta name="theme-color" content="#1b6969">
  <meta property="og:title" content="mammaintherapy - TITOLO DELLA PAGINA">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://mammaintherapy.it/PERCORSO-DI-QUESTA-PAGINA">
  <meta property="og:description" content="LA STESSA FRASE DELLA DESCRIPTION">
  <meta property="og:image" content="https://mammaintherapy.it/img/...">
  <link rel="icon" href="/favicon.ico">
```

Controlli da fare ogni volta:

- `og:url` punta **a questa** pagina, non a quella da cui è stata copiata. È
  l'errore più facile e il più dannoso: sbagliato, i social attribuiscono il
  link alla pagina sbagliata.
- `description` e `og:description` dicono la stessa cosa, in una frase che ha
  senso letta da sola fuori dal sito.
- `title` e `og:title` coincidono, nella forma `mammaintherapy - Titolo`.
- `og:image` è un URL assoluto. Per un post, la derivata `-800.jpg` del post;
  altrimenti `img/logo-250.png`.
- Un solo `<h1>` per pagina (è il titolo del sito nella testata); il titolo del
  contenuto è `<h2 class="article-title">`, i titoli delle card sono `<h3>`.
- Ogni `<img>` ha `alt` descrittivo (vuoto, `alt=""`, solo per le icone
  decorative), `width` e `height` dichiarati, e `loading="lazy"` se sta sotto la
  prima schermata.
- La voce di menu della pagina corrente porta `aria-current="page"`.
- I link esterni hanno `rel="noopener"`.
- Gli accenti e gli apostrofi nei file `.html` si scrivono come entità
  (`&egrave;`, `&ugrave;`, `&igrave;`, `&ograve;`, `&agrave;`, `&apos;`,
  `pi&ugrave;`), come nelle pagine esistenti. I sorgenti `.md` restano in UTF-8
  normale.

### 1.2 A ogni modifica dei contenuti si aggiornano sitemap, llms.txt e README

Non è un "poi lo faccio": fa parte della stessa modifica, nello stesso commit.

| file | quando va toccato | cosa va fatto |
|---|---|---|
| `sitemap.xml` | pagina aggiunta, rimossa o con il testo cambiato | aggiungi/togli il blocco `<url>`, e porta `<lastmod>` alla data della modifica (`AAAA-MM-GG`) |
| `llms.txt` | pagina o post aggiunti, descrizione del sito cambiata | aggiorna l'elenco delle pagine o dei post, e la riga di sintesi se cambia il senso del sito |
| `README.md` | file o cartelle nuove, procedure cambiate | aggiorna la tabella della struttura e le istruzioni |
| `in-evidenza.md` | cambia una card della home | aggiorna questo file **prima** di toccare `<ul class="cards">` in `index.html` |

Note sui due file per i motori:

- `llms.txt` (alla radice, servito come `https://mammaintherapy.it/llms.txt`) è
  il formato standard per i motori LLM: Markdown dentro un file `.txt`. È il
  file a cui ci si riferisce parlando del "file per gli LLM". Deve restare
  **asciutto**: niente nomi dei familiari, niente date precise di nascita o di
  lutti. La pagina About me è pubblica, ma qui serve una sintesi, non una
  scheda anagrafica facile da ricombinare.
- `sitemap.xml` elenca solo le pagine vere. Fuori: `404.html`, `404.shtml`,
  `400.shtml`, `courtesy.html`, `articles/post-template.html`, `mit/`,
  `pycustomers/`, `images/`. `robots.txt` rimanda alla sitemap: se la sitemap
  cambia nome o posizione, va corretto anche lì.

### 1.3 Tutte le pagine hanno il footer con il rimando alla privacy policy

Nessuna pagina pubblicata fa eccezione, incluse le pagine di servizio e i
post. Oggi ce l'hanno tutte tranne `400.shtml` (file vuoto) e `courtesy.html`
(contiene solo `<!-- -->`): sono due stub mai scritti, e nel momento in cui
diventano pagine vere devono avere la testata e questo footer. Il blocco è
sempre questo, in fondo al `.wrapper`:

```html
  <footer class="main-footer">
    <p class="social">
      <a href="https://www.instagram.com/mammaintherapy/" aria-label="Mamma in Therapy su Instagram"><img src="img/instagram.jpeg" width="40" height="40" alt="" loading="lazy"></a>
      <a href="https://www.facebook.com/MammainTherapy" aria-label="Mamma in Therapy su Facebook"><img src="img/logo_fb.png" width="40" height="40" alt="" loading="lazy"></a>
    </p>
    <p>&copy; 2026 Mamma in Therapy | <a href="https://blog.mammaintherapy.it/p/privacy-policy-semplificata.html" title="Privacy Policy."> Privacy Policy</a> | <a href="mailto:info@mammaintherapy.it">Contattami</a></p>
  </footer>
```

Dentro `articles/` i `src` delle immagini diventano `../img/...`, oppure
root-assoluti. Il link alla privacy policy è obbligatorio perché il sito scrive
un cookie di tracciamento (`js/mit.js` + Google Analytics 4): senza quel
rimando il banner non basta.

---

## 2. Testata comune

La testata è **duplicata in ogni file** (i `.shtml` non usano SSI): si copia a
mano da una pagina esistente. Quando si cambia, si cambia in **tutte** le
pagine, nessuna esclusa.

- Gli `href` del menu sono root-assoluti (`/vetrine.html`), così la stessa
  testata funziona in radice e dentro `articles/`.
- Voci, in quest'ordine: Home · Vetrine · Blog (esterno) · Post · Iniziative ·
  About me.
- Il menu è un `<details>` + CSS, **zero JavaScript**: non aggiungerne.

---

## 3. Pubblicare un post

Ogni post è una terna appaiata dallo **slug** (non dalla data: `.md` e foto
possono portare giorni diversi):

| cosa | dove |
|---|---|
| testo sorgente | `articles/AAAAMMGG_slug.md` |
| pagina pubblicata | `articles/AAAAMMGG_slug.html` |
| foto originale | `img/articles/AAAAMMGG_slug.jpg` |
| derivata per la pagina | `img/articles/AAAAMMGG_slug-800.jpg` |
| derivata per la card | `img/articles/AAAAMMGG_slug-400.jpg` |

Struttura del `.md`: riga 1 il titolo, riga 3 il sottotitolo, dalla riga 5 il
testo, un capoverso per paragrafo. Lo stesso vale per `about-me.md`.

Derivate con ImageMagick:

```sh
convert img/articles/SLUG.jpg -strip -resize '800x>' -quality 78 -interlace Plane \
        img/articles/SLUG-800.jpg
convert img/articles/SLUG.jpg -strip -resize 400x250^ -gravity north \
        -extent 400x250 -quality 78 img/articles/SLUG-400.jpg
```

Il `>` in `'800x>'` serve: senza, ImageMagick **ingrandisce** le foto più
piccole di 800 px, aggiungendo peso senza dettaglio.

Poi: copia `articles/post-template.html`, sostituisci i segnaposto tra `[ ]`
(metadati del `<head>` compresi, vedi §1.1), aggiungi la card in `post.html`, e
aggiorna i file di §1.2. Per una foto quadrata o verticale usa
`class="article-image article-image--portrait"`.

Il `.md` è il sorgente: se si corregge il testo pubblicato, si riporta la
correzione anche nell'HTML (con le entità) e viceversa. I due non devono
divergere.

---

## 4. CSS e JS

- Tutto lo stile sta in `css/style.css`. `css/mitblog.css` è il foglio del
  Blogspot esterno: non è usato da questo sito, non va modificato qui.
- Attenzione alla specificità: `.homepage p` (0,1,1) batte una classe singola
  (0,1,0). Per questo esistono `.card .card-text`, `.homepage .page-wip`,
  `.homepage .section-intro`. Le varianti come `.article-image--portrait` vanno
  dichiarate **dopo** la classe base, altrimenti a pari specificità perdono.
- Nel font dei titoli (ThinkNothing) l'apostrofo è illeggibile: il
  `@font-face` esclude `U+0027` e `U+2019` con `unicode-range`, così
  l'apostrofo ricade su Indie Flower. Non rimuovere quella riga.
- `js/mit.js` (banner cookie, `gaSendEvent`) e `js/game_v3.js` (il gioco) si
  caricano con `defer`. L'evento `link_go_to_blog` sulla card Blog va
  conservato.
- Analytics e **GA4 via gtag.js** (`GA4_MEASUREMENT_ID` in testa a `js/mit.js`).
  `gaInit()` inietta `gtag/js` e `gaSendEvent(categoria, azione, etichetta)`
  manda l'evento, **entrambi solo dopo il consenso** (`checkCookies()`): senza
  cookie `cc_mit_tracking=yes` non viene caricato nulla e nessun evento parte.
  `gaSendEvent` conserva la firma a tre argomenti di Universal Analytics perche
  e chiamata dalle pagine e dai `js/game_v*.js`: `ga4EventName()` traduce la
  coppia categoria/azione in un nome snake_case valido per GA4 (`game` +
  `gameOver` -> `game_over`, senza raddoppiare il prefisso), categoria e azione
  originali restano nei parametri `event_category`/`event_action` e un'etichetta
  numerica finisce anche in `value`.
- Il gioco (`js/game_v3.js`, runner v7) si avvia da sé sul canvas `#mit-runner`
  e prende gli sprite da `images/` (la mamma è `images/mum-hd.png`, ad alta
  risoluzione: va disegnata con `imageSmoothingEnabled`, non a pixel netti). Il
  canvas **deve** stare dentro `.mit-game#mit-game`: lo script misura quel
  contenitore e ci aggancia lo schermo intero, aperto da `#mit-game-open`.
  Pausa e chiusura dello schermo intero sono **disegnate dentro al canvas**, non
  in HTML: a schermo intero i pulsanti della pagina possono non vedersi (Chrome
  su macOS), quelli sul canvas sì. Non reintrodurre un tasto di chiusura HTML.
  Il bilanciamento (stress, malattia, ferie, velocità, durata delle scosse) sta
  tutto in `CONFIG` in testa al file, esposto anche come `MammaRunner.CONFIG`.
  Il gioco manda gli eventi GA4 `game_start`, `game_pause`, `game_quit` e
  `game_over` (con il punteggio in `event_label` e `value`) tramite
  `gaSendEvent`, se presente.
- Le pagine in costruzione usano `<p class="page-wip">…</p>`: quando arriva il
  contenuto vero, va rimosso (e con lui ogni frase tipo "nel frattempo").
- **Classifica del gioco.** Il game over emette sul canvas un evento
  `mit:gameover` (`detail`: `score`, `best`, `isRecord`, `durationMs`); lo
  script inline in `index.html` lo ascolta, chiede un nickname se il punteggio
  entra tra i primi 10 e lo invia a `api/score.php` (`GET` la top 10, `POST`
  registra). Lo store è `api/data/scores.json` (una voce per nickname, la
  migliore; max 10). Scelte: **niente login** (solo nickname, salvato in
  `localStorage` come `mit_lb_nick`), mitigazioni anti-cheat **leggere** (tetto
  al punteggio, coerenza punti/durata, nickname ripulito e filtrato), **nessun
  IP** registrato né rate limit per IP. Privacy: si salva solo un nickname
  libero e un numero, nessun dato personale, nessun trasferimento a terzi → la
  privacy policy non cambia. La classifica alimentata dal browser è
  falsificabile: una riga palesemente falsa si cancella a mano dal JSON. I
  parametri (tetti, soglie, blocklist) sono costanti in testa a `api/score.php`.

---

## 5. Prima di committare

1. **Controlli statici**: tag nidificati bene, graffe CSS bilanciate, sintassi
   JS, e ogni `src`/`href` locale che risolve a un file che esiste davvero.
2. **XML/YAML validi** se sono stati toccati `sitemap.xml` o il workflow:
   ```sh
   python3 -c "import xml.dom.minidom as m; m.parse('sitemap.xml'); print('ok')"
   python3 -c "import yaml,io; yaml.safe_load(io.open('.github/workflows/deploy-ftp.yml')); print('ok')"
   ```
3. **Prova a video** su `python3 -m http.server 8777`, anche a larghezza
   telefono: hamburger che apre e chiude, card in griglia, footer presente,
   gioco che parte.
4. **Checklist di §1**: metadati, sitemap + llms.txt + README, footer con
   privacy policy.

Lavoro su `release/vX.Y`, PR verso `main`. Il merge su `main` pubblica: non si
committa su `main` direttamente.

---

## 6. Pubblicazione via FTP

`.github/workflows/deploy-ftp.yml`, ad ogni push su `main`.

- La destinazione è `httpdocs/`, **non** `./`: il login FTP arriva nella root
  dell'account, che non è la document root servita da nginx. Con `./` il
  deploy riesce e il sito non cambia. È già capitato: vedi il commit
  "Deploy into httpdocs/, not the FTP login root".
- FTPS con `security: strict`: pretende che il secret `FTP_SERVER` sia
  l'hostname del certificato, non un IP. `strict` e `FTP_SERVER` si cambiano
  insieme.
- Il deploy è incrementale e si basa su `.ftp-deploy-sync-state.json` scritto
  nella cartella di destinazione: se il log dice "this must be your first
  publish" e non lo è, si sta guardando nella cartella sbagliata.
- Non vengono pubblicati: `**/*.md`, `.github/`, `.claude/`, `backlog/`,
  `.git*` e **`api/data/`**. Quindi README.md, AGENT.md e i sorgenti `.md`
  restano nel repo. `llms.txt`, `sitemap.xml` e `robots.txt` **sì**, vengono
  pubblicati.
- `api/data/` è escluso di proposito: contiene `scores.json`, lo store della
  classifica del gioco, che vive e si aggiorna **solo sul server**. Se il deploy
  lo caricasse, ogni push riporterebbe la classifica a vuota. È anche in
  `.gitignore`, quindi non finisce nel repo. Il PHP crea cartella e file da sé
  al primo punteggio.
- L'hosting resetta il canale dati FTPS sugli **upload massicci** (prima
  pubblicazione in una cartella vuota, molti file in una volta): fallisce con
  `ECONNRESET` sul data socket. I deploy **incrementali** (pochi file cambiati)
  passano senza problemi, ed è il caso normale.
- Per provare senza rischi: run manuale dalla tab Actions con `dry_run=true`,
  o con `server_dir=httpdocs/_deploytest/` per un upload vero ma isolato,
  visibile su `https://mammaintherapy.it/_deploytest/`.

---

## 7. Contenuti: cosa non decidere da soli

- Il testo dei post e delle pagine è di Beatrice. Si correggono refusi e si
  ripulisce il markup incollato da Word (`class="MsoNormal"`, `<o:p>`,
  `mso-spacerun`), non si riscrive il tono né si accorciano i racconti.
- I dati personali della famiglia stanno nell'About me perché è lei ad averli
  scritti lì. Non vanno replicati in metadati, `llms.txt`, `alt` delle immagini
  o commenti.
- Niente nuovi script di tracciamento, pixel o servizi esterni senza che sia
  stato chiesto: cambierebbero quello che la privacy policy dichiara.
