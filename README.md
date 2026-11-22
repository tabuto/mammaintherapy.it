# mammaintherapy.it

Sito di **Mamma in Therapy**: blog personale in italiano, storie di
sopravvivenza familiare. Online su <https://mammaintherapy.it/>.

Sito statico: HTML scritto a mano, un foglio di stile, due script. Nessun build
step, nessun framework, nessuna dipendenza da installare.

## Struttura

| percorso | cosa contiene |
|---|---|
| `index.html` | home: riga di presentazione, card in evidenza, gioco in canvas e classifica |
| `about-me.html` + `about-me.md` | pagina About me e il suo testo sorgente |
| `post.html` | indice dei post ospitati sul sito |
| `iniziative.html` | progetti e raccolte solidali |
| `vetrine.html` | prodotti consigliati |
| `articles/` | i post: per ognuno un `.md` (sorgente) e un `.html` (pubblicato) |
| `articles/post-template.html` | template da copiare per un post nuovo |
| `in-evidenza.md` | elenco di riferimento delle card della home |
| `sitemap.xml` | mappa del sito per i motori di ricerca |
| `llms.txt` | descrizione del sito per i motori LLM |
| `robots.txt` | `Allow: /` e rimando alla sitemap |
| `css/style.css` | tutto lo stile del sito |
| `css/ThinkNothing.woff2` | font dei titoli (il `.otf` è l'originale) |
| `css/mitblog.css` | foglio di stile del Blogspot esterno, **non** di questo sito |
| `js/mit.js` | banner cookie e invio eventi ad Analytics |
| `js/game_v3.js` | il gioco della home (`game_v2.js` e `game_v1.js` sono le versioni precedenti) |
| `api/score.php` | endpoint PHP della classifica: `GET` la top 10, `POST` registra un punteggio |
| `api/data/` | **solo sul server**: `scores.json`, lo store della classifica. Non è nel repo (`.gitignore`) e il deploy non lo tocca |
| `img/` | logo, icone social e `img/articles/` con le foto dei post |
| `images/mum-hd.png` | la mamma del gioco (gli altri sprite sono `monster*.png` e `poop3.png`) |
| `404.html`, `404.shtml`, `400.shtml`, `courtesy.html` | pagine di servizio |
| `mit/`, `pycustomers/` | materiale storico, fuori dal sito nuovo |
| `images/old/`, `images/mum.png` | sprite delle versioni precedenti del gioco |
| `backlog/` | i task svolti, con decisioni e motivazioni |
| `.github/workflows/deploy-ftp.yml` | pubblicazione via FTP |

Il blog storico, con l'archivio degli anni passati, è un Blogspot esterno:
<https://blog.mammaintherapy.it/>.

## Lavorare in locale

`file://` non basta (i percorsi sono root-assoluti), serve un server:

```sh
python3 -m http.server 8777
```

Poi <http://127.0.0.1:8777/>. Nota: in locale il banner cookie ricompare a ogni
caricamento, perché `js/mit.js` scrive il cookie con
`domain=mammaintherapy.it`, che su `127.0.0.1` viene rifiutato. Sul dominio vero
funziona.

## Pubblicare un post

In breve — la procedura completa, con tutti i controlli, è in **AGENT.md**:

1. `articles/AAAAMMGG_slug.md` con il testo (riga 1 titolo, riga 3 sottotitolo,
   dalla 5 i capoversi) e `img/articles/AAAAMMGG_slug.jpg` con la foto.
2. Le due derivate dell'immagine con ImageMagick (comandi in testa a
   `articles/post-template.html`): `-800.jpg` per la pagina, `-400.jpg` per la card.
3. Copia `articles/post-template.html` in `articles/AAAAMMGG_slug.html` e
   sostituisci i segnaposto tra `[ ]`, metadati compresi.
4. Aggiungi la card in `post.html` (e in `in-evidenza.md` + `index.html` se va
   in evidenza).
5. Aggiorna `sitemap.xml`, `llms.txt` e questo README.

La conversione `.md` → `.html` è manuale: il sito non ha un generatore.

## Pubblicazione

Ogni push su `main` fa partire il workflow **Deploy FTP**, che carica in FTPS i
soli file cambiati nella document root `httpdocs/`. I `.md`, `.github/`,
`.claude/`, `backlog/` e **`api/data/`** non vengono pubblicati: quest'ultima
contiene `scores.json`, lo store della classifica, che vive e si aggiorna solo
sul server — se il deploy lo caricasse, ogni push lo riporterebbe vuoto.

> **Nota FTPS.** L'hosting resetta il canale dati sugli upload massicci (molti
> file in una volta), ma regge bene i deploy incrementali (pochi file cambiati),
> che sono il caso normale. Un primo caricamento in una cartella vuota può quindi
> fallire con `ECONNRESET`: in quel caso conviene un upload piccolo per volta.

Il workflow si può lanciare anche a mano dalla tab Actions, con dry-run e
cartella di destinazione scelti negli input: il default
`httpdocs/_deploytest/` permette di provare senza toccare il sito, e il
risultato si vede su <https://mammaintherapy.it/_deploytest/>.

Il lavoro si fa su `release/vX.Y`, da cui si apre una PR verso `main`: il merge
pubblica.
