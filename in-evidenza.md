# In evidenza

Questo file è l'elenco di riferimento delle card che compaiono nella home, in
`index.html`, nell'ordine in cui appaiono. Chi cambia la home cambia prima questo
file, poi riporta le stesse voci nel blocco `<ul class="cards">` di `index.html`.

Campi di ogni voce:

- **link** — dove porta la card (percorso dalla radice del sito, o URL esterno)
- **immagine** — la copertina `-400.jpg`; se manca, la card usa una copertina
  disegnata in CSS con l'iniziale (classe `card-cover--draw`)
- **occhiello** — la riga piccola sopra il titolo (facoltativa)
- **testo** — la riga di descrizione sotto il titolo

---

## 1. Calendario dell'Avvento Solidale

- **tipo:** articolo
- **link:** `/articles/20261121_calendario_avvento.html`
- **immagine:** `img/articles/20261121_calendario_avvento-400.jpg`
- **occhiello:** Iniziativa · 21 Novembre 2026
- **testo:** 24 giorni, 24 piccoli gesti: una scatola che a Natale diventa un aiuto concreto.

## 2. Post

- **tipo:** sezione
- **link:** `/post.html`
- **immagine:** `img/articles/i-nuovi-noi-400.jpg`
- **testo:** Storie di sopravvivenza familiare, scritte e ospitate qui.

## 3. Vetrine

- **tipo:** sezione
- **link:** `/vetrine.html`
- **immagine:** nessuna (copertina disegnata, iniziale «V»)
- **testo:** I prodotti che uso davvero e che mi sento di consigliare.

## 4. Blog

- **tipo:** link esterno
- **link:** `https://blog.mammaintherapy.it/`
- **immagine:** nessuna (copertina disegnata, iniziale «B»)
- **testo:** Il diario completo, con tutto l'archivio degli anni passati.
- **nota:** la card chiama `goToBlog()`, che registra l'evento Analytics prima di uscire dal sito

## 5. About me

- **tipo:** pagina
- **link:** `/about-me.html`
- **immagine:** `img/articles/about-me-400.jpg`
- **testo:** Chi sono, come è nato Mamma in Therapy e perché.

---

## Come si cambia una voce in evidenza

1. Modifica o riordina le voci qui sopra.
2. Se la voce nuova è un articolo, serve la copertina: dalla foto originale
   `img/articles/SLUG.jpg` ricava la derivata da 400 px
   (il comando è in testa a `articles/post-template.html`).
3. Riporta le voci nel blocco `<ul class="cards">` di `index.html`, nello stesso
   ordine. La struttura di una card è:

   ```html
   <li>
   <a class="card" href="[link]">
     <img class="card-cover" src="[immagine]" width="400" height="250" alt="[descrizione]" loading="lazy">
     <div class="card-body">
       <h3 class="card-title">[titolo]</h3>
       <p class="card-meta">[occhiello]</p>
       <p class="card-text">[testo]</p>
     </div>
   </a>
   </li>
   ```

   Senza foto, al posto dell'`<img>` va:

   ```html
   <span class="card-cover card-cover--draw" aria-hidden="true">V</span>
   ```

4. Le card si dispongono da sole in griglia: non serve toccare il CSS per
   aggiungerne o toglierne.
