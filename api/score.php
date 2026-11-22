<?php
/**
 * Classifica del gioco "Mamma in Therapy: la fuga".
 *
 *   GET  /api/score.php            -> { "ok": true, "top": [ {n,p,t}, ... ] }  (max 10)
 *   POST /api/score.php  JSON body  { "nickname": "...", "punti": 1234, "durata_ms": 65000 }
 *                                   -> { "ok": true, "top": [...], "rank": 3 }  (rank = posizione 1-based, o null)
 *
 * Store: data/scores.json (una sola voce per nickname, la migliore). Il file
 * non viene mai pubblicato dal deploy (il workflow esclude api/data/): vive e si
 * aggiorna solo sul server.
 *
 * Scelte (task02):
 *  - niente login: solo un nickname scelto al game over;
 *  - mitigazioni anti-cheat LEGGERE: tetto assoluto al punteggio, coerenza
 *    punti/durata, nickname ripulito e filtrato. NIENTE rate limit per IP e
 *    NIENTE IP registrato (privacy: nessun dato personale, policy invariata);
 *  - guardia anti-DoS: corpo della richiesta limitato, la classifica tiene al
 *    massimo i primi 10 (file di dimensione costante) e si scrive su disco solo
 *    quando il punteggio entra davvero in classifica.
 *
 * Questo frontend e' falsificabile per definizione (chiunque puo' chiamare il
 * POST a mano): le guardie alzano l'asticella, non la rendono invalicabile. Una
 * riga palesemente falsa si cancella a mano da data/scores.json.
 */

declare(strict_types=1);

// ---- Parametri (tunabili) ------------------------------------------------
const TOP_N               = 10;        // voci tenute in classifica
const MAX_NICK_LEN        = 16;        // caratteri del nickname
const MAX_POINTS          = 100000;    // tetto assoluto di sicurezza
const MAX_POINTS_PER_SEC  = 100;       // coerenza: punti al secondo plausibili (il gioco ne da' ~30/s al massimo)
const POINTS_GRACE        = 60;        // margine per le partite molto brevi
const MIN_DURATION_MS     = 2000;      // una partita con punti dura almeno 2s
const MAX_BODY_BYTES      = 1024;      // guardia DoS: corpo POST piu' grande = rifiutato

// Lista (estendibile) di termini non ammessi nel nickname. Confronto su testo
// minuscolo senza spazi/punteggiatura: blocca anche "p.o.r.c.o" e simili.
const BLOCKLIST = [
  'cazzo', 'merda', 'stronz', 'puttan', 'troia', 'vaffanculo', 'figa',
  'coglion', 'bastard', 'porcodio', 'diocane', 'negro', 'frocio',
  'fuck', 'shit', 'bitch', 'nigger', 'admin', 'mammaintherapy'
];

// --------------------------------------------------------------------------
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$DATA_DIR  = __DIR__ . '/data';
$DATA_FILE = $DATA_DIR . '/scores.json';

function fail(int $code, string $msg): void {
  http_response_code($code);
  echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_SLASHES);
  exit;
}

/** minuscolo UTF-8, con ripiego se mbstring non e' attivo. */
function lc(string $s): string {
  return function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s);
}

/** Legge e ordina la classifica dal file (senza lock: sola lettura). */
function read_board(string $file): array {
  if (!is_file($file)) return [];
  $raw = @file_get_contents($file);
  if ($raw === false || $raw === '') return [];
  $data = json_decode($raw, true);
  if (!is_array($data)) return [];
  return $data;
}

/** Ripulisce il nickname: niente caratteri di controllo, niente <>&"', lunghezza massima. */
function clean_nick(string $raw): string {
  $n = trim($raw);
  $n = preg_replace('/[\x00-\x1F\x7F]/u', '', $n);      // via i caratteri di controllo
  $n = preg_replace('/[<>&"\']/u', '', $n);              // via i caratteri a rischio XSS/HTML
  $n = preg_replace('/\s+/u', ' ', $n);                  // spazi collassati
  $n = trim($n);
  if (function_exists('mb_substr')) $n = mb_substr($n, 0, MAX_NICK_LEN, 'UTF-8');
  else                              $n = substr($n, 0, MAX_NICK_LEN);
  return $n;
}

