# Task 01 — Refactor: navigazione, sezioni, template post

**Branch:** `release/v2.0`
**Data:** 21 novembre 2026
**Stato:** fatto (in attesa della prova a video e del commit)

---

## 1. Istruzioni ricevute

> il logo mettilo in alto a destra del titolo, a sinistra prevedi un hamburgher menu
> con le sezioni (vetrine,blog,post,iniziative,about me) nella home page ci saranno a
> tendere una serie di link o tile o card (da decidere) verso una selezione di pagine
> in evidenza. prepara una pagina template "post" che prevede nello stesso stile:
> titolo, sottotitolo, data, foto, testo. link vetrina amazon:
> `https://l.instagram.com/?u=https%3A%2F%2Fblog.mammaintherapy.it%2Fp%2Fprodotti-consigliati.html%3Fm%3D1%26utm_source%3Dig%26utm_medium%3Dsocial%26utm_content%3Dlink_in_bio%26fbclid%3DPAZXh0bgNhZW0CMTEAcGRvZgJzcnRjBmFwcF9pZA85MzY2MTk3NDMzOTI0NTkAAaeRfBdjDmi9pLTbbq1ZGdZHE6XIoAZsPFAT3eaTF7KZphTrkBWKnLj5C5qymg_aem_juZxOTBnhaK-7rWsuF90Eg&e=AUBp1C68Sxur7ssEix0sXLpz_M8XrgZrU_la02u0t7cNYIpuoEwq2OI6EelkwNARnWSg7m7VhTNQTz4j2HlciaS-BI4sV1QD8m_HQalH7jFj1xrtpV0I2CcwCDPZbMc`
> ogni post/articolo ha un immagine, un file .md ed un file html. applica queste
> modifiche. prevedi già le pagine e le sezioni che ti ho indicato, dove non hai
> informazioni inserisci (pagina in costruzione). crea la cartella backlog inserisci
> il primo task01-refactor.md con queste istruzioni ed il piano di implementazione

## 2. Decisioni prese

| tema | scelta | perché |
|---|---|---|
| Contenuti in evidenza in home | Card con immagine | Più invitanti di una lista; reggono bene anche con pochi contenuti |
| Blog vs Post | **Blog** = link esterno a `blog.mammaintherapy.it`; **Post** = indice degli articoli ospitati qui | Le due voci del menu indicano due archivi diversi |
| Link vetrina | URL pulito `https://blog.mammaintherapy.it/p/prodotti-consigliati.html` | Il redirect `l.instagram.com` contiene una firma di sessione (`e=`) e un `fbclid` che scadono: da un link permanente sul sito è meglio evitarlo. L'originale resta qui sopra come traccia di provenienza |
| Calendario dell'Avvento | Pubblicato come prima iniziativa | Testo `.md` e foto erano già in cartella; serve anche da collaudo reale del template |
| Menu | `<details>` + CSS, **zero JavaScript** | Apribile da tastiera e da tocco senza codice; coerente con l'alleggerimento del giro precedente |

## 3. Convenzione dei contenuti

Ogni post è una terna, appaiata dallo **slug** (non dalla data: `.md` e foto possono
portare giorni diversi):

| cosa | dove |
|---|---|
| testo sorgente | `articles/AAAAMMGG_slug.md` |
| pagina pubblicata | `articles/AAAAMMGG_slug.html` |
| foto originale | `img/articles/AAAAMMGG_slug.jpg` |
| derivata per la pagina | `img/articles/AAAAMMGG_slug-800.jpg` |
| derivata per la card | `img/articles/AAAAMMGG_slug-400.jpg` |

Le derivate si generano con ImageMagick:

```sh
convert img/articles/SLUG.jpg -strip -resize '800x>' -quality 78 -interlace Plane \
        img/articles/SLUG-800.jpg
convert img/articles/SLUG.jpg -strip -resize 400x250^ -gravity north \
        -extent 400x250 -quality 78 img/articles/SLUG-400.jpg
```

La conversione `.md` → `.html` è **manuale**: si copia `articles/post-template.html`,
si sostituiscono i segnaposto tra `[ ]` e si aggiunge la card in `post.html`.
Il sito non ha build step e non ne acquisisce uno con questo task.

