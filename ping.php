<?php
// Probe temporaneo: verifica che l'hosting esegua PHP e che una cartella sia
// scrivibile (serve per api/scores.json della classifica). Da rimuovere dopo il check.
header('Content-Type: application/json; charset=utf-8');

$writeTest = null;
$f = __DIR__ . '/_ping_write_test.tmp';
if (@file_put_contents($f, 'ok', LOCK_EX) !== false) {
    $writeTest = 'ok';
    @unlink($f);
} else {
    $writeTest = 'FALLITO';
}

echo json_encode([
    'php'        => PHP_VERSION,
    'sapi'       => PHP_SAPI,
    'write_test' => $writeTest,
    'dir'        => __DIR__,
    'json_ext'   => function_exists('json_encode'),
    'time'       => date('c'),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