/** true se il nickname contiene un termine della blocklist. */
function is_blocked(string $nick): bool {
  $flat = lc($nick);
  $flat = preg_replace('/[^a-z0-9àèéìòù]/u', '', $flat); // solo lettere/cifre, per scoprire gli offuscamenti
  foreach (BLOCKLIST as $bad) {
    if ($flat !== '' && strpos($flat, $bad) !== false) return true;
  }
  return false;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ---- GET: restituisce la classifica --------------------------------------
if ($method === 'GET') {
  echo json_encode(['ok' => true, 'top' => read_board($DATA_FILE)], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  exit;
}

if ($method !== 'POST') fail(405, 'Metodo non consentito');

// ---- POST: registra un punteggio -----------------------------------------

// Guardia DoS: rifiuta i corpi troppo grandi prima ancora di leggerli.
$len = isset($_SERVER['CONTENT_LENGTH']) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
if ($len > MAX_BODY_BYTES) fail(413, 'Richiesta troppo grande');

$body = file_get_contents('php://input', false, null, 0, MAX_BODY_BYTES + 1);
if ($body === false || strlen($body) > MAX_BODY_BYTES) fail(413, 'Richiesta troppo grande');

$in = json_decode($body, true);
if (!is_array($in)) fail(400, 'JSON non valido');

$nick  = clean_nick((string) ($in['nickname'] ?? ''));
if ($nick === '') $nick = 'Anonima';
if (is_blocked($nick)) fail(422, 'Nickname non consentito');

// Punti: intero, non negativo, sotto il tetto assoluto.
$punti = $in['punti'] ?? null;
if (!is_int($punti) && !(is_string($punti) && ctype_digit($punti))) fail(400, 'Punti non validi');
$punti = (int) $punti;
if ($punti < 0 || $punti > MAX_POINTS) fail(422, 'Punteggio fuori scala');

// Coerenza punti/durata: un punteggio positivo richiede una durata plausibile.
if ($punti > 0) {
  $dur = $in['durata_ms'] ?? null;
  $dur = (is_int($dur) || (is_string($dur) && ctype_digit($dur))) ? (int) $dur : 0;
  if ($dur < MIN_DURATION_MS) fail(422, 'Partita troppo breve per questo punteggio');
  $maxPlausibile = (int) ceil(($dur / 1000) * MAX_POINTS_PER_SEC) + POINTS_GRACE;
  if ($punti > $maxPlausibile) fail(422, 'Punteggio non plausibile per la durata');
}

// ---- Scrittura con lock esclusivo ----------------------------------------
if (!is_dir($DATA_DIR)) @mkdir($DATA_DIR, 0775, true);

$fp = @fopen($DATA_FILE, 'c+');
if ($fp === false) fail(500, 'Store non scrivibile');
if (!flock($fp, LOCK_EX)) { fclose($fp); fail(500, 'Store occupato'); }

$raw   = stream_get_contents($fp);
$board = json_decode($raw ?: '[]', true);
if (!is_array($board)) $board = [];

// Una sola voce per nickname (confronto senza maiuscole): si tiene la migliore.
$nickKey = lc($nick);
$changed = false;
$found   = false;
foreach ($board as &$row) {
  if (isset($row['n']) && lc((string) $row['n']) === $nickKey) {
    $found = true;
    if ($punti > (int) ($row['p'] ?? 0)) {        // aggiorna a parita' di nick solo se e' un record personale
      $row['p'] = $punti; $row['t'] = time(); $row['n'] = $nick; $changed = true;
    }
    break;
  }
}
unset($row);

if (!$found) {
  // Entra se c'e' posto o se batte l'ultimo in classifica (guardia: niente scrittura inutile).
  $full = count($board) >= TOP_N;
  $minP = $full ? min(array_map(fn($r) => (int) ($r['p'] ?? 0), $board)) : -1;
  if (!$full || $punti > $minP) {
    $board[] = ['n' => $nick, 'p' => $punti, 't' => time()];
    $changed = true;
  }
}

if ($changed) {
  usort($board, fn($a, $b) => ((int) $b['p']) <=> ((int) $a['p']));
  $board = array_slice($board, 0, TOP_N);
  $out = json_encode($board, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  rewind($fp);
  ftruncate($fp, 0);
  fwrite($fp, $out);
  fflush($fp);
}

flock($fp, LOCK_UN);
fclose($fp);

// Posizione del giocatore (1-based) se e' in classifica.
$rank = null;
foreach ($board as $i => $row) {
  if (lc((string) $row['n']) === $nickKey) { $rank = $i + 1; break; }
}

echo json_encode(['ok' => true, 'top' => $board, 'rank' => $rank], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