`articles/i-nuovi-noi.html` è precedente alla convenzione: resta al suo URL (niente
prefisso di data), ma ha ora il suo `i-nuovi-noi.md` e le derivate dell'immagine.

## 4. Testata comune

```
┌──────────────────────────────────────────────┐
│  ☰        MAMMA IN THERAPY           [logo]  │
└──────────────────────────────────────────────┘
```

- `<header class="main-head">` è una griglia `1fr auto 1fr`: nav a sinistra, titolo al
  centro, logo a destra (64px da telefono, 86px da ≥700px).
- L'hamburger c'è **a tutte le larghezze** e apre un pannello a tendina. Tutto in CSS.
  Un primo tentativo trasformava il menu in barra orizzontale sopra i 700px, ma non
  funzionava: Chrome ora nasconde il contenuto di un `<details>` chiuso con
  `content-visibility` sul pseudo-elemento `::details-content`, non più con
  `display:none` sui figli, quindi la regola che riportava in vista la lista non aveva
  effetto e su desktop non si vedeva nessun menu. Niente barra: l'hamburger era anche
  quello che era stato chiesto.
- Voci: Home · Vetrine · Blog (esterno) · Post · Iniziative · About me.
- Gli href del menu sono **root-assoluti** (`/vetrine.html`), così la stessa testata
  funziona identica in radice e dentro `articles/`. La pagina corrente è marcata con
  `aria-current="page"` ed evidenziata.

## 5. File creati

- `vetrine.html` — card verso i prodotti consigliati + segnaposto per le altre vetrine
- `post.html` — indice dei post locali
- `iniziative.html` — Calendario dell'Avvento + segnaposto
- `about-me.html` — segnaposto + rimando a Instagram
- `articles/post-template.html` — template post (titolo, sottotitolo, data, foto, testo)
- `articles/20261121_calendario_avvento.html` — primo post, dal `.md` esistente
- `articles/i-nuovi-noi.md` — sorgente mancante, ricavato dall'HTML pubblicato
- `img/articles/*-800.jpg`, `img/articles/*-400.jpg` — derivate delle due foto
- `backlog/task01-refactor.md` — questo file

## 6. File modificati

- `index.html` — nuova testata, logo tolto dalla card (è salito in testata), griglia di
  5 card in evidenza, il gioco resta sotto invariato
- `css/style.css` — `.main-head` a griglia, `.menu*` (hamburger + pannello + barra),
  `.cards`/`.card*`, `.article-subtitle`, `.article-tags`, `.page-wip`, `.section-intro`
- `articles/i-nuovi-noi.html` — rifatto sulla testata nuova e sul template post
- `404.html`, `404.shtml` — stessa testata, stessa pulizia

## 7. File rimosso

- `articles/article-template.html` — sostituito da `articles/post-template.html`, che
  aggiunge il sottotitolo e la testata nuova. Resta recuperabile da git.

## 8. Scelte di contenuto da confermare

- La home non dice più "Pagina in costruzione... nel frattempo..." e non ha più il
  bottone "Vai al BLOG!": al loro posto una riga di presentazione e le card (il Blog è
  una card e una voce di menu). L'evento Analytics `goToBlog` è conservato: la card
  Blog chiama ancora `goToBlog()`.
- Nel post del Calendario dell'Avvento, rispetto al `.md`: tolto "Vedi meno" (residuo
  del copia-incolla da Instagram) e la parola "condivisione" rimasta fuori dagli
  hashtag; corretto "il Calendario il dell'Avvento" → "il Calendario dell'Avvento";
  "Scrivimi in DM" è diventato un link al profilo Instagram. Il `.md` **non** è stato
  toccato: resta il sorgente come l'hai scritto.
- Copyright del piè di pagina: 2026 su tutte le pagine.

## 8bis. Difetti trovati durante la prova a video e corretti

- **Menu invisibile su desktop** — vedi sopra: via la barra orizzontale, hamburger sempre.
- **Hamburger finito su una seconda riga, a destra** — `.main-nav` si portava dietro
  `grid-area: nav` dalla griglia di `.wrapper`, dove però non vive più: dentro
  `.main-head` quel nome creava colonne fantasma (la testata risultava di 5 colonne).
  Regola rimossa.
- **Copertine delle card tagliate ai lati** — l'attributo `height="250"` dell'`<img>` è
  un hint di presentazione che vinceva sull'`aspect-ratio`: mancava `height: auto`.
- **Testo delle card, `.page-wip` e `.section-intro` fuori posto** — `.homepage p`
  (specificità 0,1,1) batteva le classi singole (0,1,0) e imponeva centratura e
  margini. Risolto con `.card .card-text`, `.homepage .page-wip`, ecc.
- **Apostrofo illeggibile nei titoli** — in ThinkNothing sia `U+0027` sia `U+2019` sono
  due scarabocchi ("dell'Avvento" diventava "dell_&_Avvento"). Il `@font-face` ora
  esclude quei due codepoint con `unicode-range`, così il solo apostrofo ricade su
  Indie Flower.
- **Una sola card che si gonfiava a tutta larghezza** (pagina Vetrine): `auto-fit`
  → `auto-fill`.

Non verificato: la resa a larghezza telefono. La finestra di Chrome non si lascia
ridimensionare da qui (resta a 1922px); da controllare col device toolbar o dal
telefono. Nota: in locale il banner cookie ricompare a ogni caricamento perché
`js/mit.js` scrive il cookie con `domain=mammaintherapy.it`, che su `127.0.0.1` viene
rifiutato. Sul dominio vero funziona.

## 8ter. Secondo giro di modifiche

- **Home** aggiunta come prima voce del menu (la pagina corrente resta marcata con
  `aria-current="page"`, quindi in home la voce Home è evidenziata).
- **In evidenza**: la prima card punta ora direttamente all'articolo del Calendario
  dell'Avvento invece che alla sezione Iniziative, con occhiello
  «Iniziativa · 21 Novembre 2026».
- **`in-evidenza.md`** (radice): elenco di riferimento delle card della home, con link,
  immagine, occhiello e testo di ognuna, più le istruzioni per cambiarle. È il file da
  aggiornare prima di toccare il blocco `<ul class="cards">` di `index.html`.
- **About me** non è più un semplice segnaposto: ha la foto `img/articles/about-me.jpg`
  (derivate `-800` per la pagina e `-400` per la card in home) ed è impaginata come un
  articolo (titolo, sottotitolo, foto, testo). Il testo resta «(pagina in costruzione)».
- **`about-me.md`** (radice, accanto a `about-me.html`): sorgente dedicato della pagina,
  con in coda un commento che spiega quale riga diventa cosa.
- Nuova variante CSS `.article-image--portrait` (max 420 px) per le foto quadrate o
  verticali, che altrimenti si prendono tutta la pagina: la usa `about-me.html`.
  Va dichiarata **dopo** `.article-image`, altrimenti a pari specificità perde.
- Nota sulle derivate: per le immagini più piccole di 800 px usare `-resize '800x>'`
  (con il maggiore) invece di `-resize 800x`, altrimenti ImageMagick le ingrandisce
  aggiungendo peso senza dettaglio — è successo con `about-me.jpg`, che è larga 674 px.

## 9. Rimandato (prossimi task)

- [ ] Contenuti veri di **About me** e delle altre **Vetrine** (libri, giochi, regali)
- [ ] Altre **iniziative** oltre al Calendario dell'Avvento
- [ ] La testata è duplicata in ogni file: i `.shtml` presenti **non** usano SSI, quindi
      per ora si copia a mano. Se le pagine crescono, valutare un include lato server o
      un piccolo generatore
- [ ] Eventuale generatore `.md` → `.html`, se i post diventano molti
- [ ] `css/mitblog.css` è il foglio di stile del Blogspot esterno: fuori da questo lavoro
- [ ] Convertire anche le foto in WebP/AVIF se il peso delle card dovesse crescere

## 10. Verifica

1. Controlli statici: sintassi JS, graffe CSS bilanciate, nidificazione dei tag,
   e ogni `src`/`href` locale che risolve a un file esistente.
2. Prova a video (serve un server locale, `file://` non basta):
   ```sh
   cd /mnt/ssd_170gb/projects/github/mammaintherapy.it && python3 -m http.server 8777
   ```
   Poi su `http://127.0.0.1:8777/`: hamburger che apre e chiude sotto i 700px, barra
   orizzontale sopra, logo in testata, card in griglia, pagina post, gioco che parte.
